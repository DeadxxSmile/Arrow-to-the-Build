'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
require('./electron-stub')
const { parseSavedVariables, normalizeLuaTables } = require('../src/main/addon/luaSavedVariables')
const { normalizeSnapshot, liveCharacterState, decodeBridgeSnapshot, bridgeRootAsArchive } = require('../src/main/addon/integration')

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


test('legacy bridge schema 1 still expands into the normal snapshot contract', () => {
  const parsed = normalizeLuaTables(parseSavedVariables(`ArrowToTheBuildBridgeSavedVariables={
    schemaVersion=1,revision=4,addonVersion="0.1.0-alpha.5",apiVersion=101050,capturedAt=1786067000,
    captureReason="level-changed",characterKey="@Player|NA Megaserver|123",
    capturedSections={"identity","skills"},character={
      identity="@Player\\tNA Megaserver\\t123\\tTalia Tempest\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t23\\t0\\t209\\t0\\t7\\t0\\t0\\t27",
      skills={activeWeaponPair="1\\t0",lines={{header="1\\t218\\tHerald of the Tome\\t30",abilities={"185794\\t185794\\t534\\tRuneblades\\t4\\t0\\t\\t\\t0\\t0"}}},actionBars={}},
      equipment={},champion={totalEarned=209,disciplines={},slots={}}
    }
  }`, 'ArrowToTheBuildBridgeSavedVariables'))
  const decoded = decodeBridgeSnapshot(parsed)
  assert.equal(decoded.characterKey, '@Player|NA Megaserver|123')
  assert.equal(decoded.raw.identity.level, 23)
  assert.equal(decoded.raw.identity.progression.availableSkillPoints, 7)
  assert.equal(decoded.raw.skills.lines[0].name, 'Herald of the Tome')
  assert.equal(decoded.raw.skills.lines[0].rank, 30)
  assert.equal(decoded.raw.skills.lines[0].abilities[0].name, 'Runeblades')
  assert.equal(decoded.raw.dataProfile, 'near-live-bridge')
})

test('bridge schema 2 decodes the flat ID-first payload and exposes budget metadata', () => {
  const parsed = normalizeLuaTables(parseSavedVariables(`ArrowToTheBuildBridgeSavedVariables={
    schemaVersion=2,revision=9,addonVersion="0.1.0-alpha.6",apiVersion=101050,capturedAt=1786067100,
    captureReason="skill-progression-changed",characterKey="@Player|NA Megaserver|123",
    capturedSections={"identity","skills"},estimatedBytes=7420,budgetBytes=32768,budgetStatus="ok",truncated=false,
    reducedFields={},droppedSections={},character={
      identity="@Player\\tNA Megaserver\\t123\\tTalia Tempest\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t23\\t0\\t209\\t0\\t7\\t0\\t0\\t27",
      skills={activeWeaponPair="1\\t0",lines="1\\t218\\t30",abilities="218\\t185794\\t534\\t4\\t0\\t\\t0",
        actionBars="0\\t1\\t193398\\t1\\t0\\t185794\\t534\\t218\\t0\\t4"},
      equipment="",champion={totalEarned=209,disciplines="3\\t70\\t0",stars="",slots=""}
    }
  }`, 'ArrowToTheBuildBridgeSavedVariables'))
  const decoded = decodeBridgeSnapshot(parsed)
  assert.equal(decoded.raw.dataProfile, 'near-live-bridge-v2')
  assert.equal(decoded.raw.skills.lines[0].skillLineId, 218)
  assert.equal(decoded.raw.skills.lines[0].name, '')
  assert.equal(decoded.raw.skills.lines[0].abilities[0].progressionId, 534)
  assert.equal(decoded.raw.skills.actionBars[0].slots[0].name, 'Ability 193398')
  assert.equal(decoded.raw.skills.actionBars[0].slots[0].matchMethod, 'progression-id')
  assert.equal(decoded.raw.completeness.isComplete, true)
  assert.equal(decoded.raw.completeness.estimatedBytes, 7420)
  assert.equal(decoded.raw.completeness.budgetBytes, 32768)
})

