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

test('release package, README, and lockfile stay synchronized at v3.1.1', () => {
  const pkg = readJson('package.json')
  const lock = readJson('package-lock.json')
  const readme = read('README.md')
  const publicRelease = capturedVersion(readme, /Current public release:\s*\*\*v([^*]+)\*\*/, 'README public release')
  const development = capturedVersion(readme, /Current development version:\s*\*\*v([^*]+)\*\*/, 'README development release')

  assert.equal(lock.version, pkg.version, 'package-lock top-level version differs from package.json')
  assert.equal(lock.packages?.['']?.version, pkg.version, 'package-lock root package version differs from package.json')
  assert.equal(development, pkg.version, 'README development release differs from package.json')
  assert.equal(publicRelease, pkg.version, 'README public release differs from package.json')
  assert.equal(pkg.version, '3.1.1', 'release source should identify itself as v3.1.1')
})

test('published GitHub Pages keeps a release fallback and auto-resolves the latest stable GitHub release', () => {
  const readme = read('README.md')
  const site = read('docs/index.html')
  const siteScript = read('docs/app.js')
  const publicRelease = capturedVersion(readme, /Current public release:\s*\*\*v([^*]+)\*\*/, 'README public release')
  const fallback = capturedVersion(site, /<b data-release-version>v([^<]+)<\/b>/, 'GitHub Pages fallback version')

  assert.equal(fallback, publicRelease, 'site fallback should match the release packaged with the repository')
  assert.match(site, /data-release-version/)
  assert.match(site, /data-installer-name/)
  assert.match(site, /data-release-link/)
  assert.match(siteScript, /api\.github\.com\/repos\/DeadxxSmile\/Arrow-to-the-Build\/releases\/latest/)
  assert.match(siteScript, /RELEASE_CACHE_TTL_MS\s*=\s*30\s*\*\s*60\s*\*\s*1000/)
  assert.match(siteScript, /softwareVersion\s*=\s*release\.version/)
  assert.doesNotMatch(site, /styles\.css\?v=3\.1\.1/)
  assert.doesNotMatch(site, /app\.js\?v=3\.1\.1/)
  assert.match(site, /Current release/)
  assert.doesNotMatch(site, /Release candidate/i)
})

test('current public and maintenance guides identify the ATTB 3.1.1 release baseline', () => {
  for (const relativeDir of ['docs/reference', 'docs/maintenance']) {
    const dir = path.join(root, relativeDir)
    const guides = fs.readdirSync(dir).filter(name => name.endsWith('.md')).sort()
    assert.ok(guides.length > 0, `no Markdown guides found in ${relativeDir}`)
    for (const guide of guides) {
      const source = fs.readFileSync(path.join(dir, guide), 'utf8')
      assert.ok(source.includes('3.1.1'), `${relativeDir}/${guide} does not identify the current v3.1.1 release baseline`)
    }
  }
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
  assert.equal(addonVersion, '1.1.3')
  assert.equal(manifestField(addonManifest, 'AddOnVersion'), '10103')
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
