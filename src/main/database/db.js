'use strict'

const path = require('path')
const fs = require('fs')
const { app } = require('electron')
let _db = null

function getBasePath() {
  return app.isPackaged ? app.getPath('userData') : path.join(__dirname, '../../../')
}
function getDbPath() { return path.join(getBasePath(), 'attb.db') }
function getDb() { if (!_db) throw new Error('Database not initialized'); return _db }

function migrationsDir() { return path.join(__dirname, 'migrations') }
function pendingMigrations(db) {
  const applied = new Set(db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename))
  return fs.readdirSync(migrationsDir()).filter(f => f.endsWith('.sql')).sort().filter(f => !applied.has(f))
}

// Copy the database aside before an upgrade touches it. Cheap insurance and the only way back if a
// future migration is wrong. db.backup() is async and would not finish before migrations start, so
// fold the WAL back in and copy the file synchronously instead.
function backupBeforeMigrations(dbPath) {
  if (!fs.existsSync(dbPath)) return null
  const dir = path.join(path.dirname(dbPath), 'Backups')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(dir, `attb-premigration-${stamp}.db`)
  _db.pragma('wal_checkpoint(TRUNCATE)')
  fs.copyFileSync(dbPath, target)
  // Keep the five most recent so this does not grow forever.
  const old = fs.readdirSync(dir).filter(f => f.startsWith('attb-premigration-')).sort().reverse().slice(5)
  for (const f of old) { try { fs.rmSync(path.join(dir, f)) } catch { } }
  return target
}

function runMigrations(dbPath) {
  _db.exec(`CREATE TABLE IF NOT EXISTS _migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`)
  const pending = pendingMigrations(_db)
  if (!pending.length) return []
  const isFirstRun = _db.prepare('SELECT COUNT(*) AS n FROM _migrations').get().n === 0
  if (!isFirstRun) { try { backupBeforeMigrations(dbPath) } catch (err) { console.error('[Migration backup]', err.message) } }
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir(), file), 'utf8')
    _db.transaction(() => {
      _db.exec(sql)
      _db.prepare('INSERT INTO _migrations(filename) VALUES (?)').run(file)
    })()
  }
  return pending
}

function initialize(explicitPath = null) {
  if (_db) return _db
  const Database = require('better-sqlite3')
  const dbPath = explicitPath || getDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('synchronous = NORMAL')
  runMigrations(dbPath)
  return _db
}
function close() { if (_db) { _db.close(); _db = null } }
module.exports = { initialize, getDb, getDbPath, close }
