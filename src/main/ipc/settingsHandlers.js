'use strict'
const dbModule = require('../database/db')

const MAX_VALUE = 4096
const KNOWN_KEYS = new Set(['theme', 'eso_plus', 'remote_images'])

function register(ipcMain) {
  ipcMain.handle('settings:getAll', () => Object.fromEntries(dbModule.getDb().prepare('SELECT key,value FROM settings').all().map(r => [r.key, r.value])))

  ipcMain.handle('settings:set', (_e, key, value) => {
    if (!KNOWN_KEYS.has(key)) throw new Error(`Unknown setting "${key}"`)
    dbModule.getDb().prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')`)
      .run(key, String(value).slice(0, MAX_VALUE))
    return true
  })

  ipcMain.handle('settings:resetApp', () => {
    const db = dbModule.getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM characters').run()
      db.prepare('DELETE FROM builds WHERE is_bundled=0').run()
      db.prepare('DELETE FROM settings').run()
    })()
    require('./buildHandlers').seedBundled()
    return true
  })

  ipcMain.handle('db:getPath', () => dbModule.getDbPath())
}
module.exports = { register, KNOWN_KEYS }
