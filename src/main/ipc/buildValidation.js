'use strict'
const catalog = require('../catalog')
const { mergeOverrides } = require('../../shared/variantLogic.cjs')
const companionCatalog = require('../../../resources/data/eso-companions.json')
const COMPANION_IDS = new Set((companionCatalog.companions || []).map(row => row.id))

const CURRENT_SCHEMA_VERSION = 4
const CP_TREE_MAX = 1200

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v)
// Ids end up in route paths, so keep them to a slug. A "//evil.com" line id would otherwise become
// a protocol-relative link target.
const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/i
const badId = v => typeof v !== 'string' || !ID_PATTERN.test(v)

function planSections(plan) {
  if (!isObj(plan)) return { core: [], flex: [] }
  const core = Array.isArray(plan.core) ? plan.core : []
  const flex = Array.isArray(plan.flex) ? plan.flex : []
  return { core, flex }
}
function planNodes(plan) {
  const { core, flex } = planSections(plan)
  return [...core, ...flex.flatMap(group => (Array.isArray(group?.nodes) ? group.nodes : []))]
}

function validateCpPlans(data, errors) {
  for (const [tree, plan] of Object.entries(isObj(data.cp_plans) ? data.cp_plans : {})) {
    if (!isObj(plan)) { errors.push(`cp_plans.${tree} must be an object.`); continue }
    const { core, flex } = planSections(plan)
    if (!Array.isArray(plan.core)) { errors.push(`cp_plans.${tree} needs a core array.`); continue }
    if (plan.flex !== undefined && !Array.isArray(plan.flex)) errors.push(`cp_plans.${tree}.flex must be an array.`)

    const nodeIds = new Set()
    const checkNode = (node, where) => {
      if (!isObj(node) || badId(node?.id)) { errors.push(`${where} needs a slug id.`); return }
      if (nodeIds.has(node.id)) errors.push(`Duplicate CP node id "${node.id}" in ${tree}.`)
      nodeIds.add(node.id)
      if (typeof node.name !== 'string' || !node.name.trim()) errors.push(`CP node "${node.id}" needs a name.`)
      const max = Number(node.max_points)
      if (!Number.isInteger(max) || max <= 0) { errors.push(`CP node "${node.id}" needs a positive whole max_points.`); return }
      if (max > CP_TREE_MAX) errors.push(`CP node "${node.id}" max_points ${max} is above the ${CP_TREE_MAX} constellation cap.`)
      if (node.jump_points !== undefined) {
        if (!Array.isArray(node.jump_points)) { errors.push(`CP node "${node.id}" jump_points must be an array.`); return }
        for (const jump of node.jump_points) {
          if (!Number.isInteger(Number(jump)) || Number(jump) <= 0) errors.push(`CP node "${node.id}" has a non-positive stage threshold "${jump}".`)
          else if (Number(jump) > max) errors.push(`CP node "${node.id}" has stage threshold ${jump} above its own max_points of ${max}.`)
        }
      }
      if (node.slottable !== undefined && typeof node.slottable !== 'boolean') errors.push(`CP node "${node.id}" slottable must be true or false.`)
    }

    core.forEach((node, i) => checkNode(node, `cp_plans.${tree}.core[${i}]`))
    const groupIds = new Set()
    flex.forEach((group, gi) => {
      if (!isObj(group) || badId(group?.id)) { errors.push(`cp_plans.${tree}.flex[${gi}] needs a slug id.`); return }
      if (groupIds.has(group.id)) errors.push(`Duplicate CP flex group "${group.id}" in ${tree}.`)
      groupIds.add(group.id)
      if (typeof group.label !== 'string' || !group.label.trim()) errors.push(`cp_plans.${tree}.flex "${group.id}" needs a label.`)
      if (group.optional !== undefined && typeof group.optional !== 'boolean') errors.push(`cp_plans.${tree}.flex "${group.id}" optional must be true or false.`)
      if (!Array.isArray(group.nodes) || !group.nodes.length) { errors.push(`cp_plans.${tree}.flex "${group.id}" needs a non-empty nodes array.`); return }
      group.nodes.forEach((node, i) => checkNode(node, `cp_plans.${tree}.flex.${group.id}[${i}]`))
    })

    const coreTotal = core.reduce((sum, node) => sum + (Number(node?.max_points) || 0), 0)
    if (coreTotal > CP_TREE_MAX) errors.push(`cp_plans.${tree} core path needs ${coreTotal} points, which no character can reach (the cap is ${CP_TREE_MAX} per constellation).`)
    const finalSlots = Array.isArray(plan.final_slots) ? plan.final_slots : []
    if (plan.final_slots !== undefined && !Array.isArray(plan.final_slots)) errors.push(`cp_plans.${tree}.final_slots must be an array.`)
    if (finalSlots.length > 4) errors.push(`cp_plans.${tree}.final_slots can contain no more than four stars.`)
    if (new Set(finalSlots).size !== finalSlots.length) errors.push(`cp_plans.${tree}.final_slots must not contain duplicate stars.`)
    for (const slot of finalSlots) {
      if (badId(slot)) errors.push(`cp_plans.${tree}.final_slots contains an invalid star id.`)
      else if (!nodeIds.has(slot)) errors.push(`cp_plans.${tree}.final_slots lists "${slot}", which is not one of its nodes.`)
    }
    validateCpGraph(plan, tree, errors)
    for (const node of planNodes(plan)) {
      if (isObj(node) && finalSlots.includes(node.id) && node.slottable !== true) {
        errors.push(`cp_plans.${tree}.final_slots lists "${node.id}", which must explicitly set slottable to true.`)
      }
    }
  }
}

