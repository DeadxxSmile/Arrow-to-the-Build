'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const readAppCss = () => ['src/renderer/styles/App.css', 'src/renderer/styles/BuildEditor.css', 'src/renderer/styles/Addon.css'].map(read).join('\n')

test('first run, character switching, and the streamlined top bar are wired into the shell', () => {
  const app = read('src/renderer/App.jsx')
  const switcher = read('src/renderer/components/CharacterSwitcher.jsx')
  assert.match(app, /Add First Character/)
  assert.match(app, /<CharacterSwitcher/)
  assert.match(app, /Build Variant/)
  assert.match(app, /with-section-rail/)
  assert.match(switcher, /Add Character/)
  assert.match(switcher, /character-switcher-divider/)
})


test('the shell exposes remembered Character Tracker and Build Editor workspaces', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const handlers = read('src/main/ipc/settingsHandlers.js')
  assert.match(app, /CharacterWorkspace|Character Tracker/)
  assert.match(app, /BuildEditorSidebar/)
  assert.match(app, /attb-last-build-editor-route/)
  assert.match(app, /attb-last-character-route/)
  assert.match(app, /startup_workspace/)
  assert.match(routes, /build-editor\/library/)
  assert.match(routes, /build-editor\/new/)
  assert.match(settings, /General Settings/)
  assert.match(settings, /Character Settings/)
  assert.match(settings, /Build Editor Settings/)
  assert.match(settings, /build_editor_default_author/)
  assert.match(settings, /NPC/)
  assert.match(handlers, /build_editor_autosave_seconds/)
  assert.match(settings, /Saved JSON folder/)
  assert.match(settings, /Choose Folder/)
  assert.match(settings, /Sync Saved Builds/)
  assert.match(handlers, /build_editor_storage_directory/)
})

test('Character Help and Tools stays character-focused while authoring routes live in Build Editor', () => {
  const routes = read('src/index.jsx')
  const app = read('src/renderer/App.jsx')
  assert.match(routes, /help\/tips/)
  assert.match(routes, /help\/import-export/)
  assert.match(routes, /help\/resources/)
  assert.match(routes, /build-editor\/guide/)
  assert.match(routes, /build-editor\/import-export/)
  assert.match(app, /Character Backups/)
  assert.match(app, /Build Setup Guide/)
  assert.match(app, /Resources & Links/)
})



test('guided build creation and core setup editors are live', () => {
  const routes = read('src/index.jsx')
  const newBuild = read('src/renderer/pages/NewBuildPage.jsx')
  const characterSetup = read('src/renderer/pages/BuildCharacterSetupPage.jsx')
  const classSetup = read('src/renderer/pages/BuildClassConfigurationPage.jsx')
  const preload = read('src/main/preload.js')
  const handlers = read('src/main/ipc/buildHandlers.js')
  const guidance = JSON.parse(read('resources/data/build-editor-guidance.json'))
  assert.match(routes, /BuildCharacterSetupPage/)
  assert.match(routes, /BuildClassConfigurationPage/)
  assert.match(newBuild, /Create Guided Draft/)
  assert.match(newBuild, /Primary role/)
  assert.match(characterSetup, /Apply Common Starting Setup/)
  assert.match(characterSetup, /AttributeAllocationEditor/)
  assert.match(classSetup, /Three active slots/)
  assert.match(classSetup, /Class Mastery/)
  assert.match(preload, /createGuidedDraft/)
  assert.match(handlers, /createGuidedBuildData/)
  assert.equal(guidance.game_version, 'Update 50')
})
test('equipment and rotation pages consume Schema 4 sets, pieces, hotbars, and skill icons', () => {
  const equipment = read('src/renderer/pages/EquipmentPage.jsx')
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  assert.match(equipment, /stage\.sets/)
  assert.match(equipment, /set\.pieces/)
  assert.match(equipment, /completion-box/)
  assert.match(rotations, /front_bar/)
  assert.match(rotations, /back_bar/)
  assert.match(rotations, /<SkillIcon/)
  assert.match(rotations, /rotation\.steps/)
})

