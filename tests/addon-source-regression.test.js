'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const addonRoot = path.resolve(__dirname, '..', 'resources', 'addon', 'ArrowToTheBuild')
const read = (...parts) => fs.readFileSync(path.join(addonRoot, ...parts), 'utf8')

const manifest = read('ArrowToTheBuild.txt')
const namespace = read('Namespace.lua')
const util = read('Util.lua')
const character = read('Collectors', 'Character.lua')
const skills = read('Collectors', 'Skills.lua')
const equipment = read('Collectors', 'Equipment.lua')
const core = read('Core.lua')
const addonSources = [namespace, util, character, skills, equipment, core].join('\n')

test('bundled addon version and SavedVariables policy stay aligned', () => {
  assert.match(manifest, /^## Version: 1\.1\.1$/m)
  assert.match(manifest, /^## AddOnVersion: 10101$/m)
  assert.match(manifest, /^## APIVersion: 101050$/m)
  assert.match(manifest, /^## DisableSavedVariablesAutoSaving: 1$/m)
  assert.match(namespace, /ATTB\.version = "1\.1\.1"/)
})

test('enum labels use the string-prefix GetString overload', () => {
  assert.doesNotMatch(addonSources, /GetString\(SI_[A-Z0-9_]+\s*,/)
  assert.match(util, /GetString\(stringPrefix, enumValue\)/)
  assert.match(character, /Util\.EnumName\("SI_GENDER", gender/)
  assert.match(skills, /Util\.EnumName\("SI_SKILLTYPE", skillType/)
  assert.match(equipment, /Util\.EnumName\("SI_EQUIPTYPE", equipType/)
  assert.match(equipment, /Util\.EnumName\("SI_ITEMTYPE", itemType/)
  assert.match(equipment, /Util\.EnumName\("SI_ARMORTYPE", armorType/)
  assert.match(equipment, /Util\.EnumName\("SI_WEAPONTYPE", weaponType/)
  assert.match(equipment, /Util\.EnumName\("SI_ITEMTRAITTYPE", traitType/)
})

test('equipment capture uses direct documented item APIs', () => {
  assert.match(equipment, /GetItemEquipType\(BAG_WORN, slotId\)/)
  assert.match(equipment, /GetItemFunctionalQuality\(BAG_WORN, slotId\)/)
  assert.doesNotMatch(equipment, /GetItemInfo\(BAG_WORN, slotId\)/)
})

test('worn inventory listener filters noisy durability and charge updates', () => {
  assert.match(core, /REGISTER_FILTER_BAG_ID[\s\S]*BAG_WORN/)
  assert.match(core, /REGISTER_FILTER_INVENTORY_UPDATE_REASON[\s\S]*INVENTORY_UPDATE_REASON_DEFAULT/)
})

test('action bar matching uses ESO ability keys before name fallback', () => {
  assert.match(skills, /GetSpecificSkillAbilityKeysByAbilityId\(abilityId\)/)
  assert.match(skills, /"ability-keys"/)
  assert.match(skills, /matchMethod = "name"/)
})
