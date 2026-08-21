'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const json = file => JSON.parse(read(file))
const { validateBuild } = require('../src/main/ipc/buildValidation')

const companionCatalog = json('resources/data/eso-companions.json')

const expected = new Map([
  ['azandar', 'Azandar al-Cybiades'],
  ['bastian', 'Bastian Hallix'],
  ['ember', 'Ember'],
  ['isobel', 'Isobel Veloise'],
  ['mirri', 'Mirri Elendis'],
  ['sharp_as_night', 'Sharp-as-Night'],
  ['tanlorin', 'Tanlorin'],
  ['zerith_var', 'Zerith-var']
])

test('v3 companion catalog covers all eight combat companions with two usable presets each', () => {
  assert.equal(companionCatalog.schema_version, 1)
  assert.equal(companionCatalog.companions.length, 8)
  assert.deepEqual(new Set(companionCatalog.companions.map(row => row.id)), new Set(expected.keys()))

  const presetIds = new Set()
  const allowedRoles = new Set(['tank', 'healer', 'damage', 'support'])
  for (const companion of companionCatalog.companions) {
    assert.equal(companion.name, expected.get(companion.id))
    assert.ok(companion.class && companion.race)
    assert.equal(companion.builds.length, 2, `${companion.name} should ship with exactly two recommended presets`)
    for (const preset of companion.builds) {
      assert.equal(preset.companion_id, companion.id)
      assert.ok(!presetIds.has(preset.id), `duplicate companion preset id ${preset.id}`)
      presetIds.add(preset.id)
      assert.ok(allowedRoles.has(preset.role), `${preset.id} has a supported role`)
      assert.ok(preset.weapon && preset.armor_weight && preset.ultimate)
      assert.equal(preset.skills.length, 5, `${preset.id} must describe exactly five prioritized companion skills`)
      assert.equal(new Set(preset.skills.map(skill => skill.toLowerCase())).size, 5, `${preset.id} skills must be unique`)
      assert.ok(preset.weapon_trait && preset.armor_trait && preset.jewelry_trait)
      assert.match(preset.source_url, /^https:\/\//)
    }
  }
  assert.equal(presetIds.size, 16)
})

test('companion build data is wired through both workspaces, persistence, docs, and Schema 4', () => {
  const routes = read('src/index.jsx')
  const app = read('src/renderer/App.jsx')
  assert.match(routes, /path="companions"/)
  assert.match(routes, /path="build-editor\/companions"/)
  assert.match(app, /\['\/companions', 'Companions'/)
  assert.match(app, /\['\/build-editor\/companions', 'Companions'/)
  assert.match(read('src/main/database/migrations/009_companion_tracking.sql'), /companion_progress_json/)
  assert.match(read('src/main/ipc/characterHandlers.js'), /sanitizeCompanionProgress/)
  const characterPage = read('src/renderer/pages/CompanionsPage.jsx')
  const editorPage = read('src/renderer/pages/BuildCompanionsPage.jsx')
  assert.match(characterPage, /companion-selector-panel/)
  assert.match(characterPage, /chooseSetup/)
  assert.match(characterPage, /companion-detail-panel/)
  assert.match(characterPage, /Ability order/)
  assert.match(editorPage, /Preset library/)
  assert.match(editorPage, /Companion skill names stay plain text by design/)

  const schema = json('docs/reference/BUILD_SCHEMA.json')
  const companion = schema.$defs.companion
  assert.ok(companion.properties.companion_id)
  assert.equal(companion.properties.skills.maxItems, 5)
  assert.equal(companion.properties.skills.uniqueItems, true)

  const guide = read('docs/reference/ATTB_AI_BUILD_JSON_AUTHORING_GUIDE.md')
  const appVersion = json('package.json').version
  const guideRevision = appVersion.split('.').slice(0, 2).join('.')
  const escapedGuideRevision = guideRevision.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  assert.match(guide, new RegExp(`Guide revision:\\*\\* ${escapedGuideRevision}(?:\\b|\\s|-)`))
  assert.match(guide, new RegExp(`Current baseline when this guide was revised:\\*\\* ATTB ${appVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  assert.match(guide, /eso-companions\.json/)
  assert.match(guide, /separate from player skill/i)
})

test('Schema 4 runtime validation catches bad companion IDs and more than five companion skills', () => {
  const base = json('resources/builds/stamina_arcanist_solo_duo.json')
  const preset = companionCatalog.companions.find(row => row.id === 'isobel').builds[0]
  const valid = structuredClone(base)
  valid.companions = [{ ...preset, id: 'isobel_tank', companion_name: 'Isobel Veloise', preset_id: preset.id }]
  assert.deepEqual(validateBuild(valid), [])

  const unknown = structuredClone(valid)
  unknown.companions[0].companion_id = 'not_a_real_companion'
  assert.ok(validateBuild(unknown).some(error => /not in the bundled companion catalog/.test(error)))

  const tooMany = structuredClone(valid)
  tooMany.companions[0].skills = [...preset.skills, 'Sixth Skill']
  assert.ok(validateBuild(tooMany).some(error => /no more than five/.test(error)))
})