test('Build Editor ships the complete guide and separate import-export tools', () => {
  const routes = read('src/index.jsx')
  const page = read('src/renderer/pages/BuildSetupGuidePage.jsx')
  const filePage = read('src/renderer/pages/BuildEditorImportExportPage.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const guide = read('src/renderer/components/BuildSetupGuide.jsx')
  const tools = read('src/renderer/components/BuildAuthoringTools.jsx')
  const markdown = read('src/renderer/components/MarkdownDocument.jsx')
  const preload = read('src/main/preload.js')
  const handlers = read('src/main/ipc/buildHandlers.js')
  assert.match(routes, /build-editor\/guide/)
  assert.match(routes, /build-editor\/import-export/)
  assert.match(page, /<BuildSetupGuide/)
  assert.match(filePage, /<BuildAuthoringTools/)
  assert.doesNotMatch(settings, /<BuildSetupGuide/)
  assert.match(tools, /Export Blank Template/)
  assert.match(tools, /Export Existing Build/)
  assert.match(tools, /Import Build JSON/)
  assert.match(guide, /Format & Skill IDs/)
  assert.match(guide, /Visual Editor Guide/)
  assert.match(guide, /Manual JSON Authoring/)
  assert.match(guide, /Validation & Troubleshooting/)
  assert.match(guide, /Complete offline documentation/)
  assert.match(markdown, /navigator\.clipboard\.writeText/)
  assert.match(markdown, /window\.api\.external\.open/)
  assert.match(preload, /exportTemplate/)
  assert.match(preload, /getAuthoringGuide/)
  assert.match(preload, /getStorageInfo/)
  assert.match(preload, /chooseStorageDirectory/)
  assert.match(preload, /app:getInfo/)
  assert.match(settings, /Built for/)
  assert.match(settings, /Open GitHub project/)
  for (const document of ['BUILD_QUICK_START.md', 'BUILD_EDITOR_GUIDE.md', 'BUILD_JSON_GUIDE.md', 'BUILD_FORMAT.md', 'BUILD_VALIDATION_GUIDE.md', 'ESO_BUILD_SYSTEM_AUDIT.md', 'SKILL_CATALOG.md', 'UPDATING_FOR_GAME_PATCHES.md']) assert.ok(handlers.includes(document), `${document} is not bundled by the guide handler`)
})

test('the shell and character setup expose reusable Schema 4 loadouts', () => {
  const app = read('src/renderer/App.jsx')
  const modal = read('src/renderer/components/CharacterModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const shared = read('src/shared/variantLogic.cjs')
  assert.match(app, /Build Loadout/)
  assert.match(modal, /loadout_id/)
  assert.match(settings, /Build loadout/)
  assert.match(shared, /function applyBuildSelection/)
  assert.match(shared, /function applyLoadout/)
})

test('profile fields and the narrow preload API expose the current profile controls', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const preload = read('src/main/preload.js')
  assert.match(modal, />Race<\/span>/)
  assert.match(modal, />Alliance<\/span>/)
  assert.doesNotMatch(modal, /Actual race|Actual alliance/)
  assert.match(settings, /Selected build/)
  assert.match(settings, /Build variant/)
  assert.match(preload, /validateData/)
  assert.match(preload, /exportData/)
  assert.match(preload, /external:\s*\{ open:/)
})



test('the character header uses balanced columns and aligned field labels', () => {
  const app = read('src/renderer/App.jsx')
  const switcher = read('src/renderer/components/CharacterSwitcher.jsx')
  const css = readAppCss()
  assert.match(app, /character-level-center topbar-field/)
  assert.match(app, /variant-control topbar-field/)
  assert.match(switcher, /character-switcher topbar-field/)
  assert.match(switcher, /topbar-label">Character/)
  const bar = [...css.matchAll(/\.character-bar\{[^}]*\}/g)].map(match => match[0]).find(rule => rule.includes('display:grid')) || ''
  assert.match(bar, /grid-template-columns:minmax\(0,1fr\) auto minmax\(0,1fr\)/,
    'equal outer tracks keep the level control at the true center of the window')
  assert.match(css, /\.topbar-field\{[^}]*grid-template-rows:14px 58px/,
    'all three controls should share the same label and field rows')
})

test('the renderer uses a browser-native ES module for variant logic', () => {
  const bridge = read('src/renderer/utils/variantLogic.mjs')
  const browserModule = read('src/shared/variantLogic.mjs')
  assert.match(bridge, /from ['"]\.\.\/\.\.\/shared\/variantLogic\.mjs['"]/)
  assert.doesNotMatch(bridge, /variantLogic\.cjs/)
  assert.match(browserModule, /export \{/)
  assert.doesNotMatch(browserModule, /module\.exports/)
})

test('CharacterModal seeds its form without referencing an undefined identifier', () => {
  // Regression guard: `setForm({ ...EMPTY, build_id })` used object shorthand for a name that
  // was never bound (the local was `buildId`), so opening the modal threw ReferenceError: build_id
  // is not defined and blanked the renderer. The reset must pass the resolved value explicitly.
  const modal = read('src/renderer/components/CharacterModal.jsx')
  assert.match(modal, /setForm\(emptyForm\(buildId\)\)/,
    'the form reset must pass the resolved buildId through the fresh-form helper')
  assert.doesNotMatch(modal, /\{ \.\.\.EMPTY,[^}]*\bbuild_id\b(?!\s*:)/,
    'never spread EMPTY with a bare build_id shorthand; the identifier is not in scope')
})

test('no renderer component spreads a state template with a bare snake_case shorthand', () => {
  // General guard for the same class of bug: a shorthand key like `{ ...EMPTY, variant_id }` only
  // works if something in scope is literally named variant_id, which these components never do.
  const dir = path.join(root, 'src/renderer')
  const files = []
  const walk = d => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.jsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(dir)
  const risky = /\{\s*\.\.\.[A-Za-z_$][\w$]*\s*,[^{}]*?,?\s*([a-z]+_[a-z_]+)\s*\}/g
  const offenders = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    let match
    while ((match = risky.exec(source))) {
      // A real binding named exactly the shorthand key would make this safe; flag otherwise.
      const key = match[1]
      const bound = new RegExp(`\\b(?:const|let|var|function)\\s+${key}\\b|\\b${key}\\s*=>`).test(source)
      if (!bound) offenders.push(`${path.relative(root, file)}: { ...spread, ${key} }`)
    }
  }
  assert.deepEqual(offenders, [], `object shorthand references an unbound identifier:\n${offenders.join('\n')}`)
})

test('the workspace grid gives the scroll region a real row track so page content is not clipped', () => {
  // Regression guard: .workspace became a CSS grid but .content-scroll kept flex-item sizing
  // (height:0; flex:1 1 auto). A grid item ignores flex, so the row collapsed and every page showed
  // only its header. The grid needs an explicit row track and the scroll child a real height.
  const css = readAppCss()
  const workspace = css.match(/\.workspace\{[^}]*\}/)?.[0] || ''
  assert.match(workspace, /grid-template-rows:\s*minmax\(0,\s*1fr\)/,
    '.workspace must define a row track or its grid child collapses')

  const scroll = [...css.matchAll(/\.content-scroll\{[^}]*\}/g)].map(m => m[0]).join(' ')
  assert.doesNotMatch(scroll, /[;{]height:0[;}]/, '.content-scroll must not be height:0 inside a grid row')
  assert.match(scroll, /height:100%/, '.content-scroll should fill its grid row')
})

test('collapsible stages use the real open attribute, not the unrecognized defaultOpen', () => {
  // React does not map defaultOpen to <details open>, so it leaked to the DOM as an unknown attribute
  // and the stages never opened. Equipment and Rotations must use `open`.
  for (const file of ['src/renderer/pages/EquipmentPage.jsx', 'src/renderer/pages/RotationsPage.jsx']) {
    const source = read(file)
    assert.doesNotMatch(source, /defaultOpen/, `${file} must not use defaultOpen on <details>`)
    assert.match(source, /<details[^>]*\bopen=\{/, `${file} should set the initial open state with open={...}`)
  }
})

test('sidebar rows share one width and the collapse divider spans the full column', () => {
  const css = readAppCss()
  assert.match(css, /\.sidebar-nav\{[^}]*scrollbar-gutter:auto[^}]*padding:14px 12px!important/,
    'the main navigation should not reserve a phantom scrollbar gutter')
  assert.match(css, /\.sidebar-nav \.nav-item\{[^}]*width:100%[^}]*min-height:48px/,
    'primary navigation rows should fill the same inner width')
  assert.match(css, /\.sidebar-footer \.nav-item\{[^}]*margin:0 12px!important/,
    'footer actions should use the same horizontal inset as primary navigation')
  assert.match(css, /\.sidebar-footer \.collapse-btn\{[^}]*width:100%[^}]*margin:0[^}]*border-top:/,
    'the collapse divider should span the complete sidebar')
})

