'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { state, makeIpc } = require('./electron-stub')

const dbModule = require('../src/main/database/db')
const buildHandlers = require('../src/main/ipc/buildHandlers')
const characterHandlers = require('../src/main/ipc/characterHandlers')
const settingsHandlers = require('../src/main/ipc/settingsHandlers')
const catalog = require('../src/main/catalog')

const { validateBuild, normalizeBuild, CURRENT_SCHEMA_VERSION } = buildHandlers
const BUILD_DIR = path.join(__dirname, '../resources/builds')
const base = () => JSON.parse(fs.readFileSync(path.join(BUILD_DIR, 'stamina_arcanist_solo_duo.json'), 'utf8'))
const errorsFor = mutate => { const b = base(); mutate(b); return validateBuild(b) }
const matches = (errors, pattern) => errors.some(error => pattern.test(error))

function schema3Fixture() {
  const build = base()
  build.schema_version = 3
  // Schema 3 knew only the generic Scribing catalog entries, not exact Schema 4 recipes.
  const recipes = new Map((build.scribed_skills || []).map(row => [row.id, row.grimoire_catalog_skill_id]))
  for (const phase of build.phases || []) {
    for (const bar of [phase.front_bar, phase.back_bar]) {
      for (const slot of bar?.slots || []) {
        if (slot.scribed_skill_id) { slot.catalog_skill_id = recipes.get(slot.scribed_skill_id); delete slot.scribed_skill_id }
      }
    }
    for (const step of phase.rotation?.steps || []) {
      if (step.scribed_skill_id) { step.catalog_skill_id = recipes.get(step.scribed_skill_id); delete step.scribed_skill_id }
    }
  }
  for (const key of [
    'metadata', 'class_configuration', 'requirements', 'transformations', 'scribed_skills',
    'quickslots', 'companions', 'performance', 'sources', 'extensions', 'default_loadout_id', 'loadouts'
  ]) delete build[key]
  for (const row of build.unlock_order || []) {
    delete row.source_kind
    delete row.skill_point_cost
    delete row.loadout_ids
  }
  for (const phase of build.phases || []) {
    delete phase.min_cp
    delete phase.max_cp
    delete phase.conditions
    delete phase.loadout_ids
  }
  for (const variant of build.variants || []) delete variant.loadout_ids
  return build
}

function freshApp() {
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-cat-'))
  state.userDataDir = dir
  dbModule.initialize(path.join(dir, 'attb.db'))
  const ipc = makeIpc()
  buildHandlers.seedBundled(); buildHandlers.register(ipc); characterHandlers.register(ipc); settingsHandlers.register(ipc)
  return { ipc, dir, db: dbModule.getDb() }
}
test.afterEach(() => dbModule.close())

test('all bundled builds are Schema 4 and catalog-id based', () => {
  for (const file of fs.readdirSync(BUILD_DIR).filter(name => name.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, file), 'utf8'))
    assert.equal(build.schema_version, CURRENT_SCHEMA_VERSION)
    for (const item of build.unlock_order) {
      if (item.scribed_skill_id) continue
      assert.ok(item.catalog_skill_id, `${file}: ${item.id} has no catalog_skill_id`)
      const hit = catalog.getSkill(item.catalog_skill_id)
      assert.ok(hit, `${file}: ${item.catalog_skill_id} is missing`)
      assert.equal(hit.line.id, item.line)
    }
    assert.deepEqual(validateBuild(build), [])
  }
})

test('Schema 4 rejects an unlock without a catalog or Scribed Skill id', () => {
  assert.ok(matches(errorsFor(build => { delete build.unlock_order[0].catalog_skill_id }), /needs catalog_skill_id or scribed_skill_id/))
})

test('unknown, wrong-line, and wrong-kind catalog ids are refused', () => {
  assert.ok(matches(errorsFor(build => { build.unlock_order[0].catalog_skill_id = 'herald__not_real' }), /does not exist in the bundled catalog/))
  assert.ok(matches(errorsFor(build => { const row = build.unlock_order.find(item => item.line === 'herald'); row.catalog_skill_id = 'soldier__runic_jolt' }), /belongs to skill line/))
  assert.ok(matches(errorsFor(build => { build.unlock_order.find(item => item.kind === 'Active').kind = 'Passive' }), /does not match catalog type/))
})

