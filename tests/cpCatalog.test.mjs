import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { CP_CATALOG, cpStarsForTree, getCpStar } from '../src/renderer/utils/cpCatalog.mjs'

const require = createRequire(import.meta.url)
const { validateBuild, normalizeBuild } = require('../src/main/ipc/buildValidation.js')
const buildDir = new URL('../resources/builds/', import.meta.url)
const bundled = fs.readdirSync(buildDir).filter(name => name.endsWith('.json')).map(name => ({ name, data: JSON.parse(fs.readFileSync(new URL(name, buildDir), 'utf8')) }))

test('Update 50 CP catalog has the complete 118-star constellation split', () => {
  assert.equal(CP_CATALOG.stars.length, 118)
  assert.equal(cpStarsForTree('craft').length, 29)
  assert.equal(cpStarsForTree('warfare').length, 48)
  assert.equal(cpStarsForTree('fitness').length, 41)
  assert.equal(cpStarsForTree('craft').filter(star => star.slottable).length, 10)
  assert.equal(cpStarsForTree('warfare').filter(star => star.slottable).length, 35)
  assert.equal(cpStarsForTree('fitness').filter(star => star.slottable).length, 28)
})

test('known stale v3.0.0 CP facts are corrected in the canonical catalog', () => {
  const expected = {
    tireless_discipline: [20, false], piercing: [20, false], sprinter: [20, false], hasty: [16, false], heros_vigor: [20, false],
    rationer: [30, false], treasure_hunter: [50, false]
  }
  for (const [id, [max, slottable]] of Object.entries(expected)) {
    const star = getCpStar(id)
    assert.ok(star, id)
    assert.equal(star.max_points, max, id)
    assert.equal(star.slottable, slottable, id)
  }
  assert.deepEqual(getCpStar('treasure_hunter').jump_points, [50])
  assert.equal(getCpStar('treasure_hunter').jump_points_verified, true)
})

test('bundled build CP strategies reference only catalog stars and valid Champion Bar slottables', () => {
  for (const { name, data } of bundled) {
    for (const [tree, plan] of Object.entries(data.cp_plans)) {
      const rows = [...(plan.core || []), ...(plan.flex || []).flatMap(group => group.nodes || [])]
      const ids = new Set(rows.map(row => row.id))
      for (const row of rows) {
        const star = getCpStar(row.id)
        assert.ok(star, `${name} ${tree} unknown ${row.id}`)
        assert.equal(star.tree, tree, `${name} ${row.id} wrong tree`)
        assert.ok(row.first_pass_points > 0 && row.first_pass_points <= star.max_points, `${name} ${row.id} invalid first pass`)
        assert.ok(row.target_points >= row.first_pass_points && row.target_points <= star.max_points, `${name} ${row.id} invalid target`)
      }
      for (const id of plan.final_slots || []) {
        assert.ok(ids.has(id), `${name} final slot ${id} must be authored`)
        assert.equal(getCpStar(id)?.slottable, true, `${name} final slot ${id} must really be slottable`)
      }
    }
    assert.deepEqual(validateBuild(data), [], `${name} should validate cleanly`)
  }
})

test('legacy duplicated CP facts normalize into build strategy without redefining ESO', () => {
  const source = structuredClone(bundled[0].data)
  const row = source.cp_plans.fitness.core.find(node => node.id === 'sprinter')
  row.max_points = 10
  row.name = 'Sprinter'
  row.slottable = false
  delete row.first_pass_points
  delete row.target_points
  const normalized = normalizeBuild(source)
  assert.deepEqual(normalized.errors, [])
  const after = normalized.data.cp_plans.fitness.core.find(node => node.id === 'sprinter')
  assert.equal(after.first_pass_points, 10)
  assert.equal(after.target_points, 20)
  assert.equal('max_points' in after, false)
  assert.equal('slottable' in after, false)
})


