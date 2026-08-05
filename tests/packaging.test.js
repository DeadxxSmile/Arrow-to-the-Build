'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// Minimal glob -> RegExp for the subset electron-builder's `files` uses. Order matters here: "**/"
// has to become "zero or more directories" before the single-star rule touches anything.
function globToRe(glob) {
  const ANY_DIRS = '\u0000'
  const ANY = '\u0001'
  const body = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, ANY_DIRS)
    .replace(/\*\*/g, ANY)
    .replace(/\*/g, '[^/]*')
    .split(ANY_DIRS).join('(?:.*/)?')
    .split(ANY).join('.*')
  return new RegExp(`^${body}$`)
}
const patterns = pkg.build.files.map(globToRe)
const shipped = file => patterns.some(re => re.test(file))

test('the glob matcher itself behaves', () => {
  assert.equal(globToRe('src/main/**/*').test('src/main/database/migrations/001.sql'), true)
  assert.equal(globToRe('src/main/**/*').test('src/main/main.js'), true)
  assert.equal(globToRe('src/main/**/*').test('src/renderer/App.jsx'), false)
  assert.equal(globToRe('resources/**/*').test('resources/builds/assets/icon.webp'), true)
  assert.equal(globToRe('package.json').test('package.json'), true)
  assert.equal(globToRe('package.json').test('src/package.json'), false)
})

test('everything the main process reads at runtime is on disk and inside the installer', () => {
  const needed = [
    'package.json',
    'src/main/main.js', 'src/main/preload.js', 'src/main/catalog.js',
    'src/main/database/db.js',
    'src/main/ipc/buildHandlers.js', 'src/main/ipc/characterHandlers.js',
    'src/main/ipc/imageHandlers.js', 'src/main/ipc/settingsHandlers.js',
    'src/shared/variantLogic.cjs', 'src/shared/variantLogic.mjs',
    'resources/data/eso-skill-catalog.json',
    'resources/art/ATTB.ico'
  ]
  for (const file of needed) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing from the source tree`)
    assert.equal(shipped(file), true, `${file} would not be packaged`)
  }
})

test('every migration ships, or a packaged install cannot create its database', () => {
  const dir = 'src/main/database/migrations'
  const files = fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.sql'))
  assert.ok(files.length >= 4, 'migrations are present')
  for (const file of files) assert.equal(shipped(`${dir}/${file}`), true, `${file} would not be packaged`)
})

test('every bundled build and its image assets ship', () => {
  for (const file of fs.readdirSync(path.join(root, 'resources/builds')).filter(f => f.endsWith('.json'))) {
    assert.equal(shipped(`resources/builds/${file}`), true)
  }
  const assets = fs.readdirSync(path.join(root, 'resources/builds/assets'))
  assert.ok(assets.length > 0)
  for (const file of assets) assert.equal(shipped(`resources/builds/assets/${file}`), true, `${file} would not be packaged`)
})

test('every image referenced anywhere in a bundled build actually exists', () => {
  const collect = value => {
    if (Array.isArray(value)) return value.flatMap(collect)
    if (!value || typeof value !== 'object') return []
    return Object.entries(value).flatMap(([key, child]) => key === 'image' && typeof child === 'string' ? [child] : collect(child))
  }
  for (const file of fs.readdirSync(path.join(root, 'resources/builds')).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(root, 'resources/builds', file), 'utf8'))
    const refs = [build.images?.hero, ...collect(build)].filter(Boolean)
    for (const ref of new Set(refs)) {
      if (/^https?:/i.test(ref)) continue
      assert.equal(fs.existsSync(path.join(root, 'resources/builds', ref)), true, `${file} references missing image ${ref}`)
    }
  }
})

test('source, tests, and tooling stay out of the installer', () => {
  const devOnly = [
    'src/renderer/App.jsx', 'src/renderer/utils/buildLogic.js', 'src/index.jsx',
    'tests/persistence.test.js', 'tests/electron-stub.js',
    'tools/run-tests.cjs', 'tools/fetch-skill-icons.mjs', 'tools/generate_skill_catalog.py', 'tools/generate_mighty_seven_builds.py', 'tools/upgrade_schema3_builds.py', 'docs/reference/BUILD_FORMAT.md', 'docs/index.html',
    'vite.config.js', 'index.html', 'README.md'
  ]
  for (const file of devOnly) assert.equal(shipped(file), false, `${file} should not be in the installer`)
})

test('native modules are unpacked from the asar so better-sqlite3 can load', () => {
  assert.ok((pkg.build.asarUnpack || []).includes('**/*.node'), 'better-sqlite3 ships a .node binary that cannot be loaded from inside an asar')
})

test('packaging is Windows-only and names the installer by version', () => {
  assert.ok(pkg.build.win, 'a windows target is configured')
  assert.equal(pkg.build.mac, undefined)
  assert.equal(pkg.build.linux, undefined)
  assert.equal(pkg.build.win.target, 'nsis')
  assert.match(pkg.build.artifactName, /\$\{version\}/)
  assert.equal(pkg.build.nsis.oneClick, false)
  // Wiping the data directory on uninstall would take every character with it.
  assert.notEqual(pkg.build.nsis.deleteAppDataOnUninstall, true)
})

test('node_modules is left to electron-builder rather than globbed in by hand', () => {
  assert.equal(pkg.build.files.some(f => f.includes('node_modules')), false,
    'an explicit node_modules glob fights electron-builder own production-dependency pruning')
})

test('the runtime dependency list contains only things the app actually imports', () => {
  const sources = []
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.(js|jsx)$/.test(entry.name)) sources.push(fs.readFileSync(path.join(root, rel), 'utf8'))
    }
  }
  walk('src')
  const text = sources.join('\n')
  for (const dep of Object.keys(pkg.dependencies)) {
    const used = new RegExp(`(require\\(|from\\s*)['"]${dep.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/|['"])`).test(text)
    assert.equal(used, true, `${dep} is a runtime dependency but nothing in src/ imports it`)
  }
})

test('the app version and the catalog it ships are both stated', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/)
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'resources/data/eso-skill-catalog.json'), 'utf8'))
  assert.ok(catalog.catalog_version)
  assert.ok(catalog.game_version)
})


