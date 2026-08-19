'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
require('./electron-stub')
const { parseSavedVariables, normalizeLuaTables } = require('../src/main/addon/luaSavedVariables')
const { normalizeSnapshot, liveCharacterState } = require('../src/main/addon/integration')
const { createCharacterBuildImport } = require('../src/main/ipc/buildCharacterImport')

const fixture = `
-- ESO SavedVariables fixture
ArrowToTheBuildSavedVariables =
{
  ["schemaVersion"] = 1,
  ["revision"] = 9,
  ["enabled"] = true,
  ["characters"] = {
    ["@Player|NA Megaserver|1234567890123456"] = {
      ["identity"] = {
        ["name"] = "Talia Tempest",
        ["level"] = 22,
      },
      ["metadata"] = { ["capturedSections"] = { [1] = "identity", [2] = "skills", }, },
    },
  },
};
`

test('the restricted parser reads ESO table data without executing Lua', () => {
  const parsed = normalizeLuaTables(parseSavedVariables(fixture))
  assert.equal(parsed.schemaVersion, 1)
  assert.equal(parsed.revision, 9)
  assert.equal(parsed.enabled, true)
  assert.equal(parsed.characters['@Player|NA Megaserver|1234567890123456'].identity.name, 'Talia Tempest')
  assert.deepEqual(parsed.characters['@Player|NA Megaserver|1234567890123456'].metadata.capturedSections, ['identity', 'skills'])
})

test('strings, comments, scalar keys, escapes, nil, and scientific numbers are supported', () => {
  const parsed = parseSavedVariables(`ArrowToTheBuildSavedVariables={-- line\n[1]='a\\n', flag=false, gone=nil, [true]=1.5e2, hex=0x10}`)
  assert.equal(parsed['1'], 'a\n')
  assert.equal(parsed.flag, false)
  assert.equal(parsed.gone, null)
  assert.equal(parsed.true, 150)
  assert.equal(parsed.hex, 16)
})

test('wrong roots and executable Lua are rejected', () => {
  assert.throws(() => parseSavedVariables('OtherAddon = {}'), /Expected ArrowToTheBuildSavedVariables/)
  assert.throws(() => parseSavedVariables('ArrowToTheBuildSavedVariables = os.execute("nope")'), /Unsupported Lua identifier value/)
  assert.throws(() => parseSavedVariables('ArrowToTheBuildSavedVariables = {}; os.execute("nope")'), /Unexpected token after SavedVariables table/)
  assert.throws(() => parseSavedVariables('ArrowToTheBuildSavedVariables = { value = function() end }'), /Unsupported Lua identifier value/)
})

test('table keys cannot smuggle nested objects or mutate object prototypes', () => {
  assert.throws(() => parseSavedVariables('ArrowToTheBuildSavedVariables = { [{}] = 1 }'), /keys must be scalar/)
  const parsed = parseSavedVariables('ArrowToTheBuildSavedVariables = { ["__proto__"] = { polluted = true } }')
  assert.equal({}.polluted, undefined)
  assert.equal(parsed.__proto__.polluted, true)
  assert.equal(Object.prototype.polluted, undefined)
})

test('the file size safety limit is enforced before parsing', () => {
  const huge = `ArrowToTheBuildSavedVariables = { value = "${'x'.repeat(8 * 1024 * 1024)}" }`
  assert.throws(() => parseSavedVariables(huge), /larger than the supported 8 MB/)
})


test('a complete archive snapshot normalizes into live character state without bridge reconciliation', () => {
  const key = '@Player|NA Megaserver|123'
  const snapshot = normalizeSnapshot(key, {
    addonVersion: '1.1.0', snapshotSchemaVersion: 2, capturedAt: 1786067300,
    identity: {
      characterKey: key, accountName: '@Player', worldName: 'NA Megaserver', characterId: '123', name: 'Talia Tempest', level: 24,
      class: { id: 117, name: 'Arcanist' }, race: { id: 4, name: 'Dark Elf' }, alliance: { id: 2, name: 'Ebonheart Pact' },
      zone: { name: 'Necrom', index: 42 },
      progression: { availableSkillPoints: 7, availableAttributePoints: 0 },
      attributes: {
        magicka: { spentPoints: 0, power: { current: 18000, maximum: 19000, effectiveMaximum: 19250 } },
        health: { spentPoints: 0, power: { current: 21000, maximum: 22000, effectiveMaximum: 22300 } },
        stamina: { spentPoints: 28, power: { current: 26000, maximum: 27000, effectiveMaximum: 27500 } }
      }
    },
    skills: { lines: [{ skillType: 1, skillTypeName: 'Class', skillLineId: 218, name: 'Herald of the Tome', rank: 31, abilities: [] }], actionBars: [], activeWeaponPair: {} },
    equipment: { items: [] }, champion: { totalEarned: 209, disciplines: [], slotted: { supported: true, slots: [] } },
    metadata: {}, completeness: { isComplete: true }
  }, { addonVersion: '1.1.0', apiVersion: 101050 })
  const live = liveCharacterState(snapshot)
  assert.equal(live.level, 24)
  assert.equal(live.actual_unspent_skill_points, 7)
  assert.equal(live.skill_ranks.herald, 31)
  assert.equal(snapshot.identity.zone.name, 'Necrom')
  assert.equal(snapshot.identity.attributes.stamina.power.effectiveMaximum, 27500)
})