test('schema 2 bridge IDs are enriched from an older durable archive without replacing fresher numeric state', () => {
  const parsed = normalizeLuaTables(parseSavedVariables(`ArrowToTheBuildBridgeSavedVariables={
    schemaVersion=2,revision=12,addonVersion="0.1.0-alpha.6",apiVersion=101050,capturedAt=1786067300,
    captureReason="skill-progression-changed",characterKey="@Player|NA Megaserver|123",capturedSections={"skills"},
    estimatedBytes=7200,budgetBytes=32768,budgetStatus="ok",truncated=false,reducedFields={},droppedSections={},character={
      identity="@Player\\tNA Megaserver\\t123\\tTalia Tempest\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t24\\t0\\t209\\t0\\t6\\t0\\t0\\t28",
      skills={activeWeaponPair="1\\t0",lines="1\\t218\\t31",abilities="218\\t185794\\t534\\t4\\t0\\t\\t0",
        actionBars="0\\t1\\t193398\\t1\\t0\\t185794\\t534\\t218\\t0\\t4"},
      equipment="",champion={totalEarned=209,disciplines="3\\t70\\t0",stars="",slots=""}
    }
  }`, 'ArrowToTheBuildBridgeSavedVariables'))
  const previous = normalizeSnapshot('@Player|NA Megaserver|123', {
    addonVersion: '0.1.0-alpha.6', snapshotSchemaVersion: 2, capturedAt: 1786067100,
    identity: { characterKey: '@Player|NA Megaserver|123', accountName: '@Player', worldName: 'NA Megaserver', characterId: '123', name: 'Talia Tempest', level: 23, class: { id: 117, name: 'Arcanist' }, race: { id: 4, name: 'Dark Elf' }, alliance: { id: 2, name: 'Ebonheart Pact' }, progression: {}, attributes: {} },
    skills: { lines: [{ skillType: 1, skillTypeName: 'Class', skillLineId: 218, name: 'Herald of the Tome', rank: 30, abilities: [{ abilityId: 185794, baseAbilityId: 185794, progressionId: 534, name: 'Runeblades', currentRank: 3, currentMorph: 0, isPassive: false, isUltimate: false }] }], actionBars: [], activeWeaponPair: {} },
    equipment: { items: [] }, champion: { totalEarned: 209, disciplines: [], slotted: { supported: true, slots: [] } }, metadata: {}
  }, { addonVersion: '0.1.0-alpha.6', apiVersion: 101050 })
  const synthetic = bridgeRootAsArchive(parsed, previous)
  const merged = synthetic.characters['@Player|NA Megaserver|123']
  assert.equal(merged.identity.level, 24, 'fresher bridge level must win')
  assert.equal(merged.skills.lines[0].rank, 31, 'fresher bridge skill rank must win')
  assert.equal(merged.skills.lines[0].name, 'Herald of the Tome')
  assert.equal(merged.skills.lines[0].abilities[0].name, 'Runeblades')
  assert.equal(merged.skills.actionBars[0].slots[0].name, 'Runeblades')
})

