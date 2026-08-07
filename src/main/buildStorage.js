'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { app, dialog, shell } = require('electron')
const dbModule = require('./database/db')

const STORAGE_SETTING = 'build_editor_storage_directory'
const LIBRARY_FOLDER_NAME = 'Arrow to the Build'
const BUILDS_FOLDER_NAME = 'Builds'

function defaultDirectory() {
  return path.join(app.getPath('documents'), LIBRARY_FOLDER_NAME, BUILDS_FOLDER_NAME)
}

function configuredDirectory() {
  const row = dbModule.getDb().prepare('SELECT value FROM settings WHERE key=?').get(STORAGE_SETTING)
  const value = String(row?.value || '').trim()
  return value && path.isAbsolute(value) ? path.normalize(value) : defaultDirectory()
}

function setConfiguredDirectory(directory) {
  const value = path.normalize(String(directory || '').trim())
  if (!value || !path.isAbsolute(value)) throw new Error('Choose an absolute folder path for saved build files.')
  dbModule.getDb().prepare(`INSERT INTO settings(key,value) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')`).run(STORAGE_SETTING, value)
  return value
}

function clearConfiguredDirectory() {
  dbModule.getDb().prepare('DELETE FROM settings WHERE key=?').run(STORAGE_SETTING)
  return defaultDirectory()
}

function ensureWritableDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true })
  fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK)
  return directory
}

function safeBuildId(value) {
  const id = String(value || '').trim()
  if (!/^[a-z0-9][a-z0-9_.-]*$/i.test(id)) throw new Error('Build ID is not safe for a file name.')
  return id
}

