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

test('bundled addon version metadata stays synchronized', () => {
  const addonManifest = read('resources/addon/ArrowToTheBuild/ArrowToTheBuild.txt')
  const namespaceLua = read('resources/addon/ArrowToTheBuild/Namespace.lua')
  const constants = read('src/main/addon/addonConstants.js')

  const addonVersion = manifestField(addonManifest, 'Version')
  assert.equal(addonVersion, '1.1.0')
  assert.equal(manifestField(addonManifest, 'AddOnVersion'), '10100')
  assert.equal(manifestField(addonManifest, 'APIVersion'), '101050')
  assert.equal(capturedVersion(namespaceLua, /ATTB\.version\s*=\s*"([^"]+)"/, 'Namespace.lua'), addonVersion)
  assert.equal(capturedVersion(constants, /BUNDLED_ADDON_VERSION\s*=\s*'([^']+)'/, 'addonConstants.js'), addonVersion)
  assert.equal(fs.existsSync(path.join(root, 'resources/addon/ArrowToTheBuildBridge')), false, 'retired bridge source must not ship')
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