test('the taller identity and character header use larger aligned controls', () => {
  const app = read('src/renderer/App.jsx')
  const css = readAppCss()
  assert.doesNotMatch(app, /<small>Arrow to the Build<\/small>/,
    'the sidebar should not repeat the product name beneath ATTB')
  assert.match(css, /\.sidebar-logo,\.character-bar\{height:108px;min-height:108px\}/)
  assert.match(css, /\.topbar-field\{[^}]*grid-template-rows:14px 58px/)
  assert.match(css, /\.character-switcher-trigger\{[^}]*height:58px/)
  assert.match(css, /\.sidebar-logo img\{width:52px;height:52px\}/)
})

test('workspace navigation keeps character help separate from Build Editor authoring', () => {
  const app = read('src/renderer/App.jsx')
  const characterBackups = app.indexOf("'/help/import-export'")
  const tips = app.indexOf("'/help/tips'")
  const resources = app.indexOf("'/help/resources'")
  const guide = app.indexOf("'/build-editor/guide'")
  const buildTransfer = app.indexOf("'/build-editor/import-export'")
  assert.ok(tips >= 0 && characterBackups > tips && resources > characterBackups,
    'character help should contain gameplay tips, character backups, and resources')
  assert.ok(guide >= 0 && buildTransfer > guide,
    'the Build Editor should keep its guide and build file tools together')
  assert.match(app, /switchWorkspace\('build-editor'/)
  assert.match(app, /switchWorkspace\('character'/)
})

test('skill icons have a generated local source and appear across bars and skill pages', () => {
  const component = read('src/renderer/components/SkillIcon.jsx')
  const skillPage = read('src/renderer/pages/SkillLinePage.jsx')
  const overview = read('src/renderer/pages/SkillsPage.jsx')
  const pkg = JSON.parse(read('package.json'))
  assert.match(component, /\.\/skill-icons\/\$\{encodeURIComponent\(skillId\)\}\.png/)
  assert.match(component, /onError=\{\(\) => setLocalFailed\(true\)\}/)
  assert.match(skillPage, /<SkillIcon skillId=\{skill\.id\}/)
  assert.match(skillPage, /<SkillIcon skillId=\{morph\.id\}/)
  assert.match(overview, /<SkillIcon skillId=\{item\.catalog_skill_id\}/)
  assert.equal(pkg.scripts['fetch:icons'], 'node tools/fetch-skill-icons.mjs')
})

test('button-styled links keep ATTB styling instead of browser-default blue underlines', () => {
  const css = read('src/renderer/styles/global.css')
  const skillLine = read('src/renderer/pages/SkillLinePage.jsx')
  const cpCard = read('src/renderer/components/CPCard.jsx')
  assert.match(css, /\.btn\{[^}]*display:inline-flex[^}]*color:var\(--text\)[^}]*text-decoration:none/)
  assert.match(skillLine, /<Link to="\/skills" className="btn secondary">/)
  assert.match(cpCard, /<Link className="btn secondary"/)
})

test('the current rotation stage draws one uninterrupted outline', () => {
  const css = readAppCss()
  assert.match(css, /\.rotation-stage-card\.current:after\{[^}]*position:absolute[^}]*inset:0[^}]*border:2px solid var\(--accent\)/)
})

test('collapsed sidebar uses compact centered controls instead of expanded spacing', () => {
  const css = readAppCss()
  assert.match(css, /\.app-shell\.collapsed \.sidebar-logo\{[^}]*padding:0[^}]*justify-content:center/,
    'the compact logo should be centered without expanded padding')
  assert.match(css, /\.app-shell\.collapsed \.sidebar-logo img\{[^}]*width:38px[^}]*height:38px/,
    'the 52px expanded logo cannot fit comfortably in a 60px sidebar')
  assert.match(css, /\.app-shell\.collapsed \.sidebar-nav \.nav-item,[\s\S]*?width:46px[\s\S]*?justify-content:center/,
    'collapsed navigation and footer actions should be fixed-width centered squares')
  assert.match(css, /\.app-shell\.collapsed \.sidebar-footer \.collapse-btn\{[^}]*height:42px[^}]*place-items:center/,
    'the collapse control should remain centered beneath a full-width divider')
})

