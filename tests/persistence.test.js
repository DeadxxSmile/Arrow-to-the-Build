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

const BUILD_DIR = path.join(__dirname, '../resources/builds')
const BUILD_FILE = path.join(BUILD_DIR, 'stamina_arcanist_solo_duo.json')
const BUNDLED_BUILD_COUNT = fs.readdirSync(BUILD_DIR).filter(name => name.endsWith('.json')).length
const readBuild = () => JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'))

function freshApp() {
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-test-'))
  state.userDataDir = dir
  dbModule.initialize(path.join(dir, 'attb.db'))
  const ipc = makeIpc()
  buildHandlers.seedBundled()
  buildHandlers.register(ipc)
  characterHandlers.register(ipc)
  settingsHandlers.register(ipc)
  return { ipc, dir, db: dbModule.getDb() }
}
test.afterEach(() => dbModule.close())

test('migrations apply once, are recorded, and create the expected columns', () => {
  const { db, dir } = freshApp()
  const applied = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all().map(r => r.filename)
  assert.deepEqual(applied, ['001_initial_schema.sql', '002_character_tracking.sql', '003_catalog_skill_tracking.sql', '004_character_profile.sql', '005_build_loadouts.sql', '006_build_editor_storage.sql', '007_user_build_file_sync.sql', '008_eso_addon_integration.sql'])
  const columns = db.prepare('PRAGMA table_info(characters)').all().map(c => c.name)
  for (const col of ['tracked_skill_lines_json', 'skill_allocations_json', 'custom_skill_lines_json', 'race', 'alliance', 'loadout_id', 'actual_unspent_attribute_points']) assert.ok(columns.includes(col))
  const buildColumns = db.prepare('PRAGMA table_info(builds)').all().map(c => c.name)
  for (const col of ['origin_type', 'forked_from_build_id', 'last_saved_revision', 'build_file_path', 'build_file_hash', 'build_file_synced_at', 'build_file_sync_error']) assert.ok(buildColumns.includes(col))
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='build_editor_drafts'").get())
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='build_revisions'").get())
  for (const table of ['addon_character_snapshots', 'character_addon_links', 'character_sync_overrides']) assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table), `${table} should exist`)
  const snapshotColumns = db.prepare('PRAGMA table_info(addon_character_snapshots)').all().map(c => c.name)
  assert.ok(snapshotColumns.includes('profile_root'))
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1)

  // Reopening must be a no-op, not a second application.
  dbModule.close()
  dbModule.initialize(path.join(dir, 'attb.db'))
  assert.equal(dbModule.getDb().prepare('SELECT COUNT(*) n FROM _migrations').get().n, 8)
})

test('upgrading a v0.2-era database keeps its data and backs the file up first', () => {
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-legacy-'))
  state.userDataDir = dir
  const dbPath = path.join(dir, 'attb.db')

  // Build a database that only ever saw migration 001, the way a v0.2 install would look.
  const Database = require('better-sqlite3')
  const legacy = new Database(dbPath)
  legacy.exec(fs.readFileSync(path.join(__dirname, '../src/main/database/migrations/001_initial_schema.sql'), 'utf8'))
  legacy.exec(`CREATE TABLE _migrations (filename TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`)
  legacy.prepare('INSERT INTO _migrations(filename) VALUES (?)').run('001_initial_schema.sql')
  legacy.prepare(`INSERT INTO builds(id,name,data_json) VALUES('legacy-build','Legacy','{}')`).run()
  legacy.prepare(`INSERT INTO characters(id,name,build_id,level,skill_ranks_json,completed_json)
                  VALUES('c1','Old Hero','legacy-build',34,'{"herald":22}','["runeblades"]')`).run()
  legacy.close()

  dbModule.initialize(dbPath)
  const row = dbModule.getDb().prepare('SELECT * FROM characters WHERE id=?').get('c1')
  assert.equal(row.name, 'Old Hero')
  assert.equal(row.level, 34)
  assert.equal(row.tracked_skill_lines_json, '[]', 'new columns arrive with defaults')
  const parsed = characterHandlers.parseRow(row)
  assert.deepEqual(parsed.skill_ranks, { herald: 22 })
  assert.deepEqual(parsed.completed, ['runeblades'])

  const backups = fs.readdirSync(path.join(dir, 'Backups'))
  assert.equal(backups.length, 1, 'the pre-upgrade database was copied aside')
  assert.ok(backups[0].startsWith('attb-premigration-'))
})

