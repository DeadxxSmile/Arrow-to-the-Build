'use strict'
const dbModule = require('../database/db')

const MAX_VALUE = 4096
const KNOWN_KEYS = new Set([
  'theme', 'eso_plus', 'remote_images', 'startup_workspace',
  'build_editor_default_author', 'build_editor_autosave_seconds',
  'build_editor_show_guidance', 'build_editor_advanced_default',
  'build_editor_compatibility_warnings', 'build_editor_storage_directory',
  'addon_sync_enabled', 'addon_onboarding_complete', 'addon_profile_root',
  'addon_allow_overrides', 'addon_last_sync_at', 'addon_last_revision',
  'addon_last_error', 'addon_detected_version'
])

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
      db.prepare('DELETE FROM character_sync_overrides').run()
      db.prepare('DELETE FROM character_addon_links').run()
      db.prepare('DELETE FROM addon_character_snapshots').run()
      db.prepare('DELETE FROM settings').run()
    })()
    require('./buildHandlers').seedBundled()
    return true
  })

  ipcMain.handle('db:getPath', () => dbModule.getDbPath())
}
module.exports = { register, KNOWN_KEYS }
