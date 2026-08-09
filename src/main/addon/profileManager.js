'use strict'

const fs = require('fs')
const path = require('path')
const { app, dialog } = require('electron')
const {
  PROFILE_NAMES, BUNDLED_ADDON_VERSION, ADDON_FOLDER, RETIRED_BRIDGE_FOLDER, SAVED_VARIABLES_FILE, RETIRED_BRIDGE_SAVED_VARIABLES_FILE
} = require('./addonConstants')

function bundledAddonRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'attb-addon')
    : path.join(app.getAppPath(), 'resources', 'addon')
}
function bundledAddonPath() { return path.join(bundledAddonRoot(), ADDON_FOLDER) }
function addonsPath(profileRoot) { return path.join(profileRoot, 'AddOns') }
function installedAddonPath(profileRoot) { return path.join(addonsPath(profileRoot), ADDON_FOLDER) }
function retiredBridgeAddonPath(profileRoot) { return path.join(addonsPath(profileRoot), RETIRED_BRIDGE_FOLDER) }
function savedVariablesPath(profileRoot) { return path.join(profileRoot, 'SavedVariables', SAVED_VARIABLES_FILE) }
function retiredBridgeSavedVariablesPath(profileRoot) { return path.join(profileRoot, 'SavedVariables', RETIRED_BRIDGE_SAVED_VARIABLES_FILE) }

function normalizeProfileSelection(selected) {
  if (!selected) return ''
  let target = path.resolve(selected)
  let base = path.basename(target).toLowerCase()
  if (base === ADDON_FOLDER.toLowerCase() || base === RETIRED_BRIDGE_FOLDER.toLowerCase()) target = path.dirname(path.dirname(target))
  else if (base === 'addons' || base === 'savedvariables') target = path.dirname(target)
  base = path.basename(target).toLowerCase()
  if (!PROFILE_NAMES.includes(base) && fs.existsSync(target)) {
    const children = PROFILE_NAMES.map(name => path.join(target, name)).filter(candidate => fs.existsSync(candidate))
    if (children.length === 1) target = children[0]
    else {
      const live = children.find(candidate => path.basename(candidate).toLowerCase() === 'live')
      if (live) target = live
    }
  }
  return target
}

function isProfileRoot(target, requireExisting = true) {
  if (!target) return false
  if (requireExisting && !fs.existsSync(target)) return false
  const base = path.basename(target).toLowerCase()
  return PROFILE_NAMES.includes(base) || fs.existsSync(path.join(target, 'AddOns')) || fs.existsSync(path.join(target, 'SavedVariables'))
}

function candidateRoots() {
  const roots = []
  const add = root => {
    const normalized = normalizeProfileSelection(root)
    if (normalized && isProfileRoot(normalized) && !roots.some(item => item.toLowerCase() === normalized.toLowerCase())) roots.push(normalized)
  }
  const documents = app.getPath('documents')
  for (const profile of PROFILE_NAMES) add(path.join(documents, 'Elder Scrolls Online', profile))
  const home = app.getPath('home')
  for (const profile of PROFILE_NAMES) add(path.join(home, 'Documents', 'Elder Scrolls Online', profile))
  for (const envName of ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial']) {
    const base = process.env[envName]
    if (!base) continue
    for (const profile of PROFILE_NAMES) add(path.join(base, 'Documents', 'Elder Scrolls Online', profile))
  }
  const score = root => fs.existsSync(path.join(root, 'AddOns', ADDON_FOLDER, 'ArrowToTheBuild.txt')) ? 0
    : fs.existsSync(savedVariablesPath(root)) ? 1
      : fs.existsSync(path.join(root, 'AddOns')) ? 2 : 3
  return roots.sort((a, b) => score(a) - score(b) || PROFILE_NAMES.indexOf(path.basename(a).toLowerCase()) - PROFILE_NAMES.indexOf(path.basename(b).toLowerCase()))
}

async function chooseProfileRoot(parentWindow = null) {
  const result = await dialog.showOpenDialog(parentWindow || undefined, {
    title: 'Choose your ESO profile folder',
    defaultPath: path.join(app.getPath('documents'), 'Elder Scrolls Online'),
    buttonLabel: 'Use This Folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || !result.filePaths[0]) return null
  const root = normalizeProfileSelection(result.filePaths[0])
  if (!isProfileRoot(root)) throw new Error('Choose the ESO live, liveeu, or pts folder, or its AddOns folder.')
  return root
}

function versionParts(value) { return String(value || '').match(/\d+/g)?.map(Number) || [] }
function compareVersions(a, b) {
  const left = versionParts(a)
  const right = versionParts(b)
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] || 0) - (right[index] || 0)
    if (difference) return difference > 0 ? 1 : -1
  }
  return String(a || '').localeCompare(String(b || ''))
}

function manifestVersion(file) {
  if (!fs.existsSync(file)) return ''
  return fs.readFileSync(file, 'utf8').match(/^##\s*Version:\s*(.+)$/mi)?.[1]?.trim() || ''
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) throw new Error('The bundled ATTB addon files are missing from this application package.')
  fs.mkdirSync(destination, { recursive: true })
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)
    if (entry.isDirectory()) copyDirectory(from, to)
    else if (entry.isFile()) fs.copyFileSync(from, to)
  }
}

