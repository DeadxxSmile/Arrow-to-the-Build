import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  applyAllocationChange, applyCompletionChange, currentPhase,
  actionableUnlocks, effectiveCompletedSet, isPieceChecked, pieceKey, recommendedUnlocks, requiredRankFor, requirementsFor,
  retiredTemporaryUnlocks, temporaryRetirementState, unlockState
} from '../src/renderer/utils/buildLogic.mjs'
import { effectiveAllocation, skillPointUsage, catalogLineMap } from '../src/renderer/utils/catalogLogic.mjs'

const arcanist = JSON.parse(fs.readFileSync(new URL('../resources/builds/stamina_arcanist_solo_duo.json', import.meta.url), 'utf8'))
const templar = JSON.parse(fs.readFileSync(new URL('../resources/builds/magicka_templar_solo_duo.json', import.meta.url), 'utf8'))
const buildDir = new URL('../resources/builds/', import.meta.url)
const bundledBuilds = fs.readdirSync(buildDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, buildDir), 'utf8')))
const maxRanks = { skill_ranks: Object.fromEntries((arcanist.relevant_lines || []).map(l => [l.id, 50])) }
const character = (over = {}) => ({ completed: [], skill_allocations: {}, skill_ranks: {}, gear: {}, ...over })

test('a morph stays blocked until the base ability is actually owned', () => {
  const morph = arcanist.unlock_order.find(x => x.id === 'pragmatic_fatecarver')
  assert.equal(unlockState(morph, character({ ...maxRanks }), arcanist), 'blocked')
  const owned = character({ ...maxRanks, completed: ['fatecarver'] })
  assert.equal(unlockState(morph, owned, arcanist), 'train')
})

test('synced catalog allocations translate back into build-row completion', () => {
  const passive = arcanist.unlock_order.find(x => x.id === 'fated_fortune_1')
  const skillId = passive.catalog_skill_id
  const synced = character({ ...maxRanks, completed: [skillId], skill_allocations: { [skillId]: 2 } })
  const completed = effectiveCompletedSet(arcanist, synced)
  assert.equal(completed.has('fated_fortune_1'), true)
  assert.equal(completed.has('fated_fortune_2'), true)
  assert.equal(unlockState(arcanist.unlock_order.find(x => x.id === 'fated_fortune_2'), synced, arcanist), 'complete')
  const offered = recommendedUnlocks(arcanist, synced).filter(x => x.state === 'available' || x.state === 'train').slice(0, 5)
  assert.equal(offered.some(x => x.catalog_skill_id === skillId), false, 'owned synced passive ranks must not remain in Next Five')
})

test('temporary unlocks retire automatically at their authored cutoff', () => {
  const runeblades = arcanist.unlock_order.find(x => x.id === 'runeblades')
  const before = character({ skill_ranks: { herald: 19 }, actual_unspent_skill_points: 10 })
  const after = character({ skill_ranks: { herald: 20 }, actual_unspent_skill_points: 10 })
  assert.equal(temporaryRetirementState(runeblades, before, arcanist).retired, false)
  assert.equal(temporaryRetirementState(runeblades, after, arcanist).retired, true)
  assert.equal(unlockState(runeblades, after, arcanist), 'retired')
  assert.equal(actionableUnlocks(arcanist, after).some(item => item.id === 'runeblades'), false)
})

test('player retirement overrides the guide without changing synced ownership', () => {
  const runeblades = arcanist.unlock_order.find(x => x.id === 'runeblades')
  const state = character({
    skill_ranks: { herald: 1 },
    skill_allocations: { [runeblades.catalog_skill_id]: 1 },
    temporary_unlock_states: { runeblades: 'retired' }
  })
  assert.equal(temporaryRetirementState(runeblades, state, arcanist).source, 'manual')
  assert.equal(state.skill_allocations[runeblades.catalog_skill_id], 1, 'retirement does not rewrite ESO ownership')
  const retired = retiredTemporaryUnlocks(arcanist, state).find(item => item.id === 'runeblades')
  assert.equal(retired.owned, true)
  assert.equal(retired.reclaimable_points, 1)
})

