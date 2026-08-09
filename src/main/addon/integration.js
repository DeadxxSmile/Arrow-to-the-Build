'use strict'

const fs = require('fs')
const path = require('path')
const { shell, BrowserWindow } = require('electron')
const dbModule = require('../database/db')
const { parseSavedVariables, normalizeLuaTables } = require('./luaSavedVariables')
const {
  BUNDLED_ADDON_VERSION, ADDON_FOLDER, RETIRED_BRIDGE_FOLDER,
  SAVED_VARIABLES_FILE, REPOSITORY_URL
} = require('./addonConstants')
const {
  normalizeProfileSelection, isProfileRoot, candidateRoots, chooseProfileRoot,
  compareVersions, manifestVersion, installAddon, isLegacyBridge, resetLegacyBridgeInstall,
  addonsPath, installedAddonPath, retiredBridgeAddonPath, savedVariablesPath
} = require('./profileManager')
const {
  cleanText, clampInt, normalizeName, objectOrEmpty,
  normalizeSnapshot, liveCharacterState
} = require('./snapshotCodec')
const { createCharacterSyncStore } = require('./characterSyncStore')

const sessionPrompted = new Set()
const POST_UPDATE_CLEANUP_KEY = 'addon_single_exporter_cleanup_v2_1_3'
let watcher = null
let watcherRoot = ''
let syncTimer = null
let pollTimer = null
let syncing = null
let lastParsedRevision = null
let lastObservedFileMarker = ''

function getSetting(key, fallback = '') {
  const row = dbModule.getDb().prepare('SELECT value FROM settings WHERE key=?').get(key)
  return row ? row.value : fallback
}

function setSetting(key, value) {
  dbModule.getDb().prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')`)
    .run(key, String(value ?? ''))
}

function boolSetting(key, fallback = false) {
  return getSetting(key, fallback ? 'true' : 'false') === 'true'
}

function parseJson(value, fallback) { try { return JSON.parse(value) } catch { return fallback } }

function notifyRenderer(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('addon:sync-updated', payload)
  }
}

const characterSyncStore = createCharacterSyncStore({
  dbModule, getSetting, setSetting, boolSetting, parseJson, normalizeSnapshot, liveCharacterState,
  normalizeName, cleanText, clampInt, sessionPrompted,
  notifyRenderer,
  getStatus: () => getStatus()
})
const {
  applySnapshotToCharacter, discoveredCharacters, snapshotCharacters, importCharacter, dismissCharacter, rediscoverDismissed,
  linkedState, overridesAllowed, isLinked, setOverride, replaceOverridesByPrefix, clearOverride, setOverrideMode, unlinkCharacter
} = characterSyncStore

function upsertSnapshots(root, profileRoot = getSetting('addon_profile_root')) {
  const db = dbModule.getDb()
  const entries = Object.entries(objectOrEmpty(root.characters))
  const found = []
  const upsert = db.prepare(`INSERT INTO addon_character_snapshots(
    character_key,profile_root,account_name,world_name,eso_character_id,character_name,class_name,race_name,alliance_name,level,champion_points,
    addon_version,snapshot_schema,captured_at,snapshot_json,discovery_status
  ) VALUES(@character_key,@profile_root,@account_name,@world_name,@eso_character_id,@character_name,@class_name,@race_name,@alliance_name,@level,@champion_points,
    @addon_version,@snapshot_schema,@captured_at,@snapshot_json,'new')
  ON CONFLICT(character_key) DO UPDATE SET
    profile_root=excluded.profile_root,account_name=excluded.account_name,world_name=excluded.world_name,eso_character_id=excluded.eso_character_id,
    character_name=excluded.character_name,class_name=excluded.class_name,race_name=excluded.race_name,alliance_name=excluded.alliance_name,
    level=excluded.level,champion_points=excluded.champion_points,addon_version=excluded.addon_version,
    snapshot_schema=excluded.snapshot_schema,captured_at=excluded.captured_at,snapshot_json=excluded.snapshot_json,updated_at=datetime('now')
  WHERE excluded.captured_at >= addon_character_snapshots.captured_at`)

  db.transaction(() => {
    for (const [characterKey, raw] of entries) {
      const snapshot = normalizeSnapshot(characterKey, raw, root)
      if (!snapshot.identity.accountName || !snapshot.identity.worldName || !snapshot.identity.characterId) continue
      const result = upsert.run({
        character_key: snapshot.characterKey,
        profile_root: profileRoot,
        account_name: snapshot.identity.accountName,
        world_name: snapshot.identity.worldName,
        eso_character_id: snapshot.identity.characterId,
        character_name: snapshot.identity.name,
        class_name: snapshot.identity.class.name,
        race_name: snapshot.identity.race.name,
        alliance_name: snapshot.identity.alliance.name,
        level: snapshot.identity.level,
        champion_points: snapshot.identity.championPoints || snapshot.identity.championPointsEarned,
        addon_version: snapshot.addonVersion,
        snapshot_schema: snapshot.snapshotSchemaVersion,
        captured_at: snapshot.capturedAt,
        snapshot_json: JSON.stringify(snapshot)
      })
      if (result.changes > 0) found.push(snapshot)
    }
    for (const snapshot of found) {
      const link = db.prepare('SELECT character_id FROM character_addon_links WHERE character_key=?').get(snapshot.characterKey)
      if (link) applySnapshotToCharacter(link.character_id, snapshot)
    }
  })()
  return found
}