test('bundled builds seed and re-seeding does not duplicate or wipe characters', () => {
  const { ipc, db } = freshApp()
  const builds = ipc.call('builds:list')
  assert.equal(builds.length, BUNDLED_BUILD_COUNT)
  assert.ok(builds.every(b => b.is_bundled === true))

  const id = ipc.call('characters:create', { name: 'Seeder', build_id: 'stamina_arcanist_solo_duo' })
  buildHandlers.seedBundled()
  assert.equal(ipc.call('builds:list').length, BUNDLED_BUILD_COUNT, 'reseeding upserts rather than inserting again')
  assert.equal(ipc.call('characters:get', id).name, 'Seeder', 'character survives a build reload')
})

test('character race and alliance default from the build and remain editable profile data', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', { name: 'Profile', build_id: 'stamina_arcanist_solo_duo' })
  const initial = ipc.call('characters:get', id)
  assert.equal(initial.race, 'Dark Elf')
  assert.equal(initial.alliance, 'Ebonheart Pact')
  ipc.call('characters:update', id, { race: 'Khajiit', alliance: 'Aldmeri Dominion' })
  const updated = ipc.call('characters:get', id)
  assert.equal(updated.race, 'Khajiit')
  assert.equal(updated.alliance, 'Aldmeri Dominion')
})

test('character numbers are clamped instead of trusted', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', {
    name: '  Spaced  ', build_id: 'stamina_arcanist_solo_duo',
    level: 9999, cp_craft: -50, cp_warfare: 'nonsense', cp_fitness: 99999
  })
  const c = ipc.call('characters:get', id)
  assert.equal(c.name, 'Spaced')
  assert.equal(c.level, 50)
  assert.equal(c.cp_craft, 0)
  assert.equal(c.cp_warfare, 0)
  assert.equal(c.cp_fitness, 1200, 'a constellation caps at 1200, not the 3600 account total')

  ipc.call('characters:update', id, { level: -3 })
  assert.equal(ipc.call('characters:get', id).level, 1)
  ipc.call('characters:setSkillRank', id, 'herald', 900)
  assert.equal(ipc.call('characters:get', id).skill_ranks.herald, 50)
})

test('a rogue update patch cannot reach unlisted columns', () => {
  const { ipc, db } = freshApp()
  const id = ipc.call('characters:create', { name: 'Safe', build_id: 'stamina_arcanist_solo_duo' })
  ipc.call('characters:update', id, { id: 'hijacked', created_at: 'x', rogue_column: 'oops', variant_id: 'not-a-variant' })
  const c = ipc.call('characters:get', id)
  assert.equal(c.id, id)
  assert.equal(c.build_id, 'stamina_arcanist_solo_duo')
  assert.equal(c.variant_id, 'solo-duo', 'an unknown variant is ignored, not stored')
})