function validateAttributes(attributes, where, errors) {
  if (attributes === undefined) return
  if (!isObj(attributes)) { errors.push(`${where} must be an object.`); return }
  let total = 0
  for (const key of ['magicka', 'health', 'stamina']) {
    const value = attributes[key]
    if (value === undefined) continue
    if (!Number.isInteger(Number(value)) || Number(value) < 0) { errors.push(`${where}.${key} must be a whole number of 0 or more.`); continue }
    total += Number(value)
  }
  for (const key of Object.keys(attributes)) {
    if (!['magicka', 'health', 'stamina'].includes(key)) errors.push(`${where} has unknown attribute "${key}".`)
  }
  if (total > 64) errors.push(`${where} totals ${total} points, but a character only ever has 64.`)
}


function deriveMetadata(data) {
  const attrs = data.defaults?.attributes || {}
  const resource = Number(attrs.stamina) > Number(attrs.magicka) ? 'stamina' : Number(attrs.magicka) > 0 ? 'magicka' : 'hybrid'
  return {
    roles: ['solo', 'damage'],
    content: ['overland', 'dungeons', 'arenas'],
    group_sizes: ['solo', 'duo', '4-player'],
    resource,
    bar_count: 2,
    class_style: 'pure_class',
    playstyles: ['flexible-pve'],
    difficulty: ['normal', 'veteran'],
    platforms: ['PC', 'Xbox', 'PlayStation'],
    language: 'en',
    tags: []
  }
}

function deriveClassConfiguration(data) {
  const baseClass = String(data.defaults?.class || '')
  const catalogLines = (catalog.getCatalog().lines || []).filter(line => line.group === 'Class' && line.class === baseClass && !/mastery/i.test(line.name))
  const preferred = (data.relevant_lines || []).map(row => catalog.getLine(row.id)).filter(line => catalogLines.some(candidate => candidate.id === line?.id))
  const lines = [...preferred, ...catalogLines.filter(line => !preferred.some(candidate => candidate.id === line.id))].slice(0, 3)
  const masteryLine = (catalog.getCatalog().lines || []).find(line => line.group === 'Class' && line.class === baseClass && /mastery/i.test(line.name))
  const choices = (data.unlock_order || []).filter(row => row.line === masteryLine?.id && row.status === 'final').map(row => row.catalog_skill_id).filter(Boolean).slice(0, 2)
  return {
    base_class: baseClass,
    active_class_lines: lines.map(line => ({ line_id: line.id, source_class: baseClass, mode: 'native' })),
    class_mastery: { enabled: choices.length > 0, points_available: 2, choices, notes: [] },
    notes: []
  }
}

function normalizeCatalogRows(data) {
  if (!Array.isArray(data.unlock_order)) return false
  let changed = false
  if (!Array.isArray(data.relevant_lines)) data.relevant_lines = []
  const relevantIds = new Set(data.relevant_lines.map(line => line?.id).filter(Boolean))

  for (const row of data.unlock_order) {
    if (!isObj(row) || !row.catalog_skill_id) continue
    const hit = catalog.getSkill(row.catalog_skill_id)
    if (!hit) continue
    const { line, skill } = hit
    const moved = row.line !== line.id
    if (moved) {
      row.line = line.id
      row.name = skill.name
      if (skill.required_rank !== null && skill.required_rank !== undefined) row.required_rank = Number(skill.required_rank)
      changed = true
    } else if (['Active', 'Ultimate', 'Morph', 'Scribing'].includes(skill.type)) {
      // Ability names/ranks are game facts, not build preferences; keep old files aligned to the live catalog.
      if (row.name !== skill.name) {
        row.name = skill.name
        changed = true
      }
      if (skill.required_rank !== null && skill.required_rank !== undefined
          && Number(row.required_rank) !== Number(skill.required_rank)) {
        row.required_rank = Number(skill.required_rank)
        changed = true
      }
    }
    if (['none', 'class_mastery_point'].includes(skill.currency) && row.skill_point_cost !== 0) {
      row.skill_point_cost = 0
      changed = true
    }
    if (!relevantIds.has(line.id)) {
      data.relevant_lines.push({ id: line.id, name: line.name, max: Number(line.max_rank) || 50, group: line.group })
      relevantIds.add(line.id)
      changed = true
    }
  }
  return changed
}

function normalizeOptionalSections(data) {
  if (!data.metadata) data.metadata = deriveMetadata(data)
  if (!data.class_configuration) data.class_configuration = deriveClassConfiguration(data)
  if (!Array.isArray(data.relevant_lines)) data.relevant_lines = []
  const relevantIds = new Set(data.relevant_lines.map(line => line?.id).filter(Boolean))
  for (const selection of data.class_configuration?.active_class_lines || []) {
    if (!selection?.line_id || relevantIds.has(selection.line_id)) continue
    const line = catalog.getLine(selection.line_id)
    if (!line) continue
    data.relevant_lines.push({ id: line.id, name: line.name, max: Number(line.max) || 50, group: line.group })
    relevantIds.add(line.id)
  }
  if (!data.transformations) data.transformations = { curse: data.defaults?.curse || 'none', notes: [] }
  for (const key of ['requirements', 'scribed_skills', 'quickslots', 'companions', 'sources', 'loadouts']) if (!Array.isArray(data[key])) data[key] = []
  if (!isObj(data.extensions)) data.extensions = {}
  if (typeof data.default_loadout_id !== 'string') data.default_loadout_id = data.loadouts[0]?.id || ''
  return data
}

