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
  assert.match(css, /\.topbar-field\{[^}]*grid-template-rows:12px 48px/,
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
  assert.match(modal, /setForm\(\{ \.\.\.EMPTY, build_id: buildId \}\)/,
    'the form reset must assign build_id from the resolved buildId')
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
