'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('./electron-stub')
const { validateBuild } = require('../src/main/ipc/buildHandlers')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const readAppCss = () => ['src/renderer/styles/App.css', 'src/renderer/styles/BuildEditor.css', 'src/renderer/styles/Addon.css'].map(read).join('\n')
const template = () => JSON.parse(read('docs/reference/BUILD_TEMPLATE.json'))

test('Build Editor routes use live Equipment, Champion Points, and Loadouts pages', () => {
  const routes = read('src/index.jsx')
  assert.match(routes, /BuildEquipmentPage/)
  assert.match(routes, /BuildChampionPointsPage/)
  assert.match(routes, /BuildLoadoutsPage/)
  assert.doesNotMatch(routes, /BuildEditorPlaceholderPage title="Equipment"/)
  assert.doesNotMatch(routes, /BuildEditorPlaceholderPage title="Champion Points"/)
  assert.doesNotMatch(routes, /BuildEditorPlaceholderPage title="Loadouts & Variants"/)
})

test('the Leveling Plan stacks full-width hotbars and hides the unused one-bar panel', () => {
  const css = readAppCss()
  assert.match(css, /Full-width hotbars plus Equipment, CP, Loadouts, and Variants authoring/)
  assert.match(css, /\.leveling-bars-grid\{grid-template-columns:1fr\}/)
  assert.match(css, /\.leveling-bar-editor\.disabled\{display:none\}/)
})

test('Equipment editor exposes stages, sources, sets, pieces, and stable IDs', () => {
  const page = read('src/renderer/pages/BuildEquipmentPage.jsx')
  assert.match(page, /Add Gear Stage/)
  assert.match(page, /How to obtain this set/)
  assert.match(page, /Slot-by-slot setup/)
  assert.match(page, /Perfected item/)
  assert.match(page, /Mythic item/)
  assert.match(page, /recommended_gear_stage_ids/)
  assert.match(page, /uniqueId/)
})

test('Champion Point editor exposes all trees, ordered routes, branches, and four final slots', () => {
  const page = read('src/renderer/pages/BuildChampionPointsPage.jsx')
  assert.match(page, /Warfare/)
  assert.match(page, /Fitness/)
  assert.match(page, /Craft/)
  assert.match(page, /Automatic prerequisite route/)
  assert.match(page, /Recommended routes and optional alternatives/)
  assert.match(page, /Final four slottables/)
  assert.match(page, /slottableNodes/)
  assert.match(page, /\[0, 1, 2, 3\]/)
})

test('Loadouts and Variants editor captures visual Schema 4 override sections', () => {
  const page = read('src/renderer/pages/BuildLoadoutsPage.jsx')
  assert.match(page, /Base Build → Loadout → Variant/)
  assert.match(page, /Capture only the sections that should diverge/)
  assert.match(page, /Refresh All from Current Base/)
  assert.match(page, /Compatible loadouts/)
  assert.match(page, /default_loadout_id/)
  assert.match(page, /overrides/)
})

test('new editor-authored gear, CP, loadout, and variant data remains valid Schema 4', () => {
  const build = template()
  build.gear_stages.push({
    id: 'editor_test_stage', name: 'Editor Test Stage', min_level: 50, max_level: 9999,
    summary: 'A test stage created by the visual editor.',
    sets: [{
      id: 'editor_test_set', name: 'Editor Test Set', role: 'Body set',
      source: { type: 'Crafted', location: 'Test Station', tradeable: 'Yes' },
      pieces: [{ id: 'editor_test_chest', slot: 'Chest', weight: 'Medium', trait: 'Divines', enchantment: 'Max Stamina', quality: 'Purple' }]
    }]
  })
  build.cp_plans.warfare.core.push({
    id: 'fighting_finesse', first_pass_points: 50, target_points: 50, note: 'Created in the editor.'
  })
  build.cp_plans.warfare.final_slots = ['fighting_finesse']
  build.loadouts.push({
    id: 'editor_test_loadout', name: 'Editor Test Loadout', summary: 'A complete alternative.',
    roles: ['damage'], content: ['dungeons'], available: true, conditions: [],
    overrides: { gear_stages: structuredClone(build.gear_stages), cp_plans: structuredClone(build.cp_plans) }
  })
  build.variants.push({
    id: 'editor_test_variant', name: 'Editor Test Variant', summary: 'A smaller alternative.',
    available: true, loadout_ids: ['editor_test_loadout'], overrides: { summary: 'Variant summary.' }
  })
  assert.deepEqual(validateBuild(build), [])
})