test('shipped text stays free of em and en dashes, which the project style avoids', () => {
  // The one deliberate exception is the minimize glyph in the window title bar, which is a real dash
  // character used as an icon, not prose. Everything else uses commas, colons, or hyphens.
  const EM = '\u2014', EN = '\u2013'
  const exts = ['.js', '.jsx', '.cjs', '.mjs', '.css', '.md', '.json', '.py', '.html', '.txt', '.sql']
  const skipDirs = new Set(['node_modules', 'build', 'dist', '.git'])
  const offenders = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (!skipDirs.has(entry.name)) walk(path.join(dir, entry.name)); continue }
      if (!exts.some(ext => entry.name.endsWith(ext))) continue
      const full = path.join(dir, entry.name)
      const rel = path.relative(root, full)
      if (rel === path.join('src', 'renderer', 'components', 'TitleBar.jsx')) continue
      const text = fs.readFileSync(full, 'utf8')
      const count = (text.split(EM).length - 1) + (text.split(EN).length - 1)
      if (count) offenders.push(`${rel} (${count})`)
    }
  }
  walk(root)
  assert.deepEqual(offenders, [], `these files contain em or en dashes:\n${offenders.join('\n')}`)
})

test('Basic Setup leads navigation and owns the build hero and target attributes', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  const status = read('src/renderer/pages/StatusPage.jsx')
  assert.ok(app.indexOf("'/setup'") < app.indexOf("'/status'"), 'Basic Setup should appear before Current Levels')
  assert.match(routes, /Navigate to="\/setup"/)
  assert.match(setup, /className="hero-panel"/)
  assert.match(setup, /Build attribute target/)
  assert.match(setup, /Build Progress/)
  assert.match(setup, /attributes\.spent\}\/\{attributes\.targetTotal/)
  assert.doesNotMatch(status, /className="hero-panel"/)
})

test('Current Levels is numeric-only progression for level, CP, line ranks, and multi-rank passives', () => {
  const status = read('src/renderer/pages/StatusPage.jsx')
  assert.match(status, /Current levels/)
  assert.match(status, /cp_craft/)
  assert.match(status, /cp_warfare/)
  assert.match(status, /cp_fitness/)
  assert.match(status, /Current line ranks/)
  assert.match(status, /Multi-rank passive levels/)
  assert.match(status, /applyAllocationChange/)
  assert.doesNotMatch(status, /What to take next|recommendedUnlocks|toggleUnlock/)
})

test('Champion Points has a dedicated route, rail, overview, and constellation path pages', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  const page = read('src/renderer/pages/ChampionPointsPage.jsx')
  const card = read('src/renderer/components/CPCard.jsx')
  assert.match(app, /Champion Points/)
  assert.match(app, /\/champion-points\/craft/)
  assert.match(app, /\/champion-points\/warfare/)
  assert.match(app, /\/champion-points\/fitness/)
  assert.match(routes, /champion-points\/:tree/)
  assert.match(page, /CP_ACCOUNT_MAX/)
  assert.match(card, /Spend here next/)
  assert.match(card, /Required connection path/)
  assert.match(card, /Recommended Champion Bar/)
})

test('character creation records real attributes and always exposes three CP fields', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  const handlers = read('src/main/ipc/characterHandlers.js')
  assert.match(modal, /attributes: ZERO_ATTRIBUTES/)
  assert.match(modal, /Attribute points/)
  assert.match(modal, /Craft CP/)
  assert.match(modal, /Warfare CP/)
  assert.match(modal, /Fitness CP/)
  assert.doesNotMatch(modal, /form\.level\s*>=\s*50/)
  assert.match(handlers, /const attributes = sanitizeAttributes\(payload\.attributes\)/)
  assert.doesNotMatch(handlers, /sanitizeAttributes\(payload\.attributes,\s*defaults\.attributes\)/)
})

