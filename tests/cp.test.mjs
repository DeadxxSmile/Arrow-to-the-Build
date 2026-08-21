import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { CP_ACCOUNT_MAX, CP_TREE_MAX, allocateCp, cpPlanCapacity, planSections } from '../src/renderer/utils/buildLogic.mjs'

const arcanist = JSON.parse(fs.readFileSync(new URL('../resources/builds/stamina_arcanist_solo_duo.json', import.meta.url), 'utf8'))
const templar = JSON.parse(fs.readFileSync(new URL('../resources/builds/magicka_templar_solo_duo.json', import.meta.url), 'utf8'))
const buildDir = new URL('../resources/builds/', import.meta.url)
const bundledBuilds = fs.readdirSync(buildDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(new URL(f, buildDir), 'utf8')))
const warfare = arcanist.cp_plans.warfare

const plan = {
  label: 'Test',
  core: [
    { id: 'path_a', name: 'Path A', max_points: 10, slottable: false, jump_points: [10] },
    { id: 'path_b', name: 'Path B', max_points: 10, slottable: false, jump_points: [10] }
  ],
  flex: [
    { id: 'damage', label: 'Damage', purpose: 'damage', nodes: [{ id: 'hit_harder', name: 'Hit Harder', max_points: 50, slottable: true, jump_points: [25, 50] }] },
    { id: 'movement', label: 'Movement', purpose: 'movement', nodes: [{ id: 'run_faster', name: 'Run Faster', max_points: 30, slottable: true }] }
  ],
  final_slots: ['hit_harder']
}

test('the constellation cap is 1200 and the account total is 3600', () => {
  assert.equal(CP_TREE_MAX, 1200)
  assert.equal(CP_ACCOUNT_MAX, 3600)
})

test('low CP fills the core path first and nothing else', () => {
  const a = allocateCp(plan, 12)
  assert.equal(a.corePoints, 12)
  assert.equal(a.coreComplete, false)
  assert.equal(a.coreRemaining, 8)
  assert.equal(a.flexPoints, 0)
  assert.equal(a.groups.every(g => g.points === 0), true)
  assert.equal(a.next.node.id, 'path_b')
  assert.deepEqual(a.core.map(x => x.points), [10, 2])
})

test('zero CP is a valid, quiet state rather than an error', () => {
  const a = allocateCp(plan, 0)
  assert.equal(a.total, 0)
  assert.equal(a.corePoints, 0)
  assert.equal(a.coreComplete, false)
  assert.equal(a.unassigned, 0)
  assert.equal(a.overCap, 0)
})

test('exact core completion flips to complete with no flex points yet', () => {
  const a = allocateCp(plan, 20)
  assert.equal(a.coreComplete, true)
  assert.equal(a.corePoints, 20)
  assert.equal(a.coreRemaining, 0)
  assert.equal(a.flexPoints, 0)
  assert.equal(a.unassigned, 0)
  assert.equal(a.core.every(x => x.full), true)
})

test('points past the core spill into flex groups in order', () => {
  const a = allocateCp(plan, 60)
  assert.equal(a.coreComplete, true)
  assert.equal(a.flexPoints, 40)
  assert.equal(a.groups[0].points, 40)
  assert.equal(a.groups[1].points, 0)
  assert.equal(a.groups[0].entries[0].stage, 25, 'the passed stage threshold is reported')
  assert.equal(a.unassigned, 0)
})

test('overflow past every listed star becomes free points, not a warning', () => {
  const a = allocateCp(plan, 200)
  assert.equal(a.coreComplete, true)
  assert.equal(a.groups.every(g => g.full), true)
  assert.equal(a.flexPoints, 80, 'only points actually assigned to recommended flex targets count as flex spend')
  assert.equal(a.unassigned, 200 - cpPlanCapacity(plan))
  assert.equal(a.unassigned, 100, 'core 20 + flex 80 listed, so 100 of the 200 are free')
  assert.equal(a.next, null, 'nothing is still waiting for points')
})