test('tests use Electron embedded Node so native module ABIs stay aligned', () => {
  assert.equal(pkg.scripts.test, 'node tools/run-tests.cjs')
  const runner = fs.readFileSync(path.join(root, 'tools/run-tests.cjs'), 'utf8')
  assert.match(runner, /ELECTRON_RUN_AS_NODE:\s*'1'/)
  assert.match(runner, /require\('electron'\)/)
  assert.match(runner, /\['--test',\s*\.\.\.testFiles\]/)
})

test('the Windows package uses the build configuration in package.json', () => {
  assert.equal(pkg.scripts.build, 'npm run build:renderer && electron-builder')
  assert.equal(pkg.build.win.target, 'nsis')
  assert.equal(pkg.build.win.sign, undefined)
  assert.equal(pkg.build.win.azureSignOptions, undefined)
  assert.equal(pkg.build.win.signtoolOptions, undefined)
  assert.equal(pkg.build.forceCodeSigning, undefined)
})


test('the public repository has one build script, one root guide, a license, and GitHub Pages files', () => {
  const buildBat = path.join(root, 'BUILD-ATTB.bat')
  assert.equal(fs.existsSync(buildBat), true, 'BUILD-ATTB.bat should live in the repository root')
  const script = fs.readFileSync(buildBat, 'utf8')
  assert.match(script, /npm ci --include=dev --no-audit --no-fund/i)
  assert.match(script, /npm run fetch:icons/i)
  assert.match(script, /npm test/i)
  assert.match(script, /npm run build/i)
  assert.doesNotMatch(script, /start\s+"".*ATTB-Setup|Launching installer/i,
    'the public build script must create the installer without launching it')

  for (const file of ['README.md', 'LICENSE', 'docs/index.html', 'docs/styles.css', 'docs/app.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should be present`)
  }
  for (const obsolete of ['SETUP.md', 'SECURITY.md', 'Clear-SQL.bat', 'BUILD-AND-INSTALL-ATTB.bat']) {
    assert.equal(fs.existsSync(path.join(root, obsolete)), false, `${obsolete} should not remain in the public root`)
  }

  const schemaPath = path.join(root, 'docs/reference/BUILD_SCHEMA.json')
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
  assert.equal(schema.properties.schema_version.const, 3)
  assert.equal(shipped('docs/reference/BUILD_SCHEMA.json'), false)
})
