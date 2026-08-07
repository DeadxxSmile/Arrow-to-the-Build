'use strict'

const fs = require('fs')
const path = require('path')
const { app, dialog } = require('electron')
const {
  PROFILE_NAMES, BUNDLED_ADDON_VERSION, ADDON_FOLDER, BRIDGE_ADDON_FOLDER,
  SAVED_VARIABLES_FILE, BRIDGE_SAVED_VARIABLES_FILE
} = require('./addonConstants')

function bundledAddonRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'attb-addon')
    : path.join(app.getAppPath(), 'resources', 'addon')
}
function bundledAddonPath(folder = ADDON_FOLDER) { return path.join(bundledAddonRoot(), folder) }
function addonsPath(profileRoot) { return path.join(profileRoot, 'AddOns') }
function installedAddonPath(profileRoot, folder = ADDON_FOLDER) { return path.join(addonsPath(profileRoot), folder) }
function savedVariablesPath(profileRoot) { return path.join(profileRoot, 'SavedVariables', SAVED_VARIABLES_FILE) }
function bridgeSavedVariablesPath(profileRoot) { return path.join(profileRoot, 'SavedVariables', BRIDGE_SAVED_VARIABLES_FILE) }

function normalizeProfileSelection(selected) {
  if (!selected) return ''
  let target = path.resolve(selected)
  let base = path.basename(target).toLowerCase()
  if (base === ADDON_FOLDER.toLowerCase() || base === BRIDGE_ADDON_FOLDER.toLowerCase()) target = path.dirname(path.dirname(target))
  else if (base === 'addons' || base === 'savedvariables') target = path.dirname(target)
  base = path.basename(target).toLowerCase()
  if (!PROFILE_NAMES.includes(base) && fs.existsSync(target)) {
    const children = PROFILE_NAMES.map(name => path.join(target, name)).filter(candidate => fs.existsSync(candidate))
    if (children.length === 1) target = children[0]
    else if (children.some(candidate => path.basename(candidate).toLowerCase() === 'live')) target = children.find(candidate => path.basename(candidate).toLowerCase() === 'live')
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
  const score = root => fs.existsSync(path.join(root, 'AddOns', ADDON_FOLDER, 'ArrowToTheBuild.txt')) && fs.existsSync(path.join(root, 'AddOns', BRIDGE_ADDON_FOLDER, 'ArrowToTheBuildBridge.txt')) ? 0
    : fs.existsSync(savedVariablesPath(root)) || fs.existsSync(bridgeSavedVariablesPath(root)) ? 1
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

function versionParts(value) {
  return String(value || '').match(/\d+/g)?.map(Number) || []
}

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
  const text = fs.readFileSync(file, 'utf8')
  return text.match(/^##\s*Version:\s*(.+)$/mi)?.[1]?.trim() || ''
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

function installAddonComponent(profileRoot, { folder, manifest, force = false } = {}) {
  const root = normalizeProfileSelection(profileRoot)
  const destination = installedAddonPath(root, folder)
  const destinationManifest = path.join(destination, manifest)
  const installedVersion = manifestVersion(destinationManifest)
  if (!force && installedVersion && compareVersions(installedVersion, BUNDLED_ADDON_VERSION) > 0) {
    return { folder, path: destination, version: installedVersion, skipped: true, reason: 'newer-installed' }
  }

  const temp = `${destination}.attb-installing`
  const backup = `${destination}.attb-backup`
  fs.rmSync(temp, { recursive: true, force: true })
  fs.rmSync(backup, { recursive: true, force: true })
  copyDirectory(bundledAddonPath(folder), temp)
  if (!fs.existsSync(path.join(temp, manifest))) {
    fs.rmSync(temp, { recursive: true, force: true })
    throw new Error(`The bundled ${folder} manifest could not be copied.`)
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
    throw new Error(`ATTB could not install ${folder} safely: ${error.message || error}`)
  }
  return { folder, path: destination, version: manifestVersion(destinationManifest) || BUNDLED_ADDON_VERSION, skipped: false }
}

function installAddon(profileRoot, { force = false } = {}) {
  const root = normalizeProfileSelection(profileRoot)
  if (!isProfileRoot(root)) throw new Error('The configured ESO profile folder is not valid.')
  fs.mkdirSync(addonsPath(root), { recursive: true })
  const main = installAddonComponent(root, { folder: ADDON_FOLDER, manifest: 'ArrowToTheBuild.txt', force })
  const bridge = installAddonComponent(root, { folder: BRIDGE_ADDON_FOLDER, manifest: 'ArrowToTheBuildBridge.txt', force })
  return {
    path: main.path,
    version: main.version,
    skipped: main.skipped && bridge.skipped,
    main,
    bridge,
    bridge_path: bridge.path,
    bridge_version: bridge.version
  }
}

module.exports = {
  normalizeProfileSelection, isProfileRoot, candidateRoots, chooseProfileRoot,
  compareVersions, manifestVersion, installAddon,
  addonsPath, installedAddonPath, savedVariablesPath, bridgeSavedVariablesPath
}