test('optional flex branches are shown without silently allocating into them', () => {
  const optionalPlan = structuredClone(plan)
  optionalPlan.flex[1].optional = true
  const a = allocateCp(optionalPlan, 100)
  assert.equal(a.corePoints, 20)
  assert.equal(a.groups[0].points, 50, 'the recommended branch fills normally')
  assert.equal(a.groups[1].optional, true)
  assert.equal(a.groups[1].points, 0, 'an alternative is not auto-spent')
  assert.equal(a.groups[1].entries.every(entry => entry.points === 0), true)
  assert.equal(a.unassigned, 30, 'leftover points stay flexible')
  assert.equal(a.optionalCapacity, 30)
  assert.equal(a.flexCapacity, 50, 'recommended capacity excludes alternatives')
})

test('totals above 1200 are capped and the excess is reported separately', () => {
  const a = allocateCp(plan, 5000)
  assert.equal(a.total, 1200)
  assert.equal(a.overCap, 3800)
  assert.equal(a.coreComplete, true)
})

test('negative and nonsense totals fall back to zero instead of NaN', () => {
  for (const bad of [-1, -900, NaN, undefined, null, 'lots', {}]) {
    const a = allocateCp(plan, bad)
    assert.equal(a.total, 0, `${String(bad)} should read as 0`)
    assert.equal(a.corePoints, 0)
    assert.ok(a.allocations.every(x => Number.isFinite(x.points)))
  }
})

test('fractional totals are truncated to whole points', () => {
  assert.equal(allocateCp(plan, 12.9).total, 12)
  assert.equal(allocateCp(plan, 12.9).corePoints, 12)
})

test('a malformed node contributes nothing rather than swallowing the budget', () => {
  const broken = { core: [{ id: 'bad', name: 'Bad' }, { id: 'ok', name: 'OK', max_points: 5 }], flex: [] }
  const a = allocateCp(broken, 10)
  assert.equal(a.core[0].points, 0)
  assert.equal(a.core[1].points, 5)
  assert.equal(a.unassigned, 5)
})

test('a plan with no core at all is entirely flexible', () => {
  const a = allocateCp({ flex: [{ id: 'g', label: 'G', nodes: [{ id: 'n', name: 'N', max_points: 10 }] }] }, 4)
  assert.equal(a.coreCapacity, 0)
  assert.equal(a.coreComplete, true, 'an empty required path counts as done')
  assert.equal(a.flexPoints, 4)
  assert.equal(a.groups[0].points, 4)
})

test('the bundled Arcanist plans reach their authored core milestones before later upgrades', () => {
  for (const [tree, plan] of Object.entries(arcanist.cp_plans)) {
    const full = allocateCp(plan, 1200, { tree })
    const capacity = full.coreCapacity
    assert.ok(Number.isFinite(capacity) && capacity > 0, `${tree} core milestone must be finite`)
    assert.equal(allocateCp(plan, capacity, { tree }).coreComplete, true)
    assert.equal(allocateCp(plan, capacity - 1, { tree }).coreComplete, false)
  }
})

test('a high-CP character sees flexible points instead of a permanent warning', () => {
  // 300 in one tree is ordinary for a CP900 player and used to read as "points exceed this plan".
  const a = allocateCp(warfare, 300)
  assert.equal(a.coreComplete, true)
  assert.ok(a.flexPoints > 0)
  assert.equal(a.groups.some(g => g.points > 0), true, 'the extra points land in the damage branch')
})

test('every flex group reports its own purpose and capacity', () => {
  const a = allocateCp(warfare, 1200)
  for (const group of a.groups) {
    assert.ok(group.group.purpose, 'each branch declares what it is for')
    assert.ok(group.capacity > 0)
    if (group.optional) assert.equal(group.full, false, 'alternatives are never silently treated as spent')
    else assert.equal(group.full, true)
  }
})