function validateMetadata(data, errors) {
  const metadata = data.metadata
  if (!isObj(metadata)) { errors.push('metadata must be an object.'); return }
  for (const key of ['roles', 'content']) if (!Array.isArray(metadata[key]) || !metadata[key].length) errors.push(`metadata.${key} must be a non-empty array.`)
  if (typeof metadata.resource !== 'string' || !metadata.resource.trim()) errors.push('metadata.resource is required.')
  if (![1, 2].includes(Number(metadata.bar_count))) errors.push('metadata.bar_count must be 1 or 2.')
  if (typeof metadata.class_style !== 'string' || !metadata.class_style.trim()) errors.push('metadata.class_style is required.')
}

function validateClassConfiguration(data, errors) {
  const cfg = data.class_configuration
  if (!isObj(cfg)) { errors.push('class_configuration must be an object.'); return }
  const baseClass = String(cfg.base_class || '')
  if (!baseClass) errors.push('class_configuration.base_class is required.')
  if (baseClass && data.defaults?.class && baseClass !== data.defaults.class) errors.push('class_configuration.base_class must match defaults.class.')
  const rows = Array.isArray(cfg.active_class_lines) ? cfg.active_class_lines : []
  if (rows.length !== 3) errors.push('class_configuration.active_class_lines must contain exactly three class skill lines.')
  const ids = new Set(), foreignClasses = new Set()
  let nativeCount = 0, usesSubclassing = false
  for (const [i, row] of rows.entries()) {
    if (!isObj(row) || badId(row?.line_id)) { errors.push(`class_configuration.active_class_lines[${i}] needs a valid line_id.`); continue }
    if (ids.has(row.line_id)) errors.push(`class_configuration repeats class line "${row.line_id}".`)
    ids.add(row.line_id)
    const line = catalog.getLine(row.line_id)
    if (!line || line.group !== 'Class' || /mastery/i.test(line.name)) errors.push(`class_configuration line "${row.line_id}" is not a normal class skill line.`)
    if (line && row.source_class !== line.class) errors.push(`class_configuration line "${row.line_id}" source_class must be "${line.class}".`)
    if (!['native', 'mastered', 'subclassing'].includes(row.mode)) errors.push(`class_configuration line "${row.line_id}" mode must be native, mastered, or subclassing.`)
    if (row.mode === 'native') {
      if (row.source_class !== baseClass) errors.push(`class_configuration line "${row.line_id}" cannot be native because it belongs to ${row.source_class || 'another class'}.`)
      else nativeCount += 1
    } else {
      usesSubclassing = true
      if (row.source_class === baseClass) errors.push(`class_configuration line "${row.line_id}" belongs to the base class and should use mode "native".`)
      if (row.source_class && row.source_class !== baseClass) {
        if (foreignClasses.has(row.source_class)) errors.push(`class_configuration cannot use two lines from foreign class "${row.source_class}".`)
        foreignClasses.add(row.source_class)
      }
    }
  }
  if (!nativeCount) errors.push('class_configuration must retain at least one native skill line from the base class.')
  const mastery = cfg.class_mastery
  if (!isObj(mastery) || typeof mastery.enabled !== 'boolean' || !Array.isArray(mastery.choices)) errors.push('class_configuration.class_mastery needs enabled and choices fields.')
  else {
    const pointsAvailable = mastery.points_available === undefined ? 2 : Number(mastery.points_available)
    if (!Number.isInteger(pointsAvailable) || pointsAvailable < 0) errors.push('class_configuration.class_mastery.points_available must be a whole number of 0 or more.')
    if (mastery.choices.length > Math.max(0, Number.isInteger(pointsAvailable) ? pointsAvailable : 0)) errors.push('class_configuration.class_mastery lists more choices than points_available.')
    if (new Set(mastery.choices).size !== mastery.choices.length) errors.push('class_configuration.class_mastery choices must be unique.')
    if (usesSubclassing && mastery.enabled) errors.push('Class Mastery cannot be enabled while a build uses subclassing or mastered foreign class lines.')
    const masteryLine = (catalog.getCatalog().lines || []).find(line => line.group === 'Class' && line.class === baseClass && /mastery/i.test(line.name))
    for (const skillId of mastery.choices) {
      const hit = catalog.getSkill(skillId)
      if (!hit || hit.line?.id !== masteryLine?.id) errors.push(`Class Mastery choice "${skillId}" is not a ${baseClass} mastery passive.`)
    }
    if (mastery.enabled && !mastery.choices.length) errors.push('Enabled Class Mastery must select at least one passive.')
    if (!mastery.enabled && mastery.choices.length) errors.push('Disabled Class Mastery cannot list active choices.')
  }
}

function validateScribedSkills(data, errors) {
  const rows = Array.isArray(data.scribed_skills) ? data.scribed_skills : []
  const ids = new Set()
  for (const [i, row] of rows.entries()) {
    if (!isObj(row) || badId(row?.id)) { errors.push(`scribed_skills[${i}] needs a slug id.`); continue }
    if (ids.has(row.id)) errors.push(`Duplicate scribed skill id "${row.id}".`)
    ids.add(row.id)
    for (const key of ['name', 'grimoire', 'focus_script', 'signature_script', 'affix_script']) if (typeof row[key] !== 'string' || !row[key].trim()) errors.push(`scribed skill "${row.id}" needs ${key}.`)
    if (row.grimoire_catalog_skill_id) {
      const hit = catalog.getSkill(row.grimoire_catalog_skill_id)
      if (!hit || hit.skill?.type !== 'Scribing') errors.push(`scribed skill "${row.id}" grimoire_catalog_skill_id is not a Scribing Grimoire in the bundled catalog.`)
    }
  }
  return ids
}

