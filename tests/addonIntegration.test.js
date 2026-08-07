'use strict'
// These tests share the addon integration module and drive syncNow explicitly. Disable the live
// fs.watch so a watcher callback from one case cannot fire after a later case has repointed the
// profile root (which showed up as a flaky "belongs to a different ESO profile" import failure).
process.env.ATTB_DISABLE_ADDON_WATCH = '1'
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
const addonIntegration = require('../src/main/addon/integration')

function luaCharacter({ key, id, name, level = 22, capturedAt = 1786066768 }) {
  return `
    ["${key}"] = {
      ["addonVersion"] = "0.1.0-alpha.4.2",
      ["snapshotSchemaVersion"] = 2,
      ["dataProfile"] = "compact",
      ["capturedAt"] = ${capturedAt},
      ["captureReason"] = "manual-command",
      ["identity"] = {
        ["characterKey"] = "${key}", ["accountName"] = "@Tester", ["worldName"] = "NA Megaserver",
        ["characterId"] = "${id}", ["name"] = "${name}", ["rawName"] = "${name}^Fx",
        ["class"] = { ["id"] = 117, ["name"] = "Arcanist" },
        ["race"] = { ["id"] = 4, ["name"] = "Dark Elf" },
        ["alliance"] = { ["id"] = 2, ["name"] = "Ebonheart Pact" },
        ["level"] = ${level}, ["championPoints"] = 0, ["championPointsEarned"] = 209,
        ["progression"] = { ["availableAttributePoints"] = 1, ["availableSkillPoints"] = 6 },
        ["attributes"] = {
          ["magicka"] = { ["spentPoints"] = 0 }, ["health"] = { ["spentPoints"] = 0 }, ["stamina"] = { ["spentPoints"] = 26 }
        }
      },
      ["skills"] = {
        ["lines"] = {
          [1] = { ["skillType"] = 1, ["skillTypeName"] = "Class", ["skillLineId"] = 218,
            ["name"] = "Herald of the Tome", ["rank"] = 29,
            ["abilities"] = {
              [1] = { ["abilityId"] = 185794, ["baseAbilityId"] = 185794, ["progressionId"] = 534,
                ["name"] = "Runeblades", ["currentRank"] = 4, ["currentMorph"] = 0,
                ["isPassive"] = false, ["isUltimate"] = false },
              [2] = { ["abilityId"] = 184847, ["baseAbilityId"] = 184847, ["progressionId"] = 0,
                ["name"] = "Fated Fortune", ["currentRank"] = 2, ["currentMorph"] = 0,
                ["passiveRank"] = 2, ["passiveMaxRank"] = 2, ["isPassive"] = true, ["isUltimate"] = false }
            }
          }
        },
        ["actionBars"] = {
          [1] = { ["category"] = 0, ["label"] = "Primary", ["slots"] = {
            [1] = { ["position"] = 1, ["name"] = "Runeblades", ["abilityId"] = 185794, ["skillAbilityId"] = 185794, ["progressionId"] = 534 },
            [2] = { ["position"] = 2, ["name"] = "Empty", ["abilityId"] = 0 }
          } }
        },
        ["activeWeaponPair"] = { ["pair"] = 1, ["locked"] = false }
      },
      ["equipment"] = { ["items"] = {
        [1] = { ["slotName"] = "Head", ["name"] = "Helm of the Trainee", ["itemId"] = 95986,
          ["quality"] = 2, ["armorTypeName"] = "Heavy", ["trait"] = { ["name"] = "Training", ["id"] = 15 },
          ["set"] = { ["hasSet"] = true, ["name"] = "Armor of the Trainee", ["id"] = 281 },
          ["enchantment"] = { ["name"] = "Maximum Magicka Enchantment" } }
      } },
      ["champion"] = {
        ["totalEarned"] = 209,
        ["disciplines"] = {
          [1] = { ["disciplineId"] = 3, ["name"] = "Craft", ["spent"] = 70, ["unspent"] = 0, ["stars"] = {} },
          [2] = { ["disciplineId"] = 1, ["name"] = "Warfare", ["spent"] = 70, ["unspent"] = 0, ["stars"] = {} },
          [3] = { ["disciplineId"] = 2, ["name"] = "Fitness", ["spent"] = 69, ["unspent"] = 0, ["stars"] = {} }
        },
        ["slotted"] = { ["supported"] = true, ["slots"] = {} }
      },
      ["metadata"] = { ["firstSeenAt"] = ${capturedAt - 10}, ["lastSeenAt"] = ${capturedAt}, ["captureCount"] = 2,
        ["capturedSections"] = { [1] = "identity", [2] = "skills", [3] = "equipment", [4] = "champion" } },
      ["diagnostics"] = { ["warnings"] = {}, ["errors"] = {} },
      ["completeness"] = { ["isComplete"] = true }
    }`
}