test('changing class builds preserves profile and non-class progress while clearing incompatible class data', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', {
    name: 'Switcher', build_id: 'stamina_arcanist_solo_duo', race: 'Khajiit',
    alliance: 'Aldmeri Dominion', level: 50, cp_warfare: 400
  })
  ipc.call('characters:addTrackedSkillLine', id, 'blacksmithing')
  ipc.call('characters:addTrackedSkillLine', id, 'assassination')
  ipc.call('characters:setSkillRank', id, 'herald', 41)
  ipc.call('characters:setSkillRank', id, 'blacksmithing', 36)
  ipc.call('characters:setSkillTracking', id, {
    herald__runeblades: 1, blacksmithing__metalworking: 1
  }, ['runeblades'])
  ipc.call('characters:setGearPiece', id, 'leveling', 'id:any_current_level_piece_head_leveling', true)

  ipc.call('characters:update', id, { build_id: 'magicka_templar_solo_duo', variant_id: 'cyrodiil' })
  const changed = ipc.call('characters:get', id)
  assert.equal(changed.build_id, 'magicka_templar_solo_duo')
  assert.equal(changed.variant_id, 'cyrodiil', 'a valid variant supplied with the new build is honored')
  assert.equal(changed.race, 'Khajiit')
  assert.equal(changed.alliance, 'Aldmeri Dominion')
  assert.equal(changed.level, 50)
  assert.equal(changed.cp_warfare, 400)
  assert.equal(changed.skill_ranks.herald, undefined, 'the previous class line is removed')
  assert.equal(changed.skill_ranks.blacksmithing, 36, 'craft progression survives')
  assert.equal(changed.skill_allocations.herald__runeblades, undefined, 'the previous class skill is removed')
  assert.equal(changed.skill_allocations.blacksmithing__metalworking, 1, 'non-class allocations survive')
  assert.deepEqual(changed.completed, [], 'old build completion ids are removed when they do not exist in the new build')
  assert.deepEqual(changed.gear, {}, 'different-class build switches clear build-specific gear progress')
  assert.ok(changed.tracked_skill_lines.includes('blacksmithing'))
  assert.ok(!changed.tracked_skill_lines.includes('assassination'), 'incompatible manually tracked class lines are removed')
})

test('gear ticks round-trip and unchecking removes the key', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', { name: 'Gear', build_id: 'stamina_arcanist_solo_duo' })
  ipc.call('characters:setGearPiece', id, 'leveling', 'id:leveling_training_head', true)
  assert.equal(ipc.call('characters:get', id).gear.leveling['id:leveling_training_head'], true)
  ipc.call('characters:setGearPiece', id, 'leveling', 'id:leveling_training_head', false)
  assert.deepEqual(ipc.call('characters:get', id).gear.leveling, {})
})

test('character delete removes only that character', () => {
  const { ipc } = freshApp()
  const a = ipc.call('characters:create', { name: 'A', build_id: 'stamina_arcanist_solo_duo' })
  const b = ipc.call('characters:create', { name: 'B', build_id: 'stamina_arcanist_solo_duo' })
  assert.equal(ipc.call('characters:delete', a), true)
  assert.equal(ipc.call('characters:delete', a), false, 'deleting twice reports nothing changed')
  assert.deepEqual(ipc.call('characters:list').map(c => c.id), [b])
  assert.equal(ipc.call('builds:list').length, BUNDLED_BUILD_COUNT, 'builds survive character deletion')
})

test('app reset clears user data but restores bundled builds', () => {
  const { ipc } = freshApp()
  ipc.call('characters:create', { name: 'Doomed', build_id: 'stamina_arcanist_solo_duo' })
  ipc.call('settings:set', 'theme', 'light')
  const imported = readBuild()
  imported.id = 'imported-build'
  buildHandlers.upsertBuild(imported, null, false)

  ipc.call('settings:resetApp')
  assert.deepEqual(ipc.call('characters:list'), [])
  assert.deepEqual(ipc.call('settings:getAll'), {})
  const builds = ipc.call('builds:list')
  assert.equal(builds.length, BUNDLED_BUILD_COUNT)
  assert.equal(builds.some(b => b.id === 'imported-build'), false)
})

test('settings reject unknown keys', () => {
  const { ipc } = freshApp()
  assert.equal(ipc.call('settings:set', 'remote_images', true), true)
  assert.equal(ipc.call('settings:getAll').remote_images, 'true')
  assert.throws(() => ipc.call('settings:set', 'evil', 'x'), /Unknown setting/)
})

