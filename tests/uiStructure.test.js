'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const readAppCss = () => [
  'src/renderer/styles/App.css',
  'src/renderer/styles/BuildEditor.css',
  'src/renderer/styles/Addon.css'
].map(read).join('\n')

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
  assert.match(css, /\.sidebar-workspace-header\{[^}]*height:84px/)
  assert.doesNotMatch(app, /sidebar-app-name|<span>Arrow to the Build<\/span>/)
  assert.match(css, /\.workspace-tabs\{[^}]*height:84px[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*gap:0[^}]*padding:12px 0 0/)
  assert.match(app, /<Fragment key=\{section\.label\}>/)
  assert.doesNotMatch(app, /className="(?:help|character)-nav-section"/)
  assert.match(css, /\.editor-nav>\.sidebar-section-label:not\(:first-child\),\.help-tools-nav>\.sidebar-section-label:not\(:first-child\),\.character-tracker-nav>\.sidebar-section-label:not\(:first-child\)\{[^}]*margin-top:11px/)
  assert.match(css, /\.editor-nav \.nav-item,\.help-tools-nav \.nav-item,\.character-tracker-nav \.nav-item\{[^}]*min-height:48px[^}]*padding:11px 13px/)
  assert.match(css, /\.editor-nav \.nav-item b,\.help-tools-nav \.nav-item b,\.character-tracker-nav \.nav-item b\{[^}]*font-size:\.82rem/)
  assert.match(css, /\.sidebar-nav-surface>\.sidebar-nav\{[^}]*scrollbar-gutter:stable/)
  assert.match(css, /\.character-bar\{[^}]*align-items:center/)
  assert.match(css, /\.character-bar>\.topbar-field\{[^}]*align-self:center/)
  assert.match(css, /\.workspace-tab\{[^}]*width:100%[^}]*border-bottom:1px solid var\(--line\)/)
  assert.match(css, /\.workspace-tab:hover:not\(\.active\)\{[^}]*border-bottom-color:var\(--line\)/)
  assert.match(css, /\.workspace-tab\.active\{[^}]*border:1px solid var\(--line\)[^}]*border-bottom:0[^}]*border-radius:12px 12px 0 0/)
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
  assert.match(css, /\.character-bar\{[^}]*height:84px[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.help-tools-bar\{[^}]*height:84px/)
  assert.match(css, /\.settings-workspace-bar\{[^}]*height:84px/)
  assert.doesNotMatch(css, /\.build-editor-bar\{[^}]*min-height:(?:112|150)px/)
  assert.match(css, /\.sidebar-settings-tab\{[^}]*justify-content:center[^}]*border:0/)
  assert.match(css, /\.sidebar-settings-dock\{[^}]*border-top:1px solid var\(--line\)/)
  assert.match(css, /\.sidebar-settings-dock\.active\{[^}]*border-top-color:transparent[^}]*linear-gradient/)
  assert.match(css, /\.settings-sidebar-nav \.nav-item:not\(\.active\)\{[^}]*background:transparent!important/)
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

