'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const BUILD_DIR = path.join(ROOT, 'resources/builds')
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'resources/data/eso-skill-catalog.json'), 'utf8'))
const skillById = new Map(catalog.lines.flatMap(line => (line.skills || []).map(skill => [skill.id, skill])))
const builds = Object.fromEntries(fs.readdirSync(BUILD_DIR).filter(file => file.endsWith('.json')).map(file => [file, JSON.parse(fs.readFileSync(path.join(BUILD_DIR, file), 'utf8'))]))

function passiveRanks(build, skillId) {
  return (build.unlock_order || []).filter(row => row.kind === 'Passive' && row.catalog_skill_id === skillId)
}
function finalSlots(build, tree) { return build.cp_plans?.[tree]?.final_slots || [] }

const decisions = {
  'magicka_dragonknight_solo_duo.json': {
    race: 'Dark Elf', back: 'Inferno Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'fortified', 'celerity', 'expert_evasion'],
    include: ['medium_armor__wind_walker', 'medium_armor__athletics', 'mages_guild__mage_adept', 'mages_guild__everlasting_magic', 'mages_guild__magicka_controller', 'alchemy__medicinal_use']
  },
  'magicka_sorcerer_solo_duo.json': {
    race: 'Dark Elf', back: 'Lightning Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'siphoning_spells', 'rejuvenation', 'fortified'],
    include: ['fighters_guild__slayer', 'mages_guild__everlasting_magic', 'alchemy__medicinal_use']
  },
  'magicka_templar_solo_duo.json': {
    race: 'Dark Elf', back: 'Ice Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'siphoning_spells', 'rejuvenation', 'fortified'],
    include: ['medium_armor__wind_walker', 'medium_armor__athletics', 'mages_guild__mage_adept', 'mages_guild__everlasting_magic', 'mages_guild__magicka_controller', 'alchemy__medicinal_use'],
    exclude: ['restoring_light__master_ritualist']
  },
  'magicka_warden_solo_duo.json': {
    race: 'Dark Elf', back: 'Ice Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'siphoning_spells', 'rejuvenation', 'fortified'],
    include: ['medium_armor__wind_walker', 'medium_armor__athletics', 'mages_guild__mage_adept', 'mages_guild__everlasting_magic', 'mages_guild__magicka_controller', 'alchemy__medicinal_use']
  },
  'stamina_arcanist_solo_duo.json': {
    race: 'Dark Elf', back: 'Inferno Staff',
    warfare: ['master_at_arms', 'biting_aura', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'bloody_renewal', 'rejuvenation', 'fortified'],
    include: ['fighters_guild__slayer', 'fighters_guild__banish_the_wicked', 'light_armor__evocation', 'light_armor__prodigy', 'alchemy__medicinal_use']
  },
  'stamina_necromancer_solo_duo.json': {
    race: 'Dark Elf', back: 'Inferno Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'bloody_renewal', 'rejuvenation', 'fortified'],
    include: ['light_armor__evocation', 'light_armor__spell_warding', 'light_armor__prodigy', 'fighters_guild__slayer', 'fighters_guild__banish_the_wicked', 'mages_guild__everlasting_magic', 'undaunted__undaunted_command', 'alchemy__medicinal_use'],
    exclude: ['dual_wield__controlled_fury']
  },
  'stamina_nightblade_solo_duo.json': {
    race: 'Khajiit', back: 'Ice Staff',
    warfare: ['master_at_arms', 'deadly_aim', 'fighting_finesse', 'wrathful_strikes'],
    fitness: ['boundless_vitality', 'celerity', 'rejuvenation', 'fortified'],
    include: ['light_armor__prodigy', 'mages_guild__everlasting_magic', 'alchemy__medicinal_use']
  }
}

