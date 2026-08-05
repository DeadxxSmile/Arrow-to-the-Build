import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  applyAllocationChange, applyCompletionChange, currentPhase,
  isPieceChecked, pieceKey, recommendedUnlocks, requirementsFor, unlockState
} from '../src/renderer/utils/buildLogic.js'
import { effectiveAllocation, skillPointUsage, catalogLineMap } from '../src/renderer/utils/catalogLogic.js'

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

test('rank-locked items report locked, not available', () => {
  const late = arcanist.unlock_order.find(x => Number(x.required_rank) >= 20 && !x.requires?.length)
  assert.equal(unlockState(late, character({ skill_ranks: { [late.line]: 1 } }), arcanist), 'locked')
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

test('checking a build item also moves the Skill Point ledger', () => {
  const base = character({ ...maxRanks })
  const after = applyCompletionChange(arcanist, base, 'fated_fortune_1', true)
  const skill = catalogLineMap.get('herald').skills.find(s => s.name === 'Fated Fortune')
  assert.equal(after.allocations[skill.id], 1)
  const withState = character({ ...maxRanks, ...after, completed: after.completed, skill_allocations: after.allocations })
  assert.equal(effectiveAllocation(withState, arcanist, 'herald', skill), 1)
})

test('unchecking clears the points instead of stranding them (the v0.3.1 desync)', () => {
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
  const scribing = catalogLineMap.get('scribing').skills[0]
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

test('gear keys use stable schema-3 piece ids', () => {
  const stage = arcanist.gear_stages[0]
  const piece = stage.sets[0].pieces[0]
  assert.ok(piece.id, 'bundled pieces now carry an id')
  assert.equal(pieceKey(piece, 0), `id:${piece.id}`)

  const newGear = { [stage.id]: { [`id:${piece.id}`]: true } }
  assert.equal(isPieceChecked(newGear, stage.id, piece, 0), true)
  // The whole point of ids: the tick follows the piece when the build gains a row above it.
  assert.equal(isPieceChecked(newGear, stage.id, piece, 3), true)
})