function validateCpGraph(plan, tree, errors) {
  const nodes = planNodes(plan).filter(isObj)
  const ids = new Set(nodes.map(node => node.id))
  for (const node of nodes) for (const req of (Array.isArray(node.requires) ? node.requires : [])) if (!ids.has(req)) errors.push(`CP node "${node.id}" in ${tree} requires unknown node "${req}".`)
  const state = new Map()
  const walk = id => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'open') { errors.push(`CP plan ${tree} has a circular requires path involving "${id}".`); return }
    state.set(id, 'open')
    const node = nodes.find(item => item.id === id)
    for (const req of node?.requires || []) walk(req)
    state.set(id, 'done')
  }
  for (const id of ids) walk(id)
}

function normalizeDisplaySections(effective) {
  for (const key of ['tips', 'concepts', 'requirements', 'scribed_skills', 'quickslots', 'companions', 'sources']) if (effective[key] === null) effective[key] = []
  if (effective.consumables === null) delete effective.consumables
  return effective
}

function effectiveSelectionForValidation(data, loadout = null, variant = null) {
  let effective = structuredClone(data)
  if (isObj(loadout?.overrides)) effective = mergeOverrides(effective, loadout.overrides)
  if (isObj(variant?.overrides)) effective = mergeOverrides(effective, variant.overrides)
  effective.id = data.id
  effective.loadouts = []
  effective.default_loadout_id = ''
  effective.variants = []
  delete effective.active_loadout
  delete effective.active_variant
  return normalizeDisplaySections(effective)
}


function validateCompanions(data, errors) {
  if (data.companions === undefined) return
  if (!Array.isArray(data.companions)) return
  const ids = new Set()
  for (const [index, row] of data.companions.entries()) {
    const where = `companions[${index}]`
    if (!isObj(row)) { errors.push(`${where} must be an object.`); continue }
    if (badId(row.id)) errors.push(`${where} needs a slug id.`)
    else if (ids.has(row.id)) errors.push(`Duplicate companion setup id "${row.id}".`)
    else ids.add(row.id)
    if (typeof row.name !== 'string' || !row.name.trim()) errors.push(`${where} needs a name.`)
    if (typeof row.role !== 'string' || !row.role.trim()) errors.push(`${where} needs a role.`)
    if (row.companion_id !== undefined) {
      if (badId(row.companion_id)) errors.push(`${where}.companion_id must be a slug when present.`)
      else if (!COMPANION_IDS.has(row.companion_id)) errors.push(`${where}.companion_id "${row.companion_id}" is not in the bundled companion catalog.`)
    }
    if (row.companion_name !== undefined && typeof row.companion_name !== 'string') errors.push(`${where}.companion_name must be a string when present.`)
    if (row.summary !== undefined && typeof row.summary !== 'string') errors.push(`${where}.summary must be a string when present.`)
    for (const field of ['weapon', 'armor_weight', 'weapon_trait', 'armor_trait', 'jewelry_trait', 'ultimate', 'preset_id', 'source_url']) {
      if (row[field] !== undefined && typeof row[field] !== 'string') errors.push(`${where}.${field} must be a string when present.`)
    }
    if (row.skills !== undefined) {
      if (!Array.isArray(row.skills)) errors.push(`${where}.skills must be an array.`)
      else {
        if (row.skills.length > 5) errors.push(`${where}.skills can contain no more than five normal companion abilities; ultimate is separate.`)
        const clean = row.skills.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())
        if (clean.length !== row.skills.length) errors.push(`${where}.skills must contain only non-empty strings.`)
        if (new Set(clean.map(value => value.toLowerCase())).size !== clean.length) errors.push(`${where}.skills must not contain duplicate abilities.`)
      }
    }
    for (const field of ['equipment', 'notes']) {
      if (row[field] !== undefined && (!Array.isArray(row[field]) || row[field].some(value => typeof value !== 'string' || !value.trim()))) {
        errors.push(`${where}.${field} must be an array of non-empty strings when present.`)
      }
    }
  }
}

