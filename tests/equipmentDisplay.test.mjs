import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLiveSetCoverage, liveEquipmentGroup, liveEquipmentOrder } from '../src/renderer/utils/equipmentDisplay.mjs'

test('live equipment groups armor, weapons, and jewelry without treating Hands as a weapon slot', () => {
  assert.equal(liveEquipmentGroup({ slotName: 'Hands' }), 'armor')
  assert.equal(liveEquipmentGroup({ slotName: 'Front Main Hand' }), 'weapons')
  assert.equal(liveEquipmentGroup({ slotName: 'Back Main Hand' }), 'weapons')
  assert.equal(liveEquipmentGroup({ slotName: 'Ring 1' }), 'jewelry')
  assert.equal(liveEquipmentGroup({ slotName: 'Neck' }), 'jewelry')
  assert.ok(liveEquipmentOrder({ slotName: 'Head' }) < liveEquipmentOrder({ slotName: 'Feet' }))
})

test('set coverage summarizes armor and jewelry while excluding weapon-bar sets', () => {
  const item = (slotName, setName, id, maxEquipped = 0) => ({ slotName, set: { hasSet: true, name: setName, id, maxEquipped } })
  const items = [
    item('Chest', 'Trappings of Invigoration', 1), item('Legs', 'Trappings of Invigoration', 1), item('Feet', 'Trappings of Invigoration', 1),
    item('Ring 1', 'Trappings of Invigoration', 1), item('Ring 2', 'Trappings of Invigoration', 1),
    item('Head', "Bone Pirate's Tatters", 2), item('Hands', "Bone Pirate's Tatters", 2), item('Waist', "Bone Pirate's Tatters", 2), item('Neck', "Bone Pirate's Tatters", 2),
    item('Shoulders', 'Valkyn Skoria', 3, 2),
    item('Front Main Hand', 'Deadly Strike', 4, 5), item('Front Off Hand', 'Deadly Strike', 4, 5)
  ]

  const coverage = buildLiveSetCoverage(items)
  assert.deepEqual(coverage.map(set => [set.name, set.count, set.displayMax]), [
    ['Trappings of Invigoration', 5, 5],
    ["Bone Pirate's Tatters", 4, 5],
    ['Valkyn Skoria', 1, 2]
  ])
})
