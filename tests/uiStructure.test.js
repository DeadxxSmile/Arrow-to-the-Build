'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

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

test('Help and Tools has tips, import-export, and curated resource routes', () => {
  const routes = read('src/index.jsx')
  const app = read('src/renderer/App.jsx')
  assert.match(routes, /help\/tips/)
  assert.match(routes, /help\/import-export/)
  assert.match(routes, /help\/resources/)
  assert.match(app, /Help & Tools/)
  assert.match(app, /ESO Resources/)
})

test('equipment and rotation pages consume schema-3 sets, pieces, hotbars, and skill icons', () => {
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

test('profile fields and the narrow preload API expose the new v0.5 controls', () => {
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
  const css = read('src/renderer/styles/App.css')
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
  const bridge = read('src/renderer/utils/variantLogic.js')
  const browserModule = read('src/shared/variantLogic.mjs')
  assert.match(bridge, /from ['"]\.\.\/\.\.\/shared\/variantLogic\.mjs['"]/)
  assert.doesNotMatch(bridge, /variantLogic\.cjs/)
  assert.match(browserModule, /export \{/)
  assert.doesNotMatch(browserModule, /module\.exports/)
})

test('CharacterModal seeds its form without referencing an undefined identifier', () => {
  // Regression for v0.5.2: `setForm({ ...EMPTY, build_id })` used object shorthand for a name that
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
  // Regression for v0.5.3: .workspace became a CSS grid but .content-scroll kept flex-item sizing
  // (height:0; flex:1 1 auto). A grid item ignores flex, so the row collapsed and every page showed
  // only its header. The grid needs an explicit row track and the scroll child a real height.
  const css = read('src/renderer/styles/App.css')
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
  const css = read('src/renderer/styles/App.css')
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
  const css = read('src/renderer/styles/App.css')
  assert.doesNotMatch(app, /<small>Arrow to the Build<\/small>/,
    'the sidebar should not repeat the product name beneath ATTB')
  assert.match(css, /\.sidebar-logo,\.character-bar\{height:108px;min-height:108px\}/)
  assert.match(css, /\.topbar-field\{[^}]*grid-template-rows:14px 58px/)
  assert.match(css, /\.character-switcher-trigger\{[^}]*height:58px/)
  assert.match(css, /\.sidebar-logo img\{width:52px;height:52px\}/)
})

test('Help and Tools orders reference pages before import and export', () => {
  const app = read('src/renderer/App.jsx')
  const tips = app.indexOf("'/help/tips'")
  const resources = app.indexOf("'/help/resources'")
  const transfer = app.indexOf("'/help/import-export'")
  assert.ok(tips >= 0 && resources > tips && transfer > resources,
    'Gameplay Tips, ESO Resources, then Import / Export should be the visible order')
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

test('the current rotation stage draws one uninterrupted outline', () => {
  const css = read('src/renderer/styles/App.css')
  assert.match(css, /\.rotation-stage-v3\.current:after\{[^}]*position:absolute[^}]*inset:0[^}]*border:2px solid var\(--accent\)/)
})

test('collapsed sidebar uses compact centered controls instead of expanded spacing', () => {
  const css = read('src/renderer/styles/App.css')
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

test('the modal offers backup restore and an in-dropdown build import', () => {
  const modal = read('src/renderer/components/CharacterModal.jsx')
  assert.match(modal, /characters\.importBackup\(\)/, 'restore path calls the backup importer')
  assert.match(modal, /Import character backup/, 'a restore button is shown')
  assert.match(modal, /__import__/, 'the build dropdown has an import sentinel')
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
  const css = read('src/renderer/styles/App.css')
  assert.match(page, /className={`completion-box skill-summary-toggle/)
  assert.match(page, /role="checkbox"/)
  assert.match(page, /aria-checked={complete}/)
  assert.doesNotMatch(page, /<input type="checkbox"/)
  assert.match(css, /\.skill-summary-toggle\.selected\{background:#1d8659;border-color:#62d99c\}/)
})

test('skill line abilities use the square equipment-style checkbox', () => {
  const page = read('src/renderer/pages/SkillLinePage.jsx')
  const css = read('src/renderer/styles/App.css')
  assert.match(page, /role="checkbox" aria-checked=\{!!allocation\}/, 'toggle is a real checkbox role')
  assert.doesNotMatch(page, /\{allocation \? '✓' : '\+'\}/, 'no plus-sign toggle glyph remains')
  const toggle = css.match(/\.eso-skill-toggle\{[^}]*\}/)?.[0] || ''
  assert.match(toggle, /border-radius:8px/, 'toggle is a rounded square, not a circle')
})

test('no shipped font size is smaller than the readable floor', () => {
  // The tiny CP text prompted a type-scale pass. Nothing should render below 0.72rem (~10.8px).
  for (const file of ['src/renderer/styles/App.css', 'src/renderer/styles/global.css']) {
    const css = read(file)
    const sizes = [...css.matchAll(/font-size:([0-9.]+)rem/g)].map(m => parseFloat(m[1]))
    const tooSmall = sizes.filter(size => size < 0.72)
    assert.deepEqual(tooSmall, [], `${file} has font sizes below 0.72rem: ${tooSmall.join(', ')}`)
  }
})
