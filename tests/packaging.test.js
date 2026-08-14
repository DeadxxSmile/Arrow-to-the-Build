'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const pkg = JSON.parse(read('package.json'))

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

function buildFiles() {
  return fs.readdirSync(path.join(root, 'resources/builds')).filter(file => file.endsWith('.json')).sort()
}

function collectImageRefs(value) {
  if (Array.isArray(value)) return value.flatMap(collectImageRefs)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => key === 'image' && typeof child === 'string' ? [child] : collectImageRefs(child))
}

test('the package glob helper matches the electron-builder patterns we rely on', () => {
  assert.equal(globToRe('src/main/**/*').test('src/main/database/migrations/001.sql'), true)
  assert.equal(globToRe('src/main/**/*').test('src/renderer/App.jsx'), false)
  assert.equal(globToRe('resources/**/*').test('resources/builds/assets/icon.webp'), true)
})

test('runtime files and offline reference data exist and are included in app.asar', () => {
  const needed = [
    'package.json',
    'src/main/main.js', 'src/main/preload.js', 'src/main/catalog.js', 'src/main/buildStorage.js',
    'src/main/addon/integration.js', 'src/main/addon/luaSavedVariables.js', 'src/main/addon/addonConstants.js',
    'src/main/addon/profileManager.js', 'src/main/addon/snapshotCodec.js', 'src/main/addon/characterSyncStore.js',
    'src/main/database/db.js',
    'src/main/ipc/buildHandlers.js', 'src/main/ipc/buildValidation.js', 'src/main/ipc/buildCharacterImport.js',
    'src/main/ipc/buildGuidedCreation.js', 'src/main/ipc/characterHandlers.js',
    'src/main/ipc/imageHandlers.js', 'src/main/ipc/settingsHandlers.js',
    'src/shared/variantLogic.cjs', 'src/shared/variantLogic.mjs',
    'resources/data/eso-skill-catalog.json', 'resources/data/eso-companions.json',
    'resources/data/build-editor-guidance.json', 'resources/art/ATTB.ico',
    'docs/reference/BUILD_QUICK_START.md', 'docs/reference/BUILD_EDITOR_GUIDE.md',
    'docs/reference/BUILD_JSON_GUIDE.md', 'docs/reference/ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md',
    'docs/reference/BUILD_FORMAT.md', 'docs/reference/BUILD_VALIDATION_GUIDE.md',
    'docs/reference/ESO_ADDON_INTEGRATION.md', 'docs/reference/SKILL_CATALOG.md',
    'docs/reference/BUILD_TEMPLATE.json'
  ]
  for (const file of needed) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing`)
    assert.equal(shipped(file), true, `${file} would not be packaged`)
  }
})

test('the single ESO addon ships once as an external resource', () => {
  const addonRoot = path.join(root, 'resources/addon/ArrowToTheBuild')
  const manifest = read('resources/addon/ArrowToTheBuild/ArrowToTheBuild.txt')
  assert.match(manifest, /^## Version: 1\.1\.1$/m)
  assert.match(manifest, /^## AddOnVersion: 10101$/m)
  assert.match(manifest, /^## APIVersion: 101050$/m)
  assert.match(manifest, /^## SavedVariables: ArrowToTheBuildSavedVariables$/m)
  assert.match(manifest, /^## DisableSavedVariablesAutoSaving: 1$/m)
  assert.equal(fs.existsSync(path.join(root, 'resources/addon/ArrowToTheBuildBridge')), false)
  assert.equal(fs.existsSync(path.join(addonRoot, 'README.md')), true)

  const resource = (pkg.build.extraResources || []).find(item => item.from === 'resources/addon' && item.to === 'attb-addon')
  assert.ok(resource)
  assert.ok((resource.filter || []).includes('**/*'))
  assert.equal(shipped('resources/addon/ArrowToTheBuild/ArrowToTheBuild.txt'), false, 'addon should not also be copied into app.asar')
})

test('every database migration is packaged', () => {
  const dir = 'src/main/database/migrations'
  const files = fs.readdirSync(path.join(root, dir)).filter(file => file.endsWith('.sql'))
  assert.ok(files.length > 0)
  for (const file of files) assert.equal(shipped(`${dir}/${file}`), true, `${file} would not be packaged`)
})

test('bundled builds and their local images are complete and packageable', () => {
  const referenced = new Set()
  for (const file of buildFiles()) {
    assert.equal(shipped(`resources/builds/${file}`), true)
    const build = JSON.parse(read(`resources/builds/${file}`))
    for (const ref of [build.images?.hero, ...collectImageRefs(build)].filter(Boolean)) {
      if (/^https?:/i.test(ref)) continue
      const full = path.join(root, 'resources/builds', ref)
      assert.equal(fs.existsSync(full), true, `${file} references missing image ${ref}`)
      assert.equal(shipped(`resources/builds/${ref}`), true, `${ref} would not be packaged`)
      referenced.add(path.basename(ref))
    }
  }
  for (const file of fs.readdirSync(path.join(root, 'resources/builds/assets'))) {
    assert.equal(referenced.has(file), true, `${file} is not referenced by a bundled build`)
  }
})

test('developer-only material stays out of the installed app', () => {
  const devOnly = [
    'resources/art/ATTB-Simple.png', 'resources/art/ATTB-Words.png',
    'docs/maintenance/BUILD_EDITOR_ARCHITECTURE.md', 'docs/maintenance/TESTING.md',
    'docs/maintenance/RELEASE_CHECKLIST.md', 'docs/maintenance/DEPENDENCY_AUDIT.md',
    'docs/maintenance/SKILL_AUDIT_U50.md', 'docs/maintenance/ESO_BUILD_SYSTEM_AUDIT.md',
    'docs/maintenance/UPDATING_FOR_GAME_PATCHES.md', 'docs/reference/BUILD_SCHEMA.json',
    'src/renderer/App.jsx', 'tests/persistence.test.js', 'tools/run-tests.cjs',
    'tools/fetch-skill-icons.mjs', 'tools/generate_skill_catalog.py', 'docs/index.html',
    'vite.config.js', 'index.html', 'README.md'
  ]
  for (const file of devOnly) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist in source`)
    assert.equal(shipped(file), false, `${file} should not be inside app.asar`)
  }
})

