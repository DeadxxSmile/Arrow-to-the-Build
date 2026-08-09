'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

// These guard the properties a game update must not accidentally break. They read the shipped catalog
// directly, so they hold whether it was regenerated from the Python tool or hand-edited.
const catalogPath = path.join(__dirname, '../resources/data/eso-skill-catalog.json')
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))

const allSkills = catalog.lines.flatMap(line => (line.skills || []).map(skill => ({ line, skill })))
const byId = new Map(allSkills.map(({ skill }) => [skill.id, skill]))

test('the catalog states its version and the ESO update it reflects', () => {
  assert.ok(catalog.catalog_version, 'catalog_version is required so drift is visible')
  assert.ok(catalog.game_version, 'game_version is required so builds can be matched to a patch')
  assert.ok(catalog.verified_date, 'verified_date records when it was last checked')
})

test('every skill line id is unique', () => {
  const seen = new Set()
  for (const line of catalog.lines) {
    assert.ok(line.id, 'a skill line has no id')
    assert.equal(seen.has(line.id), false, `duplicate skill line id "${line.id}"`)
    seen.add(line.id)
  }
})

test('every skill id is unique and shaped like line__slug', () => {
  const seen = new Set()
  for (const { line, skill } of allSkills) {
    assert.equal(seen.has(skill.id), false, `duplicate skill id "${skill.id}"`)
    seen.add(skill.id)
    // Ids are the permanent contract with build files, so the shape must stay stable.
    assert.match(skill.id, /^[a-z0-9]+(?:_[a-z0-9]+)*__[a-z0-9]+(?:_[a-z0-9]+)*$/, `skill id "${skill.id}" is not line__slug`)
    if (!skill.id.startsWith(line.id + '__')) {
      assert.ok(skill.legacy_line_id, `skill "${skill.id}" moved to "${line.id}" without a legacy_line_id migration marker`)
      assert.ok(skill.id.startsWith(skill.legacy_line_id + '__'), `moved skill "${skill.id}" does not preserve its legacy line prefix "${skill.legacy_line_id}"`)
    }
  }
})

test('every morph points back at its base, and every base lists its morphs', () => {
  for (const { skill } of allSkills) {
    if (skill.base_id) {
      const base = byId.get(skill.base_id)
      assert.ok(base, `morph "${skill.id}" references missing base "${skill.base_id}"`)
      assert.ok((base.morph_ids || []).includes(skill.id), `base "${base.id}" does not list its morph "${skill.id}"`)
    }
    for (const morphId of skill.morph_ids || []) {
      const morph = byId.get(morphId)
      assert.ok(morph, `skill "${skill.id}" lists missing morph "${morphId}"`)
      assert.equal(morph.base_id, skill.id, `morph "${morphId}" does not point back at base "${skill.id}"`)
    }
  }
})

test('a base ability has either zero or exactly two morphs, as ESO uses', () => {
  for (const { skill } of allSkills) {
    const count = (skill.morph_ids || []).length
    assert.ok(count === 0 || count === 2, `"${skill.id}" has ${count} morphs; ESO abilities have 0 or 2`)
  }
})

test('every skill has a whole max_points, positive except tracking-only Scribing', () => {
  for (const { skill } of allSkills) {
    assert.ok(Number.isInteger(skill.max_points), `"${skill.id}" has a non-integer max_points`)
    // Scribing entries are tracking-only and cost no skill points, so 0 is expected there.
    if (skill.type === 'Scribing') assert.ok(skill.max_points >= 0, `"${skill.id}" max_points is negative`)
    else assert.ok(skill.max_points > 0, `"${skill.id}" needs a positive max_points`)
  }
})

test('every skill type is one the app understands', () => {
  const known = new Set(['Active', 'Ultimate', 'Morph', 'Passive', 'Scribing'])
  for (const { skill } of allSkills) {
    assert.ok(known.has(skill.type), `"${skill.id}" has unknown type "${skill.type}"`)
    // Only morphs carry a base; only actives and ultimates carry morphs.
    if (skill.type === 'Morph') assert.ok(skill.base_id, `morph "${skill.id}" has no base_id`)
    else assert.equal(skill.base_id, null, `${skill.type} "${skill.id}" should not have a base_id`)
    if ((skill.morph_ids || []).length) assert.ok(['Active', 'Ultimate'].includes(skill.type), `"${skill.id}" is a ${skill.type} but has morphs`)
  }
})