function fixture() {
  const aKey = '@Tester|NA Megaserver|1111111111111111'
  const bKey = '@Tester|NA Megaserver|2222222222222222'
  return {
    aKey, bKey,
    text: `ArrowToTheBuildSavedVariables = {
      ["schemaVersion"] = 1, ["revision"] = 12, ["addonVersion"] = "0.1.0-alpha.4.2", ["apiVersion"] = 101050,
      ["characters"] = { ${luaCharacter({ key: aKey, id: '1111111111111111', name: 'Talia Test' })},
        ${luaCharacter({ key: bKey, id: '2222222222222222', name: 'Manual Hero', level: 30, capturedAt: 1786066770 })} }
    }`
  }
}


function bridgeFixture({ key, id, name = 'Talia Test', level = 23, capturedAt = 1786067000, truncated = false } = {}) {
  return `ArrowToTheBuildBridgeSavedVariables = {
    ["schemaVersion"] = 2, ["revision"] = 3, ["addonVersion"] = "0.1.0-alpha.6", ["apiVersion"] = 101050,
    ["capturedAt"] = ${capturedAt}, ["captureReason"] = "level-changed", ["characterKey"] = "${key}",
    ["capturedSections"] = { [1] = "identity", [2] = "skills", [3] = "equipment", [4] = "champion" },
    ["estimatedBytes"] = 8192, ["budgetBytes"] = 32768, ["budgetStatus"] = "${truncated ? 'truncated' : 'ok'}",
    ["truncated"] = ${truncated ? 'true' : 'false'},
    ["reducedFields"] = {}, ["droppedSections"] = ${truncated ? '{ [1] = "equipment" }' : '{}'},
    ["character"] = {
      ["identity"] = "@Tester\\tNA Megaserver\\t${id}\\t${name}\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t${level}\\t0\\t209\\t0\\t7\\t0\\t0\\t27",
      ["skills"] = {
        ["activeWeaponPair"] = "1\\t0",
        ["lines"] = "1\\t218\\t30",
        ["abilities"] = "218\\t185794\\t534\\t4\\t0\\t\\t0\\n218\\t184847\\t0\\t2\\t0\\t2\\t1",
        ["actionBars"] = "0\\t1\\t185794\\t1\\t0\\t185794\\t534\\t218\\t0\\t4\\n0\\t2\\t0\\t0\\t0\\t\\t\\t\\t\\t"
      },
      ["equipment"] = ${truncated ? '""' : '"0\\t99999\\tBridge Test Helm\\t3\\t22\\t0\\t1\\t2\\t3\\t0\\t15\\t281\\tArmor of the Trainee\\tMaximum Stamina Enchantment"'},
      ["champion"] = {
        ["totalEarned"] = 209,
        ["disciplines"] = "3\\t70\\t0\\n1\\t70\\t0\\n2\\t69\\t0",
        ["stars"] = "",
        ["slots"] = ""
      }
    }
  }`
}

function freshApp() {
  addonIntegration.stopWatching()
  dbModule.close()
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'attb-addon-'))
  const profile = path.join(dir, 'Documents', 'Elder Scrolls Online', 'live')
  fs.mkdirSync(path.join(profile, 'SavedVariables'), { recursive: true })
  state.userDataDir = dir
  state.documentsDir = path.join(dir, 'Documents')
  state.homeDir = dir
  state.appPath = path.resolve(__dirname, '..')
  dbModule.initialize(path.join(dir, 'attb.db'))
  const ipc = makeIpc()
  buildHandlers.seedBundled()
  buildHandlers.register(ipc)
  characterHandlers.register(ipc)
  settingsHandlers.register(ipc)
  addonIntegration.register(ipc)
  return { ipc, dir, profile, db: dbModule.getDb() }
}

test.afterEach(() => { addonIntegration.stopWatching(); dbModule.close() })

