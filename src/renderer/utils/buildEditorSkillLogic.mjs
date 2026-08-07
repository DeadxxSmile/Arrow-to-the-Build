import { catalogLineMap, catalogSkillMap } from './catalogLogic.mjs'

export function slugifyEditorId(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'
}

export function skillRecord(skillId) {
  return catalogSkillMap.get(skillId) || null
}

export function plannedRowsForSkill(data, skillId) {
  return (data?.unlock_order || []).filter(row => row?.catalog_skill_id === skillId)
}

export function selectedSkillIds(data) {
  return new Set((data?.unlock_order || []).map(row => row?.catalog_skill_id).filter(Boolean))
}

export function nextPriority(data) {
  return Math.max(0, ...(data?.unlock_order || []).map(row => Number(row?.priority) || 0)) + 10
}

function uniqueRowId(data, seed) {
  const used = new Set((data?.unlock_order || []).map(row => row?.id))
  const base = slugifyEditorId(seed)
  let id = base
  let suffix = 2
  while (used.has(id)) id = `${base}-${suffix++}`
  return id
}

function classLineCost(data, lineId) {
  const selection = (data?.class_configuration?.active_class_lines || []).find(row => row?.line_id === lineId)
  return selection && selection.mode !== 'native' ? 2 : 1
}

function lineRecord(line) {
  return { id: line.id, name: line.name, max: Number(line.max_rank) || 50, group: line.group || 'Other' }
}

export function ensureRelevantLine(data, lineId) {
  const line = catalogLineMap.get(lineId)
  if (!line) return data
  const current = Array.isArray(data.relevant_lines) ? data.relevant_lines : []
  if (current.some(row => row?.id === lineId)) return data
  return { ...data, relevant_lines: [...current, lineRecord(line)] }
}

function createUnlockRow(data, line, skill, overrides = {}) {
  const priority = overrides.priority ?? nextPriority(data)
  const baseName = skill.type === 'Passive' && overrides.rank
    ? `${skill.name} Rank ${overrides.rank}`
    : skill.name
  return {
    id: uniqueRowId(data, overrides.idSeed || `${skill.id}${overrides.rank ? `-rank-${overrides.rank}` : ''}`),
    name: baseName,
    catalog_skill_id: skill.id,
    section: line.group || 'Other',
    line: line.id,
    required_rank: Number(skill.required_rank) || 0,
    kind: skill.type,
    phase: overrides.phase || 'Leveling',
    status: overrides.status || (skill.type === 'Morph' || skill.type === 'Passive' || !skill.morph_ids?.length ? 'final' : 'temporary'),
    priority,
    notes: overrides.notes || '',
    morph_from: skill.base_id ? catalogSkillMap.get(skill.base_id)?.skill?.name || null : null,
    image: null,
    requires: overrides.requires || [],
    skill_point_cost: classLineCost(data, line.id)
  }
}

export function setPlannedSkillCount(input, skillId, requestedCount) {
  const hit = catalogSkillMap.get(skillId)
  if (!hit) return input
  const { line, skill } = hit
  const max = skill.type === 'Passive' ? Math.max(1, Number(skill.max_points) || 1) : 1
  const count = Math.max(0, Math.min(max, Number(requestedCount) || 0))
  let data = ensureRelevantLine(input, line.id)
  let rows = [...(data.unlock_order || [])]
  const existing = rows.filter(row => row?.catalog_skill_id === skillId)

  if (count === 0) {
    const removedIds = new Set(existing.map(row => row.id))
    if (!removedIds.size) return data
    rows = rows.filter(row => !removedIds.has(row?.id))
    // Removing a base ability also removes its selected morphs. A morph cannot be purchased
    // or meaningfully placed on a leveling bar without the base ability having existed first.
    if (skill.morph_ids?.length) {
      const morphIds = new Set(skill.morph_ids)
      const morphRowIds = new Set(rows.filter(row => morphIds.has(row?.catalog_skill_id)).map(row => row.id))
      rows = rows.filter(row => !morphIds.has(row?.catalog_skill_id))
      for (const row of rows) row.requires = (row.requires || []).filter(id => !removedIds.has(id) && !morphRowIds.has(id))
    } else {
      for (const row of rows) row.requires = (row.requires || []).filter(id => !removedIds.has(id))
    }
    return { ...data, unlock_order: rows }
  }

  // Morphs always carry their base ability into the plan. The base remains temporary by default.
  let baseRow = null
  if (skill.type === 'Morph' && skill.base_id) {
    const baseHit = catalogSkillMap.get(skill.base_id)
    baseRow = rows.find(row => row?.catalog_skill_id === skill.base_id) || null
    if (!baseRow && baseHit) {
      const baseData = { ...data, unlock_order: rows }
      baseRow = createUnlockRow(baseData, baseHit.line, baseHit.skill, { status: 'temporary', phase: 'Leveling' })
      rows.push(baseRow)
    }
  }

  if (skill.type !== 'Passive') {
    if (!existing.length) {
      const rowData = { ...data, unlock_order: rows }
      rows.push(createUnlockRow(rowData, line, skill, { requires: baseRow ? [baseRow.id] : [] }))
    }
  } else {
    while (rows.filter(row => row?.catalog_skill_id === skillId).length < count) {
      const rank = rows.filter(row => row?.catalog_skill_id === skillId).length + 1
      const rowData = { ...data, unlock_order: rows }
      rows.push(createUnlockRow(rowData, line, skill, { rank }))
    }
    while (rows.filter(row => row?.catalog_skill_id === skillId).length > count) {
      const index = rows.map(row => row?.catalog_skill_id).lastIndexOf(skillId)
      rows.splice(index, 1)
    }
  }

  return { ...data, unlock_order: rows }
}