test('class lines declare their class so build switching can keep the right ones', () => {
  for (const line of catalog.lines) {
    if (line.group === 'Class') assert.ok(line.class, `class line "${line.id}" is missing its class name`)
  }
})

test('every bundled build resolves entirely against this catalog', () => {
  // The whole point of stable ids: a build must never reference a skill the catalog does not have.
  const buildsDir = path.join(__dirname, '../resources/builds')
  for (const file of fs.readdirSync(buildsDir).filter(f => f.endsWith('.json'))) {
    const build = JSON.parse(fs.readFileSync(path.join(buildsDir, file), 'utf8'))
    for (const row of build.unlock_order || []) {
      assert.ok(byId.has(row.catalog_skill_id), `${file}: "${row.id}" references missing catalog id "${row.catalog_skill_id}"`)
    }
  }
})

const bundledBuilds = (() => {
  const buildsDir = path.join(__dirname, '../resources/builds')
  return fs.readdirSync(buildsDir).filter(f => f.endsWith('.json')).map(file => ({
    file, build: JSON.parse(fs.readFileSync(path.join(buildsDir, file), 'utf8'))
  }))
})()

test('pure-class bundled builds curate passives in all three native lines without exceeding catalog ranks', () => {
  const linesById = new Map(catalog.lines.map(line => [line.id, line]))
  for (const { file, build } of bundledBuilds) {
    if (build.metadata?.class_style !== 'pure_class') continue
    for (const configured of build.class_configuration?.active_class_lines || []) {
      if (configured.mode !== 'native') continue
      const line = linesById.get(configured.line_id)
      assert.ok(line, `${file}: native class line "${configured.line_id}" is missing from the catalog`)
      const rows = (build.unlock_order || []).filter(row => row.kind === 'Passive' && row.line === configured.line_id)
      assert.ok(rows.length > 0, `${file}: ${configured.line_id} needs curated passive progression`)
      const counts = new Map()
      for (const row of rows) counts.set(row.catalog_skill_id, (counts.get(row.catalog_skill_id) || 0) + 1)
      for (const [skillId, actual] of counts) {
        const skill = (line.skills || []).find(item => item.id === skillId)
        assert.ok(skill?.type === 'Passive', `${file}: ${skillId} is not a passive in ${configured.line_id}`)
        assert.ok(actual <= skill.max_points, `${file}: ${skillId} recommends ${actual}/${skill.max_points} ranks`)
      }
    }
  }
})

test('bundled builds do not omit their racial and core weapon/armor passive progression', () => {
  const linesById = new Map(catalog.lines.map(line => [line.id, line]))
  for (const { file, build } of bundledBuilds) {
    const rows = build.unlock_order || []
    const passivesByLine = new Map()
    for (const row of rows.filter(row => row.kind === 'Passive')) {
      passivesByLine.set(row.line, (passivesByLine.get(row.line) || 0) + 1)
    }

    for (const relevant of build.relevant_lines || []) {
      const line = linesById.get(relevant.id)
      if (!line) continue
      if (line.group === 'Racial') {
        const expected = (line.skills || []).filter(skill => skill.type === 'Passive')
          .reduce((sum, skill) => sum + (Number(skill.max_points) || 0), 0)
        assert.equal(passivesByLine.get(line.id) || 0, expected, `${file}: racial line ${line.id} is incomplete`)
      }
      if (line.group === 'Armor') {
        assert.ok((passivesByLine.get(line.id) || 0) > 0, `${file}: relevant armor line ${line.id} has no recommended passives`)
      }
      if (line.group === 'Weapon' && rows.some(row => row.line === line.id && row.kind !== 'Passive')) {
        assert.ok((passivesByLine.get(line.id) || 0) > 0, `${file}: used weapon line ${line.id} has no recommended passives`)
      }
    }
  }
})