test('a truncated flat bridge can preserve omitted sections from the previous complete snapshot', () => {
  const parsed = normalizeLuaTables(parseSavedVariables(`ArrowToTheBuildBridgeSavedVariables={
    schemaVersion=2,revision=10,addonVersion="0.1.0-alpha.6",apiVersion=101050,capturedAt=1786067200,
    captureReason="level-changed",characterKey="@Player|NA Megaserver|123",capturedSections={"identity"},
    estimatedBytes=4100,budgetBytes=32768,budgetStatus="truncated",truncated=true,reducedFields={},droppedSections={"equipment"},
    character={identity="@Player\\tNA Megaserver\\t123\\tTalia Tempest\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t24\\t0\\t209\\t0\\t7\\t0\\t0\\t28",
      skills={activeWeaponPair="1\\t0",lines="",abilities="",actionBars=""},equipment="",champion={totalEarned=209,disciplines="",stars="",slots=""}}
  }`, 'ArrowToTheBuildBridgeSavedVariables'))
  const previous = normalizeSnapshot('@Player|NA Megaserver|123', {
    addonVersion: '0.1.0-alpha.6', snapshotSchemaVersion: 2, capturedAt: 1786067100,
    identity: { characterKey: '@Player|NA Megaserver|123', accountName: '@Player', worldName: 'NA Megaserver', characterId: '123', name: 'Talia Tempest', level: 23, class: { id: 117, name: 'Arcanist' }, race: { id: 4, name: 'Dark Elf' }, alliance: { id: 2, name: 'Ebonheart Pact' }, progression: {}, attributes: {} },
    skills: { lines: [], actionBars: [], activeWeaponPair: {} },
    equipment: { items: [{ equipSlot: 0, itemId: 999, name: 'Preserved Helm', set: { id: 281, name: 'Armor of the Trainee' }, trait: { id: 15, name: 'Training' }, enchantment: { name: 'Maximum Stamina Enchantment' } }] },
    champion: { totalEarned: 209, disciplines: [], slotted: { supported: true, slots: [] } },
    metadata: {}, completeness: { isComplete: true }
  }, { addonVersion: '0.1.0-alpha.6', apiVersion: 101050 })
  const synthetic = bridgeRootAsArchive(parsed, previous)
  const merged = synthetic.characters['@Player|NA Megaserver|123']
  assert.equal(merged.identity.level, 24)
  assert.equal(merged.equipment.items[0].name, 'Preserved Helm')
  assert.equal(merged.completeness.truncated, true)
  const normalizedMerged = normalizeSnapshot('@Player|NA Megaserver|123', merged, merged)
  assert.doesNotThrow(() => liveCharacterState(normalizedMerged), 'partial bridge reconciliation must preserve the live-state contract')
})

test('reconciliation survives a previous archive whose disciplines carry empty stars tables', () => {
  // Regression: an empty Lua `stars = {}` decodes to {} (a truthy non-array). normalizeSnapshot left it
  // as an object, and the enrich loop did `for (const star of discipline.stars || [])`, which threw
  // "object is not iterable" and silently killed the sync bridge inside syncNow's catch.
  const parsed = normalizeLuaTables(parseSavedVariables(`ArrowToTheBuildBridgeSavedVariables={
    schemaVersion=2,revision=11,addonVersion="0.1.0-alpha.6",apiVersion=101050,capturedAt=1786067300,
    captureReason="champion-changed",characterKey="@Player|NA Megaserver|123",capturedSections={"identity","champion"},
    estimatedBytes=4200,budgetBytes=32768,budgetStatus="ok",truncated=false,reducedFields={},droppedSections={},
    character={identity="@Player\\tNA Megaserver\\t123\\tTalia\\t117\\tArcanist\\t4\\tDark Elf\\t2\\tEbonheart Pact\\t25\\t0\\t210\\t0\\t7\\t0\\t0\\t28",
      skills={activeWeaponPair="1\\t0",lines="",abilities="",actionBars=""},equipment="",champion={totalEarned=210,disciplines="3\\t70\\t0",stars="",slots=""}}
  }`, 'ArrowToTheBuildBridgeSavedVariables'))
  // The previous archive has a discipline with stars as an empty object, exactly the shape that threw.
  const previous = normalizeSnapshot('@Player|NA Megaserver|123', {
    addonVersion: '0.1.0-alpha.6', snapshotSchemaVersion: 2, capturedAt: 1786067200,
    identity: { characterKey: '@Player|NA Megaserver|123', accountName: '@Player', worldName: 'NA Megaserver', characterId: '123', name: 'Talia', level: 24, class: { id: 117, name: 'Arcanist' }, race: { id: 4, name: 'Dark Elf' }, alliance: { id: 2, name: 'Ebonheart Pact' }, progression: {}, attributes: {} },
    skills: { lines: [], actionBars: [], activeWeaponPair: {} },
    equipment: { items: [] },
    champion: { totalEarned: 209, disciplines: [{ disciplineId: 3, name: 'Craft', spent: 70, unspent: 0, stars: {} }], slotted: { supported: true, slots: {} } },
    metadata: {}, completeness: { isComplete: true }
  }, { addonVersion: '0.1.0-alpha.6', apiVersion: 101050 })
  let synthetic
  assert.doesNotThrow(() => { synthetic = bridgeRootAsArchive(parsed, previous) }, 'empty-object stars must not break enrichment')
  const merged = synthetic.characters['@Player|NA Megaserver|123']
  assert.equal(merged.identity.level, 25)
  assert.doesNotThrow(() => liveCharacterState(normalizeSnapshot('@Player|NA Megaserver|123', merged, merged)))
})