function validateBuild(data, options = {}) {
  const errors = []
  if (!isObj(data)) return ['Root must be a JSON object.']

  const schema = Number(data.schema_version) || 0
  if (schema !== CURRENT_SCHEMA_VERSION) errors.push(`schema_version must be ${CURRENT_SCHEMA_VERSION}. Use normalizeBuild to migrate a supported older format first.`)
  if (badId(data.id)) errors.push('Missing id, or it is not a simple slug (letters, numbers, dot, dash, underscore).')
  validateMetadata(data, errors)
  validateClassConfiguration(data, errors)
  if (typeof data.name !== 'string' || !data.name.trim()) errors.push('Missing or non-string name.')
  if (data.notes !== undefined) {
    if (typeof data.notes !== 'string') errors.push('notes must be a string when present.')
    else if (data.notes.length > 20000) errors.push('notes must be 20,000 characters or fewer.')
  }
  if (!isObj(data.defaults)) errors.push('Missing defaults object.')
  else {
    if (!data.defaults.class) errors.push('Missing defaults.class.')
    validateAttributes(data.defaults.attributes, 'defaults.attributes', errors)
  }
  if (!Array.isArray(data.relevant_lines) || !data.relevant_lines.length) errors.push('relevant_lines must be a non-empty array.')
  if (!isObj(data.cp_plans)) errors.push('cp_plans must be an object.')
  else for (const tree of ['craft', 'warfare', 'fitness']) {
    if (!isObj(data.cp_plans[tree])) errors.push(`cp_plans.${tree} must be an object.`)
  }
  if (!Array.isArray(data.unlock_order) || !data.unlock_order.length) errors.push('unlock_order must be a non-empty array.')
  if (!Array.isArray(data.gear_stages) || !data.gear_stages.length) errors.push('gear_stages must be a non-empty array.')
  // Phases drive the Skill Bars and Rotations page. A build with none renders an empty page, so
  // require at least one rather than letting it slip through as valid.
  if (!Array.isArray(data.phases) || !data.phases.length) errors.push('phases must be a non-empty array. Every build needs at least one progression phase with hotbars and a rotation.')
  for (const key of ['phases', 'tips', 'concepts', 'variants']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) errors.push(`${key} must be an array when present.`)
  }
  if (data.consumables !== undefined && !isObj(data.consumables)) errors.push('consumables must be an object when present.')
  for (const key of ['requirements', 'scribed_skills', 'quickslots', 'companions', 'sources', 'loadouts']) if (data[key] !== undefined && !Array.isArray(data[key])) errors.push(`${key} must be an array when present.`)
  const scribedIds = validateScribedSkills(data, errors)
  validateCompanions(data, errors)

  const lineIds = new Set()
  for (const [i, line] of (Array.isArray(data.relevant_lines) ? data.relevant_lines : []).entries()) {
    if (!isObj(line) || badId(line?.id)) { errors.push(`relevant_lines[${i}] needs a slug id.`); continue }
    if (lineIds.has(line.id)) errors.push(`Duplicate relevant_lines id "${line.id}".`)
    lineIds.add(line.id)
    if (typeof line.name !== 'string' || !line.name.trim()) errors.push(`relevant_lines "${line.id}" needs a name.`)
    if (!catalog.getLine(line.id)) errors.push(`relevant_lines "${line.id}" is not a skill line in the bundled catalog.`)
  }

  for (const selection of (data.class_configuration?.active_class_lines || [])) {
    if (selection?.line_id && !lineIds.has(selection.line_id)) {
      errors.push(`class_configuration line "${selection.line_id}" must also appear in relevant_lines.`)
    }
  }

  const items = Array.isArray(data.unlock_order) ? data.unlock_order : []
  const seen = new Set()
  const resolved = new Map()
  for (const [i, item] of items.entries()) {
    if (!isObj(item) || badId(item?.id)) { errors.push(`unlock_order[${i}] needs a slug id.`); continue }
    if (seen.has(item.id)) errors.push(`Duplicate unlock_order id "${item.id}".`)
    seen.add(item.id)
    if (typeof item.name !== 'string' || !item.name.trim()) errors.push(`unlock_order "${item.id}" needs a name.`)
    if (badId(item.line)) errors.push(`unlock_order "${item.id}" needs a valid line id.`)
    if (item.requires !== undefined && !Array.isArray(item.requires)) errors.push(`unlock_order "${item.id}" requires must be an array.`)
    if (item.line && !lineIds.has(item.line)) errors.push(`unlock_order "${item.id}" points at skill line "${item.line}", which is not in relevant_lines.`)
    if (item.required_rank !== undefined && (!Number.isInteger(Number(item.required_rank)) || Number(item.required_rank) < 0)) {
      errors.push(`unlock_order "${item.id}" required_rank must be a whole number of 0 or more.`)
    }
    if (!item.catalog_skill_id && !item.scribed_skill_id) errors.push(`unlock_order "${item.id}" needs catalog_skill_id or scribed_skill_id.`)
    if (item.scribed_skill_id) {
      if (!scribedIds.has(item.scribed_skill_id)) errors.push(`unlock_order "${item.id}" references unknown scribed skill "${item.scribed_skill_id}".`)
      if (item.catalog_skill_id) errors.push(`unlock_order "${item.id}" should not set both catalog_skill_id and scribed_skill_id.`)
    } else {
      const hit = catalog.resolveUnlockRow(item)
      if (hit.error) errors.push(hit.error)
      else {
        resolved.set(item.id, hit)
        const selection = (data.class_configuration?.active_class_lines || []).find(row => row.line_id === item.line)
        if (selection && selection.mode !== 'native' && Number(item.skill_point_cost) !== 2) errors.push(`unlock_order "${item.id}" belongs to a foreign class line and must set skill_point_cost to 2.`)
      }
    }
    if (item.skill_point_cost !== undefined && (!Number.isInteger(Number(item.skill_point_cost)) || Number(item.skill_point_cost) < 0)) errors.push(`unlock_order "${item.id}" skill_point_cost must be a whole number of 0 or more.`)
    if (item.retire_when !== undefined) {
      const rule = item.retire_when
      if (item.status !== 'temporary') errors.push(`unlock_order "${item.id}" retire_when is only valid for temporary unlocks.`)
      if (!isObj(rule)) errors.push(`unlock_order "${item.id}" retire_when must be an object.`)
      else if (!['character_level', 'skill_line_rank', 'unlock_completed'].includes(rule.type)) errors.push(`unlock_order "${item.id}" retire_when.type is not supported.`)
      else if (rule.type === 'character_level' && (!Number.isInteger(Number(rule.level)) || Number(rule.level) < 1 || Number(rule.level) > 50)) errors.push(`unlock_order "${item.id}" character-level retirement must use a whole level from 1 to 50.`)
      else if (rule.type === 'skill_line_rank') {
        if (badId(rule.line)) errors.push(`unlock_order "${item.id}" skill-line retirement needs a valid line id.`)
        else if (!lineIds.has(rule.line)) errors.push(`unlock_order "${item.id}" retirement line "${rule.line}" is not in relevant_lines.`)
        if (!Number.isInteger(Number(rule.rank)) || Number(rule.rank) < 1 || Number(rule.rank) > 50) errors.push(`unlock_order "${item.id}" skill-line retirement rank must be a whole number from 1 to 50.`)
      } else if (rule.type === 'unlock_completed' && badId(rule.unlock_id)) errors.push(`unlock_order "${item.id}" replacement retirement needs a valid unlock_id.`)
    }
  }

  for (const item of items) {
    for (const req of (Array.isArray(item?.requires) ? item.requires : [])) {
      if (!seen.has(req)) errors.push(`unlock_order "${item.id}" requires "${req}", which does not exist.`)
    }
    if (item?.retire_when?.type === 'unlock_completed') {
      if (!seen.has(item.retire_when.unlock_id)) errors.push(`unlock_order "${item.id}" retires after "${item.retire_when.unlock_id}", which does not exist.`)
      else if (item.retire_when.unlock_id === item.id) errors.push(`unlock_order "${item.id}" cannot retire itself.`)
    }
  }
  for (const cycle of findRequireCycles(items)) errors.push(`unlock_order has a circular requires chain: ${cycle.join(' -> ')}.`)

  validateMorphsAndPassives(items, resolved, errors)
  validateCpPlans(data, errors)

  const stageIds = new Set()
  for (const [i, stage] of (Array.isArray(data.gear_stages) ? data.gear_stages : []).entries()) {
    if (!isObj(stage) || badId(stage?.id)) { errors.push(`gear_stages[${i}] needs a slug id.`); continue }
    if (stageIds.has(stage.id)) errors.push(`Duplicate gear_stages id "${stage.id}".`)
    stageIds.add(stage.id)
    if (typeof stage.name !== 'string' || !stage.name.trim()) errors.push(`gear_stages "${stage.id}" needs a name.`)
    if (!Array.isArray(stage.sets) || !stage.sets.length) { errors.push(`gear_stages "${stage.id}" sets must be a non-empty array.`); continue }
    const setIds = new Set(), pieceIds = new Set()
    for (const [setIndex, set] of stage.sets.entries()) {
      if (!isObj(set) || badId(set?.id)) { errors.push(`gear_stages "${stage.id}" sets[${setIndex}] needs a slug id.`); continue }
      if (setIds.has(set.id)) errors.push(`gear_stages "${stage.id}" has duplicate set id "${set.id}".`)
      setIds.add(set.id)
      if (typeof set.name !== 'string' || !set.name.trim()) errors.push(`gear set "${set.id}" needs a name.`)
      if (!isObj(set.source)) errors.push(`gear set "${set.id}" needs a source object.`)
      else {
        if (typeof set.source.type !== 'string' || !set.source.type.trim()) errors.push(`gear set "${set.id}" source.type is required.`)
        if (typeof set.source.location !== 'string' || !set.source.location.trim()) errors.push(`gear set "${set.id}" source.location is required.`)
      }
      if (!Array.isArray(set.pieces) || !set.pieces.length) { errors.push(`gear set "${set.id}" needs a non-empty pieces array.`); continue }
      for (const piece of set.pieces) {
        if (!isObj(piece) || badId(piece?.id)) { errors.push(`gear set "${set.id}" has a piece without a slug id.`); continue }
        if (pieceIds.has(piece.id)) errors.push(`gear_stages "${stage.id}" has duplicate piece id "${piece.id}".`)
        pieceIds.add(piece.id)
        if (typeof piece.slot !== 'string' || !piece.slot.trim()) errors.push(`gear piece "${piece.id}" needs a slot.`)
      }
    }
  }

  const phaseIds = new Set()
  for (const [i, phase] of (Array.isArray(data.phases) ? data.phases : []).entries()) {
    if (!isObj(phase) || badId(phase?.id)) { errors.push(`phases[${i}] needs a slug id.`); continue }
    if (phaseIds.has(phase.id)) errors.push(`Duplicate phases id "${phase.id}".`)
    phaseIds.add(phase.id)
    const minLevel = Number(phase.min_level), maxLevel = Number(phase.max_level)
    if (!Number.isInteger(minLevel) || minLevel < 1 || minLevel > 50) errors.push(`phase "${phase.id}" min_level must be a whole character level from 1 to 50.`)
    if (!Number.isInteger(maxLevel) || maxLevel < minLevel || maxLevel > 9999) errors.push(`phase "${phase.id}" max_level must be a whole progression value from min_level through 9999.`)
    for (const barKey of ['front_bar', 'back_bar']) {
      const bar = phase[barKey]
      if (!isObj(bar)) { errors.push(`phase "${phase.id}" needs ${barKey}.`); continue }
      if (!Array.isArray(bar.slots) || bar.slots.length > 5) errors.push(`phase "${phase.id}" ${barKey}.slots must be an array of no more than five skills.`)
      for (const [slotIndex, slot] of (Array.isArray(bar.slots) ? bar.slots : []).entries()) {
        if (!isObj(slot) || typeof slot.name !== 'string' || !slot.name.trim()) errors.push(`phase "${phase.id}" ${barKey}.slots[${slotIndex}] needs a name.`)
        if (slot?.catalog_skill_id && !catalog.getSkill(slot.catalog_skill_id)) errors.push(`phase "${phase.id}" references unknown skill "${slot.catalog_skill_id}".`)
        if (slot?.scribed_skill_id && !scribedIds.has(slot.scribed_skill_id)) errors.push(`phase "${phase.id}" references unknown scribed skill "${slot.scribed_skill_id}".`)
      }
      if (bar.ultimate !== null && bar.ultimate !== undefined && !isObj(bar.ultimate)) errors.push(`phase "${phase.id}" ${barKey}.ultimate must be an object or null.`)
      if (isObj(bar.ultimate) && (typeof bar.ultimate.name !== 'string' || !bar.ultimate.name.trim())) errors.push(`phase "${phase.id}" ${barKey}.ultimate needs a name.`)
      if (bar.ultimate?.catalog_skill_id && !catalog.getSkill(bar.ultimate.catalog_skill_id)) errors.push(`phase "${phase.id}" references unknown ultimate "${bar.ultimate.catalog_skill_id}".`)
      if (bar.ultimate?.scribed_skill_id && !scribedIds.has(bar.ultimate.scribed_skill_id)) errors.push(`phase "${phase.id}" references unknown scribed ultimate "${bar.ultimate.scribed_skill_id}".`)
    }
    validateAttributes(phase.attributes, `phase "${phase.id}" attributes`, errors)
    if (phase.recommended_gear_stage_ids !== undefined) {
      if (!Array.isArray(phase.recommended_gear_stage_ids)) errors.push(`phase "${phase.id}" recommended_gear_stage_ids must be an array.`)
      else {
        if (new Set(phase.recommended_gear_stage_ids).size !== phase.recommended_gear_stage_ids.length) errors.push(`phase "${phase.id}" recommended_gear_stage_ids must not contain duplicates.`)
        for (const stageId of phase.recommended_gear_stage_ids) {
          if (badId(stageId)) errors.push(`phase "${phase.id}" has an invalid recommended gear stage id.`)
          else if (!stageIds.has(stageId)) errors.push(`phase "${phase.id}" references unknown gear stage "${stageId}".`)
        }
      }
    }
    if (phase.milestones !== undefined && (!Array.isArray(phase.milestones) || phase.milestones.some(item => typeof item !== 'string' || !item.trim()))) {
      errors.push(`phase "${phase.id}" milestones must be an array of non-empty strings.`)
    }
    if (!isObj(phase.rotation)) errors.push(`phase "${phase.id}" needs a rotation object.`)
    else {
      if (!['sequence', 'priority'].includes(phase.rotation.type)) errors.push(`phase "${phase.id}" rotation.type must be sequence or priority.`)
      if (!Array.isArray(phase.rotation.steps)) errors.push(`phase "${phase.id}" rotation.steps must be an array.`)
      else for (const [stepIndex, step] of phase.rotation.steps.entries()) {
        if (!isObj(step) || typeof step.name !== 'string' || !step.name.trim()) errors.push(`phase "${phase.id}" rotation.steps[${stepIndex}] needs a name.`)
        if (step?.catalog_skill_id && !catalog.getSkill(step.catalog_skill_id)) errors.push(`phase "${phase.id}" rotation references unknown skill "${step.catalog_skill_id}".`)
        if (step?.scribed_skill_id && !scribedIds.has(step.scribed_skill_id)) errors.push(`phase "${phase.id}" rotation references unknown scribed skill "${step.scribed_skill_id}".`)
      }
      for (const key of ['opener', 'execute', 'notes']) {
        if (phase.rotation[key] !== undefined && !Array.isArray(phase.rotation[key])) errors.push(`phase "${phase.id}" rotation.${key} must be an array when present.`)
      }
    }
  }

  const loadoutIds = new Set()
  for (const [i, loadout] of (Array.isArray(data.loadouts) ? data.loadouts : []).entries()) {
    if (!isObj(loadout) || badId(loadout?.id)) { errors.push(`loadouts[${i}] needs a slug id.`); continue }
    if (loadoutIds.has(loadout.id)) errors.push(`Duplicate loadout id "${loadout.id}".`)
    loadoutIds.add(loadout.id)
    if (typeof loadout.name !== 'string' || !loadout.name.trim()) errors.push(`loadout "${loadout.id}" needs a name.`)
    if (!isObj(loadout.overrides)) errors.push(`loadout "${loadout.id}" overrides must be an object.`)
    if (loadout.available === false && !loadout.unavailable_reason) errors.push(`loadout "${loadout.id}" is unavailable but gives no unavailable_reason.`)
    if (isObj(loadout.overrides)) {
      for (const key of ['id', 'schema_version', 'loadouts', 'default_loadout_id']) if (loadout.overrides[key] !== undefined) errors.push(`loadout "${loadout.id}" must not override ${key}.`)
      validateAttributes(loadout.overrides.defaults?.attributes, `loadout "${loadout.id}" overrides.defaults.attributes`, errors)
      if (options.validateLoadouts !== false && loadout.available !== false) {
        const effective = effectiveSelectionForValidation(data, loadout)
        const nested = validateBuild(effective, { validateVariants: false, validateLoadouts: false })
        errors.push(...nested.map(error => `loadout "${loadout.id}" effective build: ${error}`))
      }
    }
  }
  if (loadoutIds.size && !data.default_loadout_id) errors.push('default_loadout_id is required when loadouts are present.')
  if (data.default_loadout_id && !loadoutIds.has(data.default_loadout_id)) errors.push(`default_loadout_id "${data.default_loadout_id}" does not exist in loadouts.`)
  const defaultLoadout = (data.loadouts || []).find(loadout => loadout.id === data.default_loadout_id)
  if (defaultLoadout?.available === false) errors.push('default_loadout_id cannot point to an unavailable loadout.')

  const baseErrorCount = errors.length
  const variantIds = new Set()
  for (const [i, variant] of (Array.isArray(data.variants) ? data.variants : []).entries()) {
    if (!isObj(variant) || badId(variant?.id)) { errors.push(`variants[${i}] needs a slug id.`); continue }
    if (variantIds.has(variant.id)) errors.push(`Duplicate variants id "${variant.id}".`)
    variantIds.add(variant.id)
    if (typeof variant.name !== 'string' || !variant.name.trim()) errors.push(`variants "${variant.id}" needs a name.`)
    // An array here silently replaces the whole build once it is merged, so reject it loudly.
    if (variant.overrides !== undefined && variant.overrides !== null && !isObj(variant.overrides)) {
      errors.push(`variants "${variant.id}" overrides must be an object or null.`)
    }
    if (Array.isArray(variant.loadout_ids)) for (const loadoutId of variant.loadout_ids) if (!loadoutIds.has(loadoutId)) errors.push(`variants "${variant.id}" references unknown loadout "${loadoutId}".`)
    if (variant.available === false && !variant.unavailable_reason) {
      errors.push(`variants "${variant.id}" is marked unavailable but gives no unavailable_reason.`)
    }
    if (isObj(variant.overrides)) {
      const variantErrorStart = errors.length
      validateAttributes(variant.overrides.defaults?.attributes, `variants "${variant.id}" overrides.defaults.attributes`, errors)
      for (const key of ['id', 'schema_version', 'loadouts', 'default_loadout_id', 'variants']) {
        if (variant.overrides[key] !== undefined) errors.push(`variant "${variant.id}" must not override ${key}.`)
      }

      if (options.validateVariants !== false && variant.available !== false && baseErrorCount === 0
          && errors.length === variantErrorStart && Object.keys(variant.overrides).length) {
        const available = (data.loadouts || []).filter(loadout => loadout?.available !== false)
        const requested = Array.isArray(variant.loadout_ids) && variant.loadout_ids.length
          ? available.filter(loadout => variant.loadout_ids.includes(loadout.id))
          : available
        const targets = requested.length ? requested : [null]
        for (const loadout of targets) {
          const effective = effectiveSelectionForValidation(data, loadout, variant)
          const nested = validateBuild(effective, { validateVariants: false, validateLoadouts: false })
          const prefix = loadout
            ? `variant "${variant.id}" with loadout "${loadout.id}" effective build`
            : `variant "${variant.id}" effective build`
          errors.push(...nested.map(error => `${prefix}: ${error}`))
        }
      }
    }
  }
  return errors
}