test('the Update 50 sweep gives every ordinary passive an exact gate for every point', () => {
  const ordinary = allSkills.filter(({ skill }) => skill.type === 'Passive' && skill.currency === 'skill_point')
  assert.ok(ordinary.length > 250, 'the audit should cover the complete ordinary passive catalog, not a small subset')
  for (const { line, skill } of ordinary) {
    assert.ok(Array.isArray(skill.unlock_ranks), `${skill.id} is missing unlock_ranks`)
    assert.equal(skill.unlock_ranks.length, skill.max_points, `${skill.id} needs one gate for each purchasable point`)
    assert.deepEqual([...skill.unlock_ranks].sort((a, b) => a - b), skill.unlock_ranks, `${skill.id} gates are not monotonic`)
    for (const rank of skill.unlock_ranks) {
      assert.ok(Number.isInteger(rank) && rank >= 1 && rank <= line.max_rank, `${skill.id} has invalid line-rank gate ${rank}`)
    }
    assert.equal(skill.required_rank, skill.unlock_ranks[0], `${skill.id} required_rank should be its first-point gate`)
  }
})

test('every morph records both its family line gate and the base-ability Rank IV requirement', () => {
  const morphs = allSkills.filter(({ skill }) => skill.type === 'Morph')
  assert.ok(morphs.length > 300, 'expected the complete morph catalog')
  for (const { skill } of morphs) {
    assert.ok(Number.isInteger(skill.required_rank), `${skill.id} has no skill-line rank gate`)
    assert.equal(skill.requires_base_skill_rank, 4, `${skill.id} must require its base ability at Rank IV`)
  }
})

test('every catalog row carries current unlock provenance', () => {
  assert.equal(catalog.game_version, 'Update 50')
  assert.equal(catalog.live_patch, 'Update 50 Inc. 2')
  assert.equal(catalog.verified_date, '2026-08-09')
  assert.ok(Array.isArray(catalog.unlock_gate_sources) && catalog.unlock_gate_sources.length >= 2)
  for (const { skill } of allSkills) {
    assert.equal(skill.unlock_verified_date, '2026-08-09', `${skill.id} has stale/missing unlock verification date`)
    assert.equal(skill.unlock_patch, 'Update 50 Inc. 2', `${skill.id} has stale/missing patch provenance`)
    assert.ok(skill.unlock_source, `${skill.id} has no unlock source`)
  }
})