test('the app installs the addon, discovers characters, links builds, syncs, and restores overrides', async () => {
  const { ipc, profile, db } = freshApp()
  const manualId = ipc.call('characters:create', { name: 'Manual Hero', build_id: 'stamina_arcanist_solo_duo', level: 1 })
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)

  const configured = await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  assert.equal(configured.enabled, true)
  assert.equal(configured.addon_installed, true)
  assert.equal(configured.installed_version, '1.0.0')
  assert.equal(configured.bridge_installed, true)
  assert.equal(configured.bridge_installed_version, '1.0.0')
  assert.equal(configured.snapshot_count, 2)
  assert.ok(fs.existsSync(path.join(profile, 'AddOns', 'ArrowToTheBuild', 'ArrowToTheBuild.txt')))
  assert.ok(fs.existsSync(path.join(profile, 'AddOns', 'ArrowToTheBuildBridge', 'ArrowToTheBuildBridge.txt')))

  const discovered = ipc.call('addon:listDiscovered')
  assert.equal(discovered.length, 2)
  const manual = discovered.find(item => item.character_key === sample.bKey)
  assert.equal(manual.possible_match_id, manualId)
  const taliaDiscovery = discovered.find(item => item.character_key === sample.aKey)
  assert.deepEqual(taliaDiscovery.attributes, { magicka: 0, health: 0, stamina: 26 })

  const created = ipc.call('addon:importCharacter', sample.aKey, { build_id: 'stamina_arcanist_solo_duo' })
  const linked = ipc.call('addon:importCharacter', sample.bKey, { link_character_id: manualId })
  assert.notEqual(created.id, manualId)
  assert.equal(linked.id, manualId)
  assert.throws(() => ipc.call('characters:update', created.id, { build_id: 'magicka_templar_solo_duo' }), /Synced ESO identity is Arcanist/)

  let character = ipc.call('characters:get', created.id)
  assert.equal(character.name, 'Talia Test')
  assert.equal(character.level, 22)
  assert.deepEqual(character.attributes, { magicka: 0, health: 0, stamina: 26 })
  assert.equal(character.cp_craft, 70)
  assert.equal(character.cp_warfare, 70)
  assert.equal(character.cp_fitness, 69)
  assert.equal(character.actual_unspent_skill_points, 6)
  assert.equal(character.actual_unspent_attribute_points, 1)
  assert.equal(character.addon_sync.linked, true)
  assert.equal(character.addon_sync.profile_active, true)
  assert.equal(character.addon_sync.observed.equipment.items[0].name, 'Helm of the Trainee')

  assert.throws(() => ipc.call('characters:update', created.id, { level: 40 }), /Enable synced-data overrides/)
  ipc.call('addon:setOverrideMode', true)
  ipc.call('characters:update', created.id, { level: 40, actual_unspent_skill_points: 99 })
  character = ipc.call('characters:get', created.id)
  assert.equal(character.level, 40)
  assert.equal(character.actual_unspent_skill_points, 99)
  assert.equal(character.addon_sync.overrides.length, 2)

  ipc.call('addon:clearOverride', created.id, 'level')
  assert.equal(ipc.call('characters:get', created.id).level, 22)
  ipc.call('addon:setOverrideMode', false)
  character = ipc.call('characters:get', created.id)
  assert.equal(character.actual_unspent_skill_points, 6)
  assert.deepEqual(character.addon_sync.overrides, [])

  assert.equal(db.prepare('SELECT COUNT(*) n FROM character_addon_links').get().n, 2)
  assert.equal(ipc.call('addon:listDiscovered').length, 0)
})


test('the small bridge updates a linked character before the full archive changes', async () => {
  const { ipc, profile } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  const created = ipc.call('addon:importCharacter', sample.aKey, { build_id: 'stamina_arcanist_solo_duo' })
  assert.equal(ipc.call('characters:get', created.id).level, 22)

  const bridgePath = path.join(profile, 'SavedVariables', 'ArrowToTheBuildBridge.lua')
  fs.writeFileSync(bridgePath, bridgeFixture({ key: sample.aKey, id: '1111111111111111' }))
  const status = await ipc.call('addon:syncNow')
  assert.equal(status.bridge_saved_variables_found, true)
  assert.equal(status.bridge_last_revision, 3)
  assert.equal(status.bridge_within_normal_save_limit, true)

  const character = ipc.call('characters:get', created.id)
  assert.equal(character.level, 23)
  assert.equal(character.actual_unspent_skill_points, 7)
  assert.equal(character.skill_ranks.herald, 30)
  assert.equal(character.addon_sync.observed.equipment.items[0].name, 'Bridge Test Helm')
  assert.equal(character.addon_sync.observed.skills.actionBars[0].slots[0].matchMethod, 'progression-id')
})

test('class mismatches are rejected even when the renderer is bypassed', async () => {
  const { ipc, profile } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  assert.throws(() => ipc.call('addon:importCharacter', sample.aKey, { build_id: 'magicka_templar_solo_duo' }), /Choose a saved build for the Arcanist class/)
})

