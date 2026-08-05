import catalog from '#catalog' with { type: 'json' }

export const esoCatalog = catalog
export const catalogLines = catalog.lines || []
export const catalogLineMap = new Map(catalogLines.map(line => [line.id, line]))
export const catalogSkillMap = new Map(catalogLines.flatMap(line => (line.skills || []).map(skill => [skill.id, { line, skill }])))

// Every catalog skill, deduplicated by id, so point totals never double-count a shared entry.
const uniqueSkills = (() => {
  const seen = new Set()
  const out = []
  for (const line of catalogLines) {
    for (const skill of line.skills || []) {
      if (seen.has(skill.id)) continue
      seen.add(skill.id)
      out.push({ line, skill })
    }
  }
  return out
})()

export function normalizeSkillName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/\b(?:I|II|III|IV|V)\b$/i, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase()
}

// Build rows are matched to catalog skills by catalog_skill_id. A display-name fallback remains
// for small in-memory fixtures used by the recommendation tests.
const indexCache = new WeakMap()
export function buildIndex(build) {
  if (!build) return { bySkillId: new Map(), byLine: new Map(), byItemId: new Map() }
  const cached = indexCache.get(build)
  if (cached) return cached
  const bySkillId = new Map()
  const byLine = new Map()
  const byItemId = new Map()
  for (const item of build.unlock_order || []) {
    if (!item?.id) continue
    byItemId.set(item.id, item)
    const skillId = item.catalog_skill_id || resolveLegacyName(item)
    if (skillId) {
      const list = bySkillId.get(skillId) || []
      list.push(item)
      bySkillId.set(skillId, list)
    }
    const key = normalizeSkillName(item.name)
    if (!byLine.has(item.line)) byLine.set(item.line, new Map())
    const lineMap = byLine.get(item.line)
    const named = lineMap.get(key) || []
    named.push(item)
    lineMap.set(key, named)
  }
  const byPriority = (a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0)
  for (const list of bySkillId.values()) list.sort(byPriority)
  for (const lineMap of byLine.values()) for (const list of lineMap.values()) list.sort(byPriority)
  const index = { bySkillId, byLine, byItemId }
  indexCache.set(build, index)
  return index
}

function resolveLegacyName(item) {
  const line = catalogLineMap.get(item?.line)
  if (!line) return null
  const target = normalizeSkillName(item?.name)
  const hits = (line.skills || []).filter(skill => normalizeSkillName(skill.name) === target)
  return hits.length === 1 ? hits[0].id : null
}

export function buildItemsForCatalogSkill(build, lineId, skill) {
  if (!skill) return []
  const index = buildIndex(build)
  const byId = index.bySkillId.get(skill.id)
  if (byId) return byId
  // Test fixtures without ids can still line up by display text within the same line.
  return index.byLine.get(lineId)?.get(normalizeSkillName(skill.name)) || []
}

export function effectiveAllocation(character, build, lineId, skill) {
  const saved = character?.skill_allocations?.[skill.id]
  const max = Number(skill.max_points) || 1
  // An explicit 0 means the user deselected it, so it has to win over anything inferred below.
  if (saved !== undefined) return Math.max(0, Math.min(max, Number(saved) || 0))
  const linked = buildItemsForCatalogSkill(build, lineId, skill)
  if (!linked.length) return 0
  const completed = new Set(character?.completed || [])
  if (skill.type === 'Passive') return Math.min(max, linked.filter(item => completed.has(item.id)).length)
  return linked.some(item => completed.has(item.id)) ? 1 : 0
}

export function itemBuildMeta(build, lineId, skill) {
  const linked = buildItemsForCatalogSkill(build, lineId, skill)
  if (!linked.length) {
    return { tracked: false, status: 'tracking', phase: 'Personal', order: null, notes: 'Not required by this build; tracked for your full character record.', linked: [] }
  }
  return {
    tracked: true,
    status: linked.some(x => x.status === 'final') ? 'final' : linked.some(x => x.status === 'temporary') ? 'temporary' : 'optional',
    phase: linked[0].phase || 'General',
    order: Math.min(...linked.map(x => Number(x.priority) || 9999)),
    notes: linked.map(x => x.notes).filter(Boolean).join(' '),
    linked
  }
}

export function skillPointUsage(character, build) {
  const groups = {}
  let total = 0
  let buildRelated = 0
  let personal = 0
  for (const { line, skill } of uniqueSkills) {
    if (skill.currency !== 'skill_point') continue
    const points = effectiveAllocation(character, build, line.id, skill)
    if (!points) continue
    total += points
    groups[line.group] = (groups[line.group] || 0) + points
    if (buildItemsForCatalogSkill(build, line.id, skill).length) buildRelated += points
    else personal += points
  }
  return { total, buildRelated, personal, groups }
}

export function displayLine(buildLine, trackedId) {
  const catalogLine = catalogLineMap.get(buildLine?.id || trackedId)
  if (!catalogLine) return buildLine ? { ...buildLine, max: buildLine.max || 50, max_rank: buildLine.max || 50, catalog: false, build_relevant: true } : null
  return {
    ...catalogLine,
    ...(buildLine || {}),
    id: catalogLine.id,
    name: catalogLine.name,
    group: catalogLine.group,
    skills: catalogLine.skills || [],
    max: catalogLine.max_rank,
    max_rank: catalogLine.max_rank,
    catalog: true,
    build_relevant: !!buildLine
  }
}
