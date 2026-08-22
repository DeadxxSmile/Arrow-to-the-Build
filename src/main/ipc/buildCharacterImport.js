'use strict'

const { inferStartingPoint, scopeForStartingPoint } = require('../../shared/progressionScope.cjs')
const cpCatalog = require('../../../resources/data/eso-cp-catalog.json')
const CP_BY_ESO_ID = new Map((cpCatalog.stars || []).map(star => [Number(star.eso_skill_id), star]))

// Pure-ish transformation layer for turning reconciled ESO character state into Schema 4 build data.
// Persistence, drafts, revisions, and IPC stay in buildHandlers.js. Dependencies are injected to keep
// this module independent of the database and the addon integration singleton.
function createCharacterBuildImport(deps) {
  const { catalog, isObj, slugify, normalClassLines, lineRecord, createGuidedBuildData, requestedBuildId, uniqueBuildId } = deps

  function inferredResource(attributes = {}) {
    const pairs = ['magicka', 'health', 'stamina'].map(key => [key, Number(attributes?.[key]) || 0])
    pairs.sort((a, b) => b[1] - a[1])
    if (!pairs[0][1] || (pairs[1] && pairs[0][1] === pairs[1][1])) return 'hybrid'
    return pairs[0][0]
  }

  function uniqueLocalId(seed, used) {
    const base = slugify(seed)
    let id = base
    let suffix = 2
    while (used.has(id)) id = `${base}-${suffix++}`
    used.add(id)
    return id
  }

  function observedCatalogSkillId(slot, live) {
    const wanted = catalog.normalizeSkillName(slot?.name || '')
    if (!wanted || wanted === 'empty') return null
    for (const skillId of Object.keys(live?.skill_allocations || {})) {
      const hit = catalog.getSkill(skillId)
      if (hit && catalog.normalizeSkillName(hit.skill.name) === wanted) return skillId
    }
    for (const line of catalog.getCatalog().lines || []) {
      const hit = (line.skills || []).find(skill => catalog.normalizeSkillName(skill.name) === wanted)
      if (hit) return hit.id
    }
    return null
  }

  function importedBar(rawBar, live, weapon, fallbackLabel) {
    const rows = Array.isArray(rawBar?.slots) ? rawBar.slots : []
    const regular = rows.filter(slot => Number(slot?.position) >= 1 && Number(slot?.position) <= 5 && Number(slot?.abilityId || 0) > 0)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map(slot => {
        const catalogSkillId = observedCatalogSkillId(slot, live)
        return {
          name: String(slot.name || 'Unknown skill'),
          ...(catalogSkillId ? { catalog_skill_id: catalogSkillId } : {}),
          imported_current: true
        }
      })
    const rawUltimate = rows.find(slot => (Number(slot?.position) === 6 || slot?.isUltimate) && Number(slot?.abilityId || 0) > 0)
    const ultimateSkillId = observedCatalogSkillId(rawUltimate, live)
    return {
      weapon: weapon || fallbackLabel,
      slots: regular,
      ultimate: rawUltimate ? {
        name: String(rawUltimate.name || 'Unknown ultimate'),
        ...(ultimateSkillId ? { catalog_skill_id: ultimateSkillId } : {}),
        imported_current: true
      } : null
    }
  }

  function currentWeaponLabels(observed = {}) {
    const items = Array.isArray(observed?.equipment?.items) ? observed.equipment.items : []
    const bySlot = new Map(items.map(item => [String(item?.slotName || ''), item]))
    const describe = prefix => {
      const main = bySlot.get(`${prefix} Main Hand`)
      const off = bySlot.get(`${prefix} Off Hand`)
      if (!main) return `Current ${prefix.toLowerCase()} bar weapon`
      const mainType = String(main.weaponTypeName || main.name || 'Weapon')
      if (!off) return mainType
      const offType = String(off.weaponTypeName || off.name || 'Off-hand')
      if (/shield/i.test(offType)) return `${mainType} + Shield`
      if (/dagger/i.test(mainType) && /dagger/i.test(offType)) return 'Dual Daggers'
      return `Dual Wield (${mainType} / ${offType})`
    }
    return { front: describe('Front'), back: describe('Back') }
  }

  function currentArmorSummary(observed = {}) {
    const items = Array.isArray(observed?.equipment?.items) ? observed.equipment.items : []
    const counts = new Map()
    for (const item of items) {
      const type = String(item?.armorTypeName || '')
      if (!type || type === 'None') continue
      counts.set(type, (counts.get(type) || 0) + 1)
    }
    const summary = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${count} ${name}`).join(' / ')
    return summary || 'Current equipped armor (review in Equipment)'
  }

  function importedGearStage(observed = {}, requestedId = 'imported-current') {
    const items = Array.isArray(observed?.equipment?.items) ? observed.equipment.items : []
    const usedPieceIds = new Set()
    const pieces = items.map((item, index) => {
      const hasEquipSlot = item?.equipSlot !== null && item?.equipSlot !== undefined && item?.equipSlot !== ''
      const slotIdentity = hasEquipSlot ? `slot-${item.equipSlot}` : (item?.slotName || `slot-${index + 1}`)
      return {
        id: uniqueLocalId(`${slotIdentity}-${item?.itemId || index + 1}`, usedPieceIds),
        slot: String(item?.slotName || `Equipped slot ${index + 1}`),
        item_name: String(item?.name || 'Equipped item'),
        item_id: Number(item?.itemId || 0) || 0,
        set_name: String(item?.set?.name || ''),
        set_id: Number(item?.set?.id || 0) || 0,
        quality: Number(item?.quality || 0) || 0,
        armor_type: String(item?.armorTypeName || ''),
        weapon_type: String(item?.weaponTypeName || ''),
        trait: String(item?.trait?.name || ''),
        enchantment: String(item?.enchantment?.name || ''),
        imported_current: true
      }
    })
    if (!pieces.length) pieces.push({
      id: 'equipment-snapshot-unavailable', slot: 'Current equipment', item_name: 'Equipment detail was not present in the latest reconciled ESO snapshot.',
      imported_current: true, unavailable: true
    })
    return {
      id: requestedId,
      name: 'Imported Current Equipment',
      summary: 'What the character had equipped when this build draft was created. This is CURRENT state, not an endgame recommendation.',
      imported_current: true,
      sets: [{
        id: 'currently-equipped',
        name: 'Currently Equipped',
        source: { type: 'ESO character import', location: 'Equipped on the synced character at import time' },
        pieces
      }]
    }
  }

  function importedCpPlans(observed = {}) {
    const champion = observed?.champion || {}
    const disciplines = Array.isArray(champion.disciplines) ? champion.disciplines : []
    const slots = Array.isArray(champion?.slotted?.slots) ? champion.slotted.slots : []
    const defs = {
      craft: { id: 3, label: 'Craft', color: 'green' },
      warfare: { id: 1, label: 'Warfare', color: 'blue' },
      fitness: { id: 2, label: 'Fitness', color: 'red' }
    }
    return Object.fromEntries(Object.entries(defs).map(([tree, def]) => {
      const discipline = disciplines.find(row => Number(row?.disciplineId) === def.id) || {}
      const stars = Array.isArray(discipline.stars) ? discipline.stars : []
      // Addon 1.1.3+ exports all stars for CURRENT-state capture and graph verification.
      // Constellation placement itself is app-owned in resources/data/eso-cp-layout.json.
      // A generated build should author only what the character actually invested in,
      // and it must use canonical ATTB CP ids rather than ad-hoc eso-123 ids.
      const nodes = stars.map(star => {
        const canonical = CP_BY_ESO_ID.get(Number(star?.skillId || 0))
        const points = Math.max(0, Number(star?.points) || 0)
        if (!canonical || canonical.tree !== tree || points <= 0) return null
        const safePoints = Math.min(Number(canonical.max_points) || points, Math.trunc(points))
        return {
          id: canonical.id,
          first_pass_points: Math.max(1, safePoints),
          target_points: Math.max(1, safePoints),
          current_points: safePoints,
          note: `Imported with ${safePoints} point(s) invested. Refine this current-state snapshot into the intended target strategy in the editor.`
        }
      }).filter(Boolean)
      const authoredIds = new Set(nodes.map(node => node.id))
      const finalSlots = slots.filter(slot => Number(slot?.disciplineId) === def.id && Number(slot?.skillId || 0) > 0)
        .map(slot => CP_BY_ESO_ID.get(Number(slot.skillId)))
        .filter(star => star?.tree === tree && star.slottable === true && authoredIds.has(star.id))
        .map(star => star.id).slice(0, 4)
      return [tree, {
        label: def.label,
        color: def.color,
        core: [],
        flex: nodes.length ? [{ id: 'imported-current', label: 'Imported current investments', purpose: 'current ESO state', nodes }] : [],
        final_slots: finalSlots,
        imported_spent: Math.max(0, Number(discipline.spent) || 0),
        imported_unspent: Math.max(0, Number(discipline.unspent) || 0)
      }]
    }))
  }

  function importedClassConfiguration(live, className) {
    const trackedClassLines = (Array.isArray(live?.tracked_skill_lines) ? live.tracked_skill_lines : [])
      .map(id => catalog.getLine(id)).filter(line => line?.group === 'Class' && !/mastery/i.test(line.name))
    const nativeLines = normalClassLines(className)
    const active = [...trackedClassLines]
    for (const line of nativeLines) {
      if (active.length >= 3) break
      if (!active.some(row => row.id === line.id)) active.push(line)
    }
    return {
      base_class: className,
      active_class_lines: active.slice(0, 3).map(line => ({
        line_id: line.id,
        source_class: line.class || className,
        mode: line.class && line.class !== className ? 'subclassing' : 'native',
        notes: line.class && line.class !== className ? ['Imported as an active foreign/subclass line from the current character state.'] : []
      })),
      class_mastery: { enabled: false, points_available: 2, choices: [], notes: ['No Class Mastery choice is inferred automatically from an ESO character snapshot.'] },
      notes: ['Class-line configuration was derived from the current synced character where the snapshot exposed it.']
    }
  }

  function importedRelevantLines(live, className) {
    const ids = new Set(Array.isArray(live?.tracked_skill_lines) ? live.tracked_skill_lines : [])
    for (const skillId of Object.keys(live?.skill_allocations || {})) {
      const hit = catalog.getSkill(skillId)
      if (hit?.line?.id) ids.add(hit.line.id)
    }
    for (const line of normalClassLines(className)) ids.add(line.id)
    return [...ids].map(id => catalog.getLine(id)).filter(Boolean).map(lineRecord)
  }

  function importedUnlockRows(live = {}, className = '') {
    const allocations = { ...(live.skill_allocations || {}) }
    for (const skillId of Object.keys(allocations)) {
      const hit = catalog.getSkill(skillId)
      if (hit?.skill?.type === 'Morph' && hit.skill.base_id && !allocations[hit.skill.base_id]) allocations[hit.skill.base_id] = 1
    }
    const hits = Object.entries(allocations).map(([skillId, points]) => {
      const hit = catalog.getSkill(skillId)
      return hit ? { ...hit, points: Number(points) || 0 } : null
    }).filter(row => row && row.points > 0)
    const typeOrder = { Ultimate: 0, Active: 1, Passive: 2, Morph: 3 }
    hits.sort((a, b) => String(a.line.group || '').localeCompare(String(b.line.group || '')) || String(a.line.name || '').localeCompare(String(b.line.name || '')) || Number(a.skill.required_rank || 0) - Number(b.skill.required_rank || 0) || (typeOrder[a.skill.type] ?? 9) - (typeOrder[b.skill.type] ?? 9) || String(a.skill.name).localeCompare(String(b.skill.name)))
    const used = new Set()
    const baseRowIdBySkill = new Map()
    const rows = []
    let priority = 10
    const roman = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || String(n)
    for (const { line, skill, points } of hits) {
      const liveMax = Number(live.skill_max_points?.[skill.id])
      const effectiveMax = Number.isInteger(liveMax) && liveMax > 0 ? liveMax : Math.max(1, Number(skill.max_points) || 1)
      const count = skill.type === 'Passive' ? Math.min(effectiveMax, Math.max(1, Math.trunc(points))) : 1
      for (let rank = 1; rank <= count; rank++) {
        const id = uniqueLocalId(`${line.id}-${skill.name}${skill.type === 'Passive' && count > 1 ? `-${rank}` : ''}`, used)
        const requires = []
        if (skill.type === 'Morph' && skill.base_id && baseRowIdBySkill.has(skill.base_id)) requires.push(baseRowIdBySkill.get(skill.base_id))
        if (skill.type === 'Passive' && rank > 1) {
          const previous = rows.filter(row => row.catalog_skill_id === skill.id).slice(-1)[0]
          if (previous) requires.push(previous.id)
        }
        const name = skill.type === 'Passive' && Number(skill.max_points || 1) > 1 ? `${skill.name} ${roman(rank)}` : skill.name
        const row = {
          id, name, catalog_skill_id: skill.id, section: skill.type === 'Passive' ? 'Passive' : skill.type === 'Morph' ? 'Morph' : line.group,
          line: line.id, required_rank: Number(skill.required_rank) || 0, kind: skill.type, phase: 'Imported', status: 'final', priority,
          notes: 'Owned when this character was imported. ATTB does not fabricate the historical level at which it was acquired.',
          morph_from: skill.type === 'Morph' && skill.base_id ? (catalog.getSkill(skill.base_id)?.skill?.name || null) : null,
          image: null, requires,
          skill_point_cost: ['none', 'class_mastery_point'].includes(skill.currency) ? 0 : (line.group === 'Class' && line.class && line.class !== className ? 2 : 1),
          imported_state: 'owned', imported_rank: skill.type === 'Passive' ? rank : undefined
        }
        rows.push(row)
        priority += 10
        if (skill.type !== 'Morph' && skill.type !== 'Passive') baseRowIdBySkill.set(skill.id, id)
      }
    }
    return rows
  }

  function importedPhase(state, live, gearStageId, requestedId = '') {
    const observed = state.observed || {}
    const weapons = currentWeaponLabels(observed)
    const bars = Array.isArray(observed?.skills?.actionBars) ? observed.skills.actionBars : []
    const frontRaw = bars.find(bar => String(bar?.label || '').toLowerCase() === 'primary') || bars.find(bar => Number(bar?.category) === 0) || bars[0]
    const backRaw = bars.find(bar => String(bar?.label || '').toLowerCase() === 'backup') || bars.find(bar => Number(bar?.category) === 1) || bars[1]
    const front = importedBar(frontRaw, live, weapons.front, 'Current front bar weapon')
    const back = importedBar(backRaw, live, weapons.back, 'Current back bar weapon')
    const level = Math.max(1, Math.min(50, Number(live.level) || 1))
    const phaseId = requestedId || `imported-level-${level}`
    const rotationSteps = front.slots.map(slot => ({ name: slot.name, ...(slot.catalog_skill_id ? { catalog_skill_id: slot.catalog_skill_id } : {}) }))
    return {
      id: phaseId,
      label: `Imported Character State - Level ${level}`,
      min_level: level,
      max_level: level,
      overview: 'A truthful snapshot of the character when imported from ESO. It is the starting point for future planning, not a claim about how the character reached this state.',
      attributes: { magicka: Number(live.attributes?.magicka) || 0, health: Number(live.attributes?.health) || 0, stamina: Number(live.attributes?.stamina) || 0 },
      recommended_gear_stage_ids: [gearStageId],
      milestones: [
        `Imported Character State - Level ${level}`,
        'Skills already owned are known only to have been acquired by the time of import; ATTB does not invent earlier acquisition levels.',
        'Review CURRENT bars, gear, and progression here, then author future TARGET milestones normally.'
      ],
      front_bar: front,
      back_bar: level < 15 ? { ...back, locked: 'Back bar is unavailable before character level 15.' } : back,
      rotation: {
        type: 'priority', title: 'Imported current bar',
        summary: 'Current bar contents captured from ESO. This is not yet an optimized rotation recommendation.',
        opener: [], steps: rotationSteps, execute: [], notes: ['Refine or replace this with the intended target rotation.']
      },
      imported_current: true
    }
  }

  function importedStateExtension(state, live, mode, extra = {}) {
    const champion = state.observed?.champion || {}
    return {
      mode,
      character_name: state.character_name || live.name || 'ESO Character',
      class_name: state.class_name || '',
      race: state.race || live.race || '',
      alliance: state.alliance || live.alliance || '',
      world_name: state.world_name || '',
      level: Number(live.level) || 1,
      captured_at: Number(state.captured_at) || 0,
      attributes: { ...(live.attributes || {}) },
      available_skill_points: Number(live.actual_unspent_skill_points) || 0,
      available_attribute_points: Number(live.actual_unspent_attribute_points) || 0,
      skill_line_ranks: { ...(live.skill_ranks || {}) },
      skill_allocations: { ...(live.skill_allocations || {}) },
      champion_totals: { craft: Number(live.cp_craft) || 0, warfare: Number(live.cp_warfare) || 0, fitness: Number(live.cp_fitness) || 0, earned: Number(champion.totalEarned) || 0 },
      provenance_note: 'Imported from the latest reconciled ESO addon snapshot. Historical acquisition levels before this snapshot are intentionally unknown.',
      ...extra
    }
  }

  function createBuildFromImportedState(state, author = 'NPC', options = {}) {
    const live = state.live || {}
    const className = String(state.class_name || '')
    if (!className) throw new Error('The synced character snapshot does not include a class.')
    const characterName = state.character_name || live.name || className
    const name = String(options.name || '').trim() || `${characterName} - Imported Character Build`
    const shortName = String(options.short_name || '').trim() || `${characterName} Imported`
    const resource = String(options.resource || inferredResource(live.attributes))
    const targetBarCount = Number(options.bar_count || (Number(live.level) >= 15 ? 2 : 1)) === 1 ? 1 : 2
    const buildId = requestedBuildId(name, options.id)
    const championPoints = Number(state.observed?.champion?.totalEarned) || (Number(live.cp_craft) || 0) + (Number(live.cp_warfare) || 0) + (Number(live.cp_fitness) || 0)
    const startingPoint = String(options.starting_point || inferStartingPoint({ level: live.level, championPoints }))
    const weapons = currentWeaponLabels(state.observed)
    const data = createGuidedBuildData({
      id: buildId, name, short_name: shortName, class_name: className,
      race: state.race || live.race, alliance: state.alliance || live.alliance, resource,
      primary_role: String(options.primary_role || 'damage'), starting_point: startingPoint,
      class_style: String(options.class_style || 'pure_class'), bar_count: targetBarCount,
      front_weapon: weapons.front, back_weapon: weapons.back,
      summary: `An editable build draft created from ${characterName}'s current ESO state. Current progression is imported truthfully; future planning is intentionally left for the Build Editor.`
    }, author)
    data.notes = ''
    data.progression_scope = scopeForStartingPoint(startingPoint, startingPoint === 'cp160_plus'
      ? `Designed for ${characterName} as an existing Level 50 / CP160+ character; 1-50 leveling content is intentionally not required.`
      : startingPoint === 'level_50'
        ? `Designed for ${characterName} as an existing Level 50 character transitioning toward CP160 and the authored target.`
        : `Designed for ${characterName} as a character still progressing through levels 1-50.`)
    data.defaults = {
      ...(data.defaults || {}), class: className, race: state.race || live.race || data.defaults?.race, alliance: state.alliance || live.alliance || data.defaults?.alliance,
      attributes: { magicka: Number(live.attributes?.magicka) || 0, health: Number(live.attributes?.health) || 0, stamina: Number(live.attributes?.stamina) || 0 },
      front_weapon: weapons.front, back_weapon: weapons.back, leveling_armor: currentArmorSummary(state.observed),
      endgame_armor: 'Choose a target setup in Build Editor', mundus: 'Choose in Build Editor'
    }
    data.metadata = {
      ...(data.metadata || {}), resource, bar_count: targetBarCount,
      class_style: String(options.class_style || data.metadata?.class_style || 'pure_class'),
      playstyles: [...new Set([...(data.metadata?.playstyles || []), 'imported-character-state'])],
      tags: [...new Set([...(data.metadata?.tags || []), 'imported-character-state'])]
    }
    data.relevant_lines = importedRelevantLines(live, className)
    data.class_configuration = importedClassConfiguration(live, className)
    data.unlock_order = importedUnlockRows(live, className)
    if (!data.unlock_order.length) {
      const starter = normalClassLines(className).flatMap(line => line.skills || []).find(skill => skill.type === 'Active')
      const starterLine = starter ? catalog.getSkill(starter.id)?.line : null
      if (!starter || !starterLine) throw new Error('The synced character has no resolved owned skills and the catalog could not provide a safe starter row.')
      data.unlock_order = [{
        id: slugify(`${starterLine.id}-${starter.name}`), name: starter.name, catalog_skill_id: starter.id, section: starterLine.group, line: starterLine.id,
        required_rank: Number(starter.required_rank) || 1, kind: starter.type, phase: 'Imported', status: 'temporary', priority: 10,
        notes: 'Placeholder starter row required by Schema 4 because this snapshot did not contain resolved owned skills. Review it before saving.', morph_from: null,
        image: null, requires: [], skill_point_cost: 1, imported_state: 'unverified-placeholder'
      }]
    }
    const gear = importedGearStage(state.observed, 'imported-current')
    data.gear_stages = [gear]
    data.phases = [importedPhase(state, live, gear.id)]
    data.cp_plans = importedCpPlans(state.observed)
    data.concepts = [
      { title: 'Imported CURRENT state', text: 'Skills, attributes, bars, equipment, and Champion Point data were populated from the latest reconciled ESO snapshot where available.' },
      { title: 'Author the TARGET next', text: 'This draft intentionally avoids inventing future recommendations. Use the Build Editor to decide where the character should go from here.' }
    ]
    data.tips = ['Review every imported section before saving the first permanent revision.', 'ATTB does not fabricate the level at which pre-import skills or passives were originally acquired.']
    data.extensions = isObj(data.extensions) ? data.extensions : {}
    data.extensions.attb = {
      ...(isObj(data.extensions.attb) ? data.extensions.attb : {}),
      editor_origin: 'character-import',
      imported_character_state: importedStateExtension(state, live, 'create', { imported_phase_id: data.phases[0].id, imported_gear_stage_id: gear.id })
    }
    return data
  }

  function markImportedUnlockStatus(unlockOrder = [], live = {}) {
    const allocations = live.skill_allocations || {}
    const passiveSeen = new Map()
    return unlockOrder.map(row => {
      const hit = row?.catalog_skill_id ? catalog.getSkill(row.catalog_skill_id) : null
      let owned = false
      if (hit?.skill?.type === 'Passive') {
        const nextRank = (passiveSeen.get(row.catalog_skill_id) || 0) + 1
        passiveSeen.set(row.catalog_skill_id, nextRank)
        owned = Number(allocations[row.catalog_skill_id] || 0) >= nextRank
      } else if (row?.catalog_skill_id) owned = Number(allocations[row.catalog_skill_id] || 0) > 0
      const lineRank = Number(live.skill_ranks?.[row.line] || 0)
      const requiredRank = Number(row.required_rank || hit?.skill?.required_rank || 0)
      const importStatus = owned ? 'owned' : lineRank >= requiredRank ? 'catch-up' : 'future'
      return {
        ...row,
        import_status: importStatus,
        imported_at_level: Number(live.level) || 1,
        import_note: owned
          ? 'Confirmed owned in the imported ESO snapshot.'
          : importStatus === 'catch-up'
            ? 'Not owned at import even though the current skill-line rank meets this build row requirement.'
            : 'Target build step that remains ahead of the imported character state.'
      }
    })
  }

  function adaptBuildToImportedState(state, source, sourceData, requestedName, author = 'NPC') {
    const live = state.live
    const data = structuredClone(sourceData)
    const sourceClass = String(data.defaults?.class || source.class_name || '')
    if (state.class_name && sourceClass && catalog.normalizeLineName(state.class_name) !== catalog.normalizeLineName(sourceClass)) {
      throw new Error(`This ${state.class_name} character can only adapt a ${state.class_name} build. The selected target is for ${sourceClass}.`)
    }
    const name = String(requestedName || '').trim() || `${data.name} - ${state.character_name || live.name}`
    data.id = uniqueBuildId(name)
    data.name = name
    data.short_name = name.length > 60 ? name.slice(0, 60).trim() : name
    data.author = String(author || '').trim() || 'NPC'
    const championPoints = Number(state.observed?.champion?.totalEarned) || (Number(live.cp_craft) || 0) + (Number(live.cp_warfare) || 0) + (Number(live.cp_fitness) || 0)
    const startingPoint = inferStartingPoint({ level: live.level, championPoints })
    data.progression_scope = scopeForStartingPoint(startingPoint, startingPoint === 'cp160_plus'
      ? `Adapted for ${state.character_name || live.name || 'this character'} as an existing Level 50 / CP160+ character; 1-50 leveling content is not required for this character-specific fork.`
      : startingPoint === 'level_50'
        ? `Adapted for ${state.character_name || live.name || 'this character'} as an existing Level 50 character transitioning toward CP160.`
        : `Adapted for ${state.character_name || live.name || 'this character'} while still progressing through levels 1-50.`)
    data.relevant_lines = (() => {
      const used = new Set()
      return [...(data.relevant_lines || []), ...importedRelevantLines(live, sourceClass)].filter(line => line?.id && !used.has(line.id) && used.add(line.id))
    })()
    data.unlock_order = markImportedUnlockStatus(data.unlock_order || [], live)
    const usedStageIds = new Set((data.gear_stages || []).map(stage => stage.id))
    const currentStageId = uniqueLocalId('imported-current', usedStageIds)
    const currentGear = importedGearStage(state.observed, currentStageId)
    data.gear_stages = [currentGear, ...(data.gear_stages || [])]
    const usedPhaseIds = new Set((data.phases || []).map(phase => phase.id))
    const importedPhaseId = uniqueLocalId(`imported-level-${Math.max(1, Math.min(50, Number(live.level) || 1))}`, usedPhaseIds)
    const currentPhase = importedPhase(state, live, currentStageId, importedPhaseId)
    data.phases = [currentPhase, ...(data.phases || [])]
    data.extensions = isObj(data.extensions) ? data.extensions : {}
    data.extensions.attb = {
      ...(isObj(data.extensions.attb) ? data.extensions.attb : {}),
      editor_origin: 'character-adaptation',
      forked_from_build_id: source.id,
      forked_from_name: source.name,
      imported_character_state: importedStateExtension(state, live, 'adapt', {
        imported_phase_id: importedPhaseId, imported_gear_stage_id: currentStageId,
        source_build_id: source.id, source_build_name: source.name,
        target_preserved: true
      })
    }
    return { data, source }
  }

  return { createBuildFromImportedState, markImportedUnlockStatus, adaptBuildToImportedState }
}

module.exports = { createCharacterBuildImport }