test('a retired base skill is not reported reclaimable while a morph of it is still active', () => {
  // Real catalog ids so the base morph_ids resolve: Twin Slashes -> Blood Craze.
  const build = {
    schema_version: 4,
    id: 'morph_dependency_case',
    unlock_order: [
      { id: 'twin_slashes', name: 'Twin Slashes', line: 'dual_wield', kind: 'Active', status: 'temporary', catalog_skill_id: 'dual_wield__twin_slashes', skill_point_cost: 1, retire_when: { type: 'character_level', level: 10 } },
      { id: 'blood_craze', name: 'Blood Craze', line: 'dual_wield', kind: 'Morph', status: 'temporary', catalog_skill_id: 'dual_wield__blood_craze', skill_point_cost: 1, retire_when: { type: 'character_level', level: 40 } }
    ]
  }
  const owns = { 'dual_wield__twin_slashes': 1, 'dual_wield__blood_craze': 1 }

  // Level 10: base retires but the morph is still active, so the base point stays spent.
  const bridging = character({ level: 10, skill_allocations: owns })
  const base = retiredTemporaryUnlocks(build, bridging).find(item => item.id === 'twin_slashes')
  assert.ok(base, 'base is retired at its cutoff')
  assert.equal(base.owned, true)
  assert.equal(base.reclaimable_points, 0, 'base point is not reclaimable while the morph is active')
  assert.equal(base.reclaim_blocked_by, 'Blood Craze')

  // Level 40: the morph retires too, so the base point becomes genuinely reclaimable.
  const done = character({ level: 40, skill_allocations: owns })
  const freed = retiredTemporaryUnlocks(build, done).find(item => item.id === 'twin_slashes')
  assert.equal(freed.reclaim_blocked_by, null)
  assert.equal(freed.reclaimable_points, 1, 'base point reclaims once no morph of it is active')
})


test('a retired base skill is not reclaimable while an untracked personal morph is still owned', () => {
  const build = {
    schema_version: 4,
    id: 'personal_morph_dependency_case',
    unlock_order: [
      { id: 'twin_slashes', name: 'Twin Slashes', line: 'dual_wield', kind: 'Active', status: 'temporary', catalog_skill_id: 'dual_wield__twin_slashes', skill_point_cost: 1, retire_when: { type: 'character_level', level: 10 } }
    ]
  }
  const state = character({
    level: 10,
    skill_allocations: {
      'dual_wield__twin_slashes': 1,
      'dual_wield__blood_craze': 1
    }
  })
  const base = retiredTemporaryUnlocks(build, state).find(item => item.id === 'twin_slashes')
  assert.ok(base)
  assert.equal(base.reclaimable_points, 0, 'personal morph ownership must keep the base point spent')
  assert.equal(base.reclaim_blocked_by, 'Blood Craze')
})

test('player can explicitly keep a temporary unlock active past the build cutoff', () => {
  const runeblades = arcanist.unlock_order.find(x => x.id === 'runeblades')
  const state = character({ skill_ranks: { herald: 50 }, temporary_unlock_states: { runeblades: 'active' }, actual_unspent_skill_points: 10 })
  assert.equal(temporaryRetirementState(runeblades, state, arcanist).retired, false)
  assert.equal(unlockState(runeblades, state, arcanist), 'available')
})

test('rank-locked items report locked, not available', () => {
  const late = arcanist.unlock_order.find(x => Number(x.required_rank) >= 20 && !x.requires?.length)
  assert.equal(unlockState(late, character({ skill_ranks: { [late.line]: 1 } }), arcanist), 'locked')
})

