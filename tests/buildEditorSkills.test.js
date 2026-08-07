'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
require('./electron-stub')
const { validateBuild } = require('../src/main/ipc/buildHandlers')

const root = path.join(__dirname, '..')
const template = () => JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/BUILD_TEMPLATE.json'), 'utf8'))
let logic

test.before(async () => {
  logic = await import(pathToFileURL(path.join(root, 'src/renderer/utils/buildEditorSkillLogic.mjs')).href)
})

test('adding a morph carries its base skill into the unlock plan', () => {
  const data = template()
  data.unlock_order = data.unlock_order.filter(row => !['herald__fatecarver', 'herald__pragmatic_fatecarver'].includes(row.catalog_skill_id))
  const next = logic.setPlannedSkillCount(data, 'herald__pragmatic_fatecarver', 1)
  const base = next.unlock_order.find(row => row.catalog_skill_id === 'herald__fatecarver')
  const morph = next.unlock_order.find(row => row.catalog_skill_id === 'herald__pragmatic_fatecarver')
  assert.ok(base)
  assert.ok(morph)
  assert.equal(base.status, 'temporary')
  assert.deepEqual(morph.requires, [base.id])
  assert.deepEqual(validateBuild(next), [])
})

test('passive rank controls generate no more than the catalog maximum', () => {
  let data = template()
  data.unlock_order = data.unlock_order.filter(row => row.catalog_skill_id !== 'herald__harnessed_quintessence')
  data = logic.setPlannedSkillCount(data, 'herald__harnessed_quintessence', 99)
  const rows = logic.plannedRowsForSkill(data, 'herald__harnessed_quintessence')
  assert.equal(rows.length, 2)
  assert.equal(new Set(rows.map(row => row.id)).size, 2)
  assert.deepEqual(validateBuild(data), [])
})

test('removing a non-class relevant line also cleans bars and rotation references', () => {
  const data = template()
  const next = logic.removeRelevantLine(data, 'dual_wield')
  assert.equal(next.relevant_lines.some(line => line.id === 'dual_wield'), false)
  assert.equal(next.unlock_order.some(row => row.line === 'dual_wield'), false)
  assert.equal(next.phases.some(phase => [...(phase.front_bar?.slots || []), ...(phase.back_bar?.slots || [])].some(slot => slot.catalog_skill_id?.startsWith('dual_wield__'))), false)
})

test('leveling choices exclude passives and phase review catches missing ultimates', () => {
  const data = template()
  const choices = logic.plannedBarChoices(data)
  assert.ok(choices.length > 0)
  assert.equal(choices.some(choice => choice.type === 'Passive'), false)
  const phase = structuredClone(data.phases[1])
  phase.front_bar.ultimate = null
  phase.back_bar.ultimate = null
  const warnings = logic.phaseQualityWarnings(data, phase)
  assert.ok(warnings.some(message => /front-bar ultimate/i.test(message)))
  assert.ok(warnings.some(message => /back-bar ultimate/i.test(message)))
})