function validateMorphsAndPassives(items, resolved, errors) {
  const byId = new Map(items.filter(i => isObj(i) && i.id).map(i => [i.id, i]))
  const passiveRankCount = new Map()

  for (const item of items) {
    const hit = resolved.get(item?.id)
    if (!hit) continue
    const { skill } = hit

    if (skill.type === 'Morph') {
      if (!skill.base_id) { errors.push(`unlock_order "${item.id}" maps to a morph with no base ability in the catalog.`); continue }
      const requiredRows = (item.requires || []).map(id => byId.get(id)).filter(Boolean)
      const baseRows = requiredRows.filter(row => resolved.get(row.id)?.skill?.id === skill.base_id)
      if (requiredRows.length && !baseRows.length) {
        const names = requiredRows.map(r => r.id).join(', ')
        errors.push(`unlock_order "${item.id}" is a morph of "${skill.base_id}" but requires ${names}, none of which is that base ability.`)
      }
      // Two morphs of the same base cannot both be in the final build; ESO only allows one.
      const siblings = items.filter(other => other !== item && resolved.get(other?.id)?.skill?.base_id === skill.base_id)
      for (const sibling of siblings) {
        if (item.status === 'final' && sibling.status === 'final') {
          errors.push(`unlock_order "${item.id}" and "${sibling.id}" are alternate morphs of the same ability, so they cannot both be status "final".`)
        }
      }
    }

    if (skill.type === 'Passive') {
      const count = (passiveRankCount.get(skill.id) || 0) + 1
      passiveRankCount.set(skill.id, count)
      const max = Number(skill.max_points) || 1
      if (count > max) errors.push(`unlock_order lists ${count} ranks for passive "${skill.name}", but the catalog allows ${max}.`)
    }
  }
}