test('export and import round-trips a character faithfully', async () => {
  const { ipc, dir } = freshApp()
  const id = ipc.call('characters:create', {
    name: 'Round Trip', build_id: 'stamina_arcanist_solo_duo', level: 50,
    cp_craft: 100, cp_warfare: 200, cp_fitness: 300
  })
  ipc.call('characters:setSkillRank', id, 'herald', 27)
  ipc.call('characters:addTrackedSkillLine', id, 'blacksmithing')
  ipc.call('characters:setGearPiece', id, 'leveling', 'id:leveling_training_head', true)
  ipc.call('characters:setSkillTracking', id, { herald__fatecarver: 1, herald__fated_fortune: 2 }, ['fatecarver', 'fated_fortune_1'])

  state.savePath = path.join(dir, 'backup.json')
  const file = await ipc.call('characters:export', id)
  assert.ok(fs.existsSync(file))
  const backup = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(backup.file_type, 'attb-character-backup')
  assert.equal(backup.schema_version, 4)
  assert.ok(backup.build.unlock_order.length, 'the build travels with the backup')

  state.openPaths = [file]
  const result = await ipc.call('characters:importBackup')
  assert.equal(result.name, 'Round Trip (2)', 'name collision is resolved, original untouched')
  const restored = ipc.call('characters:get', result.id)
  const original = ipc.call('characters:get', id)
  for (const key of ['level', 'cp_craft', 'cp_warfare', 'cp_fitness', 'loadout_id', 'variant_id', 'race', 'alliance']) assert.equal(restored[key], original[key])
  assert.deepEqual(restored.skill_ranks, original.skill_ranks)
  assert.deepEqual(restored.completed.sort(), original.completed.sort())
  assert.deepEqual(restored.skill_allocations, original.skill_allocations)
  assert.deepEqual(restored.gear, original.gear)
  assert.deepEqual(restored.tracked_skill_lines, original.tracked_skill_lines)
  assert.equal(ipc.call('characters:list').length, 2)
})

test('importing a backup never overwrites a build other characters already use', async () => {
  const { ipc, dir } = freshApp()
  const keeper = ipc.call('characters:create', { name: 'Keeper', build_id: 'stamina_arcanist_solo_duo' })
  const original = ipc.call('builds:get', 'stamina_arcanist_solo_duo')

  const tampered = readBuild()
  tampered.name = 'Tampered Build'
  tampered.unlock_order = tampered.unlock_order.slice(0, 2)
  const file = path.join(dir, 'tampered-backup.json')
  fs.writeFileSync(file, JSON.stringify({
    file_type: 'attb-character-backup', schema_version: 3, build: tampered,
    character: { name: 'Intruder', level: 12 }
  }))

  state.openPaths = [file]
  const result = await ipc.call('characters:importBackup')
  assert.equal(result.build_reused, true)
  const after = ipc.call('builds:get', 'stamina_arcanist_solo_duo')
  assert.equal(after.name, original.name, 'bundled build definition is intact')
  assert.equal(after.data.unlock_order.length, original.data.unlock_order.length)
  assert.equal(ipc.call('characters:get', keeper).build_id, 'stamina_arcanist_solo_duo')
})

test('a backup carrying an unknown build is imported as a new build', async () => {
  const { ipc, dir } = freshApp()
  const fresh = readBuild()
  fresh.id = 'brand-new-build'
  fresh.name = 'Brand New'
  const file = path.join(dir, 'new-backup.json')
  fs.writeFileSync(file, JSON.stringify({ file_type: 'attb-character-backup', build: fresh, character: { name: 'Newcomer', level: 8 } }))
  state.openPaths = [file]
  const result = await ipc.call('characters:importBackup')
  assert.equal(result.build_reused, false)
  assert.equal(ipc.call('builds:get', 'brand-new-build').name, 'Brand New')
  assert.equal(ipc.call('characters:get', result.id).level, 8)
})

test('a junk or malformed backup is rejected without creating anything', async () => {
  const { ipc, dir } = freshApp()
  const bad = path.join(dir, 'bad.json')
  fs.writeFileSync(bad, JSON.stringify({ file_type: 'something-else' }))
  state.openPaths = [bad]
  await assert.rejects(() => ipc.call('characters:importBackup'), /not a valid ATTB character backup/)

  const broken = path.join(dir, 'broken.json')
  fs.writeFileSync(broken, '{ not json at all')
  state.openPaths = [broken]
  await assert.rejects(() => ipc.call('characters:importBackup'), /not valid JSON/)
  assert.deepEqual(ipc.call('characters:list'), [])
})