test('the character modal can always be dismissed, including on first run', () => {
  // Regression: first-run mode hid the close X, disabled Escape, and ignored backdrop clicks, so the
  // setup dialog had no way out. Every path must be able to close now.
  const modal = read('src/renderer/components/CharacterModal.jsx')
  // Escape closes regardless of firstCharacter
  assert.match(modal, /event\.key === 'Escape'\) onClose\(\)/)
  assert.doesNotMatch(modal, /Escape' && !firstCharacter/)
  // Backdrop click closes regardless of firstCharacter
  assert.doesNotMatch(modal, /!firstCharacter && event\.target === event\.currentTarget/)
  // The close X and a Cancel button are always rendered
  assert.doesNotMatch(modal, /\{!firstCharacter && <button type="button" className="icon-btn"/)
  assert.doesNotMatch(modal, /\{!firstCharacter && <button type="button" className="btn ghost"/)
})

test('the character modal offers addon import and backup restore without the removed build-import sentinel', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  assert.match(modal, /characters\.importBackup\(\)/, 'restore path calls the backup importer')
  assert.match(modal, /Import character backup/, 'a restore button is shown')
  assert.match(modal, /Import Data From Addon/, 'addon character import is offered directly')
  assert.doesNotMatch(modal, /__import__|Import Another Build/, 'build import belongs to the Build Editor, not character creation')
})

test('character setup actions share one footer row without the ESO Plus note', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  const css = readAppCss()
  assert.match(modal, /className="modal-footer"/)
  assert.doesNotMatch(modal, /ESO Plus is account-wide under Settings/)
  assert.match(css, /\.modal-footer\{display:flex;align-items:center;justify-content:space-between/)
})

test('CachedImage renders nothing rather than a stray letter when a hero image is absent', () => {
  // Regression: builds without images.hero showed the first letter of the alt text ("M" for Magicka...)
  // floating in the hero because the placeholder kept position:absolute. fallback="none" drops it.
  const cached = read('src/renderer/components/CachedImage.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  assert.match(cached, /fallback === 'none'/)
  assert.match(cached, /if \(!src && fallback === 'none'\) return null/)
  assert.match(setup, /className="hero-image" fallback="none"/)
})


test('Skills overview uses the same square completion control as equipment and line pages', () => {
  const page = read('src/renderer/pages/SkillsPage.jsx')
  const css = readAppCss()
  assert.match(page, /className={`completion-box skill-summary-toggle/)
  assert.match(page, /role="checkbox"/)
  assert.match(page, /aria-checked={complete}/)
  assert.doesNotMatch(page, /<input type="checkbox"/)
  assert.match(css, /\.skill-summary-toggle\.selected\{background:#1d8659;border-color:#62d99c\}/)
})

test('skill line abilities use the square equipment-style checkbox', () => {
  const page = read('src/renderer/pages/SkillLinePage.jsx')
  const css = readAppCss()
  assert.match(page, /role="checkbox" aria-checked=\{!!allocation\}/, 'toggle is a real checkbox role')
  assert.doesNotMatch(page, /\{allocation \? '✓' : '\+'\}/, 'no plus-sign toggle glyph remains')
  const toggle = css.match(/\.eso-skill-toggle\{[^}]*\}/)?.[0] || ''
  assert.match(toggle, /border-radius:8px/, 'toggle is a rounded square, not a circle')
})

test('no shipped font size is smaller than the readable floor', () => {
  // The tiny CP text prompted a type-scale pass. Nothing should render below 0.72rem (~10.8px).
  for (const file of ['src/renderer/styles/App.css', 'src/renderer/styles/BuildEditor.css', 'src/renderer/styles/Addon.css', 'src/renderer/styles/global.css']) {
    const css = read(file)
    const sizes = [...css.matchAll(/font-size:([0-9.]+)rem/g)].map(m => parseFloat(m[1]))
    const tooSmall = sizes.filter(size => size < 0.72)
    assert.deepEqual(tooSmall, [], `${file} has font sizes below 0.72rem: ${tooSmall.join(', ')}`)
  }
})


test('Resources includes project, support, and creator links', () => {
  const page = read('src/renderer/pages/ResourcesPage.jsx')
  assert.match(page, /ATTB on GitHub/)
  assert.match(page, /https:\/\/buymeacoffee\.com\/deadx_xsmile/)
  assert.match(page, /https:\/\/linktr\.ee\/deadx_xsmile/)
  assert.match(page, /Resources &amp; project links/)
})

test('the removed increment-CP IPC path does not survive in renderer or main-process code', () => {
  for (const file of ['src/renderer/App.jsx', 'src/main/preload.js', 'src/main/ipc/characterHandlers.js']) {
    assert.doesNotMatch(read(file), /incrementCp|characters:incrementCp/, `${file} still contains the obsolete CP increment path`)
  }
})

test('the Electron shell blocks unexpected navigation and keeps the renderer sandboxed', () => {
  const main = read('src/main/main.js')
  const html = read('index.html')
  assert.match(main, /contextIsolation:\s*true/)
  assert.match(main, /nodeIntegration:\s*false/)
  assert.match(main, /sandbox:\s*true/)
  assert.match(main, /webSecurity:\s*true/)
  assert.match(main, /fileURLToPath\(target\)/,
    'packaged navigation should compare the real file path rather than allowing every file URL')
  assert.match(main, /target\.origin === new URL\(devServerUrl\)\.origin/,
    'development navigation should be limited to the configured Vite origin')
  assert.match(main, /External links must not contain credentials/)
  assert.match(html, /script-src 'self';/)
  assert.doesNotMatch(html, /script-src[^;]*unsafe-inline/,
    'the renderer does not need inline JavaScript permission')
  assert.match(html, /object-src 'none'/)
  assert.match(html, /base-uri 'none'/)
  assert.match(html, /frame-src 'none'/)
})

test('every renderer file that references React by name also imports it', () => {
  // Regression: ErrorBoundary.jsx used `React.Component` with no `import React`, so it threw
  // "React is not defined" at runtime and white-screened the whole app, while the production build
  // and the Node tests both stayed green. The automatic JSX runtime covers <jsx> but NOT the React
  // namespace, so any file that writes React.<x> must import it explicitly.
  const dir = path.join(root, 'src')
  const offenders = []
  const walk = d => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full); continue }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue
      const src = fs.readFileSync(full, 'utf8')
      // Does it reference the React namespace directly (React.Component, React.createElement, etc.)?
      if (!/\bReact\.\w/.test(src)) continue
      const importsReact = /import\s+React[,\s]/.test(src) || /import\s+\*\s+as\s+React\b/.test(src)
      if (!importsReact) offenders.push(path.relative(root, full))
    }
  }
  walk(dir)
  assert.deepEqual(offenders, [], `these files use React.<x> without importing React:\n${offenders.join('\n')}`)
})

test('Build Editor wires protected ownership, drafts, autosave, and revisions through the shell', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  const library = read('src/renderer/pages/BuildLibraryPage.jsx')
  const overview = read('src/renderer/pages/BuildOverviewPage.jsx')
  const review = read('src/renderer/pages/BuildReviewPage.jsx')
  const hook = read('src/renderer/hooks/useBuildEditor.js')
  const preload = read('src/main/preload.js')
  const handlers = read('src/main/ipc/buildHandlers.js')

  assert.match(app, /Recovery draft saved locally/)
  assert.match(app, /characterBuilds = useMemo/)
  assert.match(app, /last_saved_revision/)
  assert.match(routes, /BuildOverviewPage/)
  assert.match(routes, /BuildReviewPage/)
  assert.match(library, /Fork Build/)
  assert.match(library, /Resume Editing/)
  assert.match(library, /Duplicate/)
  assert.match(overview, /Permanent build ID/)
  assert.match(review, /Revision history/)
  assert.match(review, /Save Build/)
  assert.match(hook, /HISTORY_LIMIT = 60/)
  assert.match(hook, /flushCurrentDraft/)
  assert.match(hook, /attb-active-build-draft/)
  for (const name of ['openDraft', 'createBlankDraft', 'fork', 'saveDraft', 'saveBuild', 'listRevisions', 'restoreRevision']) {
    assert.match(preload, new RegExp(name))
  }
  assert.match(handlers, /Bundled ATTB builds are read-only/)
  assert.match(handlers, /build_editor_drafts/)
  assert.match(handlers, /build_revisions/)
  assert.match(handlers, /unsaved Build Editor recovery changes/)
})

test('unfinished created and forked drafts are not offered to Character Tracker profiles', () => {
  const app = read('src/renderer/App.jsx')
  assert.match(app, /item\.is_bundled \|\| Number\(item\.last_saved_revision\) > 0/)
  assert.match(app, /<CharacterModal open=\{modal\} builds=\{characterBuilds\}/)
})

test('Electron renderer actions use app-owned dialogs instead of unsupported browser dialogs', () => {
  const rendererRoot = path.join(root, 'src/renderer')
  const files = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.jsx?$/.test(entry.name)) files.push(full)
    }
  }
  walk(rendererRoot)
  const offenders = files.filter(file => /window\.(?:prompt|confirm|alert)\s*\(/.test(fs.readFileSync(file, 'utf8')))
  assert.deepEqual(offenders, [], `native renderer dialogs are unsupported or inconsistent in Electron:\n${offenders.map(file => path.relative(root, file)).join('\n')}`)

  const provider = read('src/renderer/components/AppDialogProvider.jsx')
  const library = read('src/renderer/pages/BuildLibraryPage.jsx')
  const index = read('src/index.jsx')
  assert.match(provider, /function AppDialogProvider/)
  assert.match(provider, /useAppDialog/)
  assert.match(library, /dialog\.prompt/)
  assert.match(library, /Duplicate this build/)
  assert.match(index, /<AppDialogProvider>/)
})

test('variant labels add the base suffix at most once', () => {
  const helper = read('src/renderer/utils/variantLogic.mjs')
  const app = read('src/renderer/App.jsx')
  const modal = read('src/renderer/components/CharacterModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(helper, /function displayVariantName/)
  assert.match(helper, /\\\(base\\\)/)
  assert.match(app, /displayVariantName\(variant\)/)
  assert.match(modal, /displayVariantName\(variant\)/)
  assert.match(settings, /displayVariantName\(variant\)/)
})

test('React Router v7 uses the declarative HashRouter without retired v6 future flags', () => {
  const index = read('src/index.jsx')
  assert.match(index, /<HashRouter>/)
  assert.doesNotMatch(index, /v7_startTransition/)
  assert.doesNotMatch(index, /v7_relativeSplatPath/)
})

test('core editor polish keeps help cards inside the viewport and removes the redundant protected-originals panel', () => {
  const popover = read('src/renderer/components/InfoPopover.jsx')
  const css = readAppCss()
  const newBuild = read('src/renderer/pages/NewBuildPage.jsx')
  assert.match(popover, /createPortal/)
  assert.match(popover, /getBoundingClientRect/)
  assert.match(popover, /window\.innerWidth/)
  assert.match(popover, /window\.innerHeight/)
  assert.match(css, /\.info-card\{position:fixed/)
  assert.doesNotMatch(newBuild, /Nothing here edits a bundled build/)
  assert.doesNotMatch(newBuild, /Protected originals/)
})

test('Class Configuration foreign-line filtering binds the row it inspects', () => {
  const classSetup = read('src/renderer/pages/BuildClassConfigurationPage.jsx')
  assert.match(classSetup, /filter\(\(row, rowIndex\) => rowIndex !== index && row\.source_class !== baseClass\)/)
  assert.doesNotMatch(classSetup, /filter\(\(_, rowIndex\) => rowIndex !== index && row\.source_class/)
})

test('Build Editor skills and leveling pages are live authoring forms', () => {
  const routes = read('src/index.jsx')
  const skills = read('src/renderer/pages/BuildSkillsPage.jsx')
  const leveling = read('src/renderer/pages/BuildLevelingPage.jsx')
  const logic = read('src/renderer/utils/buildEditorSkillLogic.mjs')
  const css = readAppCss()
  assert.match(routes, /build-editor\/skills" element=\{<BuildSkillsPage/)
  assert.match(routes, /build-editor\/leveling" element=\{<BuildLevelingPage/)
  assert.match(skills, /Unlock plan/)
  assert.match(skills, /Add to plan/)
  assert.match(skills, /setPlannedSkillCount/)
  assert.match(leveling, /Five abilities plus ultimate/)
  assert.match(leveling, /Copy Last Phase/)
  assert.match(leveling, /Rotation or priority system/)
  assert.match(leveling, /Changes from/)
  assert.match(logic, /Adding a morph|skill\.type === 'Morph'/)
  assert.match(logic, /phaseQualityWarnings/)
  assert.match(css, /build-overview-page.*display:grid;gap:20px/)
})

test('Review and Save uses the same panel rhythm as the rest of the Build Editor', () => {
  const page = read('src/renderer/pages/BuildReviewPage.jsx')
  const css = readAppCss()
  assert.match(page, /className="page build-review-page"/)
  assert.match(css, /\.build-review-page\{display:grid;gap:20px\}/)
})

test('Build Setup Guide follows the visual-editor-first documentation structure', () => {
  const guide = read('src/renderer/components/BuildSetupGuide.jsx')
  const handlers = read('src/main/ipc/buildHandlers.js')
  for (const label of ['Start Here', 'Visual Editor Guide', 'Manual JSON Authoring', 'Format & Skill IDs', 'Validation & Troubleshooting', 'ESO Systems Audit', 'Patch Maintenance']) {
    assert.match(guide, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  assert.match(handlers, /buildSkillIdReferenceMarkdown/)
  assert.match(handlers, /format_and_ids/)
  assert.match(handlers, /BUILD_EDITOR_GUIDE\.md/)
  assert.match(handlers, /BUILD_VALIDATION_GUIDE\.md/)
  assert.match(handlers, /UPDATING_FOR_GAME_PATCHES\.md/)
})

test('ESO addon onboarding, character discovery, live panels, and override controls are wired through the app', () => {
  const app = read('src/renderer/App.jsx')
  const setup = read('src/renderer/components/AddonSetupModal.jsx')
  const importer = read('src/renderer/components/AddonImportModal.jsx')
  const characterModal = read('src/renderer/components/CharacterModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const equipment = read('src/renderer/pages/EquipmentPage.jsx')
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  const champion = read('src/renderer/pages/ChampionPointsPage.jsx')
  const preload = read('src/main/preload.js')
  const main = read('src/main/main.js')
  const integration = read('src/main/addon/integration.js')

  assert.match(app, /<AddonSetupModal/)
  assert.match(app, /APP_TAGLINE/)
  assert.match(read('src/renderer/utils/branding.mjs'), /I Used To Be Meta Like You, Then I Took An Arrow To The Build/)
  assert.match(app, /<AddonImportModal/)
  assert.match(app, /new_characters/)
  assert.match(setup, /Install Addon and Enable Sync/)
  assert.match(setup, /small sync bridge/)
  assert.match(setup, /ESO-controlled sync/)
  assert.match(setup, /I Already Installed It/)
  assert.match(setup, /Not Now/)
  assert.match(importer, /New ESO character found/)
  assert.match(importer, /Add and sync this character/)
  assert.match(importer, /Link the existing ATTB character/)
  assert.match(characterModal, /Import Data From Addon/)
  assert.doesNotMatch(characterModal, /Import Another Build/)
  assert.match(settings, /Allow synced-data overrides/)
  assert.match(settings, /Small sync bridge/)
  assert.match(settings, /Sync bridge SavedVariables/)
  assert.match(settings, /ESO-controlled sync bridge ready/)
  assert.match(settings, /Disable and Restore Live Data/)
  assert.match(settings, /Active overrides/)
  assert.match(equipment, /Observed in ESO/)
  assert.match(rotations, /LiveActionBars/)
  assert.match(rotations, /<details className="rotation-stage rotation-stage-card live-action-bars-stage" open>/)
  assert.match(rotations, /ObservedHotbar/)
  assert.match(rotations, /hotbar-slot observed-current/)
  assert.match(champion, /LiveChampionState/)
  assert.match(readAppCss(), /\.live-observed-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(preload, /addon:getStatus/)
  assert.match(main, /addonIntegration\.startWatching/)
  assert.match(integration, /parseSavedVariables/)
  assert.match(integration, /Install.*Repair|installAddon/)
  assert.doesNotMatch(integration, /\beval\s*\(|new Function|child_process/)
})

test('the Build Editor workspace is code-split so it stays out of the startup bundle', () => {
  // The Build Editor is a separate workspace most sessions never open. Loading its pages lazily keeps
  // the initial download small. Character Tracker pages stay eager because they are the fast path.
  const index = read('src/index.jsx')
  const app = read('src/renderer/App.jsx')

  // Every Build* editor page must be a lazy(() => import(...)) binding, not a static import.
  const buildPages = ['BuildLibraryPage', 'NewBuildPage', 'BuildOverviewPage', 'BuildCharacterSetupPage',
    'BuildClassConfigurationPage', 'BuildSkillsPage', 'BuildLevelingPage', 'BuildEquipmentPage',
    'BuildChampionPointsPage', 'BuildLoadoutsPage', 'BuildReviewPage', 'BuildSetupGuidePage',
    'BuildEditorImportExportPage']
  for (const page of buildPages) {
    assert.match(index, new RegExp(`const ${page} = lazy\\(\\(\\) => import\\(`), `${page} should be lazy-loaded`)
    assert.doesNotMatch(index, new RegExp(`^import ${page} from`, 'm'), `${page} should not be a static import`)
  }

  // Character Tracker pages must stay eagerly imported so the core experience has no load delay.
  for (const page of ['StatusPage', 'SetupPage', 'SkillsPage', 'EquipmentPage', 'ChampionPointsPage']) {
    assert.match(index, new RegExp(`^import ${page} from`, 'm'), `${page} should stay eagerly loaded`)
  }

  // A Suspense boundary must wrap the routed content so lazy chunks have a fallback while loading.
  assert.match(app, /import \{[^}]*\bSuspense\b[^}]*\} from 'react'/, 'App must import Suspense')
  assert.match(app, /<Suspense fallback=\{[^}]*\}>[\s\S]*<Outlet/, 'the Outlet must be wrapped in Suspense')
})

test('the bundler is configured to split vendor and the skill catalog into their own chunks', () => {
  const viteConfig = read('vite.config.js')
  assert.match(viteConfig, /manualChunks/, 'vite config should define manualChunks')
  assert.match(viteConfig, /eso-skill-catalog/, 'the large catalog should be its own chunk')
  assert.match(viteConfig, /vendor/, 'vendor code should be split into its own chunk')
})

test('synced characters can create or adapt Build Editor drafts from the Character Tracker', () => {
  const setup = read('src/renderer/pages/SetupPage.jsx')
  const preload = read('src/main/preload.js')
  const handlers = read('src/main/ipc/buildHandlers.js')
  const importLogic = read('src/main/ipc/buildCharacterImport.js')
  const hook = read('src/renderer/hooks/useBuildEditor.js')
  const overview = read('src/renderer/pages/BuildOverviewPage.jsx')
  assert.match(setup, /Create Build from Character/)
  assert.match(setup, /Adapt Build to Character/)
  assert.match(preload, /createFromCharacter/)
  assert.match(preload, /adaptFromCharacter/)
  assert.match(handlers, /createBuildFromCharacterData/)
  assert.match(handlers, /adaptBuildToCharacterData/)
  assert.match(importLogic, /Imported Character State/)
  assert.match(hook, /createFromCharacter/)
  assert.match(hook, /adaptFromCharacter/)
  assert.match(overview, /CURRENT character layered under TARGET build/)
})

test('synced skill allocations drive overview completion and live controls lock with overrides off', () => {
  const logic = read('src/renderer/utils/buildLogic.mjs')
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  assert.match(logic, /effectiveCompletedSet/)
  assert.match(logic, /skill_allocations/)
  assert.match(skills, /Build progress reconciled with live ESO skills/)
  assert.match(skills, /disabled=\{syncedLocked\}/)
})

test('addon onboarding stays compact and current progression stays aligned', () => {
  const modal = read('src/renderer/components/AddonSetupModal.jsx')
  const status = read('src/renderer/pages/StatusPage.jsx')
  const css = readAppCss()
  assert.match(modal, /addon-setup-summary/)
  assert.match(status, /progression-editor/)
  assert.match(status, /Available Skill Points/)
  assert.match(status, /Available Attribute Points/)
  assert.match(css, /\.addon-setup-summary/)
  assert.match(css, /\.progression-editor/)
})


test('a discovered ESO character can create a named build before its permanent ID is locked', () => {
  const modal = read('src/renderer/components/AddonImportModal.jsx')
  const setup = read('src/renderer/components/CharacterBuildSetupModal.jsx')
  const characterSyncStore = read('src/main/addon/characterSyncStore.js')
  const handlers = read('src/main/ipc/buildHandlers.js')
  const preload = read('src/main/preload.js')
  assert.match(modal, /Create a new build from this character/)
  assert.match(modal, /CharacterBuildSetupModal/)
  assert.match(setup, /Build name/)
  assert.match(setup, /Permanent build ID/)
  assert.match(setup, /becomes permanent when the build is created/)
  assert.match(setup, /Primary role/)
  assert.match(setup, /Primary resource/)
  assert.match(characterSyncStore, /options\.create_build/)
  assert.match(characterSyncStore, /createBuildFromImportedStateDraft/)
  assert.match(handlers, /requestedBuildId/)
  assert.match(preload, /createFromCharacter: \(characterId, author, options\)/)
})

test('ESO save timing is explicit and links users to external documentation', () => {
  const setup = read('src/renderer/components/AddonSetupModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(setup, /Important limitation from ESO/)
  assert.match(setup, /\/reloadui/)
  assert.match(setup, /I understand that ESO controls when sync data reaches disk/)
  assert.match(setup, /showthread\.php\?t=8957/)
  assert.match(setup, /wiki\.esoui\.com\/Storing_data_and_accessing_files/)
  assert.match(settings, /Need the latest character data now\? Run <code>\/reloadui<\/code>/)
  assert.match(settings, /ZOS SavedVariables timing/)
  assert.match(setup, /button-row compact-buttons addon-doc-buttons/)
  assert.match(setup, /Read ZOS save-timing explanation<\/button><button type="button" className="btn secondary"/)
  assert.match(settings, /button-row compact-buttons addon-doc-buttons/)
})

test('settings deep-link to Character Settings and keep account-wide ESO Plus in General', () => {
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  assert.match(settings, /useSearchParams/)
  assert.match(setup, /\/settings\?tab=character/)
  assert.match(settings, /Account-wide access/)
  assert.match(settings, /ESO Plus active/)
  // Progression editing belongs on Current Levels, not in Character Settings.
  const characterBlock = settings.split("{tab === 'character'")[1]?.split("{tab === 'editor'")[0] || ''
  assert.doesNotMatch(characterBlock, /AttributesEditor/)
  assert.doesNotMatch(characterBlock, /Overall level/)
  assert.doesNotMatch(characterBlock, /Available Skill Points/)
  assert.doesNotMatch(characterBlock, /Available Attribute Points/)
})

test('live action bars use player-facing presentation without match diagnostics', () => {
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  const catalog = read('src/renderer/utils/catalogLogic.mjs')
  assert.match(rotations, /LiveActionBars/)
  assert.match(rotations, /catalogSkillIdForName/)
  assert.match(rotations, /<SkillIcon skillId=\{skillId\}/)
  assert.doesNotMatch(rotations, /PROGRESSION-ID/)
  assert.doesNotMatch(rotations, /matchMethod/)
  assert.match(catalog, /export function catalogSkillIdForName/)
})

test('Champion Point summaries use earned, spent, and unspent language', () => {
  const champion = read('src/renderer/pages/ChampionPointsPage.jsx')
  const card = read('src/renderer/components/CPCard.jsx')
  assert.match(champion, /earned Champion Points/)
  assert.match(champion, /unspent/)
  assert.match(champion, /spent/)
  assert.match(card, /earned points/)
  assert.match(card, /Total earned in this tree/)
  assert.doesNotMatch(card, /Available in this tree/)
})

test('Schema 4 and the editor support portable plain-text Build Notes', () => {
  const schema = read('docs/reference/BUILD_SCHEMA.json')
  const template = read('docs/reference/BUILD_TEMPLATE.json')
  const editor = read('src/renderer/pages/BuildOverviewPage.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  const format = read('docs/reference/BUILD_FORMAT.md')
  assert.match(schema, /"notes"/)
  assert.match(schema, /20000/)
  assert.match(template, /"notes": ""/)
  assert.match(editor, /Build notes/)
  assert.match(editor, /20000/)
  assert.match(setup, /build-notes-display/)
  assert.match(format, /Build notes|notes/i)
})

test('attributes avoid a misleading disabled build-target action', () => {
  const attrs = read('src/renderer/components/AttributesEditor.jsx')
  assert.doesNotMatch(attrs, /Build target unlocks later/)
  assert.match(attrs, /Use build target/)
})

test('branding uses the wordmark on large surfaces and the simple mark for compact app chrome', () => {
  const app = read('src/renderer/App.jsx')
  const empty = read('src/renderer/pages/EmptyState.jsx')
  const title = read('src/renderer/components/TitleBar.jsx')
  assert.match(app, /logo-words\.png/)
  assert.match(app, /sidebar-logo[^\n]*logo\.png/)
  assert.match(empty, /logo-words\.png/)
  assert.match(title, /logo\.png/)
  for (const file of ['public/logo.png', 'public/logo-words.png', 'resources/art/ATTB.ico', 'resources/art/ATTB-Simple.png', 'resources/art/ATTB-Words.png']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} is missing from the source tree`)
  }
})