test('special nonstandard lines keep their exact Update 50 skill and passive gates', () => {
  const expect = (id, { rank, gates, max, currency }) => {
    const skill = byId.get(id)
    assert.ok(skill, `missing audited skill ${id}`)
    if (rank !== undefined) assert.equal(skill.required_rank, rank, `${id} line-rank gate drifted`)
    if (gates !== undefined) assert.deepEqual(skill.unlock_ranks, gates, `${id} point gates drifted`)
    if (max !== undefined) assert.equal(skill.max_points, max, `${id} max_points drifted`)
    if (currency !== undefined) assert.equal(skill.currency, currency, `${id} currency drifted`)
  }

  // Class and weapon representative points.
  expect('herald__fated_fortune', { gates: [8, 18] })
  expect('herald__harnessed_quintessence', { gates: [14, 27] })
  expect('herald__psychic_lesion', { gates: [22, 36] })
  expect('herald__splintered_secrets', { gates: [39, 50] })
  expect('two_handed__forceful', { gates: [5, 34] })
  expect('dual_wield__twin_blade_and_blunt', { gates: [41, 50] })

  // Soul Magic / Vampire / Werewolf.
  expect('soul_magic__soul_shatter', { gates: [2, 4] })
  expect('soul_magic__soul_summons', { gates: [2, 3] })
  expect('soul_magic__soul_lock', { gates: [3, 5] })
  expect('vampire__vampiric_drain', { rank: 4 })
  expect('vampire__mesmerize', { rank: 6 })
  expect('vampire__mist_form', { rank: 9 })
  expect('vampire__dark_stalker', { gates: [3, 7] })
  expect('vampire__strike_from_the_shadows', { gates: [4, 8] })
  expect('vampire__blood_ritual', { gates: [6] })
  expect('vampire__undeath', { gates: [6, 9] })
  expect('vampire__unnatural_movement', { gates: [7, 10] })
  expect('werewolf__pounce', { rank: 2 })
  expect('werewolf__hircine_s_bounty', { rank: 4 })
  expect('werewolf__roar', { rank: 5 })
  expect('werewolf__piercing_howl', { rank: 6 })
  expect('werewolf__infectious_claws', { rank: 9 })
  expect('werewolf__pursuit', { gates: [3, 7] })
  expect('werewolf__blood_rage', { gates: [4, 8] })
  expect('werewolf__bloodmoon', { gates: [6] })
  expect('werewolf__savage_strength', { gates: [6, 9] })
  expect('werewolf__call_of_the_pack', { gates: [7, 10] })

  // Psijic Order and one-point corrections discovered in the sweep.
  expect('psijic_order__time_stop', { rank: 2 })
  expect('psijic_order__imbue_weapon', { rank: 3 })
  expect('psijic_order__accelerate', { rank: 5 })
  expect('psijic_order__mend_wounds', { rank: 6 })
  expect('psijic_order__meditate', { rank: 8 })
  expect('psijic_order__undo', { rank: 10 })
  expect('psijic_order__see_the_unseen', { rank: 1, currency: 'none' })
  expect('psijic_order__clairvoyance', { gates: [3, 5] })
  expect('psijic_order__spell_orb', { gates: [4, 7] })
  expect('psijic_order__concentrated_barrier', { gates: [6, 8] })
  expect('psijic_order__deliberation', { gates: [9], max: 1 })
  expect('thieves_guild__veil_of_shadows', { gates: [10], max: 1 })

  // Alliance War actives have their own progression pattern, not the guild/weapon patterns.
  expect('assault__war_horn', { rank: 4 })
  expect('assault__vigor', { rank: 2 })
  expect('assault__rapid_maneuver', { rank: 5 })
  expect('assault__caltrops', { rank: 6 })
  expect('assault__magicka_detonation', { rank: 7 })
  expect('assault__continuous_attack', { gates: [3, 9] })
  expect('assault__reach', { gates: [5, 10] })
  expect('assault__combat_frenzy', { gates: [8, 10] })
  expect('support__siege_shield', { rank: 2 })
  expect('support__purge', { rank: 4 })
  expect('support__guard', { rank: 5 })
  expect('support__barrier', { rank: 6 })
  expect('support__revealing_flare', { rank: 7 })
  expect('support__magicka_aid', { gates: [3, 9] })
  expect('support__combat_medic', { gates: [5, 10] })
  expect('support__battle_resurrection', { gates: [8, 10] })

  // Racial ordering exceptions and representative craft progression.
  expect('nord__resist_frost', { gates: [5, 15, 30] })
  expect('nord__stalwart', { gates: [10, 20, 40] })
  expect('nord__rugged', { gates: [25, 35, 50] })
  expect('argonian__life_mender', { gates: [5, 15, 30] })
  expect('argonian__argonian_resistance', { gates: [10, 20, 40] })
  expect('argonian__resourceful', { gates: [25, 35, 50] })
  expect('blacksmithing__metalworking', { gates: [1, 5, 10, 15, 20, 25, 30, 35, 40, 50] })
  expect('jewelry_crafting__engraver', { gates: [1, 14, 27, 40, 50] })
  expect('alchemy__solvent_proficiency', { gates: [1, 10, 20, 30, 40, 48, 49, 50] })
  expect('enchanting__aspect_improvement', { gates: [1, 6, 16, 31] })
  expect('provisioning__recipe_quality', { gates: [1, 10, 35, 50] })
  expect('provisioning__recipe_improvement', { gates: [1, 20, 30, 40, 50, 50] })
})

