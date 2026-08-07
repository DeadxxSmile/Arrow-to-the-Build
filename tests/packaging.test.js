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
    'src/main/main.js', 'src/main/preload.js', 'src/main/catalog.js', 'src/main/buildStorage.js',
    'src/main/addon/integration.js', 'src/main/addon/luaSavedVariables.js', 'src/main/addon/addonConstants.js',
    'src/main/addon/profileManager.js', 'src/main/addon/snapshotCodec.js', 'src/main/addon/snapshotMerge.js', 'src/main/addon/characterSyncStore.js',
    'src/main/database/db.js',
    'src/main/ipc/buildHandlers.js', 'src/main/ipc/buildValidation.js', 'src/main/ipc/buildCharacterImport.js',
    'src/main/ipc/buildGuidedCreation.js', 'src/main/ipc/characterHandlers.js',
    'src/main/ipc/imageHandlers.js', 'src/main/ipc/settingsHandlers.js',
    'src/shared/variantLogic.cjs', 'src/shared/variantLogic.mjs',
    'resources/data/eso-skill-catalog.json',
    'resources/data/build-editor-guidance.json',
    'resources/art/ATTB.ico',
    'docs/reference/BUILD_QUICK_START.md', 'docs/reference/BUILD_EDITOR_GUIDE.md',
    'docs/reference/BUILD_JSON_GUIDE.md', 'docs/reference/BUILD_FORMAT.md',
    'docs/reference/BUILD_VALIDATION_GUIDE.md', 'docs/reference/ESO_BUILD_SYSTEM_AUDIT.md',
    'docs/reference/SKILL_CATALOG.md', 'docs/reference/UPDATING_FOR_GAME_PATCHES.md',
    'docs/reference/BUILD_TEMPLATE.json'
  ]
  for (const file of needed) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing from the source tree`)
    assert.equal(shipped(file), true, `${file} would not be packaged`)
  }
})

test('the packaged app includes the tested ESO companion addon as a real external resource', () => {
  const addonRoot = path.join(root, 'resources/addon/ArrowToTheBuild')
  const manifest = fs.readFileSync(path.join(addonRoot, 'ArrowToTheBuild.txt'), 'utf8')
  assert.match(manifest, /^## Version: 1\.0\.0$/m)
  assert.match(manifest, /^## AddOnVersion: 10000$/m)
  assert.match(manifest, /^## SavedVariables: ArrowToTheBuildSavedVariables$/m)
  assert.match(manifest, /^## DisableSavedVariablesAutoSaving: 1$/m, 'the durable archive stays out of the normal-play autosave rotation')
  const bridgeRoot = path.join(root, 'resources/addon/ArrowToTheBuildBridge')
  const bridgeManifest = fs.readFileSync(path.join(bridgeRoot, 'ArrowToTheBuildBridge.txt'), 'utf8')
  assert.match(bridgeManifest, /^## Version: 1\.0\.0$/m)
  assert.match(bridgeManifest, /^## AddOnVersion: 10000$/m)
  assert.match(bridgeManifest, /^## DependsOn: ArrowToTheBuild$/m)
  assert.match(bridgeManifest, /^## SavedVariables: ArrowToTheBuildBridgeSavedVariables$/m)
  assert.equal(fs.existsSync(path.join(bridgeRoot, 'Bridge.lua')), true)
  const resource = (pkg.build.extraResources || []).find(item => item.from === 'resources/addon' && item.to === 'attb-addon')
  assert.ok(resource, 'the addon must be copied outside app.asar so it can be installed with normal filesystem operations')
  assert.ok((resource.filter || []).includes('**/*'))
  const profileManager = fs.readFileSync(path.join(root, 'src/main/addon/profileManager.js'), 'utf8')
  assert.match(profileManager, /process\.resourcesPath, 'attb-addon'/)
  for (const file of fs.readdirSync(addonRoot).filter(file => /\.(?:lua|txt)$/.test(file))) assert.equal(fs.existsSync(path.join(addonRoot, file)), true)
  for (const file of fs.readdirSync(path.join(addonRoot, 'Collectors')).filter(file => file.endsWith('.lua'))) assert.equal(fs.existsSync(path.join(addonRoot, 'Collectors', file)), true)
})

test('source-only branding masters and addon sources are not duplicated inside app.asar', () => {
  for (const file of ['resources/art/ATTB-Simple.png', 'resources/art/ATTB-Words.png']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should remain available to source/branding work`)
    assert.equal(shipped(file), false, `${file} is not read by the installed runtime`)
  }
  for (const file of [
    'resources/addon/ArrowToTheBuild/ArrowToTheBuild.txt',
    'resources/addon/ArrowToTheBuildBridge/ArrowToTheBuildBridge.txt'
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true)
    assert.equal(shipped(file), false, `${file} should ship only through extraResources, not a second copy in app.asar`)
  }
})