test('verified armor passive point gates override stale authored ranks from older builds', () => {
  const cases = [
    ['agility_1', 38],
    ['athletics_1', 42],
    ['concentration_2', 50]
  ]
  for (const [id, expected] of cases) {
    const item = templar.unlock_order.find(row => row.id === id)
    assert.ok(item, `${id} exists in the bundled Templar build`)
    assert.equal(requiredRankFor(item, templar), expected, `${item.name} uses the verified live armor gate`)
    const rank = expected - 1
    const completed = requirementsFor(templar, item.id)
    assert.equal(unlockState(item, character({ skill_ranks: { [item.line]: rank }, completed }), templar), 'locked')
  }
})

test('Suggested Next Picks never exposes the stale armor passives from the reported regression', () => {
  const ranks = Object.fromEntries((templar.relevant_lines || []).map(line => [line.id, 50]))
  ranks.medium_armor = 18
  ranks.light_armor = 36
  const state = character({ skill_ranks: ranks, actual_unspent_skill_points: 20 })
  const ids = new Set(actionableUnlocks(templar, state).map(item => item.id))
  for (const id of ['agility_1', 'athletics_1', 'concentration_2']) {
    assert.equal(ids.has(id), false, `${id} must not be marked purchasable before its verified line rank`)
  }
})

test('Suggested Next Picks keeps a conservative safety fallback if future catalog drift loses passive point gates', () => {
  const passive = templar.unlock_order.find(row => row.line === 'aedric_spear' && row.kind === 'Passive')
  assert.ok(passive, 'fixture has an Aedric Spear passive')
  const line = catalogLineMap.get(passive.line)
  const catalogPassive = line?.skills?.find(skill => skill.id === passive.catalog_skill_id)
  assert.ok(Array.isArray(catalogPassive?.unlock_ranks), 'the shipped U50 catalog is fully audited')

  // Deliberately simulate a future patch/catalog regression without making the real catalog incomplete.
  const saved = catalogPassive.unlock_ranks
  delete catalogPassive.unlock_ranks
  try {
    const almostMax = character({ skill_ranks: { [passive.line]: 49 }, actual_unspent_skill_points: 20 })
    assert.equal(actionableUnlocks(templar, almostMax).some(item => item.id === passive.id), false)
    const maxed = character({ skill_ranks: { [passive.line]: 50 }, actual_unspent_skill_points: 20 })
    if (unlockState(passive, maxed, templar) === 'available') {
      assert.equal(actionableUnlocks(templar, maxed).some(item => item.id === passive.id), true)
    }
  } finally {
    catalogPassive.unlock_ranks = saved
  }
})

test('passive rank II is derived as requiring rank I even though the JSON does not say so', () => {
  const first = arcanist.unlock_order.find(x => x.id === 'fated_fortune_1')
  const second = arcanist.unlock_order.find(x => x.id === 'fated_fortune_2')
  assert.deepEqual(second.requires, [], 'build file genuinely declares no requirement')
  assert.deepEqual(requirementsFor(arcanist, second.id), [first.id])
  assert.equal(unlockState(second, character({ ...maxRanks }), arcanist), 'blocked')
  assert.equal(unlockState(second, character({ ...maxRanks, completed: [first.id] }), arcanist), 'available')
})

test('recommendations never offer a completed, blocked, or impossible item', () => {
  const state = character({ ...maxRanks, completed: ['runeblades'] })
  const offered = recommendedUnlocks(arcanist, state).filter(x => x.state === 'available' || x.state === 'train')
  assert.equal(offered.some(x => x.id === 'runeblades'), false)
  assert.equal(new Set(offered.map(x => x.id)).size, offered.length, 'no duplicates')
  for (const item of offered) {
    assert.ok((state.skill_ranks[item.line] ?? 0) >= (Number(item.required_rank) || 0))
    for (const req of requirementsFor(arcanist, item.id)) assert.ok(state.completed.includes(req))
  }
})

test('recommendations order by priority and tolerate a missing priority', () => {
  const build = {
    unlock_order: [
      { id: 'c', line: 'x', required_rank: 1, priority: 30 },
      { id: 'a', line: 'x', required_rank: 1 },
      { id: 'b', line: 'x', required_rank: 1, priority: 10 }
    ]
  }
  const ids = recommendedUnlocks(build, character({ skill_ranks: { x: 50 } })).map(x => x.id)
  assert.deepEqual(ids, ['a', 'b', 'c'], 'missing priority sorts as 0 rather than scrambling the list')
})

