import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import {
  applyVariant, availableVariants, changedSections, defaultVariantId,
  describeVariant, findVariant, listVariants, mergeOverrides
} from '../src/renderer/utils/variantLogic.js'

const require = createRequire(import.meta.url)
const mainVariantLogic = require('../src/shared/variantLogic.cjs')

const load = name => JSON.parse(fs.readFileSync(new URL(`../resources/builds/${name}.json`, import.meta.url), 'utf8'))
const templar = load('magicka_templar_solo_duo')
const arcanist = load('stamina_arcanist_solo_duo')

const sample = () => ({
  id: 'demo', name: 'Demo',
  summary: 'Base summary',
  defaults: { class: 'Templar', attributes: { magicka: 64, health: 0, stamina: 0 }, mundus: 'The Thief' },
  tips: ['one', 'two'],
  phases: [{ id: 'early', label: 'Early', front: ['A', 'B'] }, { id: 'late', label: 'Late', front: ['C'] }],
  gear_stages: [{ id: 'final', name: 'Final', pieces: [{ id: 'head', set: 'Base Set', trait: 'Divines' }, { id: 'chest', set: 'Other', trait: 'Divines' }] }],
  consumables: { foods: [{ name: 'PvE food' }] },
  cp_plans: { warfare: { label: 'Warfare', core: [{ id: 'a', max_points: 10 }], flex: [] } },
  variants: [
    { id: 'base', name: 'Base', overrides: null },
    { id: 'alt', name: 'Alt', summary: 'Changes tips', overrides: { tips: ['different'] } },
    { id: 'planned', name: 'Planned', available: false, unavailable_reason: 'No data yet.', overrides: null }
  ]
})

test('omitted keys keep the base value', () => {
  const merged = mergeOverrides({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 9 } })
  assert.deepEqual(merged, { a: 1, b: { c: 9, d: 3 } })
})

test('null explicitly clears a section', () => {
  assert.deepEqual(mergeOverrides({ a: 1, b: 2 }, { b: null }), { a: 1, b: null })
  assert.equal(mergeOverrides({ a: 1 }, null), null)
})

test('undefined in an override is treated as untouched', () => {
  const merged = mergeOverrides({ a: 1, b: 2 }, { b: undefined })
  assert.equal(merged.b, 2)
})

test('plain arrays replace rather than concatenate', () => {
  assert.deepEqual(mergeOverrides({ tips: ['a', 'b', 'c'] }, { tips: ['z'] }).tips, ['z'])
  assert.deepEqual(mergeOverrides({ tips: ['a'] }, { tips: [] }).tips, [])
})

test('arrays of identified objects merge by id', () => {
  const base = { pieces: [{ id: 'head', set: 'A', trait: 'Divines' }, { id: 'chest', set: 'B', trait: 'Divines' }] }
  const merged = mergeOverrides(base, { pieces: [{ id: 'chest', set: 'Swapped' }] })
  assert.equal(merged.pieces.length, 2, 'untouched entries survive')
  assert.deepEqual(merged.pieces[0], { id: 'head', set: 'A', trait: 'Divines' })
  assert.deepEqual(merged.pieces[1], { id: 'chest', set: 'Swapped', trait: 'Divines' }, 'only the named field changes')
})

test('a keyed array can add and remove entries', () => {
  const base = { pieces: [{ id: 'head', set: 'A' }, { id: 'chest', set: 'B' }] }
  const merged = mergeOverrides(base, { pieces: [{ id: 'ring', set: 'New' }, { id: 'head', $remove: true }] })
  assert.deepEqual(merged.pieces.map(p => p.id), ['chest', 'ring'])
})

test('deep nested objects merge without dropping siblings', () => {
  const merged = mergeOverrides(sample(), { defaults: { attributes: { health: 20 } } })
  assert.equal(merged.defaults.attributes.health, 20)
  assert.equal(merged.defaults.attributes.magicka, 64, 'sibling attributes survive')
  assert.equal(merged.defaults.mundus, 'The Thief', 'sibling defaults survive')
  assert.equal(merged.defaults.class, 'Templar')
})

test('applying a variant never mutates the base build', () => {
  const base = sample()
  const before = JSON.stringify(base)
  applyVariant(base, 'alt')
  applyVariant(base, 'base')
  applyVariant(base, 'alt')
  assert.equal(JSON.stringify(base), before)
})

test('switching back and forth is deterministic and restores the base', () => {
  const base = sample()
  const first = applyVariant(base, 'base')
  const alt = applyVariant(base, 'alt')
  assert.deepEqual(alt.tips, ['different'])
  const backAgain = applyVariant(base, 'base')
  assert.deepEqual(backAgain.tips, ['one', 'two'], 'base data comes back intact')
  assert.equal(JSON.stringify(first), JSON.stringify(backAgain), 'repeat switching is stable')

  let current = null
  for (const id of ['alt', 'base', 'alt', 'base', 'alt']) current = applyVariant(base, id)
  assert.deepEqual(current.tips, ['different'])
  assert.equal(JSON.stringify(current), JSON.stringify(applyVariant(base, 'alt')))
})

test('a variant cannot override the build id or the variants list', () => {
  const base = sample()
  base.variants.push({ id: 'sneaky', name: 'Sneaky', overrides: { id: 'stolen', variants: [] } })
  const merged = applyVariant(base, 'sneaky')
  assert.equal(merged.id, 'demo')
  assert.equal(merged.variants.length, base.variants.length)
})

test('an unavailable variant falls back to the base build and says why', () => {
  const base = sample()
  const merged = applyVariant(base, 'planned')
  assert.equal(merged.active_variant, null)
  assert.deepEqual(merged.tips, ['one', 'two'], 'nothing is overridden')
  assert.equal(merged.variant_unavailable.unavailable_reason, 'No data yet.')
})