test('collapsible equipment and rotation stages use the real details open attribute', () => {
  for (const file of ['src/renderer/pages/EquipmentPage.jsx', 'src/renderer/pages/RotationsPage.jsx']) {
    const source = read(file)
    assert.doesNotMatch(source, /defaultOpen/)
    assert.match(source, /<details[^>]*\bopen=\{/)
  }
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
  assert.match(setup, /className="hero-image" fallback="none"/)
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

test('live action bars use player-facing skill identity instead of bridge diagnostics', () => {
  const rotations = read('src/renderer/pages/RotationsPage.jsx')
  assert.match(rotations, /LiveActionBars/)
  assert.match(rotations, /catalogSkillIdForName/)
  assert.match(rotations, /<SkillIcon/)
  assert.doesNotMatch(rotations, /PROGRESSION-ID|matchMethod/)
})

test('the companion tracker uses companion and build selectors with a spacious detail view', () => {
  const page = read('src/renderer/pages/CompanionsPage.jsx')
  assert.match(page, /<span>Companion<\/span>/)
  assert.match(page, /<span>Build<\/span>/)
  assert.match(page, /chooseSetup/)
  assert.match(page, /withCompanionTarget/)
  assert.match(page, /Gear direction/)
  assert.match(page, /Ability priority/)
  assert.match(page, /Build notes/)
  assert.doesNotMatch(page, /build-card-grid|preset-card-grid/)
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

test('component styles use one complete theme palette instead of hard-coded colors', () => {
  const files = [
    'src/renderer/styles/global.css',
    'src/renderer/styles/App.css',
    'src/renderer/styles/BuildEditor.css',
    'src/renderer/styles/Addon.css'
  ]
  const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g
  const offenders = []
  for (const file of files) {
    const source = read(file)
    if (literal.test(source)) offenders.push(file)
    literal.lastIndex = 0
  }
  assert.deepEqual(offenders, [])

  const themes = read('src/renderer/styles/themes.css')
  const propsFor = selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const block = themes.match(new RegExp(`${escaped}\\{([^}]*)\\}`, 's'))
    assert.ok(block, `missing theme block ${selector}`)
    return [...block[1].matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]).sort()
  }
  const baseProps = propsFor(':root')
  for (const selector of ['html[data-theme="dark"]', 'html[data-theme="light"]', 'html[data-theme="old-scrolls"]', 'html[data-theme="skytrim"]', 'html[data-theme="woodland"]']) {
    assert.deepEqual(propsFor(selector), baseProps, `${selector} must override the full palette contract`)
  }

  const allStyles = [themes, ...files.map(read)].join('\n')
  const declared = new Set([...allStyles.matchAll(/--([\w-]+)\s*:/g)].map(match => match[1]))
  const used = new Set([...allStyles.matchAll(/var\(--([\w-]+)/g)].map(match => match[1]))
  assert.deepEqual([...used].filter(name => !declared.has(name)).sort(), [])

  // Themes may change palette and surface treatment, but not typography metrics.
  // Keeping one font stack prevents labels and headings from shifting when a theme changes.
  const themeTypography = /html\[data-theme=[^\]]+\][^{]*\{[^}]*\b(?:font-family|font-size|font-weight|letter-spacing|line-height)\s*:/gs
  assert.doesNotMatch(allStyles, themeTypography)
})

test('Settings exposes every supported color theme', () => {
  const settings = read('src/renderer/pages/SettingsPage.jsx')
  for (const [value, label] of [
    ['default', 'ATTB Default'],
    ['dark', 'Deep Dark'],
    ['light', 'Light'],
    ['old-scrolls', 'Old Scrolls'],
    ['skytrim', 'SkyTrim'],
    ['woodland', 'Woodland']
  ]) {
    assert.match(settings, new RegExp(`<option value="${value}">${label}<\\/option>`))
  }
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

  assert.match(app, /function HelpSidebarNav/)
  assert.match(app, /function WorkspaceSwitcher/)
  assert.match(app, /\['build-editor', 'Build', 'Build Editor'\]/)
  assert.match(app, /\['help', 'Help', 'Help & Tools'\]/)
  assert.match(app, /workspace === 'help'/)
  assert.match(routes, /path="help" element=\{<HelpHomePage \/>\}/)
  assert.match(routes, /path="help\/topic\/:topic" element=\{<BuildReferencePage \/>\}/)
  assert.match(routes, /path="help\/topic\/traits" element=\{<TraitReferencePage \/>\}/)
  assert.match(routes, /path="help\/traits" element=\{<Navigate to="\/help\/topic\/traits" replace \/>\}/)

  for (const section of ['Gear', 'Combat', 'Progression', 'Companions', 'Reference']) assert.match(helpMeta, new RegExp(`label: '${section}'`))
  for (const topic of ['Gear & Sets', 'Enchantments & Glyphs', 'Combat Stats & Caps', 'Buffs, Debuffs & Status Effects', 'Mundus Stones', 'Champion Points', 'Scribing', 'Consumables', 'Build Glossary', 'Companion Builds & Traits']) {
    assert.match(helpMeta, new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${topic} should be present in Help & Tools`)
  }
  assert.match(home, /ESO knowledge beside the build/)
  assert.match(reference, /‹ Help &amp; Tools/)
  assert.match(traits, /‹ Help &amp; Tools/)
  for (const trait of ['Divines', 'Impenetrable', 'Charged', 'Precise', 'Bloodthirsty', 'Harmony', 'Triune']) assert.match(traits, new RegExp(`\\['${trait}'`), `${trait} should be present in the trait reference`)
  assert.match(reference, /18,200/)
  assert.match(reference, /125%/)
  assert.match(reference, /Focus Script/)
  assert.match(reference, /Aggressive/)
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