function pendingPromptCharacters() {
  const pending = discoveredCharacters(true).filter(item => !sessionPrompted.has(item.character_key))
  for (const item of pending) sessionPrompted.add(item.character_key)
  return pending
}

async function stableRead(file) {
  let previous = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (!fs.existsSync(file)) return null
    const stat = fs.statSync(file)
    const marker = `${stat.size}:${stat.mtimeMs}`
    if (previous === marker) return fs.readFileSync(file, 'utf8')
    previous = marker
    await new Promise(resolve => setTimeout(resolve, 180))
  }
  return fs.readFileSync(file, 'utf8')
}

async function readArchiveSyncSource(profileRoot, reason) {
  const file = savedVariablesPath(profileRoot)
  if (!fs.existsSync(file)) return { found: false, processed: false, snapshots: [], version: '' }
  const text = await stableRead(file)
  if (!text) return { found: true, processed: false, snapshots: [], version: '' }
  const parsed = normalizeLuaTables(parseSavedVariables(text))
  const schema = clampInt(parsed.schemaVersion, 0, 999, 0)
  if (schema !== 1) throw new Error(`Unsupported addon SavedVariables schema ${schema}. ATTB currently supports schema 1.`)
  const revision = clampInt(parsed.revision, 0, Number.MAX_SAFE_INTEGER, 0)
  const stat = fs.statSync(file)
  const marker = `${profileRoot}:${revision}:${stat.size}:${Math.trunc(stat.mtimeMs)}`
  if (reason !== 'manual' && lastParsedRevision !== null && revision === lastParsedRevision && marker === lastObservedFileMarker) {
    return { found: true, processed: false, snapshots: [], revision, version: cleanText(parsed.addonVersion, 80) }
  }
  lastParsedRevision = revision
  lastObservedFileMarker = marker
  const snapshots = upsertSnapshots(parsed, profileRoot)
  setSetting('addon_last_revision', revision)
  return { found: true, processed: true, snapshots, revision, version: cleanText(parsed.addonVersion, 80) }
}

async function syncNow(reason = 'manual') {
  if (syncing) return syncing
  syncing = (async () => {
    const profileRoot = getSetting('addon_profile_root')
    if (!boolSetting('addon_sync_enabled') || !profileRoot) return getStatus()

    let archive = { found: false, processed: false, snapshots: [], version: '' }
    let errorText = ''
    try {
      archive = await readArchiveSyncSource(profileRoot, reason)
    } catch (error) {
      errorText = error.message || String(error)
    }

    if (archive.found) setSetting('addon_last_sync_at', new Date().toISOString())
    setSetting('addon_last_error', errorText)
    if (archive.version) setSetting('addon_detected_version', archive.version)

    const status = getStatus()
    notifyRenderer({
      type: errorText ? 'error' : 'sync',
      reason,
      status,
      error: errorText,
      new_characters: pendingPromptCharacters(),
      updated_count: archive.snapshots.length,
      sources: { archive: archive.processed }
    })
    return status
  })().finally(() => { syncing = null })
  return syncing
}

function stopWatching() {
  if (watcher) { try { watcher.close() } catch { } }
  watcher = null
  watcherRoot = ''
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = null
}

function scheduleSync(reason = 'watch') {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => syncNow(reason).catch(error => console.error('[ATTB addon sync]', error)), 650)
}

function attachWatcher(root) {
  if (watcher || process.env.ATTB_DISABLE_ADDON_WATCH === '1') return
  const directory = path.dirname(savedVariablesPath(root))
  if (!fs.existsSync(directory)) return
  try {
    watcher = fs.watch(directory, { persistent: false }, (_event, filename) => {
      if (!filename || String(filename).toLowerCase() === SAVED_VARIABLES_FILE.toLowerCase()) scheduleSync('watch')
    })
    watcher.on?.('error', () => { try { watcher.close() } catch { }; watcher = null })
  } catch { watcher = null }
}