test('bundled build required_rank values agree with the audited catalog point-by-point', () => {
  for (const { file, build } of bundledBuilds) {
    const groups = new Map()
    for (const row of build.unlock_order || []) {
      if (!row.catalog_skill_id) continue
      if (!groups.has(row.catalog_skill_id)) groups.set(row.catalog_skill_id, [])
      groups.get(row.catalog_skill_id).push(row)
    }
    for (const [skillId, rows] of groups) {
      const skill = byId.get(skillId)
      assert.ok(skill, `${file}: missing ${skillId}`)
      if (skill.type === 'Passive' && skill.currency === 'skill_point') {
        const ordered = [...rows].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0) || String(a.id).localeCompare(String(b.id)))
        assert.ok(ordered.length <= skill.unlock_ranks.length, `${file}: ${skillId} has too many passive point rows`)
        ordered.forEach((row, index) => {
          assert.equal(row.required_rank, skill.unlock_ranks[index], `${file}: ${row.id} has stale required_rank for passive point ${index + 1}`)
        })
      } else if (['Active', 'Ultimate', 'Morph'].includes(skill.type)) {
        for (const row of rows) assert.equal(row.required_rank, skill.required_rank, `${file}: ${row.id} has stale required_rank`)
      }
    }
  }
})

test('v2.1 armor passives keep their verified per-point line-rank gates', () => {
  const gates = {
    'light_armor__grace': [2, 10, 30],
    'light_armor__evocation': [6, 18],
    'light_armor__spell_warding': [14, 34],
    'light_armor__prodigy': [38, 46],
    'light_armor__concentration': [42, 50],
    'medium_armor__dexterity': [2, 10, 30],
    'medium_armor__wind_walker': [6, 18],
    'medium_armor__improved_sneak': [14, 34],
    'medium_armor__agility': [38, 46],
    'medium_armor__athletics': [42, 50],
    'heavy_armor__resolve': [2, 10, 30],
    'heavy_armor__constitution': [6, 18],
    'heavy_armor__juggernaut': [14, 34],
    'heavy_armor__revitalize': [38, 46],
    'heavy_armor__rapid_mending': [42, 50]
  }
  for (const [id, expected] of Object.entries(gates)) {
    const skill = byId.get(id)
    assert.ok(skill, `missing armor passive ${id}`)
    assert.deepEqual(skill.unlock_ranks, expected, `${id} per-point gates drifted`)
    assert.equal(skill.unlock_ranks.length, skill.max_points, `${id} needs one verified gate per purchasable rank`)
  }
})

