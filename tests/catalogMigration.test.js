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
const matches = (errors, pattern) => errors.some(e => pattern.test(e))

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

test('all bundled builds are schema 3 and catalog-id based', () => {
  for (const file of fs.readdirSync(BUILD_DIR).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, file), 'utf8'))
    assert.equal(build.schema_version, CURRENT_SCHEMA_VERSION)
    for (const item of build.unlock_order) {
      assert.ok(item.catalog_skill_id, `${file}: ${item.id} has no catalog_skill_id`)
      const hit = catalog.getSkill(item.catalog_skill_id)
      assert.ok(hit, `${file}: ${item.catalog_skill_id} is missing`)
      assert.equal(hit.line.id, item.line)
    }
    assert.deepEqual(validateBuild(build), [])
  }
})

test('schema 3 rejects a row without catalog_skill_id', () => {
  assert.ok(matches(errorsFor(b => { delete b.unlock_order[0].catalog_skill_id }), /missing catalog_skill_id, which schema 3 requires/))
})

test('unknown, wrong-line, and wrong-kind catalog ids are refused', () => {
  assert.ok(matches(errorsFor(b => { b.unlock_order[0].catalog_skill_id = 'herald__not_real' }), /does not exist in the bundled catalog/))
  assert.ok(matches(errorsFor(b => { const row = b.unlock_order.find(x => x.line === 'herald'); row.catalog_skill_id = 'soldier__runic_jolt' }), /belongs to skill line/))
  assert.ok(matches(errorsFor(b => { b.unlock_order.find(x => x.kind === 'Active').kind = 'Passive' }), /does not match catalog type/))
})

test('display text can change without breaking stable catalog ids', () => {
  const build = base(), id = build.unlock_order[0].catalog_skill_id
  build.unlock_order[0].name = 'Different Display Text'
  assert.deepEqual(validateBuild(build), [])
  assert.equal(build.unlock_order[0].catalog_skill_id, id)
})

test('older pre-release schemas are rejected rather than migrated', () => {
  const old = base(); old.schema_version = 2
  const normalized = normalizeBuild(old)
  assert.equal(normalized.changed, false)
  assert.ok(matches(normalized.errors, /older pre-release schemas are not supported/))
  assert.ok(matches(validateBuild(old), /schema_version must be 3/))
})

test('normalizing schema 3 is a no-op and does not mutate input', () => {
  const input = base(), before = JSON.stringify(input)
  const result = normalizeBuild(input)
  assert.deepEqual(result.errors, []); assert.equal(result.changed, false); assert.equal(JSON.stringify(input), before)
})

test('morph and passive catalog constraints remain enforced', () => {
  const wrongBase = errorsFor(b => {
    const morph = b.unlock_order.find(x => x.kind === 'Morph' && x.requires?.length)
    const other = b.unlock_order.find(x => x.kind === 'Active' && !morph.requires.includes(x.id))
    morph.requires = [other.id]
  })
  assert.ok(matches(wrongBase, /none of which is that base ability/))
  const build = base(), passive = build.unlock_order.find(x => x.kind === 'Passive')
  const max = catalog.getSkill(passive.catalog_skill_id).skill.max_points
  for (let i = 0; i < max + 1; i++) build.unlock_order.push({ ...passive, id: `${passive.id}_extra_${i}`, priority: 9000 + i })
  assert.ok(matches(validateBuild(build), /catalog allows/))
})

test('schema-3 build import is stored unchanged', () => {
  const { ipc } = freshApp(), build = base()
  build.id = 'schema3-import'; build.name = 'Schema 3 Import'
  buildHandlers.upsertBuild(build, null, false)
  const stored = ipc.call('builds:get', build.id)
  assert.equal(stored.data.schema_version, 3)
  assert.deepEqual(stored.data.phases, build.phases)
  assert.deepEqual(stored.data.gear_stages, build.gear_stages)
})

test('character backup carries and restores a schema-3 build', async () => {
  const { ipc, dir } = freshApp()
  const id = ipc.call('characters:create', { name: 'Schema Hero', build_id: 'stamina-arcanist-solo-duo-u50', level: 42, race: 'Dark Elf', alliance: 'Ebonheart Pact' })
  ipc.call('characters:setSkillRank', id, 'herald', 30)
  state.savePath = path.join(dir, 'schema3-backup.json')
  const file = await ipc.call('characters:export', id)
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(backup.build.schema_version, 3)
  state.openPaths = [file]
  const restored = await ipc.call('characters:importBackup')
  const character = ipc.call('characters:get', restored.id)
  assert.equal(character.level, 42); assert.equal(character.race, 'Dark Elf'); assert.equal(character.skill_ranks.herald, 30)
})

test('a backup carrying an older build schema is refused atomically', async () => {
  const { ipc, dir } = freshApp(), old = base(); old.id = 'old-schema'; old.schema_version = 2
  const file = path.join(dir, 'old.json')
  fs.writeFileSync(file, JSON.stringify({ file_type: 'attb-character-backup', build: old, character: { name: 'Nope' } }))
  state.openPaths = [file]
  await assert.rejects(() => ipc.call('characters:importBackup'), /schema_version must be 3|older pre-release schemas/)
  assert.deepEqual(ipc.call('characters:list'), [])
})

test('future schemas, unsafe ids, and unknown lines are refused', () => {
  assert.ok(matches(errorsFor(b => { b.schema_version = 99 }), /schema_version must be 3/))
  assert.ok(matches(errorsFor(b => { b.id = 'has spaces' }), /not a simple slug/))
  assert.ok(matches(errorsFor(b => { b.relevant_lines[0].id = '//evil.example.com' }), /needs a slug id/))
  assert.ok(matches(errorsFor(b => { b.relevant_lines[0].id = 'made_up_line' }), /not a skill line in the bundled catalog/))
})
