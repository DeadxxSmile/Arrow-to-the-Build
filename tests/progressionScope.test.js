'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('./electron-stub')

const {
  STARTING_POINTS,
  DEFAULT_PROGRESSION_SCOPE,
  resolveProgressionScope,
  scopeForStartingPoint,
  inferStartingPoint
} = require('../src/shared/progressionScope.cjs')
const { validateBuild, createGuidedBuildData } = require('../src/main/ipc/buildHandlers')

const template = () => JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/reference/BUILD_TEMPLATE.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/data/eso-skill-catalog.json'), 'utf8'))

test('progression scope keeps Schema 4 backwards compatible', () => {
  assert.deepEqual(STARTING_POINTS, ['new_character', 'level_50', 'cp160_plus'])
  assert.deepEqual(resolveProgressionScope({}), DEFAULT_PROGRESSION_SCOPE)
  assert.deepEqual(resolveProgressionScope({ progression_scope: { starting_point: 'cp160_plus' } }), {
    starting_point: 'cp160_plus',
    leveling_content_required: false,
    description: ''
  })

  const oldSchema4 = template()
  delete oldSchema4.progression_scope
  assert.deepEqual(validateBuild(oldSchema4), [])
})

test('progression scope helpers classify new, Level 50, and CP160+ characters', () => {
  assert.deepEqual(scopeForStartingPoint('new_character'), { starting_point: 'new_character', leveling_content_required: true })
  assert.deepEqual(scopeForStartingPoint('level_50'), { starting_point: 'level_50', leveling_content_required: false })
  assert.deepEqual(scopeForStartingPoint('cp160_plus'), { starting_point: 'cp160_plus', leveling_content_required: false })
  assert.equal(inferStartingPoint({ level: 49, championPoints: 1000 }), 'new_character')
  assert.equal(inferStartingPoint({ level: 50, championPoints: 159 }), 'level_50')
  assert.equal(inferStartingPoint({ level: 50, championPoints: 160 }), 'cp160_plus')
})

test('runtime validation checks an explicit progression scope without requiring it on old Schema 4 files', () => {
  const badStart = template()
  badStart.progression_scope.starting_point = 'ancient_hero'
  assert.ok(validateBuild(badStart).some(error => /progression_scope\.starting_point/.test(error)))

  const badFlag = template()
  badFlag.progression_scope.leveling_content_required = 'no'
  assert.ok(validateBuild(badFlag).some(error => /progression_scope\.leveling_content_required/.test(error)))

  const badDescription = template()
  badDescription.progression_scope.description = 'x'.repeat(1001)
  assert.ok(validateBuild(badDescription).some(error => /1,000 characters/.test(error)))
})

test('guided creation changes its scaffold to match the declared starting point', () => {
  const leveling = createGuidedBuildData({
    id: 'scope-new-character', name: 'Scope New Character', class_name: 'Arcanist', starting_point: 'new_character'
  }, 'Tester')
  assert.equal(leveling.progression_scope.starting_point, 'new_character')
  assert.equal(leveling.progression_scope.leveling_content_required, true)
  assert.ok(leveling.phases.some(phase => Number(phase.min_level) < 50))
  assert.ok(leveling.gear_stages.some(stage => stage.id === 'leveling'))
  assert.deepEqual(validateBuild(leveling), [])

  const level50 = createGuidedBuildData({
    id: 'scope-level-50', name: 'Scope Level 50', class_name: 'Dragonknight', starting_point: 'level_50'
  }, 'Tester')
  assert.equal(level50.progression_scope.starting_point, 'level_50')
  assert.equal(level50.progression_scope.leveling_content_required, false)
  assert.ok(level50.phases.every(phase => Number(phase.min_level) >= 50))
  assert.equal(level50.gear_stages.some(stage => stage.id === 'leveling'), false)
  assert.equal(level50.phases[0].min_cp, 0)
  assert.equal(level50.phases[0].max_cp, 159)
  assert.notEqual(level50.defaults.leveling_trait, 'Training')
  assert.deepEqual(validateBuild(level50), [])

  const cp160 = createGuidedBuildData({
    id: 'scope-cp160', name: 'Scope CP160', class_name: 'Warden', starting_point: 'cp160_plus'
  }, 'Tester')
  assert.equal(cp160.progression_scope.starting_point, 'cp160_plus')
  assert.equal(cp160.progression_scope.leveling_content_required, false)
  assert.ok(cp160.phases.every(phase => Number(phase.min_level) >= 50))
  assert.equal(cp160.gear_stages.some(stage => stage.id === 'leveling'), false)
  assert.match(cp160.phases[0].label, /CP160/i)
  assert.equal(cp160.phases[0].min_cp, 160)
  assert.equal(cp160.phases[0].max_cp, 3600)
  assert.equal(cp160.defaults.gear_cap, 'CP160+')
  assert.deepEqual(validateBuild(cp160), [])
})

test('Build Review only recommends the three-stage leveling gear roadmap when leveling content is required', async () => {
  const { createBuildReview } = await import('../src/renderer/utils/buildReviewLogic.mjs')
  const newCharacter = template()
  newCharacter.gear_stages = newCharacter.gear_stages.slice(0, 1)
  const newReview = createBuildReview(newCharacter, catalog, [])
  assert.ok(newReview.suggestions.some(row => row.code === 'gear-progression'))

  const cp160 = template()
  cp160.progression_scope = scopeForStartingPoint('cp160_plus', 'Existing-character rebuild.')
  cp160.gear_stages = cp160.gear_stages.slice(0, 1)
  const cpReview = createBuildReview(cp160, catalog, [])
  assert.equal(cpReview.suggestions.some(row => row.code === 'gear-progression'), false)
})