test('Update 50 skill audit regression facts stay pinned', () => {
  const hit = id => {
    const row = allSkills.find(item => item.skill.id === id)
    assert.ok(row, `missing audited skill ${id}`)
    return row
  }
  const expectSkill = (id, expected = {}) => {
    const { line, skill } = hit(id)
    if (expected.line) assert.equal(line.id, expected.line, `${id} line drifted`)
    if (expected.name) assert.equal(skill.name, expected.name, `${id} name drifted`)
    if (expected.max !== undefined) assert.equal(skill.max_points, expected.max, `${id} max rank drifted`)
    if (expected.rank !== undefined) assert.equal(skill.required_rank, expected.rank, `${id} unlock rank drifted`)
    if (expected.currency) assert.equal(skill.currency, expected.currency, `${id} currency drifted`)
  }

  // Racial/inherent and live-snapshot mismatch that triggered this audit.
  expectSkill('dark_elf__ashlander', { line: 'dark_elf', name: 'Ashlander', max: 1, currency: 'none' })
  for (const id of ['dark_elf__dynamic', 'dark_elf__resist_flame', 'dark_elf__ruination']) expectSkill(id, { max: 3, currency: 'skill_point' })
  expectSkill('provisioning__recipe_quality', { max: 4 })

  // Free/inherent passives and transformed skill lines.
  for (const id of ['light_armor__light_armor_bonuses', 'light_armor__light_armor_penalties', 'medium_armor__medium_armor_bonuses', 'heavy_armor__heavy_armor_bonuses', 'heavy_armor__heavy_armor_penalties']) expectSkill(id, { max: 1, currency: 'none' })
  expectSkill('emperor__domination', { max: 1, currency: 'none' })
  expectSkill('vampire__feed', { max: 1, currency: 'none' })
  expectSkill('vampire__dark_stalker', { max: 2 })
  expectSkill('vampire__strike_from_the_shadows', { max: 2 })
  expectSkill('vampire__undeath', { max: 2 })
  expectSkill('vampire__unnatural_movement', { max: 2 })
  expectSkill('vampire__blood_ritual', { max: 1 })
  expectSkill('werewolf__devour', { name: 'Insatiable Hunger', max: 1, currency: 'none' })
  expectSkill('werewolf__pursuit', { name: 'Master of the Chase', max: 2 })
  expectSkill('werewolf__bloodmoon', { name: 'Shadow of the Bloodmoon', max: 1 })
  expectSkill('werewolf__savage_strength', { name: 'Feral Cruelty', max: 2 })
  expectSkill('werewolf__call_of_the_pack', { name: 'Call of the Hunt', max: 2 })

  // Scribing Grimoires belong to parent skill lines. Their permanent scribing__ IDs stay stable.
  const scribing = allSkills.filter(({ skill }) => skill.type === 'Scribing')
  assert.equal(scribing.length, 12)
  assert.equal(new Set(scribing.map(({ skill }) => skill.name.toLowerCase())).size, 12, 'Scribing Grimoires must not be duplicated in a synthetic parallel line')
  expectSkill('scribing__traveling_knife', { line: 'dual_wield', rank: 25, currency: 'none' })
  expectSkill('scribing__wield_soul', { line: 'soul_magic', currency: 'none' })
  expectSkill('scribing__torchbearer', { line: 'fighters_guild', rank: 5, currency: 'none' })
  expectSkill('scribing__ulfsild_s_contingency', { line: 'mages_guild', rank: 5, currency: 'none' })
  expectSkill('scribing__trample', { line: 'assault', rank: 5, currency: 'none' })
  expectSkill('scribing__banner_bearer', { line: 'support', rank: 5, currency: 'none' })

  // Current line/name migrations from the U49/U50 combat refreshes.
  expectSkill('shadow__veiled_strike', { line: 'assassination', rank: 1 })
  expectSkill('assassination__blur', { line: 'shadow', rank: 1 })
  expectSkill('assassination__assassin_s_blade', { line: 'assassination', rank: 20 })
  expectSkill('shadow__shadow_cloak', { line: 'shadow', rank: 4 })
  expectSkill('ardent_flame__fiery_grip', { line: 'draconic_power', name: 'Chains of Flame', rank: 42 })
  expectSkill('draconic_power__inhale', { line: 'ardent_flame', name: 'Core of Flame', rank: 20 })
  expectSkill('earthen_heart__ash_cloud', { line: 'ardent_flame', name: 'Hearthfire', rank: 30 })
  expectSkill('ardent_flame__fiery_breath', { line: 'draconic_power', name: 'Dragonfire Breath', rank: 1 })
  expectSkill('draconic_power__spiked_armor', { line: 'earthen_heart', name: 'Earthspike Mantle', rank: 42 })

  expectSkill('bow__long_shots', { name: 'Vinedusk Training' })
  expectSkill('aedric_spear__empowering_sweep', { name: 'Crescent Sweep' })
  expectSkill('aedric_spear__puncturing_sweeps', { name: 'Puncturing Sweep' })
  expectSkill('dark_magic__restraining_prison', { name: 'Vibrant Shroud' })
  expectSkill('daedric_summoning__charged_atronach', { name: 'Summon Charged Atronach' })
  expectSkill('storm_calling__mage_s_fury', { name: "Mages' Fury" })
  expectSkill('grave_lord__stalking_blastbones', { name: "Grave Lord's Sacrifice" })
  expectSkill('scrying__scry', { max: 1, currency: 'none' })
  expectSkill('excavation__keen_eye_treasure_chests', { max: 2 })
  expectSkill('dark_brotherhood__blade_of_woe', { max: 1, currency: 'none' })
  expectSkill('thieves_guild__finders_keepers', { max: 1, currency: 'none' })
  expectSkill('dark_brotherhood__padomaic_sprint', { max: 4 })
})
