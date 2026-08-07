'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('./electron-stub')

const { createGuidedBuildData, validateBuild } = require('../src/main/ipc/buildHandlers')
const guidance = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/data/build-editor-guidance.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/data/eso-skill-catalog.json'), 'utf8'))

const classes = ['Arcanist', 'Dragonknight', 'Necromancer', 'Nightblade', 'Sorcerer', 'Templar', 'Warden']

test('Build Editor guidance is versioned and covers every ESO class and race', () => {
  assert.equal(guidance.game_version, catalog.game_version)
  assert.ok(guidance.verified_date)
  assert.deepEqual(Object.keys(guidance.classes).sort(), classes.slice().sort())
  assert.equal(Object.keys(guidance.races).length, 10)
  assert.ok(guidance.sources.some(source => source.type === 'official'))
  for (const [name, row] of Object.entries(guidance.races)) {
    assert.ok(row.summary, `${name} needs guidance text`)
    assert.ok(Array.isArray(row.common_for) && row.common_for.length, `${name} needs common use cases`)
  }
})

test('guided creation produces a valid class-specific Schema 4 build for every class and common role', () => {
  for (const className of classes) {
    for (const role of ['damage', 'healer', 'tank', 'solo']) {
      const build = createGuidedBuildData({
        id: `guided-${className}-${role}`,
        name: `${className} ${role}`,
        class_name: className,
        primary_role: role
      }, 'NPC')
      assert.deepEqual(validateBuild(build), [], `${className}/${role} should validate`)
      assert.equal(build.defaults.class, className)
      assert.equal(build.class_configuration.active_class_lines.length, 3)
      assert.ok(build.class_configuration.active_class_lines.every(line => line.mode === 'native'))
      assert.ok(build.phases[0].front_bar.ultimate?.catalog_skill_id)
      assert.equal(build.phases[0].back_bar.ultimate, null)
      assert.ok(build.phases[1].back_bar.ultimate?.catalog_skill_id)
    }
  }
})

test('guided one-bar builds keep the second bar intentionally unavailable', () => {
  const build = createGuidedBuildData({ id: 'guided-one-bar', name: 'Guided One Bar', class_name: 'Sorcerer', bar_count: 1 }, 'NPC')
  assert.deepEqual(validateBuild(build), [])
  assert.equal(build.metadata.bar_count, 1)
  assert.equal(build.phases[1].back_bar.ultimate, null)
  assert.match(build.phases[1].back_bar.locked, /one active bar/i)
})

test('changing the base class rebuilds a valid class-specific scaffold', async () => {
  const { rebaseBuildClass } = await import('../src/renderer/utils/buildEditorGuidance.mjs')
  for (const sourceClass of classes) {
    for (const targetClass of classes) {
      const source = createGuidedBuildData({
        id: `rebase-${sourceClass}-${targetClass}`,
        name: `${sourceClass} to ${targetClass}`,
        class_name: sourceClass
      }, 'NPC')
      const rebased = rebaseBuildClass(structuredClone(source), targetClass)
      assert.deepEqual(validateBuild(rebased), [], `${sourceClass} -> ${targetClass} should validate`)
      assert.equal(rebased.defaults.class, targetClass)
      assert.equal(rebased.class_configuration.base_class, targetClass)
      assert.ok(rebased.class_configuration.active_class_lines.every(row => row.source_class === targetClass && row.mode === 'native'))
    }
  }
})
