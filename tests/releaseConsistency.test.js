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

test('desktop release version stays synchronized across package metadata and README', () => {
  const pkg = readJson('package.json')
  const lock = readJson('package-lock.json')
  const readme = read('README.md')
  const publicRelease = capturedVersion(readme, /Current public release:\s*\*\*v([^*]+)\*\*/, 'README public release')
  const development = capturedVersion(readme, /Current development version:\s*\*\*v([^*]+)\*\*/, 'README development release')

  assert.equal(lock.version, pkg.version, 'package-lock top-level version differs from package.json')
  assert.equal(lock.packages?.['']?.version, pkg.version, 'package-lock root package version differs from package.json')
  assert.equal(publicRelease, pkg.version, 'README public release differs from package.json')
  assert.equal(development, pkg.version, 'README development release differs from package.json')
})

test('published GitHub Pages release version stays synchronized with the desktop release', () => {
  const pkg = readJson('package.json')
  const site = read('docs/index.html')
  const version = capturedVersion(site, /<b>v([^<]+)<\/b>/, 'GitHub Pages title-bar version')

  assert.equal(version, pkg.version, 'site title-bar version differs from package.json')
  assert.ok(site.includes(`Download v${version}`), 'site download call-to-action differs from title-bar version')
  assert.ok(site.includes(`ATTB-Setup-${version}.exe`), 'site installer filename differs from version pill')
  assert.ok(site.includes(`styles.css?v=${version}-v3-site`), 'site stylesheet cache version differs from version pill')
  assert.ok(site.includes(`app.js?v=${version}-v3-site`), 'site script cache version differs from version pill')
  assert.match(site, /Current release/)
  assert.doesNotMatch(site, /Release candidate/i)
})

test('current public and maintenance guides identify ATTB 3.0.0 as their release baseline', () => {
  const pkg = readJson('package.json')
  for (const relativeDir of ['docs/reference', 'docs/maintenance']) {
    const dir = path.join(root, relativeDir)
    const guides = fs.readdirSync(dir).filter(name => name.endsWith('.md')).sort()
    assert.ok(guides.length > 0, `no Markdown guides found in ${relativeDir}`)
    for (const guide of guides) {
      const source = fs.readFileSync(path.join(dir, guide), 'utf8')
      assert.ok(source.includes(`3.0.0`), `${relativeDir}/${guide} does not identify the ATTB 3.0.0 baseline`)
    }
  }
  assert.equal(pkg.version, '3.0.0', 'this release gate is intentionally pinned to the v3.0.0 publication')
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
  assert.equal(addonVersion, '1.1.1')
  assert.equal(manifestField(addonManifest, 'AddOnVersion'), '10101')
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
