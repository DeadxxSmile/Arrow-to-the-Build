'use strict'
const fs = require('fs')
const path = require('path')
const { dialog } = require('electron')
const dbModule = require('../database/db')
const catalog = require('../catalog')
const { mergeOverrides } = require('../../shared/variantLogic.cjs')

const MAX_JSON_BYTES = 8 * 1024 * 1024
const CURRENT_SCHEMA_VERSION = 3
const CP_TREE_MAX = 1200

function buildDir() { return path.join(__dirname, '../../../resources/builds') }

function readJsonFile(file, label) {
  const stat = fs.statSync(file)
  if (!stat.isFile()) throw new Error(`${label} is not a file.`)
  if (stat.size > MAX_JSON_BYTES) throw new Error(`${label} is larger than 8 MB, which no ATTB file should be.`)
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    throw new Error(`${label} is not valid JSON.\n${err.message}`)
  }
}

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
      if (group.optional !== undefined && typeof group.optional !== 'boolean') errors.push(`cp_plans.${tree}.flex "${group.id}" optional must be true or false.`)
      if (!Array.isArray(group.nodes) || !group.nodes.length) { errors.push(`cp_plans.${tree}.flex "${group.id}" needs a non-empty nodes array.`); return }
      group.nodes.forEach((node, i) => checkNode(node, `cp_plans.${tree}.flex.${group.id}[${i}]`))
    })

    const coreTotal = core.reduce((sum, node) => sum + (Number(node?.max_points) || 0), 0)
    if (coreTotal > CP_TREE_MAX) errors.push(`cp_plans.${tree} core path needs ${coreTotal} points, which no character can reach (the cap is ${CP_TREE_MAX} per constellation).`)
    for (const slot of plan.final_slots || []) {
      if (!nodeIds.has(slot)) errors.push(`cp_plans.${tree}.final_slots lists "${slot}", which is not one of its nodes.`)
    }
    for (const node of planNodes(plan)) {
      if (isObj(node) && node.slottable === false && (plan.final_slots || []).includes(node.id)) {
        errors.push(`cp_plans.${tree}.final_slots lists "${node.id}", which is not a slottable star.`)
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

function validateBuild(data, options = {}) {
  const errors = []
  if (!isObj(data)) return ['Root must be a JSON object.']

  const schema = Number(data.schema_version) || 0
  if (schema !== CURRENT_SCHEMA_VERSION) errors.push(`schema_version must be ${CURRENT_SCHEMA_VERSION}. This pre-release build intentionally does not import older build schemas.`)
  if (badId(data.id)) errors.push('Missing id, or it is not a simple slug (letters, numbers, dot, dash, underscore).')
  if (typeof data.name !== 'string' || !data.name.trim()) errors.push('Missing or non-string name.')
  if (!isObj(data.defaults)) errors.push('Missing defaults object.')
  else {
    if (!data.defaults.class) errors.push('Missing defaults.class.')
    validateAttributes(data.defaults.attributes, 'defaults.attributes', errors)
  }
  if (!Array.isArray(data.relevant_lines)) errors.push('relevant_lines must be an array.')
  if (!isObj(data.cp_plans)) errors.push('cp_plans must be an object.')
  if (!Array.isArray(data.unlock_order)) errors.push('unlock_order must be an array.')
  if (!Array.isArray(data.gear_stages)) errors.push('gear_stages must be an array.')
  for (const key of ['phases', 'tips', 'concepts', 'variants']) {
    if (data[key] !== undefined && !Array.isArray(data[key])) errors.push(`${key} must be an array when present.`)
  }
  if (data.consumables !== undefined && !isObj(data.consumables)) errors.push('consumables must be an object when present.')

  const lineIds = new Set()
  for (const [i, line] of (Array.isArray(data.relevant_lines) ? data.relevant_lines : []).entries()) {
    if (!isObj(line) || badId(line?.id)) { errors.push(`relevant_lines[${i}] needs a slug id.`); continue }
    if (lineIds.has(line.id)) errors.push(`Duplicate relevant_lines id "${line.id}".`)
    lineIds.add(line.id)
    if (!catalog.getLine(line.id)) errors.push(`relevant_lines "${line.id}" is not a skill line in the bundled catalog.`)
  }

  const items = Array.isArray(data.unlock_order) ? data.unlock_order : []
  const seen = new Set()
  const resolved = new Map()
  for (const [i, item] of items.entries()) {
    if (!isObj(item) || badId(item?.id)) { errors.push(`unlock_order[${i}] needs a slug id.`); continue }
    if (seen.has(item.id)) errors.push(`Duplicate unlock_order id "${item.id}".`)
    seen.add(item.id)
    if (item.requires !== undefined && !Array.isArray(item.requires)) errors.push(`unlock_order "${item.id}" requires must be an array.`)
    if (item.line && lineIds.size && !lineIds.has(item.line)) errors.push(`unlock_order "${item.id}" points at skill line "${item.line}", which is not in relevant_lines.`)
    if (item.required_rank !== undefined && (!Number.isInteger(Number(item.required_rank)) || Number(item.required_rank) < 0)) {
      errors.push(`unlock_order "${item.id}" required_rank must be a whole number of 0 or more.`)
    }
    if (!item.catalog_skill_id) {
      errors.push(`unlock_order "${item.id}" is missing catalog_skill_id, which schema ${CURRENT_SCHEMA_VERSION} requires.`)
    }
    const hit = catalog.resolveUnlockRow(item)
    if (hit.error) errors.push(hit.error)
    else resolved.set(item.id, hit)
  }

  for (const item of items) {
    for (const req of (Array.isArray(item?.requires) ? item.requires : [])) {
      if (!seen.has(req)) errors.push(`unlock_order "${item.id}" requires "${req}", which does not exist.`)
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
      }
      if (bar.ultimate !== null && bar.ultimate !== undefined && !isObj(bar.ultimate)) errors.push(`phase "${phase.id}" ${barKey}.ultimate must be an object or null.`)
      if (isObj(bar.ultimate) && (typeof bar.ultimate.name !== 'string' || !bar.ultimate.name.trim())) errors.push(`phase "${phase.id}" ${barKey}.ultimate needs a name.`)
      if (bar.ultimate?.catalog_skill_id && !catalog.getSkill(bar.ultimate.catalog_skill_id)) errors.push(`phase "${phase.id}" references unknown ultimate "${bar.ultimate.catalog_skill_id}".`)
    }
    if (!isObj(phase.rotation)) errors.push(`phase "${phase.id}" needs a rotation object.`)
    else {
      if (!['sequence', 'priority'].includes(phase.rotation.type)) errors.push(`phase "${phase.id}" rotation.type must be sequence or priority.`)
      if (!Array.isArray(phase.rotation.steps)) errors.push(`phase "${phase.id}" rotation.steps must be an array.`)
      else for (const [stepIndex, step] of phase.rotation.steps.entries()) {
        if (!isObj(step) || typeof step.name !== 'string' || !step.name.trim()) errors.push(`phase "${phase.id}" rotation.steps[${stepIndex}] needs a name.`)
        if (step?.catalog_skill_id && !catalog.getSkill(step.catalog_skill_id)) errors.push(`phase "${phase.id}" rotation references unknown skill "${step.catalog_skill_id}".`)
      }
      for (const key of ['opener', 'execute', 'notes']) {
        if (phase.rotation[key] !== undefined && !Array.isArray(phase.rotation[key])) errors.push(`phase "${phase.id}" rotation.${key} must be an array when present.`)
      }
    }
  }

  const baseErrorCount = errors.length
  const variantIds = new Set()
  for (const [i, variant] of (Array.isArray(data.variants) ? data.variants : []).entries()) {
    if (!isObj(variant) || badId(variant?.id)) { errors.push(`variants[${i}] needs a slug id.`); continue }
    if (variantIds.has(variant.id)) errors.push(`Duplicate variants id "${variant.id}".`)
    variantIds.add(variant.id)
    // An array here silently replaces the whole build once it is merged, so reject it loudly.
    if (variant.overrides !== undefined && variant.overrides !== null && !isObj(variant.overrides)) {
      errors.push(`variants "${variant.id}" overrides must be an object or null.`)
    }
    if (variant.available === false && !variant.unavailable_reason) {
      errors.push(`variants "${variant.id}" is marked unavailable but gives no unavailable_reason.`)
    }
    if (isObj(variant.overrides)) {
      const variantErrorStart = errors.length
      validateAttributes(variant.overrides.defaults?.attributes, `variants "${variant.id}" overrides.defaults.attributes`, errors)
      if (variant.overrides.id !== undefined) errors.push(`variants "${variant.id}" must not override the build id.`)
      if (variant.overrides.variants !== undefined) errors.push(`variants "${variant.id}" must not override the variants list.`)

      if (options.validateVariants !== false && variant.available !== false && baseErrorCount === 0
          && errors.length === variantErrorStart && Object.keys(variant.overrides).length) {
        const base = structuredClone(data)
        base.variants = []
        const effective = mergeOverrides(base, variant.overrides)
        effective.id = data.id
        effective.variants = []
        // Null is a useful way to clear optional display-only sections in a loadout.
        for (const key of ['phases', 'tips', 'concepts']) if (effective[key] === null) effective[key] = []
        if (effective.consumables === null) delete effective.consumables
        const nested = validateBuild(effective, { validateVariants: false })
        errors.push(...nested.map(error => `variants "${variant.id}" effective build: ${error}`))
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

/** Schema 3 is the first public-facing build format. Pre-release schemas are intentionally rejected. */
function normalizeBuild(input) {
  const data = JSON.parse(JSON.stringify(input))
  const errors = []
  if (Number(data.schema_version) !== CURRENT_SCHEMA_VERSION) {
    errors.push(`schema_version must be ${CURRENT_SCHEMA_VERSION}; older pre-release schemas are not supported.`)
  }
  return { data, changed: false, errors }
}

function upsertBuild(input, sourcePath = null, bundled = false) {
  const { data, errors: normalizeErrors } = normalizeBuild(input)
  const errors = [...normalizeErrors, ...validateBuild(data)]
  if (errors.length) throw new Error(`Invalid ATTB build file:\n${[...new Set(errors)].join('\n')}`)
  dbModule.getDb().prepare(`
    INSERT INTO builds(id,name,short_name,class_name,game_version,verified_date,schema_version,source_path,is_bundled,data_json)
    VALUES(@id,@name,@short_name,@class_name,@game_version,@verified_date,@schema_version,@source_path,@is_bundled,@data_json)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, short_name=excluded.short_name, class_name=excluded.class_name,
      game_version=excluded.game_version, verified_date=excluded.verified_date,
      schema_version=excluded.schema_version, source_path=excluded.source_path,
      is_bundled=excluded.is_bundled, data_json=excluded.data_json, updated_at=datetime('now')
  `).run({
    id: data.id,
    name: data.name,
    short_name: data.short_name || data.name,
    class_name: data.defaults?.class || '',
    game_version: data.game_version || '',
    verified_date: data.verified_date || '',
    schema_version: Number(data.schema_version) || 1,
    source_path: sourcePath,
    is_bundled: bundled ? 1 : 0,
    data_json: JSON.stringify(data)
  })
  return data.id
}

function seedBundled() {
  const dir = buildDir()
  if (!fs.existsSync(dir)) return
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const full = path.join(dir, file)
    try {
      upsertBuild(readJsonFile(full, file), full, true)
    } catch (err) { console.error('[Build seed]', file, err.message) }
  }
}

function rowToSummary(r) { return { ...r, is_bundled: !!r.is_bundled } }

function register(ipcMain) {
  ipcMain.handle('builds:list', () => dbModule.getDb().prepare(`SELECT id,name,short_name,class_name,game_version,verified_date,schema_version,is_bundled FROM builds ORDER BY is_bundled DESC,name`).all().map(rowToSummary))

  ipcMain.handle('builds:get', (_e, id) => {
    const row = dbModule.getDb().prepare('SELECT * FROM builds WHERE id=?').get(String(id || ''))
    if (!row) return null
    return { ...rowToSummary(row), data: JSON.parse(row.data_json) }
  })

  ipcMain.handle('builds:import', async () => {
    const result = await dialog.showOpenDialog({ title: 'Import ATTB Build JSON', filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }], properties: ['openFile'] })
    if (result.canceled || !result.filePaths[0]) return null
    const file = result.filePaths[0]
    const raw = readJsonFile(file, path.basename(file))
    const { changed } = normalizeBuild(raw)
    const id = upsertBuild(raw, file, false)
    return { id, name: raw.name, normalized: changed }
  })

  ipcMain.handle('builds:validateData', (_e, data) => {
    const errors = validateBuild(data)
    return { valid: errors.length === 0, errors }
  })

  ipcMain.handle('builds:exportData', async (_e, data, defaultName = 'ATTB-build.json') => {
    const errors = validateBuild(data)
    if (errors.length) throw new Error(`Cannot export an invalid ATTB build:
${errors.join('\n')}`)
    const result = await dialog.showSaveDialog({
      title: 'Export ATTB Build JSON', defaultPath: String(defaultName || 'ATTB-build.json'),
      filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
    return result.filePath
  })

  ipcMain.handle('builds:reloadForCharacter', async (_e, characterId) => {
    const row = dbModule.getDb().prepare(`SELECT b.* FROM builds b JOIN characters c ON c.build_id=b.id WHERE c.id=?`).get(String(characterId || ''))
    if (!row) throw new Error('Character build not found')
    let file = row.source_path
    if (!file || !fs.existsSync(file)) {
      const result = await dialog.showOpenDialog({
        title: 'Reload Current Build from JSON',
        filters: [{ name: 'ATTB Build JSON', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) return null
      file = result.filePaths[0]
    }
    const data = readJsonFile(file, path.basename(file))
    if (data.id !== row.id) throw new Error(`Build ID mismatch. Expected "${row.id}" but the selected JSON contains "${data.id}".`)
    const { changed } = normalizeBuild(data)
    upsertBuild(data, file, !!row.is_bundled)
    return { id: data.id, name: data.name, file, normalized: changed }
  })
}

module.exports = {
  register, seedBundled, validateBuild, upsertBuild, normalizeBuild, readJsonFile,
  planNodes, planSections, MAX_JSON_BYTES, CURRENT_SCHEMA_VERSION, CP_TREE_MAX
}