test('every migration ships, or a packaged install cannot create its database', () => {
  const dir = 'src/main/database/migrations'
  const files = fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.sql'))
  assert.ok(files.length >= 5, 'migrations are present')
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

test('every bundled build asset is referenced by at least one build', () => {
  const collect = value => {
    if (Array.isArray(value)) return value.flatMap(collect)
    if (!value || typeof value !== 'object') return []
    return Object.entries(value).flatMap(([key, child]) => key === 'image' && typeof child === 'string' ? [child] : collect(child))
  }
  const referenced = new Set()
  for (const file of fs.readdirSync(path.join(root, 'resources/builds')).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(root, 'resources/builds', file), 'utf8'))
    for (const ref of [build.images?.hero, ...collect(build)].filter(Boolean)) {
      if (!/^https?:/i.test(ref)) referenced.add(path.basename(ref))
    }
  }
  for (const file of fs.readdirSync(path.join(root, 'resources/builds/assets'))) {
    assert.equal(referenced.has(file), true, `${file} is packaged but no bundled build references it`)
  }
})

test('obsolete pre-release build conversion tools are not shipped in the repository', () => {
  for (const file of ['tools/generate_mighty_seven_builds.py', 'tools/upgrade_schema3_builds.py']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} should remain removed`)
  }
})


test('historical Build Editor milestone files and completed scaffolding are removed', () => {
  const obsoleteDocs = [
    'docs/reference/BUILD_CREATOR_PLAN.md',
    'docs/reference/FUTURE_CAPTURE_PLAN.md',
    ...Array.from({ length: 5 }, (_, index) => `docs/reference/BUILD_EDITOR_MILESTONE_${index + 1}_TESTING.md`)
  ]
  for (const file of obsoleteDocs) assert.equal(fs.existsSync(path.join(root, file)), false, `${file} should remain removed`)

  for (const file of ['docs/reference/TESTING.md', 'docs/reference/BUILD_EDITOR_ARCHITECTURE.md']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should replace the historical milestone material`)
    assert.equal(shipped(file), false, `${file} is developer documentation and should remain source-only`)
  }

  const overview = fs.readFileSync(path.join(root, 'src/renderer/pages/BuildOverviewPage.jsx'), 'utf8')
  assert.doesNotMatch(overview, /Core editor checkpoint|editor-section-preview/)
})

test('developer and public-reference documents remain source-only', () => {
  for (const file of [
    'docs/reference/BUILD_EDITOR_ARCHITECTURE.md',
    'docs/reference/BUNDLED_BUILD_SOURCES.md',
    'docs/reference/ESO_ADDON_INTEGRATION.md',
    'docs/reference/TESTING.md',
    'docs/reference/BUILD_SCHEMA.json',
    'docs/reference/RELEASE_CHECKLIST.md',
    'docs/reference/DEPENDENCY_AUDIT.md'
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should remain in the source repository`)
    assert.equal(shipped(file), false, `${file} is not read by the installed runtime`)
  }
})

test('retired branding duplicates stay out of the source tree', () => {
  for (const file of ['public/icon.png', 'resources/art/ATTB.png']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} is an obsolete duplicate and should remain removed`)
  }
})