test('an unknown variant id is harmless', () => {
  const merged = applyVariant(sample(), 'does-not-exist')
  assert.equal(merged.active_variant, null)
  assert.deepEqual(merged.tips, ['one', 'two'])
})

test('empty or null overrides are not reported as changes', () => {
  assert.deepEqual(changedSections(null), [])
  assert.deepEqual(changedSections({}), [])
  assert.deepEqual(changedSections([]), [])
  assert.deepEqual(changedSections({ tips: ['x'], summary: 'y' }), ['summary', 'tips'])

  const base = sample()
  assert.deepEqual(findVariant(base, 'base').changes, [])
  assert.equal(describeVariant(findVariant(base, 'base')), 'Base build, nothing overridden.')
  assert.equal(describeVariant(findVariant(base, 'alt')), 'Changes tips')
  assert.equal(describeVariant(findVariant(base, 'planned')), 'No data yet.')
})

test('only available variants are offered, and the default is an available one', () => {
  const base = sample()
  assert.deepEqual(availableVariants(base).map(v => v.id), ['base', 'alt'])
  assert.deepEqual(listVariants(base).map(v => v.id), ['base', 'alt', 'planned'])
  assert.equal(defaultVariantId(base), 'base')
})

test('a variant can override every section a build has', () => {
  const base = sample()
  base.variants.push({
    id: 'everything', name: 'Everything',
    overrides: {
      summary: 'Changed',
      defaults: { mundus: 'The Atronach', attributes: { magicka: 0, stamina: 64 } },
      phases: [{ id: 'early', front: ['Z'] }],
      gear_stages: [{ id: 'final', pieces: [{ id: 'head', set: 'PvP Set' }] }],
      consumables: { foods: [{ name: 'PvP food' }] },
      tips: ['pvp tip'],
      cp_plans: { warfare: { core: [{ id: 'a', max_points: 20 }] } }
    }
  })
  const m = applyVariant(base, 'everything')
  assert.equal(m.summary, 'Changed')
  assert.equal(m.defaults.mundus, 'The Atronach')
  assert.equal(m.defaults.attributes.stamina, 64)
  assert.equal(m.defaults.class, 'Templar', 'untouched defaults survive')
  assert.deepEqual(m.phases[0].front, ['Z'])
  assert.equal(m.phases[0].label, 'Early', 'phase merged by id, not replaced')
  assert.equal(m.phases[1].id, 'late', 'other phases survive')
  assert.equal(m.gear_stages[0].pieces[0].set, 'PvP Set')
  assert.equal(m.gear_stages[0].pieces[0].trait, 'Divines', 'unspecified piece fields survive')
  assert.equal(m.gear_stages[0].pieces[1].id, 'chest')
  assert.equal(m.consumables.foods[0].name, 'PvP food')
  assert.deepEqual(m.tips, ['pvp tip'])
  assert.equal(m.cp_plans.warfare.core[0].max_points, 20)
  assert.equal(m.cp_plans.warfare.label, 'Warfare', 'untouched plan fields survive')
})

test('bundled variants are either genuinely different or honestly marked', () => {
  for (const build of [templar, arcanist]) {
    for (const variant of listVariants(build)) {
      if (!variant.available) {
        assert.ok(variant.unavailable_reason, `${build.id}/${variant.id} must explain itself`)
        continue
      }
      const applied = applyVariant(build, variant.id)
      const isBase = JSON.stringify(applied.consumables) === JSON.stringify(build.consumables)
        && JSON.stringify(applied.tips) === JSON.stringify(build.tips)
      // Either it changes something real, or it is the plain base entry. Never a fake alternative.
      assert.equal(isBase, variant.changes.length === 0,
        `${build.id}/${variant.id} claims changes ${JSON.stringify(variant.changes)} but produced ${isBase ? 'the base build' : 'different data'}`)
    }
  }
})

test('the bundled Cyrodiil variant really swaps consumables and tips', () => {
  for (const build of [templar, arcanist]) {
    const base = applyVariant(build, 'solo-duo')
    const pvp = applyVariant(build, 'cyrodiil')
    assert.notDeepEqual(pvp.consumables.foods, base.consumables.foods)
    assert.ok(pvp.tips.length > base.tips.length, 'PvP notes are added')
    assert.notEqual(pvp.summary, base.summary)
    assert.deepEqual(pvp.unlock_order, base.unlock_order, 'the skill plan itself is unchanged')
    assert.deepEqual(applyVariant(build, 'solo-duo').tips, base.tips, 'switching back restores tips')
  }
})

test('the Templar off-heal variant is disabled rather than pretending', () => {
  const offHeal = findVariant(templar, 'off-heal')
  assert.equal(offHeal.available, false)
  assert.match(offHeal.unavailable_reason, /off-heal/i)
  assert.equal(availableVariants(templar).some(v => v.id === 'off-heal'), false)
})


test('renderer and main-process variant helpers stay behaviorally aligned', () => {
  const base = sample()
  const overrides = {
    defaults: { attributes: { health: 12 } },
    phases: [{ id: 'early', front: ['Synced'] }],
    tips: ['same result']
  }
  assert.deepEqual(mergeOverrides(base, overrides), mainVariantLogic.mergeOverrides(base, overrides))
  for (const id of ['base', 'alt', 'planned', 'does-not-exist']) {
    assert.deepEqual(applyVariant(base, id), mainVariantLogic.applyVariant(base, id))
  }
  assert.deepEqual(listVariants(base), mainVariantLogic.listVariants(base))
})