test('a backup whose build fails validation aborts the whole import', async () => {
  const { ipc, dir } = freshApp()
  const file = path.join(dir, 'invalid-build.json')
  fs.writeFileSync(file, JSON.stringify({
    file_type: 'attb-character-backup',
    build: { id: 'no-good', name: 'No Good' },
    character: { name: 'Ghost' }
  }))
  state.openPaths = [file]
  await assert.rejects(() => ipc.call('characters:importBackup'), /Invalid ATTB build file/)
  assert.deepEqual(ipc.call('characters:list'), [], 'no half-written character left behind')
  assert.equal(ipc.call('builds:get', 'no-good'), null)
})

test('legacy free-form skill lines migrate into catalog line ids on read', () => {
  const { ipc, db } = freshApp()
  const id = ipc.call('characters:create', { name: 'Legacy', build_id: 'stamina_arcanist_solo_duo' })
  db.prepare('UPDATE characters SET custom_skill_lines_json=?, tracked_skill_lines_json=? WHERE id=?')
    .run(JSON.stringify([{ name: 'Blacksmithing', rank: 12 }]), '[]', id)

  const migrated = ipc.call('characters:get', id)
  assert.deepEqual(migrated.tracked_skill_lines, ['blacksmithing'])
  assert.equal(migrated.skill_ranks.blacksmithing, 12)
  assert.deepEqual(migrated.custom_skill_lines, [], 'the legacy column is cleared once converted')
  assert.equal(db.prepare('SELECT custom_skill_lines_json c FROM characters WHERE id=?').get(id).c, '[]')
})

test('corrupt JSON columns fall back to empty instead of throwing', () => {
  const { ipc, db } = freshApp()
  const id = ipc.call('characters:create', { name: 'Corrupt', build_id: 'stamina_arcanist_solo_duo' })
  db.prepare('UPDATE characters SET skill_ranks_json=?, completed_json=?, gear_json=? WHERE id=?')
    .run('{oops', 'null', '[]', id)
  const c = ipc.call('characters:get', id)
  assert.deepEqual(c.skill_ranks, {})
  assert.deepEqual(c.completed, [])
  assert.deepEqual(c.gear, {}, 'an array where an object belongs is rejected')
})

test('attributes persist, clamp, and survive a reload', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', { name: 'Attr', build_id: 'stamina_arcanist_solo_duo', level: 50 })
  assert.deepEqual(ipc.call('characters:get', id).attributes, { magicka: 0, health: 0, stamina: 0 },
    'a new character starts with no recorded attributes instead of copying the build target')

  ipc.call('characters:update', id, { attributes: { magicka: 10, health: 20, stamina: 30 } })
  const saved = ipc.call('characters:get', id)
  assert.deepEqual(saved.attributes, { magicka: 10, health: 20, stamina: 30 })
  assert.equal(saved.attribute_points, 60, 'attribute_points tracks the sum')

  ipc.call('characters:update', id, { attributes: { magicka: -5, health: 2.9, stamina: 'x' } })
  assert.deepEqual(ipc.call('characters:get', id).attributes, { magicka: 0, health: 2, stamina: 0 },
    'negative, fractional, and junk values are cleaned')
})

test('character creation stores explicit attributes and Champion Points even below level 50', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', {
    name: 'Alt', build_id: 'stamina_arcanist_solo_duo', level: 16,
    attributes: { magicka: 0, health: 0, stamina: 19 },
    cp_craft: 70, cp_warfare: 70, cp_fitness: 69
  })
  const c = ipc.call('characters:get', id)
  assert.deepEqual(c.attributes, { magicka: 0, health: 0, stamina: 19 })
  assert.equal(c.attribute_points, 19)
  assert.equal(c.cp_craft, 70)
  assert.equal(c.cp_warfare, 70)
  assert.equal(c.cp_fitness, 69)
})

test('an attribute split over 64 is trimmed rather than stored', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', {
    name: 'TooMany', build_id: 'stamina_arcanist_solo_duo',
    attributes: { magicka: 64, health: 64, stamina: 64 }
  })
  const c = ipc.call('characters:get', id)
  const total = c.attributes.magicka + c.attributes.health + c.attributes.stamina
  assert.equal(total, 64)
  assert.equal(c.attributes.magicka, 64, 'trimming works back from Stamina')
})