function targetPathForBuild(buildId, directory = configuredDirectory()) {
  return path.join(directory, `${safeBuildId(buildId)}.json`)
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function fileHash(file) {
  return sha256(fs.readFileSync(file))
}

function atomicWrite(file, text) {
  const directory = path.dirname(file)
  ensureWritableDirectory(directory)
  const token = `${process.pid}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`
  const temp = path.join(directory, `.${path.basename(file)}.${token}.tmp`)
  const backup = path.join(directory, `.${path.basename(file)}.${token}.bak`)
  let fd
  let replacementComplete = false
  try {
    fd = fs.openSync(temp, 'wx')
    fs.writeFileSync(fd, text, 'utf8')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    fd = null
    try {
      fs.renameSync(temp, file)
      replacementComplete = true
    } catch (error) {
      if (!fs.existsSync(file)) throw error
      fs.renameSync(file, backup)
      try {
        fs.renameSync(temp, file)
        replacementComplete = true
        fs.rmSync(backup, { force: true })
      } catch (replaceError) {
        try {
          if (!fs.existsSync(file) && fs.existsSync(backup)) fs.renameSync(backup, file)
        } catch { /* Leave the backup in place for manual recovery. */ }
        throw replaceError
      }
    }
  } finally {
    if (fd !== null && fd !== undefined) { try { fs.closeSync(fd) } catch { } }
    try { fs.rmSync(temp, { force: true }) } catch { }
    if (replacementComplete) { try { fs.rmSync(backup, { force: true }) } catch { } }
  }
}

function buildJson(data) {
  return JSON.stringify(data, null, 2) + '\n'
}

function eligibleRows() {
  return dbModule.getDb().prepare(`SELECT * FROM builds
    WHERE is_bundled=0 AND last_saved_revision>0 ORDER BY name`).all()
}

function rowData(row) {
  return JSON.parse(row.data_json)
}

function markSuccess(buildId, file, hash) {
  dbModule.getDb().prepare(`UPDATE builds SET build_file_path=?,build_file_hash=?,
    build_file_synced_at=datetime('now'),build_file_sync_error=NULL WHERE id=? AND is_bundled=0`)
    .run(file, hash, buildId)
}

function markFailure(buildId, error) {
  dbModule.getDb().prepare(`UPDATE builds SET build_file_sync_error=? WHERE id=? AND is_bundled=0`)
    .run(String(error?.message || error || 'Build file sync failed.').slice(0, 2000), buildId)
}

function writeRow(row, directory = configuredDirectory(), persist = true) {
  if (!row || row.is_bundled || Number(row.last_saved_revision) <= 0) {
    return { ok: true, skipped: true, reason: 'Only permanently saved user builds are mirrored.' }
  }
  const file = targetPathForBuild(row.id, directory)
  const text = buildJson(rowData(row))
  const hash = sha256(text)
  try {
    if (fs.existsSync(file)) {
      const existingHash = fileHash(file)
      const sameManagedPath = row.build_file_path && path.normalize(row.build_file_path) === path.normalize(file)
      const unchangedSinceLastSync = sameManagedPath && row.build_file_hash && existingHash === row.build_file_hash
      if (existingHash !== hash && !unchangedSinceLastSync) {
        const message = 'The saved JSON file was modified outside ATTB or conflicts with another file. It was preserved and not overwritten.'
        if (persist) markFailure(row.id, message)
        return { ok: false, path: file, external_change: true, error: message }
      }
    }
    atomicWrite(file, text)
    if (persist) markSuccess(row.id, file, hash)
    return { ok: true, path: file, hash }
  } catch (error) {
    if (persist) markFailure(row.id, error)
    return { ok: false, path: file, error: error.message || String(error) }
  }
}

function syncSavedBuild(buildId) {
  const row = dbModule.getDb().prepare('SELECT * FROM builds WHERE id=?').get(String(buildId || ''))
  if (!row) return { ok: false, error: 'Build not found.' }
  return writeRow(row)
}

function syncAllSavedBuilds({ directory = configuredDirectory(), persist = true } = {}) {
  const rows = eligibleRows()
  const results = rows.map(row => ({ build_id: row.id, name: row.name, ...writeRow(row, directory, persist) }))
  return {
    directory,
    total: rows.length,
    synced: results.filter(result => result.ok && !result.skipped).length,
    failed: results.filter(result => !result.ok).length,
    results
  }
}

function inspectRow(row, directory, directoryAvailable) {
  const expectedPath = targetPathForBuild(row.id, directory)
  if (!directoryAvailable) return { build_id: row.id, name: row.name, status: 'unavailable', path: expectedPath }
  if (!fs.existsSync(expectedPath)) return { build_id: row.id, name: row.name, status: 'missing', path: expectedPath, error: row.build_file_sync_error || '' }
  try {
    const currentHash = fileHash(expectedPath)
    if (row.build_file_hash && currentHash !== row.build_file_hash) {
      return { build_id: row.id, name: row.name, status: 'external-change', path: expectedPath }
    }
    if (path.normalize(row.build_file_path || '') !== path.normalize(expectedPath)) {
      return { build_id: row.id, name: row.name, status: 'pending', path: expectedPath }
    }
    return { build_id: row.id, name: row.name, status: 'synced', path: expectedPath, synced_at: row.build_file_synced_at }
  } catch (error) {
    return { build_id: row.id, name: row.name, status: 'error', path: expectedPath, error: error.message }
  }
}

function getInfo() {
  const directory = configuredDirectory()
  let available = true
  let error = ''
  try { ensureWritableDirectory(directory) } catch (caught) { available = false; error = caught.message || String(caught) }
  const builds = eligibleRows().map(row => inspectRow(row, directory, available))
  return {
    directory,
    default_directory: defaultDirectory(),
    is_default: path.normalize(directory) === path.normalize(defaultDirectory()),
    available,
    error,
    eligible_builds: builds.length,
    synced_builds: builds.filter(item => item.status === 'synced').length,
    pending_builds: builds.filter(item => item.status !== 'synced').length,
    external_changes: builds.filter(item => item.status === 'external-change').length,
    builds
  }
}

function switchDirectory(directory, useDefault = false) {
  const candidate = path.normalize(directory)
  ensureWritableDirectory(candidate)
  const preview = syncAllSavedBuilds({ directory: candidate, persist: false })
  if (preview.failed) {
    const first = preview.results.find(result => !result.ok)
    throw new Error(`ATTB could not copy every saved build into that folder. The current folder was not changed.\n${first?.name || 'Build'}: ${first?.error || 'Unknown file error'}`)
  }
  if (useDefault) clearConfiguredDirectory(); else setConfiguredDirectory(candidate)
  for (const result of preview.results) if (result.ok && !result.skipped) markSuccess(result.build_id, result.path, result.hash)
  return { changed: true, copied: preview.synced, ...getInfo() }
}

async function chooseDirectory() {
  const current = configuredDirectory()
  const result = await dialog.showOpenDialog({
    title: 'Choose ATTB Build Storage Folder',
    defaultPath: current,
    buttonLabel: 'Use This Folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || !result.filePaths[0]) return null
  return switchDirectory(result.filePaths[0], false)
}

function restoreDefaultDirectory() {
  return switchDirectory(defaultDirectory(), true)
}

async function openDirectory() {
  const directory = ensureWritableDirectory(configuredDirectory())
  const result = await shell.openPath(directory)
  if (result) throw new Error(result)
  return directory
}

function removeManagedBuildFile(row) {
  if (!row || row.is_bundled || !row.build_file_path || !fs.existsSync(row.build_file_path)) return { removed: false }
  try {
    if (row.build_file_hash && fileHash(row.build_file_path) !== row.build_file_hash) {
      return { removed: false, preserved: true, reason: 'The JSON file was modified outside ATTB, so it was preserved.' }
    }
    fs.rmSync(row.build_file_path)
    return { removed: true, path: row.build_file_path }
  } catch (error) {
    return { removed: false, preserved: true, reason: error.message || String(error) }
  }
}

module.exports = {
  STORAGE_SETTING,
  defaultDirectory,
  configuredDirectory,
  targetPathForBuild,
  syncSavedBuild,
  syncAllSavedBuilds,
  getInfo,
  chooseDirectory,
  restoreDefaultDirectory,
  openDirectory,
  removeManagedBuildFile,
  atomicWrite,
  buildJson
}