test('next-five stays stable and available-first across all bundled builds', () => {
  for (const build of bundledBuilds) {
    const ranks = Object.fromEntries((build.relevant_lines || []).map(l => [l.id, 15]))
    const recs = recommendedUnlocks(build, character({ skill_ranks: ranks }))
    const top = recs.slice(0, 5)
    assert.equal(top.length, 5)
    assert.ok(top.every(x => x.state === 'available'), 'available items sort ahead of locked and blocked ones')
  }
})



test('locked recommendations prefer the closest skill-line rank before authored priority', () => {
  const build = {
    unlock_order: [
      { id: 'far', line: 'a', required_rank: 40, priority: 1 },
      { id: 'near', line: 'b', required_rank: 12, priority: 999 },
      { id: 'middle', line: 'c', required_rank: 20, priority: 2 }
    ]
  }
  const state = character({ skill_ranks: { a: 5, b: 10, c: 10 } })
  const ids = recommendedUnlocks(build, state).map(item => item.id)
  assert.deepEqual(ids, ['near', 'middle', 'far'])
})

test('checking a build item also moves the Skill Point ledger', () => {
  const base = character({ ...maxRanks })
  const after = applyCompletionChange(arcanist, base, 'fated_fortune_1', true)
  const skill = catalogLineMap.get('herald').skills.find(s => s.name === 'Fated Fortune')
  assert.equal(after.allocations[skill.id], 1)
  const withState = character({ ...maxRanks, ...after, completed: after.completed, skill_allocations: after.allocations })
  assert.equal(effectiveAllocation(withState, arcanist, 'herald', skill), 1)
})

test('unchecking clears points instead of stranding them in the ledger', () => {
  const skill = catalogLineMap.get('herald').skills.find(s => s.name === 'Fated Fortune')
  let state = character({ ...maxRanks })
  for (const id of ['fated_fortune_1', 'fated_fortune_2']) {
    const next = applyCompletionChange(arcanist, state, id, true)
    state = character({ ...maxRanks, completed: next.completed, skill_allocations: next.allocations })
  }
  assert.equal(effectiveAllocation(state, arcanist, 'herald', skill), 2)

  const cleared = applyCompletionChange(arcanist, state, 'fated_fortune_1', false)
  const after = character({ ...maxRanks, completed: cleared.completed, skill_allocations: cleared.allocations })
  assert.equal(effectiveAllocation(after, arcanist, 'herald', skill), 0, 'rank II drops with rank I and the points go with it')
  assert.equal(skillPointUsage(after, arcanist).total, 0)
})

test('picking a morph selects its base and drops the opposing morph', () => {
  const line = catalogLineMap.get('herald')
  const base = line.skills.find(s => s.name === 'Fatecarver')
  const [firstMorph, secondMorph] = base.morph_ids.map(id => line.skills.find(s => s.id === id))

  let state = character({ ...maxRanks })
  let result = applyAllocationChange(arcanist, state, 'herald', firstMorph, 1, line.skills)
  state = character({ ...maxRanks, completed: result.completed, skill_allocations: result.allocations })
  assert.equal(effectiveAllocation(state, arcanist, 'herald', base), 1, 'base is auto-selected')
  assert.equal(effectiveAllocation(state, arcanist, 'herald', firstMorph), 1)

  result = applyAllocationChange(arcanist, state, 'herald', secondMorph, 1, line.skills)
  state = character({ ...maxRanks, completed: result.completed, skill_allocations: result.allocations })
  assert.equal(effectiveAllocation(state, arcanist, 'herald', secondMorph), 1)
  assert.equal(effectiveAllocation(state, arcanist, 'herald', firstMorph), 0, 'only one morph at a time')
})