test('display text can change without breaking stable catalog ids', () => {
  const build = base(), id = build.unlock_order[0].catalog_skill_id
  build.unlock_order[0].name = 'Different Display Text'
  assert.deepEqual(validateBuild(build), [])
  assert.equal(build.unlock_order[0].catalog_skill_id, id)
})

test('Schema 1, 2, and unknown future schemas are rejected safely', () => {
  for (const version of [1, 2, 99]) {
    const old = base(); old.schema_version = version
    const normalized = normalizeBuild(old)
    assert.equal(normalized.changed, false)
    assert.ok(matches(normalized.errors, /schema_version must be 3 or 4/))
    assert.ok(matches(validateBuild(old), /schema_version must be 4/))
  }
})

test('normalizing Schema 4 is a no-op and does not mutate input', () => {
  const input = base(), before = JSON.stringify(input)
  const result = normalizeBuild(input)
  assert.deepEqual(result.errors, [])
  assert.equal(result.changed, false)
  assert.equal(JSON.stringify(input), before)
})

test('Schema 4 normalization follows catalog line/rank moves and zero-cost grants without changing permanent skill ids', () => {
  const input = base()
  const row = input.unlock_order.find(item => item.catalog_skill_id === 'dark_elf__ashlander')
  assert.ok(row)
  row.skill_point_cost = 1
  const stale = input.unlock_order.find(item => item.catalog_skill_id === 'scribing__ulfsild_s_contingency')
  assert.ok(stale)
  stale.line = 'scribing'
  stale.required_rank = 0
  const result = normalizeBuild(input)
  assert.equal(result.changed, true)
  assert.equal(result.data.unlock_order.find(item => item.catalog_skill_id === 'dark_elf__ashlander').skill_point_cost, 0)
  const migrated = result.data.unlock_order.find(item => item.catalog_skill_id === 'scribing__ulfsild_s_contingency')
  assert.equal(migrated.catalog_skill_id, 'scribing__ulfsild_s_contingency')
  assert.equal(migrated.line, 'mages_guild')
  assert.equal(migrated.required_rank, 5)
  assert.ok(result.data.relevant_lines.some(line => line.id === 'mages_guild'))
})

test('Schema 4 normalization repairs current Nightblade ability placements and unlock ranks', () => {
  const input = base()
  const template = input.unlock_order.find(item => item.kind === 'Active')
  input.unlock_order.push({ ...template, id: 'stale-veiled-strike', name: 'Veiled Strike', catalog_skill_id: 'shadow__veiled_strike', line: 'shadow', required_rank: 4, priority: 9991 })
  input.unlock_order.push({ ...template, id: 'stale-assassins-blade', name: "Assassin's Blade", catalog_skill_id: 'assassination__assassin_s_blade', line: 'assassination', required_rank: 1, priority: 9992 })
  const result = normalizeBuild(input)
  const veiled = result.data.unlock_order.find(item => item.id === 'stale-veiled-strike')
  const blade = result.data.unlock_order.find(item => item.id === 'stale-assassins-blade')
  assert.equal(veiled.line, 'assassination')
  assert.equal(veiled.required_rank, 1)
  assert.equal(blade.line, 'assassination')
  assert.equal(blade.required_rank, 20)
})

test('valid Schema 3 builds migrate to complete Schema 4 data', () => {
  const input = schema3Fixture(), before = JSON.stringify(input)
  const result = normalizeBuild(input)
  assert.deepEqual(result.errors, [])
  assert.equal(result.changed, true)
  assert.equal(result.data.schema_version, 4)
  assert.ok(result.data.metadata)
  assert.ok(result.data.class_configuration)
  assert.deepEqual(result.data.loadouts, [])
  assert.deepEqual(validateBuild(result.data), [])
  assert.equal(JSON.stringify(input), before, 'normalization never mutates the caller object')
})

test('Schema 3 migration fills all three active native class lines and makes them trackable', () => {
  const input = schema3Fixture()
  input.relevant_lines = input.relevant_lines.filter(line => line.group !== 'Class' || line.id === 'herald' || line.id.endsWith('_mastery'))
  const result = normalizeBuild(input)
  const active = result.data.class_configuration.active_class_lines
  assert.equal(active.length, 3)
  assert.deepEqual(new Set(active.map(line => line.source_class)), new Set(['Arcanist']))
  const relevant = new Set(result.data.relevant_lines.map(line => line.id))
  assert.ok(active.every(line => relevant.has(line.line_id)))
  assert.deepEqual(validateBuild(result.data), [])
})