test('the curated Mighty Seven keep the researched race, weapon, CP, and passive decisions', () => {
  for (const [file, expected] of Object.entries(decisions)) {
    const build = builds[file]
    assert.ok(build, `${file} is missing`)
    assert.equal(build.defaults.race, expected.race, `${file}: default race drifted`)
    assert.match(build.defaults.back_weapon, new RegExp(expected.back.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${file}: back weapon drifted`)
    assert.deepEqual(finalSlots(build, 'warfare'), expected.warfare, `${file}: Warfare defaults drifted`)
    assert.deepEqual(finalSlots(build, 'fitness'), expected.fitness, `${file}: Fitness defaults drifted`)
    for (const skillId of expected.include || []) {
      const max = skillById.get(skillId)?.max_points
      assert.ok(max, `${file}: ${skillId} is missing from the catalog`)
      assert.equal(passiveRanks(build, skillId).length, max, `${file}: ${skillId} should recommend all ${max} curated ranks`)
    }
    for (const skillId of expected.exclude || []) {
      assert.equal(passiveRanks(build, skillId).length, 0, `${file}: ${skillId} is intentionally omitted from the baseline`)
    }
  }
})

test('Medicinal Use is the combat crafting baseline without dragging whole crafting trees into the build', () => {
  for (const [file, build] of Object.entries(builds)) {
    assert.equal(passiveRanks(build, 'alchemy__medicinal_use').length, 3, `${file}: Medicinal Use should be 3/3`)
    const otherCraft = (build.unlock_order || []).filter(row => row.kind === 'Passive' && row.line === 'alchemy' && row.catalog_skill_id !== 'alchemy__medicinal_use')
    assert.equal(otherCraft.length, 0, `${file}: other Alchemy passives are personal crafting choices, not baseline combat requirements`)
  }
})

function activeSetCounts(stage, side) {
  const counts = new Map()
  for (const set of stage.sets || []) {
    let count = 0
    for (const piece of set.pieces || []) {
      const slot = piece.slot || ''
      if (slot.startsWith('Front Weapon')) { if (side === 'front') count += Number(piece.set_slots) || 1 }
      else if (slot.startsWith('Back Weapon')) { if (side === 'back') count += Number(piece.set_slots) || 1 }
      else count += Number(piece.set_slots) || 1
    }
    counts.set(set.name, count)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

test('crafted starter stages keep two five-piece bonuses active on both weapon bars', () => {
  for (const [file, build] of Object.entries(builds)) {
    const stage = (build.gear_stages || []).find(row => row.id === 'starter')
    assert.ok(stage, `${file}: starter gear is missing`)
    for (const side of ['front', 'back']) {
      const counts = activeSetCounts(stage, side)
      assert.ok(counts.filter(([, count]) => count >= 5).length >= 2, `${file}: starter ${side} bar loses a second 5-piece bonus (${counts.map(([name,count]) => `${name}=${count}`).join(', ')})`)
    }
  }
})

function underlyingType(skill) {
  if (!skill) return null
  if (skill.type !== 'Morph') return skill.type
  return skillById.get(skill.base_id)?.type || skill.type
}

test('normal hotbar slots never contain Ultimates and Ultimate slots really are Ultimates', () => {
  for (const [file, build] of Object.entries(builds)) {
    for (const phase of build.phases || []) {
      for (const side of ['front_bar', 'back_bar']) {
        const bar = phase[side] || {}
        for (const slot of bar.slots || []) {
          if (!slot.catalog_skill_id) continue // placeholders and exact Scribed recipes are normal abilities
          const skill = skillById.get(slot.catalog_skill_id)
          assert.ok(skill, `${file}/${phase.id}: missing ${slot.catalog_skill_id}`)
          assert.notEqual(underlyingType(skill), 'Ultimate', `${file}/${phase.id}: ${slot.name} is an Ultimate in a normal ${side} slot`)
        }
        if (bar.ultimate?.catalog_skill_id) {
          const skill = skillById.get(bar.ultimate.catalog_skill_id)
          assert.ok(skill, `${file}/${phase.id}: missing ultimate ${bar.ultimate.catalog_skill_id}`)
          assert.equal(underlyingType(skill), 'Ultimate', `${file}/${phase.id}: ${bar.ultimate.name} is not an Ultimate`)
        }
      }
    }
  }
})

test('mature Scribing bars use complete exact recipes instead of only a generic Grimoire name', () => {
  for (const [file, build] of Object.entries(builds)) {
    const recipes = new Map((build.scribed_skills || []).map(row => [row.id, row]))
    for (const recipe of recipes.values()) {
      for (const field of ['grimoire', 'grimoire_catalog_skill_id', 'focus_script', 'signature_script', 'affix_script']) {
        assert.ok(String(recipe[field] || '').trim(), `${file}: recipe ${recipe.id} needs ${field}`)
      }
    }
    for (const phase of (build.phases || []).filter(row => row.id === '30-50' || row.id === 'final')) {
      for (const bar of [phase.front_bar, phase.back_bar]) {
        for (const slot of bar?.slots || []) {
          assert.equal(String(slot.catalog_skill_id || '').startsWith('scribing__'), false, `${file}/${phase.id}: ${slot.name} still uses a generic Scribing catalog id`)
          if (slot.scribed_skill_id) assert.ok(recipes.has(slot.scribed_skill_id), `${file}/${phase.id}: unknown Scribing recipe ${slot.scribed_skill_id}`)
        }
      }
      for (const step of phase.rotation?.steps || []) {
        assert.equal(String(step.catalog_skill_id || '').startsWith('scribing__'), false, `${file}/${phase.id}: rotation ${step.name} still uses a generic Scribing catalog id`)
        if (step.scribed_skill_id) assert.ok(recipes.has(step.scribed_skill_id), `${file}/${phase.id}: rotation references unknown recipe ${step.scribed_skill_id}`)
      }
    }
  }
})

test('arena weapons do not pretend to provide armor pieces', () => {
  for (const [file, build] of Object.entries(builds)) {
    for (const stage of build.gear_stages || []) for (const set of stage.sets || []) {
      if (!/Crushing Wall/i.test(set.name)) continue
      assert.ok((set.pieces || []).every(piece => /Weapon/.test(piece.slot || '')), `${file}/${stage.id}: Crushing Wall may only contain arena weapon slots`)
    }
  }
})

test('trial alternatives are not labeled as crafted or freely tradeable', () => {
  for (const [file, build] of Object.entries(builds)) {
    for (const stage of build.gear_stages || []) for (const set of stage.sets || []) {
      if (!/Sul-Xan|Whorl/i.test(set.name)) continue
      assert.doesNotMatch(String(set.source?.type || ''), /^Crafted$/i, `${file}/${stage.id}: ${set.name} is trial gear, not crafted gear`)
      assert.doesNotMatch(String(set.source?.tradeable || ''), /^Yes\b/i, `${file}/${stage.id}: ${set.name} is not freely tradeable crafted gear`)
    }
  }
})

test('the Arcanist beam explanation stays contained to the actual beam build', () => {
  for (const [file, build] of Object.entries(builds)) {
    if (file === 'stamina_arcanist_solo_duo.json') continue
    assert.doesNotMatch(JSON.stringify(build), /\bbeam(?:ing)?\b/i, `${file}: stale Arcanist beam text escaped into another class`)
  }
})