test('only the active ESO profile contributes discovery and status counts', async () => {
  const { ipc, dir, profile } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  assert.equal(ipc.call('addon:getStatus').snapshot_count, 2)

  const eu = path.join(dir, 'Documents', 'Elder Scrolls Online', 'liveeu')
  fs.mkdirSync(path.join(eu, 'SavedVariables'), { recursive: true })
  fs.writeFileSync(path.join(eu, 'SavedVariables', 'ArrowToTheBuild.lua'), `ArrowToTheBuildSavedVariables={schemaVersion=1,revision=1,addonVersion="0.1.0-alpha.4.2",characters={}}`)
  await ipc.call('addon:configure', { mode: 'existing', profileRoot: eu, autoDetect: false })
  assert.equal(ipc.call('addon:getStatus').snapshot_count, 0)
  assert.equal(ipc.call('addon:listDiscovered').length, 0)
})

test('install and repair preserves a newer companion addon', async () => {
  const { ipc, profile } = freshApp()
  const installed = path.join(profile, 'AddOns', 'ArrowToTheBuild')
  fs.mkdirSync(installed, { recursive: true })
  fs.writeFileSync(path.join(installed, 'ArrowToTheBuild.txt'), '## Title: Arrow to the Build\n## Version: 1.1.0\n')
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)

  const configured = await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  assert.equal(configured.installed_version, '1.1.0')
  assert.equal(configured.addon_newer_than_bundled, true)
  const result = ipc.call('addon:install')
  assert.equal(result.main.skipped, true)
  assert.equal(result.main.reason, 'newer-installed')
  assert.equal(result.bridge.skipped, false)
  assert.equal(result.bridge.version, '1.0.0')
  assert.match(fs.readFileSync(path.join(installed, 'ArrowToTheBuild.txt'), 'utf8'), /1.1.0/)
  assert.ok(fs.existsSync(path.join(profile, 'AddOns', 'ArrowToTheBuildBridge', 'ArrowToTheBuildBridge.txt')))
})


test('a synced character can create a valid editable Schema 4 draft from current ESO state', async () => {
  const { ipc, profile, db } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  const linked = ipc.call('addon:importCharacter', sample.aKey, { build_id: 'stamina_arcanist_solo_duo' })

  const draft = ipc.call('builds:createFromCharacter', linked.id, 'Test Author', {
    name: 'Talia Live Test Build', short_name: 'Talia Live', id: 'talia-live-test',
    primary_role: 'solo', resource: 'stamina', leveling_scope: 'full', bar_count: 2, class_style: 'flexible'
  })
  assert.ok(draft.id.startsWith('draft-'))
  assert.equal(draft.build_id, 'talia-live-test')
  assert.equal(draft.data.id, 'talia-live-test')
  assert.equal(draft.data.name, 'Talia Live Test Build')
  assert.equal(draft.data.short_name, 'Talia Live')
  assert.equal(draft.data.author, 'Test Author')
  assert.equal(draft.data.metadata.resource, 'stamina')
  assert.equal(draft.data.metadata.bar_count, 2)
  assert.equal(draft.data.metadata.class_style, 'flexible')
  assert.equal(draft.data.notes, '')
  assert.equal(draft.data.schema_version, 4)
  assert.equal(draft.data.defaults.class, 'Arcanist')
  assert.equal(draft.data.defaults.race, 'Dark Elf')
  assert.equal(draft.data.defaults.alliance, 'Ebonheart Pact')
  assert.deepEqual(draft.data.defaults.attributes, { magicka: 0, health: 0, stamina: 26 })
  assert.equal(draft.data.extensions.attb.imported_character_state.mode, 'create')
  assert.equal(draft.data.extensions.attb.imported_character_state.level, 22)
  assert.equal(draft.data.phases[0].label, 'Imported Character State - Level 22')
  assert.equal(draft.data.phases[0].front_bar.slots[0].name, 'Runeblades')
  assert.equal(draft.data.gear_stages[0].sets[0].pieces[0].item_name, 'Helm of the Trainee')
  assert.ok(draft.data.unlock_order.some(row => row.catalog_skill_id === 'herald__runeblades' && row.imported_state === 'owned'))
  assert.equal(draft.data.unlock_order.filter(row => row.catalog_skill_id === 'herald__fated_fortune').length, 2)
  assert.deepEqual(buildHandlers.validateBuild(draft.data), [])
  assert.equal(db.prepare('SELECT last_saved_revision FROM builds WHERE id=?').get(draft.build_id).last_saved_revision, 0, 'generated character builds stay draft-only until Save Build')
})