function startWatching() {
  stopWatching()
  if (!boolSetting('addon_sync_enabled')) return
  const root = getSetting('addon_profile_root')
  if (!root) return
  watcherRoot = root
  lastParsedRevision = null
  lastObservedFileMarker = ''
  attachWatcher(root)
  if (process.env.ATTB_DISABLE_ADDON_WATCH === '1') return
  pollTimer = setInterval(() => {
    if (watcherRoot !== getSetting('addon_profile_root') || !boolSetting('addon_sync_enabled')) return startWatching()
    attachWatcher(root)
    syncNow('poll').catch(() => {})
  }, 15000)
  pollTimer.unref?.()
  syncNow('startup').catch(() => {})
}

function safeFileSize(file) {
  try { return file && fs.existsSync(file) ? fs.statSync(file).size : 0 } catch { return 0 }
}

function getStatus() {
  const profileRoot = getSetting('addon_profile_root')
  const enabled = boolSetting('addon_sync_enabled')
  const installedPath = profileRoot ? installedAddonPath(profileRoot) : ''
  const retiredBridgePath = profileRoot ? retiredBridgeAddonPath(profileRoot) : ''
  const savePath = profileRoot ? savedVariablesPath(profileRoot) : ''
  const installedVersion = installedPath ? manifestVersion(path.join(installedPath, 'ArrowToTheBuild.txt')) : ''
  const versionComparison = installedVersion ? compareVersions(installedVersion, BUNDLED_ADDON_VERSION) : 0
  const db = dbModule.getDb()
  const snapshotCount = profileRoot ? db.prepare('SELECT COUNT(*) AS n FROM addon_character_snapshots WHERE profile_root=?').get(profileRoot).n : 0
  const linkedCount = profileRoot ? db.prepare(`SELECT COUNT(*) AS n FROM character_addon_links l JOIN addon_character_snapshots s ON s.character_key=l.character_key WHERE s.profile_root=?`).get(profileRoot).n : 0
  const pendingCount = profileRoot ? db.prepare(`SELECT COUNT(*) AS n FROM addon_character_snapshots s LEFT JOIN character_addon_links l ON l.character_key=s.character_key WHERE s.profile_root=? AND l.character_id IS NULL AND s.discovery_status IN ('new','prompted')`).get(profileRoot).n : 0
  return {
    enabled,
    onboarding_complete: boolSetting('addon_onboarding_complete'),
    allow_overrides: boolSetting('addon_allow_overrides'),
    profile_root: profileRoot,
    profile_name: profileRoot ? path.basename(profileRoot) : '',
    addon_path: installedPath,
    saved_variables_path: savePath,
    addon_installed: !!installedVersion,
    installed_version: installedVersion,
    bundled_version: BUNDLED_ADDON_VERSION,
    addon_version_mismatch: !!installedVersion && installedVersion !== BUNDLED_ADDON_VERSION,
    addon_update_available: !!installedVersion && versionComparison < 0,
    addon_newer_than_bundled: !!installedVersion && versionComparison > 0,
    saved_variables_found: !!savePath && fs.existsSync(savePath),
    saved_variables_size: safeFileSize(savePath),
    retired_bridge_installed: !!profileRoot && isLegacyBridge(profileRoot),
    retired_bridge_path: retiredBridgePath,
    snapshot_count: snapshotCount,
    linked_count: linkedCount,
    pending_count: pendingCount,
    last_sync_at: getSetting('addon_last_sync_at'),
    last_revision: Number(getSetting('addon_last_revision', '0')) || 0,
    last_error: getSetting('addon_last_error'),
    candidates: candidateRoots(),
    repository_url: REPOSITORY_URL,
    watcher_active: !!watcher || !!pollTimer
  }
}


function runPostUpdateAddonCleanup() {
  if (getSetting(POST_UPDATE_CLEANUP_KEY) === 'done') return []
  const configured = getSetting('addon_profile_root')
  const roots = []
  for (const root of [configured, ...candidateRoots()]) {
    if (!root || roots.some(item => item.toLowerCase() === root.toLowerCase())) continue
    roots.push(root)
  }

  const results = []
  let failed = false
  for (const root of roots) {
    try {
      const result = resetLegacyBridgeInstall(root)
      if (result.found) results.push(result)
    } catch (error) {
      failed = true
      const message = error.message || String(error)
      console.error('[ATTB addon cleanup]', message)
      setSetting('addon_last_error', message)
    }
  }

  if (results.length) {
    lastParsedRevision = null
    lastObservedFileMarker = ''
    setSetting('addon_last_revision', '0')
    setSetting('addon_detected_version', BUNDLED_ADDON_VERSION)
    if (!failed) setSetting('addon_last_error', '')
  }
  if (!failed) setSetting(POST_UPDATE_CLEANUP_KEY, 'done')
  return results
}