test('source, tests, and tooling stay out of the installer', () => {
  const devOnly = [
    'src/renderer/App.jsx', 'src/renderer/utils/buildLogic.mjs', 'src/index.jsx',
    'tests/persistence.test.js', 'tests/electron-stub.js',
    'tools/run-tests.cjs', 'tools/fetch-skill-icons.mjs', 'tools/generate_skill_catalog.py', 'docs/index.html',
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

test('native dependency rebuilding is owned by electron-builder without a duplicate direct tool dependency', () => {
  assert.equal(pkg.devDependencies['@electron/rebuild'], undefined)
  assert.equal(pkg.scripts.rebuild, undefined)
  assert.equal(pkg.scripts.postinstall, 'electron-builder install-app-deps')
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
      else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name)) sources.push(fs.readFileSync(path.join(root, rel), 'utf8'))
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
  assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
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

  for (const file of [
    'README.md', 'LICENSE', 'docs/index.html', 'docs/styles.css', 'docs/app.js',
    'docs/reference/BUILD_QUICK_START.md', 'docs/reference/BUILD_EDITOR_GUIDE.md',
    'docs/reference/BUILD_JSON_GUIDE.md', 'docs/reference/BUILD_VALIDATION_GUIDE.md',
    'docs/reference/BUILD_TEMPLATE.json', 'docs/reference/RELEASE_CHECKLIST.md', 'docs/reference/DEPENDENCY_AUDIT.md',
    'RELEASE_NOTES_2.0.0.md'
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should be present`)
  }

  const website = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8')
  for (const screenshot of [
    'create-build-from-character.webp', 'new-eso-character.webp', 'synced-basic-setup.webp',
    'skills-passives.webp', 'current-action-bars.webp', 'champion-points.webp',
    'build-library.webp', 'review-save.webp', 'current-vs-target.webp',
    'current-equipment.webp', 'addon-manager.webp', 'addon-status.webp'
  ]) {
    assert.equal(fs.existsSync(path.join(root, 'docs/assets/screenshots', screenshot)), true, `${screenshot} should be present`)
    assert.match(website, new RegExp(screenshot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  const template = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/BUILD_TEMPLATE.json'), 'utf8'))
  assert.equal(template.schema_version, 4)
  assert.ok(template.id && template.name && template.defaults?.class)
  assert.ok(template.format_notes.some(note => /required to be non-empty/.test(note)), 'the exported template must explain its required populated arrays')
  assert.match(website, /Structure preview only/)
  assert.doesNotMatch(website, /Minimal valid ATTB build JSON/, 'the compact website snippet is not the complete importable template')
  for (const obsolete of ['SETUP.md', 'SECURITY.md', 'Clear-SQL.bat', 'BUILD-AND-INSTALL-ATTB.bat']) {
    assert.equal(fs.existsSync(path.join(root, obsolete)), false, `${obsolete} should not remain in the public root`)
  }

  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  const site = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8')
  for (const link of ['https://buymeacoffee.com/deadx_xsmile', 'https://linktr.ee/deadx_xsmile']) {
    assert.match(readme, new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.match(site, new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(site, /rel="canonical" href="https:\/\/deadxxsmile\.github\.io\/Arrow-to-the-Build\/"/)
  assert.match(site, /property="og:url" content="https:\/\/deadxxsmile\.github\.io\/Arrow-to-the-Build\/"/)
  assert.match(site, /github\.com\/DeadxxSmile\/Arrow-to-the-Build\/blob\/main\/docs\/reference\/BUILD_QUICK_START\.md/)
  assert.match(site, /github\.com\/DeadxxSmile\/Arrow-to-the-Build\/blob\/main\/docs\/reference\/BUILD_EDITOR_GUIDE\.md/)
  assert.match(site, /github\.com\/DeadxxSmile\/Arrow-to-the-Build\/blob\/main\/docs\/reference\/BUILD_JSON_GUIDE\.md/)
  assert.match(site, /github\.com\/DeadxxSmile\/Arrow-to-the-Build-ESO-Addon/)
  assert.match(site, /id="addon"/)
  assert.match(site, /\/reloadui/)
  assert.doesNotMatch(site, /href="reference\/BUILD_(?:QUICK_START|JSON_GUIDE)\.md"/, 'GitHub Pages should open rendered Markdown documentation rather than raw files')

  const schemaPath = path.join(root, 'docs/reference/BUILD_SCHEMA.json')
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
  assert.equal(schema.properties.schema_version.const, 4)
  assert.equal(shipped('docs/reference/BUILD_SCHEMA.json'), false, 'the public schema remains in source/docs but is not needed by the installed runtime')
})

test('sync bridge coalesces throttled gameplay changes and strengthens action-bar capture', () => {
  const bridge = fs.readFileSync(path.join(root, 'resources/addon/ArrowToTheBuildBridge/Bridge.lua'), 'utf8')
  const core = fs.readFileSync(path.join(root, 'resources/addon/ArrowToTheBuild/Core.lua'), 'utf8')
  assert.match(bridge, /minimumPrioritySaveIntervalSeconds = 900/)
  assert.match(bridge, /scheduleDeferredPriorityRetry/)
  assert.match(bridge, /priorityDirty/)
  assert.match(bridge, /RegisterForUpdate\(Bridge\.deferredPriorityUpdateName/)
  assert.match(bridge, /snapshot\.captureReason == "player-activated"/)
  assert.match(bridge, /lastPrioritySaveStatus = "normal-cycle"/)
  assert.match(bridge, /snapshot\.captureReason == "player-deactivated"/)
  assert.match(core, /EVENT_ACTION_SLOTS_ALL_HOTBARS_UPDATED/)
  assert.match(core, /EVENT_HOTBAR_SLOT_UPDATED/)
  assert.match(core, /Bridge priority deferred/)
})