test('a newly discovered ESO character can create its own build before any existing build is selected', async () => {
  const { ipc, profile, db } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })

  const created = ipc.call('addon:importCharacter', sample.aKey, { create_build: {
    name: 'Fresh Imported Arcanist', short_name: 'Fresh Arcanist', id: 'fresh.imported_arcanist',
    author: 'Import Author', primary_role: 'damage', resource: 'stamina', leveling_scope: 'full', bar_count: 2, class_style: 'pure_class'
  } })

  assert.equal(created.created_build, true)
  assert.equal(created.build_id, 'fresh.imported_arcanist')
  assert.ok(created.draft_id.startsWith('draft-'))
  const character = ipc.call('characters:get', created.id)
  assert.equal(character.build_id, 'fresh.imported_arcanist')
  assert.equal(character.level, 22)
  assert.equal(character.addon_sync.linked, true)
  const build = JSON.parse(db.prepare('SELECT data_json FROM builds WHERE id=?').get(created.build_id).data_json)
  assert.equal(build.name, 'Fresh Imported Arcanist')
  assert.equal(build.author, 'Import Author')
  assert.equal(build.extensions.attb.imported_character_state.mode, 'create')
  assert.deepEqual(buildHandlers.validateBuild(build), [])
  assert.equal(db.prepare('SELECT last_saved_revision FROM builds WHERE id=?').get(created.build_id).last_saved_revision, 0)

  // Permanent IDs are chosen before creation and must never silently suffix when the user supplied one.
  const sample2 = fixture()
  assert.throws(() => ipc.call('addon:importCharacter', sample2.bKey, { create_build: {
    name: 'Another Build', id: 'fresh.imported_arcanist', author: 'Import Author', resource: 'stamina'
  } }), /already exists/)
})

test('adapting a saved target preserves recommendations and marks current owned catch-up and future rows', async () => {
  const { ipc, profile, db } = freshApp()
  const sample = fixture()
  fs.writeFileSync(path.join(profile, 'SavedVariables', 'ArrowToTheBuild.lua'), sample.text)
  await ipc.call('addon:configure', { mode: 'install', profileRoot: profile, autoDetect: false })
  const linked = ipc.call('addon:importCharacter', sample.aKey, { build_id: 'stamina_arcanist_solo_duo' })
  const sourceBefore = JSON.parse(db.prepare('SELECT data_json FROM builds WHERE id=?').get('stamina_arcanist_solo_duo').data_json)

  const draft = ipc.call('builds:adaptFromCharacter', linked.id, 'stamina_arcanist_solo_duo', '', 'Test Author')
  assert.equal(draft.data.extensions.attb.imported_character_state.mode, 'adapt')
  assert.equal(draft.data.extensions.attb.imported_character_state.source_build_id, 'stamina_arcanist_solo_duo')
  assert.equal(draft.data.extensions.attb.imported_character_state.target_preserved, true)
  assert.deepEqual(draft.data.defaults, sourceBefore.defaults, 'CURRENT character state must not replace TARGET build defaults')
  assert.deepEqual(draft.data.gear_stages.slice(1), sourceBefore.gear_stages, 'random current equipment must not replace target gear stages')
  assert.deepEqual(draft.data.phases.slice(1), sourceBefore.phases, 'target progression remains intact after the truthful import milestone')
  assert.equal(draft.data.phases[0].label, 'Imported Character State - Level 22')
  assert.ok(draft.data.unlock_order.some(row => row.catalog_skill_id === 'herald__runeblades' && row.import_status === 'owned'))
  assert.ok(draft.data.unlock_order.some(row => row.import_status === 'catch-up'), 'unowned but already rank-eligible recommendations become catch-up rows')
  assert.ok(draft.data.unlock_order.some(row => row.import_status === 'future'), 'later recommendations remain future rows')
  assert.deepEqual(buildHandlers.validateBuild(draft.data), [])
  const adaptedRow = db.prepare('SELECT origin_type,forked_from_build_id,last_saved_revision FROM builds WHERE id=?').get(draft.build_id)
  assert.equal(adaptedRow.origin_type, 'fork')
  assert.equal(adaptedRow.forked_from_build_id, 'stamina_arcanist_solo_duo')
  assert.equal(adaptedRow.last_saved_revision, 0)
  const sourceAfter = JSON.parse(db.prepare('SELECT data_json FROM builds WHERE id=?').get('stamina_arcanist_solo_duo').data_json)
  assert.deepEqual(sourceAfter, sourceBefore, 'adapting must never mutate the selected source build')
})