test('native SQLite and Windows installer settings are safe for production packaging', () => {
  assert.ok((pkg.build.asarUnpack || []).includes('**/*.node'))
  assert.equal(pkg.build.win?.target, 'nsis')
  assert.equal(pkg.build.mac, undefined)
  assert.equal(pkg.build.linux, undefined)
  assert.match(pkg.build.artifactName, /\$\{version\}/)
  assert.equal(pkg.build.nsis.oneClick, false)
  assert.notEqual(pkg.build.nsis.deleteAppDataOnUninstall, true)
})

test('dependency and rebuild configuration stays lean', () => {
  assert.equal(pkg.devDependencies['@electron/rebuild'], undefined)
  assert.equal(pkg.scripts.rebuild, undefined)
  assert.equal(pkg.scripts.postinstall, 'electron-builder install-app-deps')
  assert.equal(pkg.build.files.some(file => file.includes('node_modules')), false)

  const sources = []
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(rel)
      else if (/\.(js|jsx|mjs|cjs)$/.test(entry.name)) sources.push(read(rel))
    }
  }
  walk('src')
  const source = sources.join('\n')
  for (const dep of Object.keys(pkg.dependencies)) {
    const escaped = dep.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')
    assert.equal(new RegExp(`(require\\(|from\\s*)['"]${escaped}(/|['"])`).test(source), true, `${dep} is not imported by src`)
  }
})

test('tests use Electron embedded Node so native module ABIs stay aligned', () => {
  const runner = read('tools/run-tests.cjs')
  assert.equal(pkg.scripts.test, 'node tools/run-tests.cjs')
  assert.match(runner, /ELECTRON_RUN_AS_NODE:\s*'1'/)
  assert.match(runner, /require\('electron'\)/)
  assert.match(runner, /\['--test',\s*\.\.\.testFiles\]/)
})