test('legacy full-max connector rows migrate to unlock milestones before later targets', () => {
  const source = structuredClone(bundled.find(row => ['sprinter', 'hasty', 'heros_vigor'].every(id => row.data.cp_plans?.fitness?.core?.some(node => node.id === id))).data)
  for (const id of ['sprinter', 'hasty', 'heros_vigor']) {
    const row = source.cp_plans.fitness.core.find(node => node.id === id)
    delete row.first_pass_points
    delete row.target_points
    row.max_points = getCpStar(id).max_points
  }
  const normalized = normalizeBuild(source)
  assert.deepEqual(normalized.errors, [])
  const nodes = new Map(normalized.data.cp_plans.fitness.core.map(row => [row.id, row]))
  assert.equal(nodes.get('sprinter').first_pass_points, 10)
  assert.equal(nodes.get('hasty').first_pass_points, 8)
  assert.equal(nodes.get('heros_vigor').first_pass_points, 10)
  assert.equal(nodes.get('sprinter').target_points, 20)
  assert.equal(nodes.get('hasty').target_points, 16)
  assert.equal(nodes.get('heros_vigor').target_points, 20)
})


test('legacy gold-first Craft order keeps Gilded Fingers full but inserts only the Fortune unlock milestone', () => {
  const source = structuredClone(bundled[0].data)
  source.cp_plans.craft = {
    core: [
      { id: 'gilded_fingers', max_points: 50, note: 'CURRENT FIRST PRIORITY: finish the gold bonus.' },
      { id: 'inspiration_boost', max_points: 45, note: 'Second priority while crafts are leveling.' }
    ],
    flex: [{ id: 'loot', label: 'Loot', purpose: 'economy', nodes: [
      { id: 'fortunes_favor', max_points: 50, note: 'Secondary treasure gold passive.' }
    ] }],
    final_slots: []
  }
  const normalized = normalizeBuild(source)
  assert.deepEqual(normalized.errors, [])
  const plan = normalized.data.cp_plans.craft
  assert.equal(plan.core.find(row => row.id === 'gilded_fingers').first_pass_points, 50)
  assert.equal(plan.flex[0].nodes.find(row => row.id === 'fortunes_favor').first_pass_points, 10)
})

test('unverified bundled stage hints are not treated as validation authority', () => {
  const star = CP_CATALOG.stars.find(row => row.jump_points_verified !== true)
  assert.ok(star, 'catalog should distinguish unverified stage hints')
  const source = structuredClone(bundled[0].data)
  const tree = star.tree
  source.cp_plans[tree].flex.push({ id: 'stage-trust-test', label: 'Stage trust test', purpose: 'test', optional: true, nodes: [{ id: star.id, first_pass_points: 1, target_points: Math.min(star.max_points, 1), jump_points: [1] }] })
  const errors = validateBuild(source)
  assert.equal(errors.some(error => error.includes('stale stage thresholds')), false)
})

test('catalog map and verified graph metadata never point across constellations or at missing stars', () => {
  const all = new Map(CP_CATALOG.stars.map(star => [star.id, star]))
  for (const star of CP_CATALOG.stars) {
    assert.equal(Number.isFinite(Number(star.map?.x)), true, `${star.id} needs schematic x`)
    assert.equal(Number.isFinite(Number(star.map?.y)), true, `${star.id} needs schematic y`)
    for (const linkedId of star.links || []) {
      const linked = all.get(linkedId)
      assert.ok(linked, `${star.id} links unknown ${linkedId}`)
      assert.equal(linked.tree, star.tree, `${star.id} must not link across constellations`)
      if (star.links_verified === true && linked.links_verified === true) {
        assert.equal((linked.links || []).includes(star.id), true, `${star.id} <-> ${linkedId} verified link should be symmetric`)
      }
    }
    for (const prereqId of star.prerequisite_path || []) {
      const prereq = all.get(prereqId)
      assert.ok(prereq, `${star.id} prerequisite ${prereqId} must exist`)
      assert.equal(prereq.tree, star.tree, `${star.id} prerequisite must stay in ${star.tree}`)
    }
  }
})

test('verified jump-point stars reject build targets between real ESO stages', () => {
  const source = structuredClone(bundled[0].data)
  const sprinter = source.cp_plans.fitness.core.find(node => node.id === 'sprinter')
  sprinter.first_pass_points = 11
  sprinter.target_points = 20
  const errors = validateBuild(source)
  assert.ok(errors.some(error => error.includes('between ESO effect stages') && error.includes('sprinter')))
})