function isLegacyBridge(profileRoot) {
  const manifest = path.join(retiredBridgeAddonPath(profileRoot), 'ArrowToTheBuildBridge.txt')
  if (!fs.existsSync(manifest)) return false
  const text = fs.readFileSync(manifest, 'utf8')
  return /^##\s*Title:\s*Arrow to the Build - Sync Bridge\s*$/mi.test(text)
    && /^##\s*SavedVariables:\s*ArrowToTheBuildBridgeSavedVariables\s*$/mi.test(text)
}


function isManagedAddon(profileRoot) {
  const manifest = path.join(installedAddonPath(profileRoot), 'ArrowToTheBuild.txt')
  if (!fs.existsSync(manifest)) return false
  const text = fs.readFileSync(manifest, 'utf8')
  return /^##\s*Title:\s*Arrow to the Build\s*$/mi.test(text)
    && /^##\s*SavedVariables:\s*ArrowToTheBuildSavedVariables\s*$/mi.test(text)
}

function isLegacyBridgeSavedVariables(profileRoot) {
  const file = retiredBridgeSavedVariablesPath(profileRoot)
  if (!fs.existsSync(file)) return false
  try {
    return /\bArrowToTheBuildBridgeSavedVariables\s*=/.test(fs.readFileSync(file, 'utf8'))
  } catch {
    return false
  }
}

function hasLegacyBridgeArtifacts(profileRoot) {
  return isLegacyBridge(profileRoot) || isLegacyBridgeSavedVariables(profileRoot)
}

function retireLegacyBridge(profileRoot) {
  if (!isLegacyBridge(profileRoot)) return false
  fs.rmSync(retiredBridgeAddonPath(profileRoot), { recursive: true, force: true })
  return true
}


function resetLegacyBridgeInstall(profileRoot) {
  const root = normalizeProfileSelection(profileRoot)
  if (!isProfileRoot(root)) return { found: false, reinstalled: false }

  const bridgeFolderOwned = isLegacyBridge(root)
  const bridgeSaveOwned = isLegacyBridgeSavedVariables(root)
  if (!bridgeFolderOwned && !bridgeSaveOwned) return { found: false, reinstalled: false }

  const mainFolder = installedAddonPath(root)
  if (fs.existsSync(mainFolder) && !isManagedAddon(root)) {
    throw new Error(`ATTB found legacy bridge data in ${root}, but the ${ADDON_FOLDER} folder is not recognized as an ATTB addon. It was left untouched.`)
  }

  if (bridgeFolderOwned) fs.rmSync(retiredBridgeAddonPath(root), { recursive: true, force: true })
  fs.rmSync(retiredBridgeSavedVariablesPath(root), { force: true })
  fs.rmSync(savedVariablesPath(root), { force: true })
  if (fs.existsSync(mainFolder)) fs.rmSync(mainFolder, { recursive: true, force: true })

  const installed = installAddon(root, { force: true })
  return {
    found: true,
    reinstalled: true,
    profile_root: root,
    bridge_folder_removed: bridgeFolderOwned,
    bridge_saved_variables_removed: bridgeSaveOwned,
    main_saved_variables_removed: true,
    installed_version: installed.version
  }
}

function installAddon(profileRoot, { force = false } = {}) {
  const root = normalizeProfileSelection(profileRoot)
  if (!isProfileRoot(root)) throw new Error('The configured ESO profile folder is not valid.')
  fs.mkdirSync(addonsPath(root), { recursive: true })

  const destination = installedAddonPath(root)
  const destinationManifest = path.join(destination, 'ArrowToTheBuild.txt')
  const installedVersion = manifestVersion(destinationManifest)
  let skipped = false

  if (!force && installedVersion && compareVersions(installedVersion, BUNDLED_ADDON_VERSION) > 0) {
    skipped = true
  } else {
    const temp = `${destination}.attb-installing`
    const backup = `${destination}.attb-backup`
    fs.rmSync(temp, { recursive: true, force: true })
    fs.rmSync(backup, { recursive: true, force: true })
    copyDirectory(bundledAddonPath(), temp)
    if (!fs.existsSync(path.join(temp, 'ArrowToTheBuild.txt'))) {
      fs.rmSync(temp, { recursive: true, force: true })
      throw new Error('The bundled ArrowToTheBuild manifest could not be copied.')
    }

    let backedUp = false
    try {
      if (fs.existsSync(destination)) {
        fs.renameSync(destination, backup)
        backedUp = true
      }
      fs.renameSync(temp, destination)
      fs.rmSync(backup, { recursive: true, force: true })
    } catch (error) {
      fs.rmSync(temp, { recursive: true, force: true })
      if (!fs.existsSync(destination) && backedUp && fs.existsSync(backup)) {
        try { fs.renameSync(backup, destination) } catch { }
      }
      throw new Error(`ATTB could not install ${ADDON_FOLDER} safely: ${error.message || error}`)
    }
  }

  const retiredBridgeRemoved = retireLegacyBridge(root)
  return {
    path: destination,
    version: manifestVersion(destinationManifest) || installedVersion || BUNDLED_ADDON_VERSION,
    skipped,
    reason: skipped ? 'newer-installed' : '',
    retired_bridge_removed: retiredBridgeRemoved
  }
}

module.exports = {
  normalizeProfileSelection, isProfileRoot, candidateRoots, chooseProfileRoot,
  compareVersions, manifestVersion, installAddon, isLegacyBridge, isLegacyBridgeSavedVariables, hasLegacyBridgeArtifacts, isManagedAddon, retireLegacyBridge, resetLegacyBridgeInstall,
  addonsPath, installedAddonPath, retiredBridgeAddonPath, savedVariablesPath, retiredBridgeSavedVariablesPath
}