test('the Windows build script runs the clean release pipeline and verifies its installer', () => {
  const script = read('BUILD-ATTB.bat')
  assert.match(script, /package-lock\.json/i)
  assert.match(script, /npm ci --include=dev --no-audit --no-fund/i)
  assert.match(script, /npm run fetch:icons/i)
  assert.match(script, /npm test/i)
  assert.match(script, /rmdir \/s \/q "dist"/i)
  assert.match(script, /npm run build/i)
  assert.match(script, /dist\\ATTB-Setup-%ATTB_VERSION%\.exe/i)
  assert.match(script, /Windows installer ready:/i)
  assert.doesNotMatch(script, /installer was created but was not launched|Launching installer|start\s+"".*ATTB-Setup/i)
})

test('the source repository keeps the small set of release essentials', () => {
  for (const file of [
    'README.md', 'LICENSE', 'BUILD-ATTB.bat', 'docs/index.html', 'docs/styles.css', 'docs/app.js',
    'docs/reference/BUILD_QUICK_START.md', 'docs/reference/BUILD_EDITOR_GUIDE.md',
    'docs/reference/BUILD_JSON_GUIDE.md', 'docs/reference/BUILD_VALIDATION_GUIDE.md',
    'docs/reference/ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md', 'docs/reference/BUILD_TEMPLATE.json',
    'docs/maintenance/RELEASE_CHECKLIST.md', 'docs/maintenance/DEPENDENCY_AUDIT.md'
  ]) assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should be present`)

  for (const obsolete of ['SETUP.md', 'SECURITY.md', 'Clear-SQL.bat', 'BUILD-AND-INSTALL-ATTB.bat']) {
    assert.equal(fs.existsSync(path.join(root, obsolete)), false, `${obsolete} should remain removed`)
  }
})

test('ESO addon source stays direct and free of retired bridge-era defensive wrappers', () => {
  const addonRoot = path.join(root, 'resources/addon/ArrowToTheBuild')
  const luaFiles = [
    ...fs.readdirSync(addonRoot).filter(file => file.endsWith('.lua')).map(file => path.join(addonRoot, file)),
    ...fs.readdirSync(path.join(addonRoot, 'Collectors')).filter(file => file.endsWith('.lua')).map(file => path.join(addonRoot, 'Collectors', file))
  ]
  const source = luaFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n')
  const core = read('resources/addon/ArrowToTheBuild/Core.lua')
  const character = read('resources/addon/ArrowToTheBuild/Collectors/Character.lua')
  const champion = read('resources/addon/ArrowToTheBuild/Collectors/Champion.lua')

  for (const pattern of [
    /pcall\s*\(/, /_G\s*\[/, /SafeCall/, /SafeRegisterEvent/, /Util\.Value/,
    /EVENT_CHAMPION_POINTS_CHANGED/, /EVENT_ATTRIBUTE_POINTS_CHANGED/,
    /EVENT_SKILL_LINE_LEVELED_UP/, /EVENT_SKILL_ABILITY_PROGRESSIONS_UPDATED/,
    /IsChampionSkillSlottable/, /GetAvailableAttributePoints/, /GetNumAvailableAttributePoints/,
    /PrioritySave/, /ArrowToTheBuildBridge/
  ]) assert.doesNotMatch(source, pattern)

  assert.match(character, /GetAttributeUnspentPoints\(\)/)
  assert.match(champion, /GetChampionSkillType\(skillId\)/)
  assert.match(champion, /CanChampionSkillTypeBeSlotted\(skillType\)/)
  assert.match(core, /EVENT_ACTION_SLOTS_ALL_HOTBARS_UPDATED/)
  assert.match(core, /EVENT_HOTBAR_SLOT_UPDATED/)
  assert.match(core, /EVENT_PLAYER_DEACTIVATED/)
  assert.doesNotMatch(core, /EVENT_SKILL_XP_UPDATE|EVENT_ABILITY_PROGRESSION_XP_UPDATE/)
})