test('deselecting a base ability also deselects its morph', () => {
  const line = catalogLineMap.get('herald')
  const base = line.skills.find(s => s.name === 'Fatecarver')
  const morph = line.skills.find(s => s.id === base.morph_ids[0])
  let state = character({ ...maxRanks })
  let r = applyAllocationChange(arcanist, state, 'herald', morph, 1, line.skills)
  state = character({ ...maxRanks, completed: r.completed, skill_allocations: r.allocations })
  r = applyAllocationChange(arcanist, state, 'herald', base, 0, line.skills)
  state = character({ ...maxRanks, completed: r.completed, skill_allocations: r.allocations })
  assert.equal(effectiveAllocation(state, arcanist, 'herald', morph), 0)
  assert.equal(effectiveAllocation(state, arcanist, 'herald', base), 0)
})

test('passive ranks cost one point each and totals split build vs personal', () => {
  const line = catalogLineMap.get('herald')
  const passive = line.skills.find(s => s.name === 'Fated Fortune')
  let state = character({ ...maxRanks })
  const r = applyAllocationChange(arcanist, state, 'herald', passive, 2, line.skills)
  state = character({ ...maxRanks, completed: r.completed, skill_allocations: r.allocations })
  const usage = skillPointUsage(state, arcanist)
  assert.equal(usage.total, 2)
  assert.equal(usage.buildRelated, 2)
  assert.equal(usage.personal, 0)
  assert.equal(usage.groups.Class, 2)
})

test('a line the build never mentions counts as personal points only', () => {
  const smithing = catalogLineMap.get('blacksmithing')
  const passive = smithing.skills[0]
  const state = character({ skill_allocations: { [passive.id]: 3 } })
  const usage = skillPointUsage(state, arcanist)
  assert.equal(usage.personal, 3)
  assert.equal(usage.buildRelated, 0)
  assert.equal(usage.groups.Craft, 3)
})

test('Scribing and Class Mastery entries stay out of the ordinary point ledger', () => {
  const scribing = [...catalogLineMap.values()].flatMap(line => line.skills || []).find(skill => skill.id.startsWith('scribing__'))
  const mastery = catalogLineMap.get('arcanist_mastery').skills[0]
  const state = character({ skill_allocations: { [scribing.id]: 1, [mastery.id]: 1 } })
  assert.equal(skillPointUsage(state, arcanist).total, 0)
})

test('current phase matches bands and falls back to the last one', () => {
  assert.equal(currentPhase(arcanist, 1).id, '1-15')
  assert.equal(currentPhase(arcanist, 14).id, '1-15')
  assert.equal(currentPhase(arcanist, 15).id, '15-30')
  assert.equal(currentPhase(arcanist, 50).id, 'final')
  assert.equal(currentPhase({ phases: [] }, 10), null)
})

test('current phase can scope progression by Champion Points and loadout', () => {
  const build = { phases: [
    { id: 'leveling', min_level: 1, max_level: 50, max_cp: 159 },
    { id: 'general-cp', min_level: 50, max_level: 9999, min_cp: 160, loadout_ids: ['general'] },
    { id: 'boss-cp', min_level: 50, max_level: 9999, min_cp: 160, loadout_ids: ['boss'] }
  ] }
  assert.equal(currentPhase(build, 50, 0, 'general').id, 'leveling')
  assert.equal(currentPhase(build, 50, 160, 'general').id, 'general-cp')
  assert.equal(currentPhase(build, 50, 160, 'boss').id, 'boss-cp')
})

test('gear keys use stable Schema 4 piece ids', () => {
  const stage = arcanist.gear_stages[0]
  const piece = stage.sets[0].pieces[0]
  assert.ok(piece.id, 'bundled pieces now carry an id')
  assert.equal(pieceKey(piece, 0), `id:${piece.id}`)

  const newGear = { [stage.id]: { [`id:${piece.id}`]: true } }
  assert.equal(isPieceChecked(newGear, stage.id, piece, 0), true)
  // The whole point of ids: the tick follows the piece when the build gains a row above it.
  assert.equal(isPieceChecked(newGear, stage.id, piece, 3), true)
})
