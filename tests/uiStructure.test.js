'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const rendererStyleFiles = [
  'src/renderer/styles/global.css',
  'src/renderer/styles/App.css',
  'src/renderer/styles/Workspace.css',
  'src/renderer/styles/ThemeEditor.css',
  'src/renderer/styles/Character.css',
  'src/renderer/styles/Help.css',
  'src/renderer/styles/BuildEditor.css',
  'src/renderer/styles/Addon.css'
]
const readAppCss = () => rendererStyleFiles.map(read).join('\n')

// This file intentionally stays small. It is for renderer regressions that are difficult to
// exercise without a browser harness, not for asserting every label, CSS value, or route.

test('the main shell exposes all three workspaces and the first-character path', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  assert.match(app, /Add First Character/)
  assert.match(app, /<CharacterSwitcher/)
  assert.match(app, /Character Tracker/)
  assert.match(app, /UnifiedSidebar/)
  assert.match(app, /BuildEditorSidebarNav/)
  assert.match(app, /HelpSidebarNav/)
  assert.match(routes, /build-editor\/library/)
  assert.match(routes, /path="help" element=\{<HelpHomePage \/>\}/)
})

test('the sidebar uses header-aligned workspace tabs and quiet integrated settings navigation', () => {
  const app = read('src/renderer/App.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const css = readAppCss()
  const titlebar = read('src/renderer/components/TitleBar.jsx')
  assert.match(app, /function WorkspaceSwitcher/)
  assert.match(app, /function UnifiedSidebar/)
  assert.match(app, /function SettingsSidebarNav/)
  assert.match(app, /\['character', 'Character', 'Character Tracker'\]/)
  assert.match(app, /\['build-editor', 'Build', 'Build Editor'\]/)
  assert.match(app, /\['help', 'Help', 'Help & Tools'\]/)
  assert.doesNotMatch(app, /function SidebarIdentity/)
  assert.doesNotMatch(app, /<SidebarIdentity/)
  assert.doesNotMatch(app, /collapseStorageKey|toggleCollapsed|collapse-btn/)
  assert.doesNotMatch(settings, /className="settings-tabs"/)
  assert.match(titlebar, /<span>ATTB<\/span>\{version && <b>\| v\{version\}<\/b>\}/)
  assert.match(app, /className=\{\(\) => `nav-item \${activeTab === id \? 'active' : ''}`\}/)
  assert.match(css, /\.sidebar-workspace-header\{[^}]*height:var\(--layout-workspace-header-height\)/)
  assert.doesNotMatch(app, /sidebar-app-name|<span>Arrow to the Build<\/span>/)
  assert.match(css, /\.workspace-tabs\{[^}]*height:var\(--layout-workspace-header-height\)[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*gap:0[^}]*padding:12px 0 0/)
  assert.match(app, /<Fragment key=\{section\.label\}>/)
  assert.doesNotMatch(app, /className="(?:help|character)-nav-section"/)
  assert.match(css, /\.editor-nav>\.sidebar-section-label:not\(:first-child\),\.help-tools-nav>\.sidebar-section-label:not\(:first-child\),\.character-tracker-nav>\.sidebar-section-label:not\(:first-child\)\{[^}]*margin-top:11px/)
  assert.match(css, /\.editor-nav \.nav-item,\.help-tools-nav \.nav-item,\.character-tracker-nav \.nav-item\{[^}]*min-height:48px[^}]*padding:11px 13px/)
  assert.match(css, /\.editor-nav \.nav-item b,\.help-tools-nav \.nav-item b,\.character-tracker-nav \.nav-item b\{[^}]*font-size:\.82rem/)
  assert.match(css, /\.sidebar-nav-surface>\.sidebar-nav\{[^}]*scrollbar-gutter:stable/)
  assert.match(css, /\.character-bar\{[^}]*align-items:center/)
  assert.match(css, /\.character-bar>\.topbar-field\{[^}]*align-self:center/)
  assert.match(css, /\.workspace-tab\{[^}]*width:100%[^}]*border-bottom:1px solid var\(--color-border\)/)
  assert.match(css, /\.workspace-tab:hover:not\(\.active\)\{[^}]*border-bottom-color:var\(--color-border\)/)
  assert.match(css, /\.workspace-tab\.active\{[^}]*border:1px solid var\(--color-border\)[^}]*border-bottom:0[^}]*border-radius:12px 12px 0 0/)
  assert.match(css, /\.workspace-tab\{[^}]*height:72px[^}]*gap:5px/)
  assert.match(css, /\.workspace-tab svg\{[^}]*width:28px[^}]*height:28px/)
  assert.match(css, /\.workspace-tab span\{[^}]*font-size:\.75rem/)
  assert.match(css, /\.workspace-tab\.active::before,\.workspace-tab\.active::after\{[^}]*width:13px[^}]*height:13px/)
  assert.match(css, /\.workspace-tab\.active::before\{[^}]*left:-12px[^}]*radial-gradient\(circle at 0 0/)
  assert.match(css, /\.workspace-tab\.active::after\{[^}]*right:-12px[^}]*radial-gradient\(circle at 100% 0/)
  assert.doesNotMatch(app, /character-level-center|NumberStepper|OverrideResetButton/)
  assert.match(app, /className="build-control topbar-field"/)
  assert.match(app, /<span className="topbar-label">Build<\/span>/)
  assert.match(app, /Gameplay and Build Info, Tools, and Guides/)
  assert.doesNotMatch(app, /<span className="eyebrow">Editable build<\/span>/i)
  assert.doesNotMatch(app, /Saved build is current/)
  assert.match(css, /\.help-tools-bar \.character-switcher\{[^}]*width:min\(390px,40vw\)[^}]*flex:0 0 min\(390px,40vw\)/)
  assert.match(app, /<header className="settings-workspace-bar"><h1>Application Settings<\/h1><\/header>/)
  assert.doesNotMatch(app, /<span className="mono">\{editor\.draft\.build_id\}/)
  assert.match(css, /\.character-bar\{[^}]*height:var\(--layout-workspace-header-height\)[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.help-tools-bar\{[^}]*height:var\(--layout-workspace-header-height\)/)
  assert.match(css, /\.settings-workspace-bar\{[^}]*height:var\(--layout-workspace-header-height\)/)
  assert.doesNotMatch(css, /\.build-editor-bar\{[^}]*min-height:(?:112|150)px/)
  assert.match(css, /\.sidebar-settings-tab\{[^}]*justify-content:center[^}]*border:0/)
  assert.match(css, /\.sidebar-settings-dock\{[^}]*border-top:1px solid var\(--color-border\)/)
  assert.match(css, /\.sidebar-settings-dock\.active\{[^}]*border-top-color:transparent[^}]*linear-gradient/)
  assert.match(css, /\.settings-sidebar-nav \.nav-item:not\(\.active\)\{[^}]*background:transparent/)
  assert.match(app, /className="sidebar-nav character-tracker-nav"/)
  assert.match(app, /label: 'Build progress'/)
  assert.match(app, /\['\/character-data', 'Backups & Import', '⇄'\]/)
  assert.match(app, /Return to previous workspace/)
  assert.match(css, /\.sidebar-mode-settings \.sidebar-nav-surface\{[^}]*linear-gradient/)
})

