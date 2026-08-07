'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('./electron-stub')
const dbModule = require('../src/main/database/db')
const { insertCharacter } = require('../src/main/ipc/characterHandlers')

const build = JSON.parse(fs.readFileSync(path.join(__dirname, '../resources/builds/stamina_arcanist_solo_duo.json'), 'utf8'))

function captureInsert(payload) {
  let values = null
  const original = dbModule.getDb
  dbModule.getDb = () => ({ prepare: () => ({ run: input => { values = input } }) })
  try { insertCharacter(payload, build, 'test-id') } finally { dbModule.getDb = original }
  return values
}

test('character creation never copies the build attribute target into recorded progress', () => {
  const values = captureInsert({ name: 'Fresh', build_id: build.id, level: 16 })
  assert.deepEqual(JSON.parse(values.attributes_json), { magicka: 0, health: 0, stamina: 0 })
  assert.equal(values.attribute_points, 0)
  assert.equal(values.loadout_id, 'flexible-pve')
  assert.equal(values.variant_id, 'solo-duo')
})

test('character creation records explicit attributes and all three CP budgets for a low-level alt', () => {
  const values = captureInsert({
    name: 'Alt', build_id: build.id, level: 16,
    attributes: { magicka: 0, health: 0, stamina: 19 },
    cp_craft: 70, cp_warfare: 70, cp_fitness: 69
  })
  assert.deepEqual(JSON.parse(values.attributes_json), { magicka: 0, health: 0, stamina: 19 })
  assert.equal(values.attribute_points, 19)
  assert.equal(values.cp_craft, 70)
  assert.equal(values.cp_warfare, 70)
  assert.equal(values.cp_fitness, 69)
})