test('slottable and passive stars stay explicit in every CP branch', () => {
  const a = allocateCp(warfare, 1200)
  const entries = [...a.core, ...a.groups.flatMap(g => g.entries)]
  assert.equal(entries.every(x => typeof x.node.slottable === 'boolean'), true)
  assert.equal(entries.some(x => x.node.slottable), true)
  assert.equal(entries.some(x => !x.node.slottable), true)
})

test('all bundled builds include real optional routes in every constellation', () => {
  for (const build of bundledBuilds) {
    for (const [tree, plan] of Object.entries(build.cp_plans)) {
      const optional = (plan.flex || []).filter(group => group.optional === true)
      assert.ok(optional.length > 0, `${build.id} ${tree} needs at least one optional route`)
      const a = allocateCp(plan, 1200)
      for (const group of a.groups.filter(group => group.optional)) {
        assert.equal(group.points, 0)
        assert.equal(group.entries.every(entry => entry.points === 0), true)
      }
    }
  }
})

test('Fitness routing spends only the connector milestone needed to unlock Bloody Renewal', () => {
  const bloody = { core: [{ id: 'bloody_renewal', first_pass_points: 50, target_points: 50 }], flex: [], final_slots: ['bloody_renewal'] }
  const atUnlock = allocateCp(bloody, 28, { tree: 'fitness' })
  assert.deepEqual(atUnlock.route.map(entry => [entry.node.id, entry.points]), [
    ['sprinter', 10], ['hasty', 8], ['heros_vigor', 10], ['bloody_renewal', 0]
  ])
  assert.equal(atUnlock.next.node.id, 'bloody_renewal')
  assert.equal(atUnlock.next.add, 50)
  const complete = allocateCp(bloody, 78, { tree: 'fitness' })
  assert.equal(complete.next, null)
  assert.equal(complete.route.find(entry => entry.node.id === 'sprinter').points, 10, 'connector is not unnecessarily maxed')
})


test('Craft routing reaches Inspiration Boost through Fortune\'s Favor instead of pretending it is directly purchasable', () => {
  const goldCraft = { core: [
    { id: 'gilded_fingers', first_pass_points: 50, target_points: 50 },
    { id: 'inspiration_boost', first_pass_points: 45, target_points: 45 }
  ], flex: [], final_slots: [] }
  const afterGold = allocateCp(goldCraft, 50, { tree: 'craft' })
  assert.deepEqual(afterGold.route.map(entry => entry.node.id), ['gilded_fingers', 'fortunes_favor', 'inspiration_boost'])
  assert.equal(afterGold.next.node.id, 'fortunes_favor')
  assert.equal(afterGold.next.target, 10)
  const unlocked = allocateCp(goldCraft, 60, { tree: 'craft' })
  assert.equal(unlocked.next.node.id, 'inspiration_boost')
})

test('a live addon graph overrides the bundled fallback path when ESO supplies current links', () => {
  const plan = { core: [{ id: 'bloody_renewal', first_pass_points: 50, target_points: 50 }], flex: [], final_slots: ['bloody_renewal'] }
  const observedChampion = { disciplines: [{ name: 'Fitness', spent: 0, unspent: 100, stars: [
    { skillId: 38, points: 0, root: true, jumpPoints: [10, 20], linkedSkillIds: [39] },
    { skillId: 39, points: 0, root: false, jumpPoints: [10, 20], linkedSkillIds: [38, 113] },
    { skillId: 113, points: 0, root: false, jumpPoints: [10, 20], linkedSkillIds: [39, 48] },
    { skillId: 48, points: 0, root: false, jumpPoints: [10, 20, 30, 40, 50], linkedSkillIds: [113] }
  ] }] }
  const result = allocateCp(plan, 100, { tree: 'fitness', observedChampion })
  assert.deepEqual(result.route.map(entry => entry.node.id), ['sprinter', 'tireless_guardian', 'heros_vigor', 'bloody_renewal'])
  assert.equal(result.next.node.id, 'sprinter')
  assert.equal(result.next.observed, true)
})