test('morph and passive catalog constraints remain enforced', () => {
  const wrongBase = errorsFor(build => {
    const morph = build.unlock_order.find(item => item.kind === 'Morph' && item.requires?.length)
    const other = build.unlock_order.find(item => item.kind === 'Active' && !morph.requires.includes(item.id))
    morph.requires = [other.id]
  })
  assert.ok(matches(wrongBase, /none of which is that base ability/))
  const build = base(), passive = build.unlock_order.find(item => item.kind === 'Passive')
  const max = catalog.getSkill(passive.catalog_skill_id).skill.max_points
  for (let i = 0; i < max + 1; i++) build.unlock_order.push({ ...passive, id: `${passive.id}_extra_${i}`, priority: 9000 + i })
  assert.ok(matches(validateBuild(build), /catalog allows/))
})

test('direct build import cannot overwrite a bundled build id', async () => {
  const { ipc, dir } = freshApp()
  const build = base()
  build.name = 'Edited Bundled Copy'
  const file = path.join(dir, 'edited-bundled-copy.json')
  fs.writeFileSync(file, JSON.stringify(build))
  state.openPaths = [file]
  await assert.rejects(() => ipc.call('builds:import'), /belongs to an ATTB bundled build/)
  const stored = ipc.call('builds:get', build.id)
  assert.notEqual(stored.data.name, build.name)
  assert.equal(stored.is_bundled, true)
})

test('Schema 3 build import is normalized and stored as Schema 4', () => {
  const { ipc } = freshApp(), build = schema3Fixture()
  build.id = 'schema3-import'; build.name = 'Schema 3 Import'
  buildHandlers.upsertBuild(build, null, false)
  const stored = ipc.call('builds:get', build.id)
  assert.equal(stored.data.schema_version, 4)
  assert.ok(stored.data.metadata)
  assert.ok(stored.data.class_configuration)
  assert.deepEqual(stored.data.phases, build.phases)
  assert.deepEqual(stored.data.gear_stages, build.gear_stages)
})

test('character backup carries and restores a Schema 4 build and loadout', async () => {
  const { ipc, dir } = freshApp()
  const id = ipc.call('characters:create', { name: 'Schema Hero', build_id: 'stamina_arcanist_solo_duo', loadout_id: 'flexible-pve', level: 42, race: 'Dark Elf', alliance: 'Ebonheart Pact' })
  ipc.call('characters:setSkillRank', id, 'herald', 30)
  state.savePath = path.join(dir, 'schema4-backup.json')
  const file = await ipc.call('characters:export', id)
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(backup.schema_version, 4)
  assert.equal(backup.build.schema_version, 4)
  assert.equal(backup.character.loadout_id, 'flexible-pve')
  state.openPaths = [file]
  const restored = await ipc.call('characters:importBackup')
  const character = ipc.call('characters:get', restored.id)
  assert.equal(character.level, 42)
  assert.equal(character.race, 'Dark Elf')
  assert.equal(character.skill_ranks.herald, 30)
  assert.equal(character.loadout_id, 'flexible-pve')
})

test('a backup carrying an unsupported build schema is refused atomically', async () => {
  const { ipc, dir } = freshApp(), old = base(); old.id = 'old-schema'; old.schema_version = 2
  const file = path.join(dir, 'old.json')
  fs.writeFileSync(file, JSON.stringify({ file_type: 'attb-character-backup', build: old, character: { name: 'Nope' } }))
  state.openPaths = [file]
  await assert.rejects(() => ipc.call('characters:importBackup'), /schema_version must be 3 or 4|schema_version must be 4/)
  assert.deepEqual(ipc.call('characters:list'), [])
})

test('unsafe ids and unknown lines are refused', () => {
  assert.ok(matches(errorsFor(build => { build.id = 'has spaces' }), /not a simple slug/))
  assert.ok(matches(errorsFor(build => { build.relevant_lines[0].id = '//evil.example.com' }), /needs a slug id/))
  assert.ok(matches(errorsFor(build => { build.relevant_lines[0].id = 'made_up_line' }), /not a skill line in the bundled catalog/))
})