function findRequireCycles(items) {
  const byId = new Map(items.filter(i => isObj(i) && i.id).map(i => [i.id, i]))
  const state = new Map()
  const cycles = []
  const walk = (id, trail) => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'open') { cycles.push([...trail.slice(trail.indexOf(id)), id]); return }
    state.set(id, 'open')
    for (const req of byId.get(id)?.requires || []) if (byId.has(req)) walk(req, [...trail, id])
    state.set(id, 'done')
  }
  for (const id of byId.keys()) walk(id, [])
  return cycles
}

/** Schema 4 is the stable public format. Schema 3 is migrated in memory and on import. */
function normalizeBuild(input) {
  const data = JSON.parse(JSON.stringify(input))
  const errors = []
  let changed = false
  const schema = Number(data.schema_version) || 0
  if (schema === 3) {
    data.schema_version = CURRENT_SCHEMA_VERSION
    normalizeOptionalSections(data)
    changed = true
  } else if (schema === CURRENT_SCHEMA_VERSION) {
    // Schema 4 remains stable, but catalog-backed display/rank placement metadata may move when ESO does.
  } else {
    errors.push(`schema_version must be 3 or ${CURRENT_SCHEMA_VERSION}; unsupported schemas cannot be imported safely.`)
  }
  if (!errors.length && normalizeCatalogRows(data)) changed = true
  return { data, changed, errors }
}


module.exports = {
  validateBuild, normalizeBuild, planNodes, planSections,
  isObj, badId, CURRENT_SCHEMA_VERSION, CP_TREE_MAX
}