test('lowering the level never rewrites the recorded attributes', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', { name: 'Demoted', build_id: 'stamina_arcanist_solo_duo', level: 50 })
  ipc.call('characters:update', id, { attributes: { magicka: 0, health: 0, stamina: 64 } })
  ipc.call('characters:update', id, { level: 5 })
  const c = ipc.call('characters:get', id)
  assert.equal(c.level, 5)
  assert.deepEqual(c.attributes, { magicka: 0, health: 0, stamina: 64 }, 'points are kept for the user to sort out')
})

test('a legacy row with only attribute_points still reads back cleanly', () => {
  const { ipc, db } = freshApp()
  const id = ipc.call('characters:create', { name: 'Old', build_id: 'stamina_arcanist_solo_duo' })
  db.prepare('UPDATE characters SET attributes_json=?, attribute_points=? WHERE id=?').run('{}', 49, id)
  const c = ipc.call('characters:get', id)
  assert.deepEqual(c.attributes, { magicka: 0, health: 0, stamina: 0 }, 'no split is invented from the old total')
  assert.equal(c.attribute_points, 49, 'the legacy figure is preserved, not deleted')
})

test('attributes round-trip through export and import', async () => {
  const { ipc, dir } = freshApp()
  const id = ipc.call('characters:create', { name: 'RoundAttr', build_id: 'stamina_arcanist_solo_duo', level: 50 })
  ipc.call('characters:update', id, { attributes: { magicka: 14, health: 20, stamina: 30 } })

  state.savePath = path.join(dir, 'attr-backup.json')
  const file = await ipc.call('characters:export', id)
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).character.attributes, { magicka: 14, health: 20, stamina: 30 })

  state.openPaths = [file]
  const result = await ipc.call('characters:importBackup')
  assert.deepEqual(ipc.call('characters:get', result.id).attributes, { magicka: 14, health: 20, stamina: 30 })
})

test('CP from an older 3600-per-tree backup is clamped to the real 1200 cap', async () => {
  const { ipc, dir } = freshApp()
  const build = JSON.parse(fs.readFileSync(BUILD_FILE, 'utf8'))
  const file = path.join(dir, 'old-cp.json')
  fs.writeFileSync(file, JSON.stringify({
    file_type: 'attb-character-backup', schema_version: 3, build,
    character: { name: 'Big CP', level: 50, cp_craft: 3600, cp_warfare: 2000, cp_fitness: 900 }
  }))
  state.openPaths = [file]
  const result = await ipc.call('characters:importBackup')
  const c = ipc.call('characters:get', result.id)
  assert.equal(c.cp_craft, 1200)
  assert.equal(c.cp_warfare, 1200)
  assert.equal(c.cp_fitness, 900, 'values already within the cap are untouched')
})

test('an old database row holding more than 1200 CP is clamped on the next write', () => {
  const { ipc, db } = freshApp()
  const id = ipc.call('characters:create', { name: 'Legacy CP', build_id: 'stamina_arcanist_solo_duo', level: 50 })
  db.prepare('UPDATE characters SET cp_warfare=? WHERE id=?').run(3000, id)
  assert.equal(ipc.call('characters:get', id).cp_warfare, 3000, 'reads are not destructive')
  ipc.call('characters:update', id, { cp_warfare: 3000 })
  assert.equal(ipc.call('characters:get', id).cp_warfare, 1200)
})

test('loadout and variant selections are validated and stored together', () => {
  const { ipc } = freshApp()
  const id = ipc.call('characters:create', {
    name: 'Variant', build_id: 'magicka_templar_solo_duo', loadout_id: 'not-real', variant_id: 'not-real'
  })
  let character = ipc.call('characters:get', id)
  assert.equal(character.loadout_id, 'flexible-pve', 'an unknown loadout falls back to the default')
  assert.equal(character.variant_id, 'solo-duo', 'an unknown variant falls back to the first usable variant')
  ipc.call('characters:update', id, { variant_id: 'cyrodiil' })
  character = ipc.call('characters:get', id)
  assert.equal(character.variant_id, 'cyrodiil')
  ipc.call('characters:update', id, { loadout_id: 'not-real' })
  character = ipc.call('characters:get', id)
  assert.equal(character.loadout_id, 'flexible-pve')
  assert.equal(character.variant_id, 'cyrodiil', 'a valid variant survives a rejected loadout change')
})