function luaWire(value) {
  if (value === null || value === undefined) return 'nil'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return `{${value.map((item, index) => `[${index + 1}]=${luaWire(item)}`).join(',')}}`
  return `{${Object.entries(value).map(([key, item]) => `[${JSON.stringify(key)}]=${luaWire(item)}`).join(',')}}`
}

function estimatorValue(value, seen = new Set()) {
  if (value === null || value === undefined) return 4
  if (typeof value === 'boolean') return value ? 4 : 5
  if (typeof value === 'number') return String(value).length + 2
  if (typeof value === 'string') return value.length + 6
  if (typeof value !== 'object') return String(value).length + 8
  if (seen.has(value)) return 8
  seen.add(value)
  let total = 8
  const entries = Array.isArray(value) ? value.map((item, index) => [index + 1, item]) : Object.entries(value)
  for (const [key, item] of entries) total += estimatorValue(key, seen) + estimatorValue(item, seen) + 10
  seen.delete(value)
  return total
}

function estimatedSerializedBytes(root) { return Math.ceil(estimatorValue(root) * 1.5 + 512) }

function syntheticBridgeRoot({ lineCount, abilitiesPerLine, starCount, equipmentNames = true, enchantments = true }) {
  const pack = (...values) => values.map(value => value == null ? '' : String(value)).join('\t')
  let abilityId = 100000
  const lines = []
  const abilities = []
  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const lineId = 1000 + lineIndex
    lines.push(pack((lineIndex % 8) + 1, lineId, 50))
    for (let abilityIndex = 0; abilityIndex < abilitiesPerLine; abilityIndex += 1) {
      abilities.push(pack(lineId, abilityId, abilityId + 2, 4, abilityIndex % 3, 2, 0))
      abilityId += 3
    }
  }
  const actionBars = []
  for (const category of [0, 1]) for (let index = 0; index < 6; index += 1) {
    actionBars.push(pack(category, index + 1, 300000 + index, 1, index === 5 ? 1 : 0, 300000 + index, 4000 + index, 1000 + index, 2, 4))
  }
  return {
    schemaVersion: 2, addonVersion: '0.1.0-alpha.6', apiVersion: 101050, revision: 999, createdAt: 1, capturedAt: 1,
    captureReason: 'budget-fixture', characterKey: '@Tester|NA Megaserver|9999999999999999',
    capturedSections: ['identity', 'skills', 'equipment', 'champion'], estimatedBytes: 0, budgetBytes: 32768,
    budgetStatus: 'ok', truncated: false, reducedFields: [], droppedSections: [], lastPrioritySaveRequestedAt: 0,
    character: {
      identity: pack('@Tester', 'NA Megaserver', '9999999999999999', 'Maxed Character', 117, 'Arcanist', 4, 'Dark Elf', 2, 'Ebonheart Pact', 50, 3600, 3600, 0, 250, 0, 0, 64),
      skills: {
        activeWeaponPair: '1\t0',
        lines: lines.join('\n'),
        abilities: abilities.join('\n'),
        actionBars: actionBars.join('\n')
      },
      equipment: Array.from({ length: 13 }, (_, index) => pack(index, 500000 + index, equipmentNames ? `Equipment Item ${index + 1}` : '', 5, 50, 160, 1, 2, 3, 4, 15, 281, equipmentNames ? 'Long Set Name' : '', enchantments ? 'Maximum Stamina Enchantment' : '')).join('\n'),
      champion: {
        totalEarned: 3600,
        disciplines: [1, 2, 3].map(disciplineId => pack(disciplineId, 1200, 0)).join('\n'),
        stars: Array.from({ length: starCount }, (_, index) => pack((index % 3) + 1, 200000 + index, 50, 50, index % 3, index % 4 === 0 ? 1 : 0)).join('\n'),
        slots: Array.from({ length: 12 }, (_, index) => pack(index + 1, (index % 3) + 1, 200000 + index)).join('\n')
      }
    }
  }
}

