'use strict'

const fs = require('fs')
const path = require('path')
const { shell, BrowserWindow } = require('electron')
const dbModule = require('../database/db')
const { parseSavedVariables, normalizeLuaTables } = require('./luaSavedVariables')

const {
  BUNDLED_ADDON_VERSION, ADDON_FOLDER, BRIDGE_ADDON_FOLDER,
  SAVED_VARIABLES_FILE, BRIDGE_SAVED_VARIABLES_FILE, BRIDGE_SAVED_VARIABLE_NAME,
  BRIDGE_SCHEMA_VERSION, ESO_NORMAL_SAVE_LIMIT_BYTES, REPOSITORY_URL
} = require('./addonConstants')
const {
  normalizeProfileSelection, isProfileRoot, candidateRoots, chooseProfileRoot,
  compareVersions, manifestVersion, installAddon,
  addonsPath, installedAddonPath, savedVariablesPath, bridgeSavedVariablesPath
} = require('./profileManager')
const sessionPrompted = new Set()

let watcher = null
let watcherRoot = ''
let syncTimer = null
let pollTimer = null
let syncing = null
let lastParsedRevision = null
let lastObservedFileMarker = ''
let lastParsedBridgeRevision = null
let lastObservedBridgeFileMarker = ''

function getSetting(key, fallback = '') {
  const row = dbModule.getDb().prepare('SELECT value FROM settings WHERE key=?').get(key)
  return row ? row.value : fallback
}

function setSetting(key, value) {
  dbModule.getDb().prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now')`)
    .run(key, String(value ?? ''))
}

function boolSetting(key, fallback = false) {
  const raw = getSetting(key, fallback ? 'true' : 'false')
  return raw === 'true'
}

const {
  cleanText, clampInt, normalizeName, asArray, objectOrEmpty,
  decodeBridgeSnapshot, normalizeSnapshot, liveCharacterState
} = require('./snapshotCodec')
const { enrichBridgeFromPrevious, bridgeRootAsArchive } = require('./snapshotMerge')
const { createCharacterSyncStore } = require('./characterSyncStore')

function parseJson(value, fallback) { try { return JSON.parse(value) } catch { return fallback } }

