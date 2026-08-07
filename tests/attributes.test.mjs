import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ATTRIBUTE_KEYS, attributePointsForLevel, attributeSummary, attributeTotal, readAttributes } from '../src/renderer/utils/buildLogic.mjs'
import { applyVariant } from '../src/renderer/utils/variantLogic.mjs'

const arcanist = JSON.parse(fs.readFileSync(new URL('../resources/builds/stamina_arcanist_solo_duo.json', import.meta.url), 'utf8'))
const character = over => ({ level: 50, attributes: {}, ...over })

test('level 50 and above provides the full 64 points', () => {
  assert.equal(attributePointsForLevel(50), 64)
  assert.equal(attributePointsForLevel(80), 64, 'levels past 50 still cap at 64')
})

test("pre-50 levels use ESO's exact milestone awards", () => {
  const expected = new Map([
    [1, 0], [2, 1], [4, 3], [5, 5], [9, 9], [10, 12],
    [15, 18], [20, 25], [25, 31], [30, 38], [35, 44],
    [40, 51], [45, 57], [49, 61], [50, 64]
  ])
  for (const [level, points] of expected) assert.equal(attributePointsForLevel(level), points, `level ${level}`)
})

test('attribute awards never decrease and land on 64 exactly', () => {
  let previous = 0
  for (let level = 1; level <= 50; level += 1) {
    const value = attributePointsForLevel(level)
    assert.ok(Number.isInteger(value) && value >= previous && value <= 64, `level ${level} gave ${value}`)
    previous = value
  }
  assert.equal(previous, 64)
})

test('bad level input never produces NaN', () => {
  for (const bad of [undefined, null, NaN, -5, 'abc', {}]) {
    const value = attributePointsForLevel(bad)
    assert.ok(Number.isInteger(value) && value >= 0, `${String(bad)} gave ${value}`)
  }
})

test('attribute values are read as whole non-negative numbers', () => {
  assert.deepEqual(readAttributes({ magicka: 10, health: 5, stamina: 2 }), { magicka: 10, health: 5, stamina: 2 })
  assert.deepEqual(readAttributes({ magicka: -4, health: 2.7, stamina: 'x' }), { magicka: 0, health: 2, stamina: 0 })
  assert.deepEqual(readAttributes(undefined), { magicka: 0, health: 0, stamina: 0 })
  assert.deepEqual(readAttributes(null), { magicka: 0, health: 0, stamina: 0 })
  assert.equal(attributeTotal({ magicka: 30, health: 20, stamina: 14 }), 64)
})

test('the summary compares actual against the build target', () => {
  const s = attributeSummary(character({ attributes: { magicka: 0, health: 10, stamina: 54 } }), arcanist)
  assert.equal(s.spent, 64)
  assert.equal(s.available, 64)
  assert.equal(s.remaining, 0)
  assert.deepEqual(s.target, { magicka: 0, health: 0, stamina: 64 })
  assert.equal(s.targetTotal, 64)
  assert.deepEqual(s.difference, { magicka: 0, health: 10, stamina: -10 })
  assert.equal(s.matchesTarget, false)
  assert.equal(s.overAvailable, 0)
})

test('matching the build target is detected exactly', () => {
  const s = attributeSummary(character({ attributes: { magicka: 0, health: 0, stamina: 64 } }), arcanist)
  assert.equal(s.matchesTarget, true)
  assert.deepEqual(s.difference, { magicka: 0, health: 0, stamina: 0 })
})

test('an under-levelled character shows unspent points, not an error', () => {
  const s = attributeSummary(character({ level: 20, attributes: { magicka: 5, health: 0, stamina: 5 } }), arcanist)
  assert.equal(s.spent, 10)
  assert.ok(s.available > 10)
  assert.equal(s.remaining, s.available - 10)
  assert.equal(s.overAvailable, 0)
})

test('dropping the level flags the excess instead of deleting points', () => {
  const attributes = { magicka: 0, health: 0, stamina: 64 }
  const s = attributeSummary(character({ level: 10, attributes }), arcanist)
  assert.equal(s.spent, 64, 'the recorded split is untouched')
  assert.deepEqual(s.actual, attributes)
  assert.ok(s.overAvailable > 0, 'the overage is surfaced')
  assert.equal(s.remaining < 0, true)
})

test('a variant can move the recommended target without touching the recorded split', () => {
  const build = {
    id: 'v', name: 'V',
    defaults: { class: 'Arcanist', attributes: { magicka: 0, health: 0, stamina: 64 } },
    variants: [
      { id: 'pve', name: 'PvE', overrides: null },
      { id: 'pvp', name: 'PvP', overrides: { defaults: { attributes: { health: 20, stamina: 44 } } } }
    ]
  }
  const recorded = { magicka: 0, health: 0, stamina: 64 }
  const pve = attributeSummary(character({ attributes: recorded }), applyVariant(build, 'pve'))
  const pvp = attributeSummary(character({ attributes: recorded }), applyVariant(build, 'pvp'))

  assert.deepEqual(pve.target, { magicka: 0, health: 0, stamina: 64 })
  assert.deepEqual(pvp.target, { magicka: 0, health: 20, stamina: 44 })
  assert.deepEqual(pvp.actual, recorded, 'the character keeps what it had')
  assert.equal(pve.matchesTarget, true)
  assert.equal(pvp.matchesTarget, false)
  assert.deepEqual(pvp.difference, { magicka: 0, health: -20, stamina: 20 })
  // Switching back restores the original recommendation.
  assert.deepEqual(attributeSummary(character({ attributes: recorded }), applyVariant(build, 'pve')).target, pve.target)
})

test('a build with no attribute defaults reports a zero target rather than crashing', () => {
  const s = attributeSummary(character({ attributes: { magicka: 10 } }), { defaults: {} })
  assert.deepEqual(s.target, { magicka: 0, health: 0, stamina: 0 })
  assert.equal(s.targetTotal, 0)
  assert.equal(s.spent, 10)
  assert.equal(attributeSummary(character(), null).spent, 0)
})

test('the three attribute keys are stable', () => {
  assert.deepEqual(ATTRIBUTE_KEYS, ['magicka', 'health', 'stamina'])
})
