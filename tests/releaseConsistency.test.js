'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const readJson = relative => JSON.parse(read(relative))

function manifestField(text, field) {
  const match = text.match(new RegExp(`^## ${field}:\\s*(.+)$`, 'm'))
  assert.ok(match, `manifest is missing ${field}`)
  return match[1].trim()
}

function capturedVersion(text, pattern, label) {
  const match = text.match(pattern)
  assert.ok(match, `${label} version constant was not found`)
  return match[1]
}

test('desktop release version stays synchronized across package metadata and published status text', () => {
  const pkg = readJson('package.json')
  const lock = readJson('package-lock.json')
  const readme = read('README.md')
  const site = read('docs/index.html')

  assert.equal(lock.version, pkg.version, 'package-lock top-level version differs from package.json')
  assert.equal(lock.packages?.['']?.version, pkg.version, 'package-lock root package version differs from package.json')
  assert.match(readme, new RegExp(`\\*\\*v${pkg.version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\*\\*`), 'README current build version is stale')
  assert.match(site, new RegExp(`<span class="meta-pill version">v${pkg.version.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}</span>`), 'GitHub Pages version pill is stale')
})


test('React Router release dependency is patched and lockfile-synchronized', () => {
  const pkg = readJson('package.json')
  const lock = readJson('package-lock.json')
  const declared = pkg.dependencies?.['react-router-dom']
  const lockedRoot = lock.packages?.['']?.dependencies?.['react-router-dom']
  const lockedPackage = lock.packages?.['node_modules/react-router-dom']?.version
  const lockedCore = lock.packages?.['node_modules/react-router']?.version

  assert.equal(declared, '7.18.2', 'release manifest must pin the reviewed React Router version')
  assert.equal(lockedRoot, declared, 'package-lock root React Router dependency differs from package.json')
  assert.equal(lockedPackage, declared, 'package-lock react-router-dom package differs from package.json')
  assert.equal(lockedCore, declared, 'react-router core and react-router-dom versions must stay aligned')
})

test('bundled addon and bridge version metadata stays synchronized', () => {
  const addonManifest = read('resources/addon/ArrowToTheBuild/ArrowToTheBuild.txt')
  const bridgeManifest = read('resources/addon/ArrowToTheBuildBridge/ArrowToTheBuildBridge.txt')
  const namespaceLua = read('resources/addon/ArrowToTheBuild/Namespace.lua')
  const bridgeLua = read('resources/addon/ArrowToTheBuildBridge/Bridge.lua')
  const constants = read('src/main/addon/addonConstants.js')

  const addonVersion = manifestField(addonManifest, 'Version')
  const bridgeVersion = manifestField(bridgeManifest, 'Version')
  assert.equal(bridgeVersion, addonVersion, 'bridge Version differs from durable addon Version')
  assert.equal(manifestField(bridgeManifest, 'AddOnVersion'), manifestField(addonManifest, 'AddOnVersion'), 'AddOnVersion differs between addon manifests')
  assert.equal(manifestField(bridgeManifest, 'APIVersion'), manifestField(addonManifest, 'APIVersion'), 'APIVersion differs between addon manifests')

  assert.equal(capturedVersion(namespaceLua, /ATTB\.version\s*=\s*"([^"]+)"/, 'Namespace.lua'), addonVersion)
  assert.equal(capturedVersion(bridgeLua, /Bridge\.version\s*=\s*"([^"]+)"/, 'Bridge.lua'), addonVersion)
  assert.equal(capturedVersion(constants, /BUNDLED_ADDON_VERSION\s*=\s*'([^']+)'/, 'addonConstants.js'), addonVersion)
})

test('the Mighty Seven contains exactly one Schema 4 bundled build for every ESO class', () => {
  const expectedClasses = new Set([
    'Arcanist', 'Dragonknight', 'Necromancer', 'Nightblade', 'Sorcerer', 'Templar', 'Warden'
  ])
  const buildsDir = path.join(root, 'resources/builds')
  const files = fs.readdirSync(buildsDir).filter(file => file.endsWith('.json')).sort()

  assert.equal(files.length, expectedClasses.size, `expected ${expectedClasses.size} bundled builds, found ${files.length}`)
  const seen = new Set()
  for (const file of files) {
    const build = JSON.parse(fs.readFileSync(path.join(buildsDir, file), 'utf8'))
    assert.equal(build.schema_version, 4, `${file}: bundled build is not Schema 4`)
    const className = build.defaults?.class
    assert.ok(expectedClasses.has(className), `${file}: unknown or missing class "${className}"`)
    assert.equal(seen.has(className), false, `${file}: duplicate bundled build for ${className}`)
    seen.add(className)
  }
  assert.deepEqual([...seen].sort(), [...expectedClasses].sort())
})

test('public Schema 4 reference, blank template, and runtime validator advertise the same contract', () => {
  const schema = readJson('docs/reference/BUILD_SCHEMA.json')
  const template = readJson('docs/reference/BUILD_TEMPLATE.json')
  const validator = read('src/main/ipc/buildValidation.js')
  const runtimeVersion = Number(capturedVersion(validator, /CURRENT_SCHEMA_VERSION\s*=\s*(\d+)/, 'buildValidation.js'))

  assert.equal(schema.properties?.schema_version?.const, runtimeVersion, 'BUILD_SCHEMA schema_version differs from runtime validation')
  assert.equal(template.schema_version, runtimeVersion, 'BUILD_TEMPLATE schema_version differs from runtime validation')
  assert.deepEqual(Object.keys(template).sort(), Object.keys(schema.properties || {}).sort(), 'BUILD_TEMPLATE top-level sections differ from BUILD_SCHEMA')
  for (const required of schema.required || []) {
    assert.ok(Object.hasOwn(template, required), `BUILD_TEMPLATE is missing required Schema 4 section "${required}"`)
  }
})