test('generic ESO Class Mastery maps to the class-specific catalog line', () => {
  const snapshot = normalizeSnapshot('@Player|NA Megaserver|1', {
    identity: {
      accountName: '@Player', worldName: 'NA Megaserver', characterId: '1', name: 'Tank', level: 50,
      class: { id: 1, name: 'Dragonknight' }, race: { name: 'Nord' }, alliance: { name: 'Ebonheart Pact' },
      progression: {}, attributes: {}
    },
    skills: { lines: [{ name: 'Class Mastery', skillLineId: 351, rank: 1, abilities: [] }] },
    equipment: { items: [] }, champion: { disciplines: [] }
  }, { addonVersion: 'test', apiVersion: 101050 })
  const live = liveCharacterState(snapshot)
  assert.equal(live.skill_ranks.dragonknight_mastery, 1)
  assert.ok(live.tracked_skill_lines.includes('dragonknight_mastery'))
})


test('imported equipment IDs remain unique even if display metadata repeats a slot label', () => {
  const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item'
  const importer = createCharacterBuildImport({
    catalog: {
      normalizeSkillName: value => String(value || '').toLowerCase(),
      normalizeLineName: value => String(value || '').toLowerCase(),
      getSkill: () => null,
      getLine: () => null,
      getCatalog: () => ({ lines: [] })
    },
    isObj: value => !!value && typeof value === 'object' && !Array.isArray(value),
    slugify,
    normalClassLines: () => [],
    lineRecord: value => value,
    createGuidedBuildData: () => ({}),
    requestedBuildId: () => 'unused',
    uniqueBuildId: () => 'adapted-test'
  })
  const state = {
    character_name: 'Talia', class_name: 'Arcanist', race: 'Dark Elf', alliance: 'Ebonheart Pact', world_name: 'NA Megaserver', captured_at: 1,
    live: { name: 'Talia', level: 24, attributes: { magicka: 0, health: 0, stamina: 29 }, skill_allocations: {}, skill_ranks: {}, tracked_skill_lines: [] },
    observed: { skills: { actionBars: [] }, champion: { disciplines: [], slotted: { slots: [] } }, equipment: { items: [
      { equipSlot: 4, slotName: 'Front Main Hand', itemId: 102035, name: 'Matched Dagger', weaponTypeName: 'Dagger' },
      { equipSlot: 5, slotName: 'Front Main Hand', itemId: 102035, name: 'Matched Dagger', weaponTypeName: 'Dagger' }
    ] } }
  }
  const source = { id: 'source', name: 'Source', class_name: 'Arcanist' }
  const sourceData = { id: 'source', name: 'Source', defaults: { class: 'Arcanist' }, relevant_lines: [], unlock_order: [], gear_stages: [], phases: [], extensions: {} }
  const { data } = importer.adaptBuildToImportedState(state, source, sourceData, '', 'Test')
  const pieces = data.gear_stages[0].sets[0].pieces
  assert.deepEqual(pieces.map(piece => piece.id), ['slot-4-102035', 'slot-5-102035'])
  assert.equal(new Set(pieces.map(piece => piece.id)).size, 2)
})

test('purchased rank-zero inherent passives are treated as unlocked and expose a one-rank live cap', () => {
  const snapshot = normalizeSnapshot('@Player|NA Megaserver|1', {
    identity: {
      accountName: '@Player', worldName: 'NA Megaserver', characterId: '1', name: 'Talia', level: 30,
      class: { id: 117, name: 'Arcanist' }, race: { id: 4, name: 'Dark Elf' }, alliance: { id: 2, name: 'Ebonheart Pact' },
      progression: {}, attributes: {}
    },
    skills: { lines: [{
      skillType: 7, skillTypeName: 'Racial', skillLineId: 64, name: 'Dark Elf Skills', rank: 30,
      abilities: [
        { abilityId: 36588, baseAbilityId: 36588, progressionId: 0, name: 'Ashlander', currentRank: 0, currentMorph: 0, isPassive: true, isUltimate: false },
        { abilityId: 45265, baseAbilityId: 45265, progressionId: 0, name: 'Dynamic', currentRank: 2, currentMorph: 0, passiveRank: 2, passiveMaxRank: 3, isPassive: true, isUltimate: false }
      ]
    }] },
    equipment: { items: [] }, champion: { disciplines: [] }
  }, { addonVersion: '1.0.0', apiVersion: 101050 })
  const live = liveCharacterState(snapshot)
  assert.equal(live.skill_allocations.dark_elf__ashlander, 1)
  assert.equal(live.skill_max_points.dark_elf__ashlander, 1)
  assert.equal(live.skill_allocations.dark_elf__dynamic, 2)
  assert.equal(live.skill_max_points.dark_elf__dynamic, 3)
})