async function configure({ mode = 'existing', profileRoot = '', autoDetect = true } = {}, parentWindow = null) {
  let root = normalizeProfileSelection(profileRoot)
  if (!root && autoDetect) root = candidateRoots()[0] || ''
  if (!root) root = await chooseProfileRoot(parentWindow)
  if (!root) return null
  if (!isProfileRoot(root)) throw new Error('The selected folder is not an ESO profile folder.')
  const cleanup = resetLegacyBridgeInstall(root)
  if (cleanup.found) {
    lastParsedRevision = null
    lastObservedFileMarker = ''
    setSetting('addon_last_revision', '0')
    setSetting('addon_detected_version', BUNDLED_ADDON_VERSION)
    setSetting('addon_last_error', '')
  }
  const addonManifest = path.join(installedAddonPath(root), 'ArrowToTheBuild.txt')
  if (mode === 'existing' && !fs.existsSync(addonManifest) && !fs.existsSync(savedVariablesPath(root))) {
    throw new Error('ATTB could not find its ESO addon or SavedVariables file in that profile. Choose Install Addon, or select the profile where it is already installed.')
  }
  if (mode === 'install') installAddon(root)
  const previousRoot = getSetting('addon_profile_root')
  setSetting('addon_profile_root', root)
  if (previousRoot !== root) {
    sessionPrompted.clear()
    lastParsedRevision = null
    lastObservedFileMarker = ''
  }
  setSetting('addon_sync_enabled', 'true')
  setSetting('addon_onboarding_complete', 'true')
  startWatching()
  await syncNow('configured')
  return getStatus()
}

function setEnabled(enabled) {
  setSetting('addon_sync_enabled', enabled ? 'true' : 'false')
  setSetting('addon_onboarding_complete', 'true')
  if (enabled) startWatching(); else stopWatching()
  return getStatus()
}

function markOnboardingDisabled() {
  setSetting('addon_sync_enabled', 'false')
  setSetting('addon_onboarding_complete', 'true')
  stopWatching()
  return getStatus()
}

async function openFolder(kind) {
  const root = getSetting('addon_profile_root')
  if (!root) throw new Error('Configure an ESO profile folder first.')
  const target = kind === 'saved' ? path.dirname(savedVariablesPath(root)) : addonsPath(root)
  fs.mkdirSync(target, { recursive: true })
  const error = await shell.openPath(target)
  if (error) throw new Error(error)
  return target
}

function register(ipcMain) {
  ipcMain.handle('addon:getStatus', () => getStatus())
  ipcMain.handle('addon:detectProfiles', () => candidateRoots())
  ipcMain.handle('addon:chooseProfile', event => chooseProfileRoot(BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle('addon:configure', (event, options) => configure(options || {}, BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle('addon:setEnabled', (_event, enabled) => setEnabled(!!enabled))
  ipcMain.handle('addon:disableOnboarding', () => markOnboardingDisabled())
  ipcMain.handle('addon:install', () => {
    const root = getSetting('addon_profile_root')
    if (!root) throw new Error('Configure an ESO profile folder first.')
    const result = installAddon(root)
    startWatching()
    return { ...result, status: getStatus() }
  })
  ipcMain.handle('addon:syncNow', () => syncNow('manual'))
  ipcMain.handle('addon:listDiscovered', () => discoveredCharacters(true))
  ipcMain.handle('addon:listSnapshots', () => snapshotCharacters())
  ipcMain.handle('addon:importCharacter', (_event, key, options) => importCharacter(String(key || ''), options || {}))
  ipcMain.handle('addon:dismissCharacter', (_event, key) => dismissCharacter(String(key || '')))
  ipcMain.handle('addon:rediscoverDismissed', () => rediscoverDismissed())
  ipcMain.handle('addon:getLinkedState', (_event, characterId) => linkedState(String(characterId || '')))
  ipcMain.handle('addon:clearOverride', (_event, characterId, fieldPath) => clearOverride(String(characterId || ''), String(fieldPath || '')))
  ipcMain.handle('addon:setOverrideMode', (_event, enabled) => setOverrideMode(!!enabled))
  ipcMain.handle('addon:unlinkCharacter', (_event, characterId) => unlinkCharacter(String(characterId || '')))
  ipcMain.handle('addon:openFolder', (_event, kind) => openFolder(kind))
  ipcMain.handle('addon:openRepository', () => shell.openExternal(REPOSITORY_URL))
}

module.exports = {
  register, startWatching, stopWatching, syncNow, getStatus, candidateRoots, installAddon, runPostUpdateAddonCleanup, snapshotCharacters,
  linkedState, isLinked, overridesAllowed, setOverride, replaceOverridesByPrefix, clearOverride, setOverrideMode,
  applySnapshotToCharacter, liveCharacterState, normalizeSnapshot,
  BUNDLED_ADDON_VERSION, ADDON_FOLDER, RETIRED_BRIDGE_FOLDER
}