export function patchPlannedSkillRows(input, skillId, patch) {
  return {
    ...input,
    unlock_order: (input.unlock_order || []).map(row => row?.catalog_skill_id === skillId ? { ...row, ...patch } : row)
  }
}

export function moveUnlockRow(input, rowId, direction) {
  const rows = [...(input.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
  const index = rows.findIndex(row => row.id === rowId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= rows.length) return input
  ;[rows[index], rows[target]] = [rows[target], rows[index]]
  return { ...input, unlock_order: rows.map((row, rowIndex) => ({ ...row, priority: (rowIndex + 1) * 10 })) }
}

export function removeRelevantLine(input, lineId) {
  const active = new Set((input.class_configuration?.active_class_lines || []).map(row => row?.line_id))
  if (active.has(lineId)) return input
  const removedIds = new Set((input.unlock_order || []).filter(row => row?.line === lineId).map(row => row.id))
  const unlocks = (input.unlock_order || [])
    .filter(row => row?.line !== lineId)
    .map(row => ({ ...row, requires: (row.requires || []).filter(id => !removedIds.has(id)) }))
  const removedSkillIds = new Set((input.unlock_order || []).filter(row => row?.line === lineId).map(row => row.catalog_skill_id).filter(Boolean))
  const cleanBar = bar => ({
    ...(bar || {}),
    slots: (bar?.slots || []).filter(slot => !removedSkillIds.has(slot?.catalog_skill_id)),
    ultimate: removedSkillIds.has(bar?.ultimate?.catalog_skill_id) ? null : bar?.ultimate ?? null
  })
  const cleanSteps = steps => (steps || []).filter(step => !removedSkillIds.has(step?.catalog_skill_id))
  return {
    ...input,
    relevant_lines: (input.relevant_lines || []).filter(line => line?.id !== lineId),
    unlock_order: unlocks,
    phases: (input.phases || []).map(phase => ({
      ...phase,
      front_bar: cleanBar(phase.front_bar),
      back_bar: cleanBar(phase.back_bar),
      rotation: {
        ...(phase.rotation || {}),
        opener: cleanSteps(phase.rotation?.opener),
        steps: cleanSteps(phase.rotation?.steps),
        execute: cleanSteps(phase.rotation?.execute)
      }
    }))
  }
}

export function plannedBarChoices(data) {
  const seen = new Set()
  const choices = []
  for (const row of [...(data?.unlock_order || [])].sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))) {
    if (!row?.catalog_skill_id || seen.has(row.catalog_skill_id)) continue
    const hit = catalogSkillMap.get(row.catalog_skill_id)
    if (!hit || hit.skill.type === 'Passive') continue
    seen.add(row.catalog_skill_id)
    const base = hit.skill.base_id ? catalogSkillMap.get(hit.skill.base_id)?.skill : null
    const ultimate = hit.skill.type === 'Ultimate' || base?.type === 'Ultimate'
    choices.push({
      id: row.catalog_skill_id,
      name: hit.skill.name,
      line: hit.line.name,
      type: hit.skill.type,
      ultimate,
      row
    })
  }
  return choices
}

export function phaseQualityWarnings(data, phase) {
  const warnings = []
  if (Number(phase.min_level) < 15 && (phase.back_bar?.slots?.length || phase.back_bar?.ultimate)) warnings.push('Back-bar skills are present before weapon swapping unlocks at level 15.')
  if (Number(phase.max_level) >= 12 && !phase.front_bar?.ultimate) warnings.push('No front-bar ultimate is selected for this phase.')
  if (Number(data?.metadata?.bar_count || 2) === 2 && Number(phase.min_level) >= 15 && !phase.back_bar?.ultimate) warnings.push('This is a two-bar build, but the back-bar ultimate is empty.')
  const ids = new Set((data?.unlock_order || []).map(row => row?.catalog_skill_id).filter(Boolean))
  for (const [barName, bar] of [['Front bar', phase.front_bar], ['Back bar', phase.back_bar]]) {
    for (const slot of bar?.slots || []) if (slot?.catalog_skill_id && !ids.has(slot.catalog_skill_id)) warnings.push(`${barName} uses ${slot.name}, but it is not in the unlock plan.`)
    if (bar?.ultimate?.catalog_skill_id && !ids.has(bar.ultimate.catalog_skill_id)) warnings.push(`${barName} uses ${bar.ultimate.name}, but it is not in the unlock plan.`)
  }
  return warnings
}