test('flat schema 2 keeps both low-level and realistically maxed complete snapshots inside the hard bridge gate', () => {
  const levelThree = syntheticBridgeRoot({ lineCount: 3, abilitiesPerLine: 1, starCount: 0 })
  const maxed = syntheticBridgeRoot({ lineCount: 45, abilitiesPerLine: 7, starCount: 90 })
  const maxedReducedDisplay = syntheticBridgeRoot({ lineCount: 45, abilitiesPerLine: 7, starCount: 90, equipmentNames: false, enchantments: false })
  const lowWire = Buffer.byteLength(`ArrowToTheBuildBridgeSavedVariables=${luaWire(levelThree)}`, 'utf8')
  const maxWire = Buffer.byteLength(`ArrowToTheBuildBridgeSavedVariables=${luaWire(maxed)}`, 'utf8')
  const maxEstimate = estimatedSerializedBytes(maxed)
  assert.ok(lowWire < 6 * 1024, `low-level bridge should be tiny, got ${lowWire} bytes`)
  assert.ok(maxWire < 24 * 1024, `packed maxed-character wire should stay compact before ESO formatting; got ${maxWire}`)
  assert.ok(maxEstimate < 32 * 1024, `conservative complete maxed-character estimate must pass the 32 KiB bridge budget; got ${maxEstimate}`)
  assert.ok(estimatedSerializedBytes(maxedReducedDisplay) < maxEstimate, 'deterministic display reduction must make the fallback smaller')
})

test('bridge source uses packed row blobs, deterministic budget degradation, and root replacement', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const source = fs.readFileSync(path.join(__dirname, '..', 'resources/addon/ArrowToTheBuildBridge/Bridge.lua'), 'utf8')
  assert.match(source, /Bridge\.budgetBytes = 32768/)
  assert.match(source, /local function rowsBlob/)
  assert.match(source, /estimateValue\(root\) \* 1\.5/)
  assert.match(source, /dropEnchantments/)
  const stages = source.slice(source.indexOf('local stages = {'))
  assert.ok(stages.indexOf('dropEnchantments') < stages.indexOf('dropEquipmentNames'))
  assert.ok(stages.indexOf('dropEquipmentNames') < stages.indexOf('dropChampionDetails'))
  assert.ok(stages.indexOf('dropChampionDetails') < stages.indexOf('dropEquipment = true'))
  assert.ok(stages.indexOf('dropEquipment = true') < stages.indexOf('dropSkills = true'))
  assert.match(source, /ArrowToTheBuildBridgeSavedVariables = saved/)
  assert.match(source, /snapshot\.captureReason == \"player-deactivated\"/)
  assert.match(source, /estimatedBytes/)
  assert.match(source, /budgetStatus/)

  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'resources/addon/ArrowToTheBuild/Core.lua'), 'utf8')
  const archivePriorityCalls = mainSource.match(/ATTB\.RequestPrioritySave\(/g) || []
  assert.equal(archivePriorityCalls.length, 1, 'the durable archive may retain the helper definition but must not request normal-play priority')
})