test('CharacterModal resets with the resolved build id instead of an undefined shorthand', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  assert.match(modal, /setForm\(emptyForm\(buildId\)\)/)
  assert.doesNotMatch(modal, /\{ \.\.\.EMPTY,[^}]*\bbuild_id\b(?!\s*:)/)
})

test('renderer state-template spreads do not contain unbound snake_case shorthand', () => {
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
      const key = match[1]
      const bound = new RegExp(`\\b(?:const|let|var|function)\\s+${key}\\b|\\b${key}\\s*=>`).test(source)
      if (!bound) offenders.push(`${path.relative(root, file)}: ${key}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test('the workspace scroll region keeps a real grid row and fill height', () => {
  const css = readAppCss()
  const workspace = css.match(/\.workspace\{[^}]*\}/)?.[0] || ''
  const scroll = [...css.matchAll(/\.content-scroll\{[^}]*\}/g)].map(match => match[0]).join(' ')
  assert.match(workspace, /grid-template-rows:\s*minmax\(0,\s*1fr\)/)
  assert.doesNotMatch(scroll, /[;{]height:0[;}]/)
  assert.match(scroll, /height:100%/)
})

test('Character Tracker progression sections use the shared controlled disclosure pattern', () => {
  const equipment = read('src/renderer/pages/EquipmentPage.jsx')
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  const status = read('src/renderer/pages/StatusPage.jsx')
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  for (const source of [equipment, rotations, status, skills]) {
    assert.match(source, /DisclosureSection/)
    assert.match(source, /DisclosureToolbar/)
  }
  assert.doesNotMatch(equipment, /<details/)
  assert.doesNotMatch(rotations, /<details/)
  assert.match(rotations, /live-action-bars-panel/)
})

test('skill icons have a generated local source and are used on player skill surfaces', () => {
  const component = read('src/renderer/components/SkillIcon.jsx')
  const skillLine = read('src/renderer/pages/SkillLinePage.jsx')
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  const pkg = JSON.parse(read('package.json'))
  assert.match(component, /skill-icons\/\$\{encodeURIComponent\(skillId\)\}\.png/)
  assert.match(skillLine, /<SkillIcon/)
  assert.match(skills, /<SkillIcon/)
  assert.equal(pkg.scripts['fetch:icons'], 'node tools/fetch-skill-icons.mjs')
})

test('the first-character modal always has an escape path', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  assert.match(modal, /event\.key === 'Escape'\) onClose\(\)/)
  assert.doesNotMatch(modal, /Escape' && !firstCharacter/)
  assert.doesNotMatch(modal, /!firstCharacter && event\.target === event\.currentTarget/)
})

test('missing hero art renders nothing instead of placeholder text', () => {
  const cached = read('src/renderer/components/CachedImage.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  assert.match(cached, /if \(!src && fallback === 'none'\) return null/)
  assert.match(setup, /character-hero-image.*fallback="none"/)
})

test('the Electron shell keeps renderer isolation and blocks unexpected navigation', () => {
  const main = read('src/main/main.js')
  const html = read('index.html')
  assert.match(main, /contextIsolation:\s*true/)
  assert.match(main, /nodeIntegration:\s*false/)
  assert.match(main, /sandbox:\s*true/)
  assert.match(main, /webSecurity:\s*true/)
  assert.match(main, /fileURLToPath\(target\)/)
  assert.match(main, /target\.origin === new URL\(devServerUrl\)\.origin/)
  assert.match(html, /script-src 'self';/)
  assert.doesNotMatch(html, /script-src[^;]*unsafe-inline/)
  assert.match(html, /object-src 'none'/)
})

test('files that reference the React namespace import React explicitly', () => {
  const offenders = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(full); continue }
      if (!/\.(jsx?|tsx?)$/.test(entry.name)) continue
      const source = fs.readFileSync(full, 'utf8')
      if (!/\bReact\.\w/.test(source)) continue
      if (!/import\s+React[,\s]/.test(source) && !/import\s+\*\s+as\s+React\b/.test(source)) {
        offenders.push(path.relative(root, full))
      }
    }
  }
  walk(path.join(root, 'src'))
  assert.deepEqual(offenders, [])
})

test('renderer code does not use browser-native prompt, confirm, or alert dialogs', () => {
  const offenders = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.jsx?$/.test(entry.name) && /window\.(?:prompt|confirm|alert)\s*\(/.test(fs.readFileSync(full, 'utf8'))) {
        offenders.push(path.relative(root, full))
      }
    }
  }
  walk(path.join(root, 'src/renderer'))
  assert.deepEqual(offenders, [])
})

test('Class Configuration foreign-line filtering reads the row it is filtering', () => {
  const source = read('src/renderer/pages/BuildClassConfigurationPage.jsx')
  assert.match(source, /filter\(\(row, rowIndex\) => rowIndex !== index && row\.source_class !== baseClass\)/)
  assert.doesNotMatch(source, /filter\(\(_, rowIndex\) => rowIndex !== index && row\.source_class/)
})

test('addon UI exposes the single-addon flow without retired bridge controls', () => {
  const setup = read('src/renderer/components/AddonSetupModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(setup, /Install Addon and Enable Sync/)
  assert.match(setup, /ESO-controlled sync/)
  assert.match(settings, /ATTB SavedVariables/)
  assert.match(settings, /ESO addon ready/)
  assert.match(settings, /Allow synced-data overrides/)
  assert.doesNotMatch(`${setup}\n${settings}`, /Small sync bridge|Sync bridge SavedVariables|bridge budget/i)
})

test('Build Editor pages stay lazy-loaded behind a Suspense boundary', () => {
  const index = read('src/index.jsx')
  const app = read('src/renderer/App.jsx')
  for (const page of [
    'BuildLibraryPage', 'NewBuildPage', 'BuildOverviewPage', 'BuildCharacterSetupPage',
    'BuildClassConfigurationPage', 'BuildSkillsPage', 'BuildLevelingPage', 'BuildEquipmentPage',
    'BuildChampionPointsPage', 'BuildLoadoutsPage', 'BuildReviewPage', 'BuildSetupGuidePage',
    'BuildEditorImportExportPage', 'BuildCompanionsPage'
  ]) {
    assert.match(index, new RegExp(`const ${page} = lazy\\(\\(\\) => import\\(`), `${page} should be lazy-loaded`)
  }
  assert.match(app, /<Suspense fallback=\{[^}]*\}>[\s\S]*<Outlet/)
})

test('the bundler keeps vendor code and the skill catalog out of the main chunk', () => {
  const vite = read('vite.config.js')
  assert.match(vite, /manualChunks/)
  assert.match(vite, /eso-skill-catalog/)
  assert.match(vite, /vendor/)
})

test('first-run addon setup cannot stack with the discovery import modal', () => {
  const app = read('src/renderer/App.jsx')
  assert.match(app, /if \(!addonSetupOpen && !modal\) setAddonImportOpen\(true\)/)
  assert.match(app, /open=\{addonImportOpen && !addonSetupOpen && !modal\}/)
  assert.match(app, /else setAddonImportOpen\(false\)/)
})

test('addon onboarding explains ESO-controlled save timing and reloadui', () => {
  const setup = read('src/renderer/components/AddonSetupModal.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(setup, /Important limitation from ESO/)
  assert.match(setup, /\/reloadui/)
  assert.match(setup, /showthread\.php\?t=8957/)
  assert.match(settings, /\/reloadui/)
})

test('the skills overview keeps the paginated unlock roadmap', () => {
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  assert.match(skills, /Unlock roadmap/)
  assert.match(skills, /SUGGESTIONS_PER_PAGE = 5/)
  assert.match(skills, /Previous 5/)
  assert.match(skills, /Next 5/)
  assert.match(skills, /rankGap/)
})

test('current action bars support addon snapshots and persistent manual tracking with player-facing skill identity', () => {
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  const handlers = read('src/main/ipc/characterHandlers.js')
  const migration = read('src/main/database/migrations/011_manual_action_bars.sql')
  assert.match(rotations, /CurrentActionBars/)
  assert.match(rotations, /ManualHotbar/)
  assert.match(rotations, /manual_action_bars/)
  assert.match(rotations, /catalogSkillIdForName/)
  assert.match(rotations, /<SkillIcon/)
  assert.match(handlers, /manual_action_bars_json/)
  assert.match(migration, /manual_action_bars_json/)
  assert.doesNotMatch(rotations, /PROGRESSION-ID|matchMethod/)
})

test('the companion tracker uses companion and target selectors with portrait-ready identity', () => {
  const page = read('src/renderer/pages/CompanionsPage.jsx')
  assert.match(page, /<span>Companion<\/span>/)
  assert.match(page, /<span>Target setup<\/span>/)
  assert.match(page, /CompanionPortrait/)
  assert.match(page, /chooseSetup/)
  assert.match(page, /withCompanionTarget/)
  assert.match(page, /Gear direction/)
  assert.match(page, /Ability order/)
  assert.match(page, /Build notes/)
  assert.doesNotMatch(page, /build-card-grid|preset-card-grid/)
})

test('v3 Character Tracker keeps build tools out of Basic Info and makes synced overrides actionable', () => {
  const app = read('src/renderer/App.jsx')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const status = read('src/renderer/pages/StatusPage.jsx')
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  const cp = read('src/renderer/pages/ChampionPointsPage.jsx')
  assert.match(app, /\['\/setup', 'Basic Info'/)
  assert.match(setup, /<h1>Basic info<\/h1>/)
  assert.doesNotMatch(setup, /Create New Build from Character|Adapt Target to Character/)
  assert.match(settings, /<CharacterBuildTools \/>/)
  assert.match(status, /<SyncOverrideBar/)
  assert.match(skills, /<SyncOverrideBar/)
  assert.match(cp, /<SyncOverrideBar/)
  assert.match(setup, /Identity & role/)
  assert.match(setup, /Combat setup/)
  assert.match(setup, /Attributes/)
  assert.match(setup, /Subclass/)
  assert.doesNotMatch(setup, /attribute-target-track/)
  assert.doesNotMatch(status, /Passive progression/)
  assert.match(status, /Ability purchases and morph choices remain under Skills &amp; Passives/)
})

test('v3 Equipment and Champion Points present actionable progression rather than opaque tables', () => {
  const equipment = read('src/renderer/pages/EquipmentPage.jsx')
  const cpCard = read('src/renderer/components/CPCard.jsx')
  const buildCpEditor = read('src/renderer/pages/BuildChampionPointsPage.jsx')
  assert.match(equipment, /Your gear path/)
  assert.match(equipment, /Where to get it/)
  assert.match(equipment, /set\.name/)
  for (const heading of ['Type', 'Category', 'Enchantment', 'Trait', 'Quality', 'Status', 'Tradeable']) assert.match(equipment, new RegExp(heading))
  assert.doesNotMatch(equipment, /eyebrow\">\{set\.role/)
  assert.match(cpCard, /Do this next/)
  assert.match(cpCard, /Unlock-aware first pass/)
  assert.match(cpCard, /Constellation Map/)
  assert.match(buildCpEditor, /First build targets/)
})

test('v3 Skills overview uses personal quick-add tracking and bottom disclosure rails', () => {
  const skills = read('src/renderer/pages/SkillsPage.jsx')
  const disclosure = read('src/renderer/components/DisclosureSection.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(skills, /Final Build Skills/)
  assert.match(skills, /Add another skill line/)
  assert.match(skills, /addTrackedSkillLine/)
  assert.match(skills, /deleteTrackedSkillLine/)
  assert.match(skills, /skill-line-remove-button/)
  assert.match(disclosure, /disclosure-toggle-rail/)
  const characterCss = read('src/renderer/styles/Character.css')
  assert.match(characterCss, /\.disclosure-toggle-rail\{[^}]*height:var\(--disclosure-rail-height\)/)
  assert.equal((characterCss.match(/\.disclosure-toggle-rail\{/g) || []).length, 1, 'disclosure rail sizing should have one authoritative rule')
  assert.doesNotMatch(settings, /Personal progression/)
})

test('v3 addon snapshot normalization preserves already-collected zone and power values for Basic Info', () => {
  const codec = read('src/main/addon/snapshotCodec.js')
  const store = read('src/main/addon/characterSyncStore.js')
  const setup = read('src/renderer/pages/SetupPage.jsx')
  assert.match(codec, /zone:\s*\{/)
  assert.match(codec, /power:\s*normalizePower/)
  assert.match(store, /observed:\s*\{[\s\S]*identity:\s*snapshot\.identity/)
  assert.match(setup, /Last known zone/)
  assert.match(setup, /effectiveMaximum/)
})

test('the addon watcher callback only uses imported or locally defined constants', () => {
  const integration = read('src/main/addon/integration.js')
  const imported = new Set()
  for (const block of integration.matchAll(/(?:const|let)\s*\{([^{}]+?)\}\s*=\s*require\([^)]+\)/g)) {
    for (const part of block[1].split(',')) {
      const name = part.trim().split(':').pop().trim()
      if (name) imported.add(name)
    }
  }
  const locallyDefined = new Set([...integration.matchAll(/(?:const|let|function)\s+([A-Z][A-Z0-9_]+)\b/g)].map(match => match[1]))
  const watchMatch = integration.match(/fs\.watch\([^,]+,[^,]+,\s*\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}\s*\)/)
  assert.ok(watchMatch, 'expected to find the fs.watch callback')
  const used = new Set([...watchMatch[2].matchAll(/[^.\w]([A-Z][A-Z0-9_]{3,})\b/g)].map(match => match[1]))
  const missing = [...used].filter(name => !imported.has(name) && !locallyDefined.has(name))
  assert.deepEqual(missing, [])
})

test('Settings sections keep explicit query routes instead of bouncing by workspace', () => {
  const app = read('src/renderer/App.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  assert.match(app, /to=\{`\/settings\?tab=\$\{id\}`\}/)
  assert.match(settings, /setSearchParams\(\{ tab \}, \{ replace: true \}\)/)
  assert.doesNotMatch(settings, /next === 'general' \? \{\}/)
})

test('component styles use one Theme Schema color contract instead of hard-coded colors', () => {
  const files = rendererStyleFiles
  const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g
  const offenders = []
  for (const file of files) {
    const source = read(file)
    if (literal.test(source)) offenders.push(file)
    literal.lastIndex = 0
  }
  assert.deepEqual(offenders, [])

  const schema = JSON.parse(read('resources/data/theme-schema.json'))
  const builtins = JSON.parse(read('resources/themes/builtin-themes.json'))
  const contract = schema.tokens.map(token => token.key).sort()
  for (const theme of builtins.themes) assert.deepEqual(Object.keys(theme.colors).sort(), contract)

  const themes = read('src/renderer/styles/themes.css')
  const allStyles = [themes, read('src/renderer/styles/tokens.css'), ...files.map(read)].join('\n')
  const declared = new Set([...allStyles.matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]))
  const used = new Set([...allStyles.matchAll(/var\(--([\w-]+)/g)].map(match => match[1]))
  assert.deepEqual([...used].filter(name => !declared.has(name) && name !== 'build-accent').sort(), [])

  const themeTypography = /html\[data-theme(?:-base)?=[^\]]+\][^{]*\{[^}]*\b(?:font-family|font-size|font-weight|letter-spacing|line-height)\s*:/gs
  assert.doesNotMatch(allStyles, themeTypography)
})

test('Settings exposes built-in and custom themes through the Theme Manager', () => {
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const manager = read('src/renderer/components/ThemeManager.jsx')
  const builtins = JSON.parse(read('resources/themes/builtin-themes.json'))
  assert.match(settings, /<ThemeManager flash=\{flash\} \/>/)
  assert.match(manager, /Customize Current Theme/)
  assert.match(manager, /Import Theme JSON/)
  assert.match(manager, /Export JSON Template/)
  const editor = read('src/renderer/components/ThemeEditorModal.jsx')
  const colorField = read('src/renderer/components/ThemeColorField.jsx')
  assert.match(editor, /Advanced Colors/)
  assert.match(editor, /Live application preview/)
  assert.match(editor, /Standalone · explicit full palette/)
  assert.match(colorField, /type="color"/)
  assert.match(colorField, />HEX</)
  assert.match(colorField, /\['r', 'g', 'b'\]/)
  for (const label of ['ATTB Default', 'Deep Dark', 'Light', 'Old Scrolls', 'SkyTrim', 'Woodland', 'Watermelon', 'Rainbow Light', 'Rainbow Dark', 'Deadx_xSmile']) {
    assert.ok(builtins.themes.some(theme => theme.name === label), `missing built-in theme ${label}`)
  }
  assert.match(read('src/renderer/styles/App.css'), /data-theme-base=\"deadx-xsmile\"/)
})
test('the custom title bar uses compact ATTB and running-version branding', () => {
  const title = read('src/renderer/components/TitleBar.jsx')
  assert.match(title, /window\.api\.app\.getInfo\(\)/)
  assert.match(title, /<span>ATTB<\/span>/)
  assert.match(title, /<b>\| v\{version\}<\/b>/)
  assert.doesNotMatch(title, /<span>Arrow to the Build<\/span>/)
})

test('Help and Tools is a dedicated workspace with grouped reference sections', () => {
  const app = read('src/renderer/App.jsx')
  const routes = read('src/index.jsx')
  const helpMeta = read('src/renderer/utils/helpReference.mjs')
  const home = read('src/renderer/pages/HelpHomePage.jsx')
  const reference = read('src/renderer/pages/BuildReferencePage.jsx')
  const traits = read('src/renderer/pages/TraitReferencePage.jsx')
  const themeGuide = read('src/renderer/pages/ThemeGuidePage.jsx')
  const themeEditorCss = read('src/renderer/styles/ThemeEditor.css')

  assert.match(app, /function HelpSidebarNav/)
  assert.match(app, /function WorkspaceSwitcher/)
  assert.match(app, /\['build-editor', 'Build', 'Build Editor'\]/)
  assert.match(app, /\['help', 'Help', 'Help & Tools'\]/)
  assert.match(app, /workspace === 'help'/)
  assert.match(routes, /path="help" element=\{<HelpHomePage \/>\}/)
  assert.match(routes, /path="help\/topic\/:topic" element=\{<BuildReferencePage \/>\}/)
  assert.match(routes, /path="help\/themes" element=\{<ThemeGuidePage \/>\}/)
  assert.match(routes, /path="help\/topic\/traits" element=\{<TraitReferencePage \/>\}/)
  assert.match(routes, /path="help\/traits" element=\{<Navigate to="\/help\/topic\/traits" replace \/>\}/)

  for (const section of ['Gear', 'Combat', 'Progression', 'Companions', 'Reference']) assert.match(helpMeta, new RegExp(`label: '${section}'`))
  for (const topic of ['Gear & Sets', 'Enchantments & Glyphs', 'Combat Stats & Caps', 'Buffs, Debuffs & Status Effects', 'Mundus Stones', 'Champion Points', 'Scribing', 'Consumables', 'Build Glossary', 'Companion Builds & Traits']) {
    assert.match(helpMeta, new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${topic} should be present in Help & Tools`)
  }
  assert.match(home, /Find the answer by what you are trying to do/)
  assert.match(home, /help-task-grid/)
  assert.match(home, /Reference by system/)
  assert.match(reference, /category === 'Reference' \? 'Build reference'/)
  assert.doesNotMatch(reference, /Reference reference/)
  assert.match(reference, /‹ Help &amp; Tools/)
  assert.match(traits, /‹ Help &amp; Tools/)
  assert.match(themeGuide, /Themes &amp; Theme Schema/)
  assert.match(themeGuide, /theme-guide-page/)
  assert.match(themeEditorCss, /\.theme-guide-page\{display:grid;gap:16px\}/)
  assert.match(themeEditorCss, /\.help-reference-grid\{display:grid;gap:14px\}/)
  assert.match(themeGuide, /Export JSON Template/)
  for (const trait of ['Divines', 'Impenetrable', 'Charged', 'Precise', 'Bloodthirsty', 'Harmony', 'Triune']) assert.match(traits, new RegExp(`\\['${trait}'`), `${trait} should be present in the trait reference`)
  assert.match(reference, /18,200/)
  assert.match(reference, /125%/)
  assert.match(reference, /Focus Script/)
  assert.match(reference, /Aggressive/)
  for (const scribingGuideAnchor of [
    'free base-game system as of July 10, 2025',
    'The Second Era of Scribing',
    'The Wing of the Indrik',
    'The Wing of the Gryphon',
    'The Wing of the Dragon',
    'The Wing of the Netch',
    'Luminous Ink',
    '50 Class Script Scraps',
    'daily Mages Guild quests',
    'daily World Boss quests',
    'daily World Event quests',
    'Two different things are called Class Mastery',
    "Ulfsild's Contingency - Bleed / Lingering Torment / Resolve",
    'Mages Guild rank 5',
    'The build is your shopping list',
    'Official ESO Scribing Help'
  ]) assert.ok(reference.toLowerCase().includes(scribingGuideAnchor.toLowerCase()), `${scribingGuideAnchor} should remain in the Scribing help guide`)
})


test('v3 workspace UX keeps equipment scannable and prioritizes editable build work', () => {
  const equipment = read('src/renderer/pages/EquipmentPage.jsx')
  const library = read('src/renderer/pages/BuildLibraryPage.jsx')
  const review = read('src/renderer/pages/BuildReviewPage.jsx')

  assert.match(equipment, /live-equipment-columns/)
  assert.doesNotMatch(equipment, /Armor &amp; jewelry bonuses/)
  assert.doesNotMatch(equipment, /Weapon sets stay below/)
  assert.match(equipment, /live-set-summary/)
  const characterCss = read('src/renderer/styles/Character.css')
  assert.match(characterCss, /\.live-equipment-columns\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(characterCss, /\.live-gear-panel\{[^}]*gap:14px/)
  assert.match(characterCss, /\.live-equipment-row-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(characterCss, /\.live-equipment-fact b\{[^}]*white-space:normal/)
  assert.doesNotMatch(characterCss, /\.live-equipment-fact b\{[^}]*overflow-wrap:anywhere/)
  assert.match(characterCss, /\.live-set-summary-list\{[^}]*--live-set-count:1[^}]*repeat\(var\(--live-set-count\),minmax\(0,1fr\)\)/)
  assert.match(equipment, /Current Equipped Armor/)
  assert.match(equipment, /Current Equipped Weapons & Jewelry/)
  assert.match(equipment, /<small>Set<\/small>/)
  assert.doesNotMatch(equipment, /live-gear-rack|live-gear-card|live-gear-table/)
  assert.match(equipment, /v3-gear-piece-check/)
  assert.match(equipment, /v3-gear-piece-head/)
  assert.match(equipment, /Where to get it/)
  assert.match(equipment, /Tradeable/)

  assert.match(library, /build-library-command-panel/)
  assert.match(library, /Your work/)
  assert.match(library, /Protected starting points/)
  assert.match(library, /Technical details/)
  assert.match(review, /review-clean-state/)
})

test('Settings stays concise while character backups live in Character Tracker', () => {
  const app = read('src/renderer/App.jsx')
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  const characterData = read('src/renderer/pages/CharacterDataPage.jsx')
  const routes = read('src/index.jsx')
  assert.match(app, /\['general', 'General',/)
  assert.match(app, /\['character', 'Character',/)
  assert.match(app, /\['addon', 'ESO Addon & Sync',/)
  assert.match(app, /\['editor', 'Build Editor',/)
  assert.doesNotMatch(settings, /className="settings-tabs"/)
  assert.doesNotMatch(settings, /Export Current Character|Import Character Backup/)
  assert.match(characterData, /<h1>Backups &amp; Import<\/h1>/)
  assert.match(characterData, /Export Current Character/)
  assert.match(characterData, /Import Character Backup/)
  assert.match(routes, /path="character-data" element=\{<CharacterDataPage \/>\}/)
  assert.match(routes, /path="help\/import-export" element=\{<Navigate to="\/character-data" replace \/>\}/)
  assert.match(routes, /path="build-editor\/settings" element=\{<Navigate to="\/settings\?tab=editor" replace \/>\}/)
})


test('Champion Point locator keeps ESO clusters collapsed to their outer portal', () => {
  const map = read('src/renderer/components/CPConstellationMap.jsx')
  const card = read('src/renderer/components/CPCard.jsx')
  assert.match(map, /Route inside:/)
  assert.match(map, /portalDetails\.get\(star\.id\)/)
  assert.match(map, /mainIdFor\(focusId\)/)
  assert.match(map, /mainIdFor\(nextId\)/)
  assert.doesNotMatch(map, /cp-map-cluster-inset|Inside \{clusterRootStar/)
  assert.match(card, /Multi-star ESO clusters stay collapsed to their portal/)
})


test('Champion Point constellation locator focuses the selected route and supports map navigation', () => {
  const map = read('src/renderer/components/CPConstellationMap.jsx')
  const card = read('src/renderer/components/CPCard.jsx')
  const css = read('src/renderer/styles/Character.css')
  assert.match(map, /route\.slice\(0, index \+ 1\)/)
  assert.match(map, /later build targets stay dim/)
  assert.match(map, /onWheel=\{handleWheel\}/)
  assert.match(map, /onPointerDown=\{handlePointerDown\}/)
  assert.match(map, /Fit constellation to view/)
  assert.match(map, /cp-map-hover-tooltip/)
  assert.match(map, /onPointerEnter=/)
  assert.match(map, /Route to selected node/)
  assert.match(card, /nextId=\{isNext \? focusId : null\}/)
  assert.match(card, /Hover any node for its name/)
  assert.match(css, /\.cp-map-controls\{position:absolute/)
  assert.match(css, /\.cp-map-hover-tooltip\{position:absolute/)
})


test('Champion Point node locator opens one full workspace map instead of stacked hover popovers', () => {
  const map = read('src/renderer/components/CPConstellationMap.jsx')
  const card = read('src/renderer/components/CPCard.jsx')
  const css = read('src/renderer/styles/Character.css')
  assert.match(card, /className="cp-map-workspace/)
  assert.match(card, /× Close Map/)
  assert.match(card, /role="dialog" aria-modal="true"/)
  assert.match(card, /setMapFocusId\(focusId \?\? nextId \?\? null\)/)
  assert.doesNotMatch(map, /cp-map-popover|Pinned ·|onMouseEnter=|onMouseLeave=/)
  assert.doesNotMatch(css, /\.cp-map-popover/)
  assert.match(css, /\.cp-map-workspace\{position:fixed/)
})