test('all bundled recommended CP targets have a verified offline route', () => {
  for (const build of bundledBuilds) {
    for (const [tree, plan] of Object.entries(build.cp_plans)) {
      const allocation = allocateCp(plan, 1200, { tree })
      assert.deepEqual(allocation.unresolvedPaths, [], `${build.id} ${tree} must not ship an unverified recommended route`)
    }
  }
})

test('the base plan object is never mutated by allocation', () => {
  const before = JSON.stringify(plan)
  allocateCp(plan, 999)
  allocateCp(plan, 0)
  assert.equal(JSON.stringify(plan), before)
})

test('verified catalog links can derive an offline prerequisite route even without a hand-authored path', () => {
  const plan = { core: [{ id: 'liquid_efficiency', first_pass_points: 50, target_points: 50 }], flex: [], final_slots: [] }
  const result = allocateCp(plan, 1200, { tree: 'craft' })
  assert.deepEqual(result.unresolvedPaths, [])
  assert.deepEqual(result.route.map(entry => entry.node.id), ['steadfast_enchantment', 'rationer', 'liquid_efficiency'])
  assert.equal(result.route[0].node.first_pass_points, 10)
  assert.equal(result.route[1].node.first_pass_points, 10)
})

test('live CP routing tolerates empty Lua tables for link lists', () => {
  const plan = { core: [{ id: 'steeds_blessing', first_pass_points: 50, target_points: 50 }], flex: [], final_slots: ['steeds_blessing'] }
  const observedChampion = { disciplines: [{ name: 'Craft', spent: 0, unspent: 102, stars: [
    { skillId: 66, points: 0, root: true, jumpPoints: {}, linkedSkillIds: {} }
  ] }] }
  const result = allocateCp(plan, 102, { tree: 'craft', observedChampion })
  assert.equal(result.next.node.id, 'steeds_blessing')
})

test('live routing continues from an earlier authored connector instead of buying an unnecessary root', () => {
  const plan = { core: [
    { id: 'tireless_discipline', first_pass_points: 10, target_points: 20 },
    { id: 'piercing', first_pass_points: 10, target_points: 20 }
  ], flex: [], final_slots: [] }
  const observedChampion = { disciplines: [{ name: 'Warfare', spent: 0, unspent: 102, stars: [
    { skillId: 6, points: 0, root: true, jumpPoints: [0, 10, 20], linkedSkillIds: [10] },
    { skillId: 11, points: 0, root: true, jumpPoints: [0, 10, 20], linkedSkillIds: [10] },
    { skillId: 10, points: 0, root: false, clusterRoot: true, jumpPoints: [0, 10, 20], linkedSkillIds: [6, 11] }
  ] }] }
  const result = allocateCp(plan, 102, { tree: 'warfare', observedChampion })
  assert.deepEqual(result.route.map(entry => entry.node.id), ['tireless_discipline', 'piercing'])
  assert.equal(result.next.node.id, 'tireless_discipline')
  assert.equal(result.next.target, 10)
})

test('synced ESO allocation reports truly unassigned points instead of the simulated route remainder', () => {
  const livePlan = {
    core: [{ id: 'gilded_fingers', first_pass_points: 50, target_points: 50 }],
    flex: [{ id: 'economy', label: 'Economy', purpose: 'economy', nodes: [{ id: 'fortunes_favor', first_pass_points: 10, target_points: 50 }] }],
    final_slots: []
  }
  const observedChampion = { disciplines: [{ name: 'Craft', spent: 0, unspent: 102, stars: [
    { skillId: 74, points: 0, root: true, jumpPoints: [10, 20, 30, 40, 50], linkedSkillIds: [] }
  ] }] }
  const result = allocateCp(livePlan, 102, { tree: 'craft', observedChampion })
  assert.equal(result.total, 102)
  assert.equal(result.unassigned, 102, 'all earned points are still unassigned in ESO')
  assert.equal(result.totalSpent, 0)
  assert.equal(result.firstPassSpent, 0)
  assert.equal(result.routeSpent, 0)
  assert.equal(result.firstPassComplete, false)
  assert.equal(result.next.node.id, 'gilded_fingers')
})