const characterSyncStore = createCharacterSyncStore({
  dbModule, getSetting, setSetting, boolSetting, parseJson, normalizeSnapshot, liveCharacterState,
  normalizeName, cleanText, clampInt, sessionPrompted,
  notifyRenderer: payload => notifyRenderer(payload),
  getStatus: () => getStatus()
})
const {
  applySnapshotToCharacter, discoveredCharacters, importCharacter, dismissCharacter, rediscoverDismissed,
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

function notifyRenderer(payload) {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('addon:sync-updated', payload)
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


function enrichNewerBridgeSnapshotsFromArchive(root, profileRoot = getSetting('addon_profile_root')) {
  const db = dbModule.getDb()
  const enrichedSnapshots = []
  const entries = Object.entries(objectOrEmpty(root.characters))

  db.transaction(() => {
    for (const [characterKey, raw] of entries) {
      const archiveSnapshot = normalizeSnapshot(characterKey, raw, root)
      const row = db.prepare('SELECT captured_at,snapshot_json FROM addon_character_snapshots WHERE character_key=? AND profile_root=?').get(characterKey, profileRoot)
      if (!row) continue
      const current = parseJson(row.snapshot_json, null)
      if (!current || current.dataProfile !== 'near-live-bridge-v2') continue
      if (Number(current.capturedAt || row.captured_at || 0) <= Number(archiveSnapshot.capturedAt || 0)) continue

      const rootMetadata = {
        droppedSections: asArray(current.completeness?.droppedSections),
        reducedFields: asArray(current.completeness?.reducedFields)
      }
      const before = JSON.stringify(current)
      const enrichedRaw = enrichBridgeFromPrevious(current, archiveSnapshot, rootMetadata)
      const enriched = normalizeSnapshot(characterKey, enrichedRaw, enrichedRaw)
      const after = JSON.stringify(enriched)
      if (after === before) continue

      db.prepare(`UPDATE addon_character_snapshots SET
        character_name=?,class_name=?,race_name=?,alliance_name=?,snapshot_json=?,updated_at=datetime('now')
        WHERE character_key=? AND profile_root=?`).run(
        enriched.identity.name,
        enriched.identity.class.name,
        enriched.identity.race.name,
        enriched.identity.alliance.name,
        after,
        characterKey,
        profileRoot
      )
      const link = db.prepare('SELECT character_id FROM character_addon_links WHERE character_key=?').get(characterKey)
      if (link) applySnapshotToCharacter(link.character_id, enriched)
      enrichedSnapshots.push(enriched)
    }
  })()
  return enrichedSnapshots
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
  const enriched = enrichNewerBridgeSnapshotsFromArchive(parsed, profileRoot)
  setSetting('addon_last_revision', revision)
  return { found: true, processed: true, snapshots: [...snapshots, ...enriched], revision, version: cleanText(parsed.addonVersion, 80) }
}

async function readBridgeSyncSource(profileRoot, reason) {
  const file = bridgeSavedVariablesPath(profileRoot)
  if (!fs.existsSync(file)) return { found: false, processed: false, snapshots: [], version: '' }
  const text = await stableRead(file)
  if (!text) return { found: true, processed: false, snapshots: [], version: '' }
  const parsed = normalizeLuaTables(parseSavedVariables(text, BRIDGE_SAVED_VARIABLE_NAME))
  const schema = clampInt(parsed.schemaVersion, 0, 999, 0)
  if (![1, BRIDGE_SCHEMA_VERSION].includes(schema)) throw new Error(`Unsupported ATTB sync bridge schema ${schema}. ATTB currently supports bridge schemas 1 and ${BRIDGE_SCHEMA_VERSION}.`)
  const revision = clampInt(parsed.revision, 0, Number.MAX_SAFE_INTEGER, 0)
  const stat = fs.statSync(file)
  const marker = `${profileRoot}:${revision}:${stat.size}:${Math.trunc(stat.mtimeMs)}`
  if (reason !== 'manual' && lastParsedBridgeRevision !== null && revision === lastParsedBridgeRevision && marker === lastObservedBridgeFileMarker) {
    return { found: true, processed: false, snapshots: [], revision, version: cleanText(parsed.addonVersion, 80), size: stat.size }
  }
  lastParsedBridgeRevision = revision
  lastObservedBridgeFileMarker = marker
  const characterKey = cleanText(parsed.characterKey, 400)
  const previousRow = characterKey ? dbModule.getDb().prepare('SELECT snapshot_json FROM addon_character_snapshots WHERE character_key=?').get(characterKey) : null
  const previousSnapshot = previousRow ? parseJson(previousRow.snapshot_json, null) : null
  const synthetic = bridgeRootAsArchive(parsed, previousSnapshot)
  const snapshots = synthetic ? upsertSnapshots(synthetic, profileRoot) : []
  setSetting('addon_bridge_last_revision', revision)
  setSetting('addon_bridge_last_sync_at', new Date().toISOString())
  setSetting('addon_bridge_last_capture_at', clampInt(parsed.capturedAt, 0, Number.MAX_SAFE_INTEGER, 0))
  setSetting('addon_bridge_estimated_bytes', clampInt(parsed.estimatedBytes, 0, 1024 * 1024, 0))
  setSetting('addon_bridge_budget_bytes', clampInt(parsed.budgetBytes, 0, 1024 * 1024, 0))
  setSetting('addon_bridge_budget_status', cleanText(parsed.budgetStatus, 40))
  setSetting('addon_bridge_truncated', parsed.truncated === true ? 'true' : 'false')
  setSetting('addon_bridge_reduced_fields', JSON.stringify(asArray(parsed.reducedFields).map(value => cleanText(value, 80))))
  setSetting('addon_bridge_dropped_sections', JSON.stringify(asArray(parsed.droppedSections).map(value => cleanText(value, 80))))
  return { found: true, processed: true, snapshots, revision, version: cleanText(parsed.addonVersion, 80), size: stat.size }
}

async function syncNow(reason = 'manual') {
  if (syncing) return syncing
  syncing = (async () => {
    const profileRoot = getSetting('addon_profile_root')
    if (!boolSetting('addon_sync_enabled') || !profileRoot) return getStatus()

    const errors = []
    const snapshots = []
    let archive = { found: false, processed: false, snapshots: [], version: '' }
    let bridge = { found: false, processed: false, snapshots: [], version: '' }

    try { archive = await readArchiveSyncSource(profileRoot, reason) }
    catch (error) { errors.push(`Character archive: ${error.message || error}`) }
    try { bridge = await readBridgeSyncSource(profileRoot, reason) }
    catch (error) { errors.push(`Sync bridge: ${error.message || error}`) }

    snapshots.push(...(archive.snapshots || []), ...(bridge.snapshots || []))
    const newestByKey = new Map()
    for (const snapshot of snapshots) {
      const previous = newestByKey.get(snapshot.characterKey)
      if (!previous || Number(snapshot.capturedAt || 0) >= Number(previous.capturedAt || 0)) newestByKey.set(snapshot.characterKey, snapshot)
    }

    if (archive.found || bridge.found) setSetting('addon_last_sync_at', new Date().toISOString())
    setSetting('addon_last_error', errors.join(' | '))
    const detectedVersion = bridge.version || archive.version
    if (detectedVersion) setSetting('addon_detected_version', detectedVersion)

    const status = getStatus()
    notifyRenderer({
      type: errors.length ? 'error' : 'sync',
      reason,
      status,
      error: errors.join(' | '),
      new_characters: pendingPromptCharacters(),
      updated_count: newestByKey.size,
      sources: { archive: archive.processed, bridge: bridge.processed }
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
  if (watcher) return
  // Unit tests drive syncNow explicitly and share this module across cases; a live fs.watch
  // callback can fire after a later test has repointed the profile root and cross-contaminate
  // snapshots. Tests set ATTB_DISABLE_ADDON_WATCH so watching is a no-op there.
  if (process.env.ATTB_DISABLE_ADDON_WATCH === '1') return
  const directory = path.dirname(savedVariablesPath(root))
  if (!fs.existsSync(directory)) return
  try {
    watcher = fs.watch(directory, { persistent: false }, (_event, filename) => {
      if (!filename || [SAVED_VARIABLES_FILE, BRIDGE_SAVED_VARIABLES_FILE].some(file => String(filename).toLowerCase() === file.toLowerCase())) scheduleSync('watch')
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
  lastParsedBridgeRevision = null
  lastObservedBridgeFileMarker = ''
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
  const bridgeInstalledPath = profileRoot ? installedAddonPath(profileRoot, BRIDGE_ADDON_FOLDER) : ''
  const savePath = profileRoot ? savedVariablesPath(profileRoot) : ''
  const bridgeSavePath = profileRoot ? bridgeSavedVariablesPath(profileRoot) : ''
  const installedVersion = installedPath ? manifestVersion(path.join(installedPath, 'ArrowToTheBuild.txt')) : ''
  const bridgeInstalledVersion = bridgeInstalledPath ? manifestVersion(path.join(bridgeInstalledPath, 'ArrowToTheBuildBridge.txt')) : ''
  const bridgeFileSize = safeFileSize(bridgeSavePath)
  const db = dbModule.getDb()
  const snapshotCount = profileRoot ? db.prepare('SELECT COUNT(*) AS n FROM addon_character_snapshots WHERE profile_root=?').get(profileRoot).n : 0
  const linkedCount = profileRoot ? db.prepare(`SELECT COUNT(*) AS n FROM character_addon_links l JOIN addon_character_snapshots s ON s.character_key=l.character_key WHERE s.profile_root=?`).get(profileRoot).n : 0
  const pendingCount = profileRoot ? db.prepare(`SELECT COUNT(*) AS n FROM addon_character_snapshots s LEFT JOIN character_addon_links l ON l.character_key=s.character_key WHERE s.profile_root=? AND l.character_id IS NULL AND s.discovery_status IN ('new','prompted')`).get(profileRoot).n : 0
  const versionComparison = installedVersion ? compareVersions(installedVersion, BUNDLED_ADDON_VERSION) : 0
  const bridgeVersionComparison = bridgeInstalledVersion ? compareVersions(bridgeInstalledVersion, BUNDLED_ADDON_VERSION) : 0
  return {
    enabled,
    onboarding_complete: boolSetting('addon_onboarding_complete'),
    allow_overrides: boolSetting('addon_allow_overrides'),
    profile_root: profileRoot,
    profile_name: profileRoot ? path.basename(profileRoot) : '',
    addon_path: installedPath,
    bridge_addon_path: bridgeInstalledPath,
    saved_variables_path: savePath,
    bridge_saved_variables_path: bridgeSavePath,
    addon_installed: !!installedVersion,
    bridge_installed: !!bridgeInstalledVersion,
    installed_version: installedVersion,
    bridge_installed_version: bridgeInstalledVersion,
    bundled_version: BUNDLED_ADDON_VERSION,
    addon_version_mismatch: !!installedVersion && installedVersion !== BUNDLED_ADDON_VERSION,
    addon_update_available: !!installedVersion && versionComparison < 0,
    addon_newer_than_bundled: !!installedVersion && versionComparison > 0,
    bridge_update_available: !!bridgeInstalledVersion && bridgeVersionComparison < 0,
    bridge_newer_than_bundled: !!bridgeInstalledVersion && bridgeVersionComparison > 0,
    saved_variables_found: !!savePath && fs.existsSync(savePath),
    bridge_saved_variables_found: !!bridgeSavePath && fs.existsSync(bridgeSavePath),
    bridge_file_size: bridgeFileSize,
    bridge_save_limit: ESO_NORMAL_SAVE_LIMIT_BYTES,
    bridge_within_normal_save_limit: bridgeFileSize === 0 || bridgeFileSize <= ESO_NORMAL_SAVE_LIMIT_BYTES,
    near_live_ready: !!bridgeInstalledVersion && bridgeFileSize > 0 && bridgeFileSize <= ESO_NORMAL_SAVE_LIMIT_BYTES,
    snapshot_count: snapshotCount,
    linked_count: linkedCount,
    pending_count: pendingCount,
    last_sync_at: getSetting('addon_last_sync_at'),
    last_revision: Number(getSetting('addon_last_revision', '0')) || 0,
    bridge_last_revision: Number(getSetting('addon_bridge_last_revision', '0')) || 0,
    bridge_last_sync_at: getSetting('addon_bridge_last_sync_at'),
    bridge_last_capture_at: Number(getSetting('addon_bridge_last_capture_at', '0')) || 0,
    bridge_estimated_bytes: Number(getSetting('addon_bridge_estimated_bytes', '0')) || 0,
    bridge_budget_bytes: Number(getSetting('addon_bridge_budget_bytes', '32768')) || 32768,
    bridge_budget_status: getSetting('addon_bridge_budget_status', ''),
    bridge_truncated: boolSetting('addon_bridge_truncated'),
    bridge_reduced_fields: parseJson(getSetting('addon_bridge_reduced_fields', '[]'), []),
    bridge_dropped_sections: parseJson(getSetting('addon_bridge_dropped_sections', '[]'), []),
    last_error: getSetting('addon_last_error'),
    candidates: candidateRoots(),
    repository_url: REPOSITORY_URL,
    watcher_active: !!watcher || !!pollTimer
  }
}

async function configure({ mode = 'existing', profileRoot = '', autoDetect = true } = {}, parentWindow = null) {
  let root = normalizeProfileSelection(profileRoot)
  if (!root && autoDetect) root = candidateRoots()[0] || ''
  if (!root) root = await chooseProfileRoot(parentWindow)
  if (!root) return null
  if (!isProfileRoot(root)) throw new Error('The selected folder is not an ESO profile folder.')
  const addonManifest = path.join(installedAddonPath(root), 'ArrowToTheBuild.txt')
  const bridgeManifest = path.join(installedAddonPath(root, BRIDGE_ADDON_FOLDER), 'ArrowToTheBuildBridge.txt')
  if (mode === 'existing' && !fs.existsSync(addonManifest) && !fs.existsSync(bridgeManifest) && !fs.existsSync(savedVariablesPath(root)) && !fs.existsSync(bridgeSavedVariablesPath(root))) {
    throw new Error('ATTB could not find its companion addon or SavedVariables files in that ESO profile. Choose Install Addon, or select the profile where it is already installed.')
  }
  if (mode === 'install') installAddon(root)
  const previousRoot = getSetting('addon_profile_root')
  setSetting('addon_profile_root', root)
  if (previousRoot !== root) { sessionPrompted.clear(); lastParsedRevision = null; lastObservedFileMarker = ''; lastParsedBridgeRevision = null; lastObservedBridgeFileMarker = '' }
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
  register, startWatching, stopWatching, syncNow, getStatus, candidateRoots, installAddon,
  linkedState, isLinked, overridesAllowed, setOverride, replaceOverridesByPrefix, clearOverride, setOverrideMode,
  applySnapshotToCharacter, liveCharacterState, normalizeSnapshot, decodeBridgeSnapshot, bridgeRootAsArchive,
  BUNDLED_ADDON_VERSION, BRIDGE_SCHEMA_VERSION, ESO_NORMAL_SAVE_LIMIT_BYTES
}
