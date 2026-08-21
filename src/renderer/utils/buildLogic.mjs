import { buildIndex, catalogLineMap, catalogSkillMap, effectiveAllocation, normalizeSkillName } from './catalogLogic.mjs'
import { cpStarsForTree, getCpStar, observedCpState, resolveCpNode } from './cpCatalog.mjs'

export const CP_TREE_MAX = 1200
export const CP_ACCOUNT_MAX = 3600

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v)

// Schema 1 put the whole tree in `nodes`. That was the required path, so read it as the core.
export function planSections(plan) {
  if (!isObj(plan)) return { core: [], flex: [] }
  const core = Array.isArray(plan.core) ? plan.core : (Array.isArray(plan.nodes) ? plan.nodes : [])
  const flex = (Array.isArray(plan.flex) ? plan.flex : []).filter(group => isObj(group) && Array.isArray(group.nodes))
  return { core, flex }
}

const cpWhole = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isInteger(n) ? n : fallback
}

function cpAuthoredNodes(plan, tree = null) {
  const { core, flex } = planSections(plan)
  const rows = []
  core.forEach((node, index) => rows.push({
    raw: node, node: resolveCpNode(node, tree), section: 'core', group: null, groupIndex: -1, authoredIndex: index, optional: false
  }))
  flex.forEach((group, groupIndex) => (group.nodes || []).forEach((node, authoredIndex) => rows.push({
    raw: node, node: resolveCpNode(node, tree), section: 'flex', group, groupIndex, authoredIndex, optional: group.optional === true
  })))
  return rows.filter(row => row.node)
}

function livePrerequisitePath(targetId, liveState, tree, preferredStarts = []) {
  if (!liveState?.discipline || !Array.isArray(liveState.liveStars) || !liveState.liveStars.length) return null
  const byId = new Map()
  const byEso = new Map()
  for (const live of liveState.liveStars) {
    const canonical = cpStarsForTree(tree).find(star => Number(star.eso_skill_id) === Number(live?.skillId))
    if (!canonical || canonical.tree !== tree) continue
    byId.set(canonical.id, { canonical, live })
    byEso.set(Number(live.skillId), canonical.id)
  }
  if (!byId.has(targetId)) return null
  const roots = [...byId.entries()].filter(([, row]) => row.live?.root === true).map(([id]) => id)
  if (!roots.length) return null

  const unlockCost = id => {
    const row = byId.get(id)
    const liveJumps = Array.isArray(row?.live?.jumpPoints) ? row.live.jumpPoints.map(Number).filter(n => n > 0) : []
    return liveJumps[0] || Number(row?.canonical?.unlock_points) || Number(row?.canonical?.max_points) || 1
  }

  const findPath = starts => {
    const usableStarts = [...new Set(starts)].filter(id => byId.has(id))
    if (!usableStarts.length) return null
    if (usableStarts.includes(targetId)) return []
    const distance = new Map(), previous = new Map(), open = new Set(usableStarts)
    for (const id of usableStarts) distance.set(id, 0)
    while (open.size) {
      let current = null
      for (const id of open) if (current === null || (distance.get(id) ?? Infinity) < (distance.get(current) ?? Infinity)) current = id
      open.delete(current)
      if (current === targetId) break
      const linked = Array.isArray(byId.get(current)?.live?.linkedSkillIds) ? byId.get(current).live.linkedSkillIds : []
      for (const linkedEso of linked) {
        const next = byEso.get(Number(linkedEso))
        if (!next || !byId.has(next)) continue
        // The chosen start is already part of the earlier authored route, so its
        // first-pass spend is already budgeted. Only newly traversed connectors
        // should influence which continuation is cheapest.
        const edgeCost = usableStarts.includes(current) ? 0 : unlockCost(current)
        const alt = (distance.get(current) || 0) + edgeCost
        if (alt < (distance.get(next) ?? Infinity)) { distance.set(next, alt); previous.set(next, current); open.add(next) }
      }
    }
    if (!previous.has(targetId)) return null
    const reverse = []
    let cursor = targetId
    while (previous.has(cursor)) { cursor = previous.get(cursor); reverse.push(cursor) }
    return reverse.reverse()
  }

  // Continue from stars the build already told the player to unlock before
  // falling back to a different root. This prevents needless side spends such
  // as inserting Precision between Tireless Discipline and Piercing when the
  // live ESO graph says Tireless already connects directly to Piercing.
  const preferred = findPath(preferredStarts)
  return preferred !== null ? preferred : findPath(roots)
}

function catalogGraphPrerequisitePath(targetId, tree) {
  const stars = cpStarsForTree(tree)
  const byId = new Map(stars.map(star => [star.id, star]))
  if (!byId.has(targetId)) return null
  const roots = stars.filter(star => star.path_verified === true && Array.isArray(star.prerequisite_path) && star.prerequisite_path.length === 0).map(star => star.id)
  if (!roots.length) return null
  if (roots.includes(targetId)) return []

  const adjacency = new Map(stars.map(star => [star.id, new Set()]))
  for (const star of stars) {
    if (star.links_verified !== true) continue
    for (const linkedId of star.links || []) {
      if (!byId.has(linkedId)) continue
      adjacency.get(star.id).add(linkedId)
      adjacency.get(linkedId).add(star.id)
    }
  }

  const cost = id => {
    const star = byId.get(id)
    return Number(star?.unlock_points_verified ? star.unlock_points : 0) || Number(star?.jump_points?.[0]) || Number(star?.max_points) || 1
  }
  const distance = new Map(), previous = new Map(), open = new Set(roots)
  for (const root of roots) distance.set(root, 0)
  while (open.size) {
    let current = null
    for (const id of open) if (current === null || (distance.get(id) ?? Infinity) < (distance.get(current) ?? Infinity)) current = id
    open.delete(current)
    if (current === targetId) break
    for (const next of adjacency.get(current) || []) {
      const alt = (distance.get(current) || 0) + cost(current)
      if (alt < (distance.get(next) ?? Infinity)) { distance.set(next, alt); previous.set(next, current); open.add(next) }
    }
  }
  if (!previous.has(targetId)) return null
  const reverse = []
  let cursor = targetId
  while (previous.has(cursor)) { cursor = previous.get(cursor); reverse.push(cursor) }
  return reverse.reverse()
}

function prerequisiteRouteFor(row, tree, liveState = null, preferredStarts = []) {
  const livePath = livePrerequisitePath(row.node?.id, liveState, tree, preferredStarts)
  const manual = row.node?.manual_prerequisites === true
  const staticVerified = row.node?.path_verified === true
  const graphPath = livePath === null && !manual && !staticVerified ? catalogGraphPrerequisitePath(row.node?.id, tree) : null
  const ids = livePath !== null
    ? livePath
    : manual || staticVerified
      ? (Array.isArray(row.node?.prerequisite_path) ? row.node.prerequisite_path : [])
      : graphPath !== null
        ? graphPath
        : []
  const verified = livePath !== null || manual || staticVerified || graphPath !== null
  const source = livePath !== null ? 'live' : manual ? 'manual' : staticVerified ? 'catalog' : graphPath !== null ? 'catalog-graph' : 'unverified'
  const nodes = ids.map(id => {
    const canonical = getCpStar(id)
    if (!canonical || (tree && canonical.tree !== tree)) return null
    const live = liveState?.liveStars?.find(star => Number(star?.skillId) === Number(canonical.eso_skill_id))
    const liveJumps = Array.isArray(live?.jumpPoints) ? live.jumpPoints.map(Number).filter(n => n > 0) : []
    const first = liveJumps[0] || (canonical.unlock_points_verified ? canonical.unlock_points : 0) || canonical.jump_points?.[0] || canonical.max_points
    return resolveCpNode({ id, first_pass_points: first }, tree)
  }).filter(Boolean)
  return { nodes, verified, source }
}

/**
 * Expand a build's strategy into the actual constellation route.
 * Build rows describe priorities; the catalog supplies ESO facts and prerequisite paths.
 */
export function expandCpPlan(plan, tree = null, liveState = null) {
  const authored = cpAuthoredNodes(plan, tree)
  const recommended = authored.filter(row => !row.optional)
  const route = []
  const byId = new Map()
  const authoredById = new Map(authored.map(row => [row.node.id, row]))

  const add = (node, meta = {}) => {
    if (!node) return null
    const existing = byId.get(node.id)
    const authoredRow = authoredById.get(node.id)
    const first = Math.max(
      cpWhole(existing?.first_pass_points, 0),
      cpWhole(meta.first_pass_points, 0),
      cpWhole(authoredRow?.node?.first_pass_points, 0),
      meta.prerequisite ? cpWhole(node.unlock_points, 1) : cpWhole(node.first_pass_points, 0)
    )
    const target = authoredRow
      ? Math.max(first, cpWhole(authoredRow.node.target_points, authoredRow.node.max_points))
      : Math.max(first, cpWhole(existing?.target_points, first))

    if (existing) {
      existing.first_pass_points = Math.min(existing.node.max_points, first)
      existing.target_points = Math.min(existing.node.max_points, target)
      if (authoredRow) {
        existing.authored = true
        existing.section = authoredRow.section
        existing.group = authoredRow.group
        existing.optional = authoredRow.optional
        existing.node = { ...node, ...authoredRow.node }
      }
      return existing
    }

    const entry = {
      node: authoredRow ? { ...node, ...authoredRow.node } : node,
      id: node.id,
      authored: !!authoredRow,
      prerequisite: meta.prerequisite === true && !authoredRow,
      requiredFor: meta.requiredFor || null,
      section: authoredRow?.section || 'prerequisite',
      group: authoredRow?.group || null,
      optional: authoredRow?.optional === true,
      routeVerified: meta.routeVerified !== false,
      routeSource: meta.routeSource || null,
      first_pass_points: Math.min(node.max_points, Math.max(0, first)),
      target_points: Math.min(node.max_points, Math.max(0, target))
    }
    byId.set(node.id, entry)
    route.push(entry)
    return entry
  }

  const unresolvedPaths = []
  for (const row of recommended) {
    const prereqRoute = prerequisiteRouteFor(row, tree, liveState, route.map(entry => entry.id))
    for (const prereq of prereqRoute.nodes) add(prereq, { prerequisite: true, requiredFor: row.node.id, routeSource: prereqRoute.source })
    const entry = add(row.node, { prerequisite: false, routeSource: prereqRoute.source })
    if (entry) entry.routeVerified = prereqRoute.verified
    if (!prereqRoute.verified) unresolvedPaths.push({ id: row.node.id, node: row.node, section: row.section, group: row.group })
  }

  const optionalGroups = []
  const { flex } = planSections(plan)
  for (const group of flex.filter(group => group.optional === true)) {
    const entries = []
    const seen = new Set()
    for (const raw of group.nodes || []) {
      const target = resolveCpNode(raw, tree)
      if (!target) continue
      const prereqRoute = prerequisiteRouteFor({ node: target }, tree, liveState)
      for (const prereq of prereqRoute.nodes) {
        if (seen.has(prereq.id)) continue
        seen.add(prereq.id)
        entries.push({ node: prereq, first_pass_points: prereq.unlock_points || prereq.first_pass_points, target_points: prereq.unlock_points || prereq.first_pass_points, prerequisite: true, requiredFor: target.id, optional: true, routeVerified: prereqRoute.verified, routeSource: prereqRoute.source })
      }
      if (!seen.has(target.id)) {
        seen.add(target.id)
        entries.push({ node: target, first_pass_points: target.first_pass_points, target_points: target.target_points, optional: true, routeVerified: prereqRoute.verified, routeSource: prereqRoute.source })
      }
    }
    optionalGroups.push({ group, entries })
  }

  return { route, authored, optionalGroups, unresolvedPaths }
}

function stageFor(node, points) {
  const jumps = (node?.jump_points || []).map(Number).filter(n => Number.isFinite(n) && n <= points)
  return jumps.length ? Math.max(...jumps) : 0
}

function allocateRoute(route, budget) {
  const points = new Map(route.map(item => [item.id, 0]))
  let remaining = budget
  const firstPassSteps = []
  const laterSteps = []

  const spendTo = (item, target, phase, steps) => {
    const current = points.get(item.id) || 0
    const safeTarget = Math.max(current, Math.min(item.node.max_points, cpWhole(target, current)))
    const needed = Math.max(0, safeTarget - current)
    const spent = Math.min(remaining, needed)
    if (spent > 0) points.set(item.id, current + spent)
    remaining -= spent
    steps.push({ id: item.id, target: safeTarget, before: current, spent, after: current + spent, phase, item })
  }

  for (const item of route) spendTo(item, item.first_pass_points, 'first-pass', firstPassSteps)
  for (const item of route.filter(item => item.authored && item.target_points > item.first_pass_points)) spendTo(item, item.target_points, 'later', laterSteps)

  return { points, remaining, firstPassSteps, laterSteps }
}

function nextInstruction(route, planned, observedState = null) {
  const source = observedState?.discipline ? observedState.points : planned.points
  const phaseRows = [
    ...route.map(item => ({ item, target: item.first_pass_points, phase: 'first-pass' })),
    ...route.filter(item => item.authored && item.target_points > item.first_pass_points).map(item => ({ item, target: item.target_points, phase: 'later' }))
  ]
  for (const row of phaseRows) {
    const current = Math.max(0, Number(source.get(row.item.id)) || 0)
    if (current < row.target) return {
      node: row.item.node,
      item: row.item,
      points: current,
      target: row.target,
      add: row.target - current,
      phase: row.phase,
      observed: !!observedState?.discipline,
      requiredFor: row.item.requiredFor || null
    }
  }
  return null
}

/**
 * Spend a constellation budget using an unlock-aware first pass, then return to
 * authored stars for eventual targets. Optional branches are shown but never auto-spent.
 */
export function allocateCp(plan, total, options = {}) {
  const budget = Math.max(0, Math.min(CP_TREE_MAX, Math.trunc(Number(total) || 0)))
  const tree = options.tree || plan?.tree || null
  const observed = observedCpState(options.observedChampion, tree)
  const expanded = expandCpPlan(plan, tree, observed)
  const planned = allocateRoute(expanded.route, budget)
  const next = nextInstruction(expanded.route, planned, observed)

  const allocationById = new Map()
  const routeEntries = expanded.route.map(item => {
    const points = planned.points.get(item.id) || 0
    const actualPoints = observed.discipline ? (observed.points.get(item.id) || 0) : null
    const entry = {
      node: { ...item.node, first_pass_points: item.first_pass_points, target_points: item.target_points },
      points,
      actualPoints,
      stage: stageFor(item.node, points),
      full: points >= item.target_points,
      firstPassComplete: points >= item.first_pass_points,
      prerequisite: item.prerequisite,
      requiredFor: item.requiredFor,
      authored: item.authored,
      section: item.section,
      group: item.group,
      optional: false
    }
    allocationById.set(item.id, entry)
    return entry
  })

  const { core, flex } = planSections(plan)
  const coreIds = new Set(core.map(row => row?.id))
  const coreEntries = routeEntries.filter(entry => coreIds.has(entry.node.id) || (entry.prerequisite && routeEntries.findIndex(x => x.node.id === entry.node.id) < routeEntries.findIndex(x => coreIds.has(x.node.id))))
  const coreTargetIds = new Set(core.map(row => row?.id))
  const coreCapacity = routeEntries.filter(entry => coreTargetIds.has(entry.node.id)).reduce((sum, entry) => sum + entry.node.first_pass_points, 0)
  const corePoints = routeEntries.filter(entry => coreTargetIds.has(entry.node.id)).reduce((sum, entry) => sum + Math.min(entry.points, entry.node.first_pass_points), 0)

  const groups = flex.map(group => {
    const optional = group.optional === true
    const ids = new Set((group.nodes || []).map(node => node?.id))
    let entries
    if (optional) {
      const source = expanded.optionalGroups.find(row => row.group.id === group.id)?.entries || []
      entries = source.map(item => ({
        node: { ...item.node, first_pass_points: item.first_pass_points, target_points: item.target_points },
        points: 0, actualPoints: observed.discipline ? (observed.points.get(item.node.id) || 0) : null,
        stage: 0, full: false, firstPassComplete: false, prerequisite: item.prerequisite, requiredFor: item.requiredFor, optional: true
      }))
    } else {
      // Include catalog-inserted prerequisites immediately before this group's authored targets.
      const targetIndexes = routeEntries.map((entry, index) => ids.has(entry.node.id) ? index : -1).filter(index => index >= 0)
      const firstIndex = targetIndexes.length ? Math.min(...targetIndexes) : -1
      const priorBoundary = flex.slice(0, flex.indexOf(group)).filter(g => g.optional !== true).flatMap(g => g.nodes || []).map(n => routeEntries.findIndex(e => e.node.id === n.id)).filter(i => i >= 0)
      const boundary = priorBoundary.length ? Math.max(...priorBoundary) : -1
      entries = routeEntries.filter((entry, index) => ids.has(entry.node.id) || (entry.prerequisite && index > boundary && (firstIndex < 0 || index <= Math.max(...targetIndexes))))
    }
    const capacity = entries.reduce((sum, entry) => sum + (optional ? entry.node.target_points : (entry.authored ? entry.node.target_points : entry.node.first_pass_points)), 0)
    const points = optional ? 0 : entries.reduce((sum, entry) => sum + entry.points, 0)
    return { group, entries, capacity, points, optional, full: !optional && capacity > 0 && entries.every(entry => entry.points >= (entry.authored ? entry.node.target_points : entry.node.first_pass_points)) }
  })

  const firstPassCapacity = expanded.route.reduce((sum, item) => sum + item.first_pass_points, 0)
  const routeCapacity = expanded.route.reduce((sum, item) => sum + (item.authored ? item.target_points : item.first_pass_points), 0)
  const spentOnRoute = budget - planned.remaining
  const hasObservedAllocation = !!observed.discipline
  const observedFirstPassSpent = hasObservedAllocation
    ? expanded.route.reduce((sum, item) => sum + Math.min(Math.max(0, Number(observed.points.get(item.id)) || 0), item.first_pass_points), 0)
    : Math.min(spentOnRoute, firstPassCapacity)
  const observedRouteSpent = hasObservedAllocation
    ? expanded.route.reduce((sum, item) => {
      const cap = item.authored ? item.target_points : item.first_pass_points
      return sum + Math.min(Math.max(0, Number(observed.points.get(item.id)) || 0), cap)
    }, 0)
    : spentOnRoute
  const unassigned = hasObservedAllocation ? observed.unspent : planned.remaining
  const firstPassComplete = hasObservedAllocation
    ? expanded.route.every(item => (observed.points.get(item.id) || 0) >= item.first_pass_points)
    : expanded.route.every(item => (planned.points.get(item.id) || 0) >= item.first_pass_points)

  return {
    total: budget,
    tree,
    core: coreEntries,
    coreCapacity,
    corePoints,
    coreComplete: coreCapacity === 0 || corePoints >= coreCapacity,
    coreRemaining: Math.max(0, coreCapacity - corePoints),
    groups,
    flexPoints: Math.max(0, spentOnRoute - corePoints),
    flexCapacity: Math.max(0, routeCapacity - coreCapacity),
    optionalCapacity: groups.filter(group => group.optional).reduce((sum, group) => sum + group.capacity, 0),
    unassigned,
    plannedUnassigned: planned.remaining,
    firstPassSpent: observedFirstPassSpent,
    routeSpent: observedRouteSpent,
    totalSpent: hasObservedAllocation ? observed.spent : spentOnRoute,
    next,
    allocations: [...routeEntries, ...groups.filter(group => group.optional).flatMap(group => group.entries)],
    route: routeEntries,
    firstPassCapacity,
    routeCapacity,
    firstPassComplete,
    laterUpgrades: expanded.route.filter(item => item.authored && item.target_points > item.first_pass_points).map(item => allocationById.get(item.id)).filter(Boolean),
    observed,
    unresolvedPaths: expanded.unresolvedPaths,
    overCap: Math.max(0, Math.trunc(Number(total) || 0) - budget)
  }
}

export function cpPlanCapacity(plan, tree = null) {
  const expanded = expandCpPlan(plan, tree)
  return expanded.route.reduce((sum, item) => sum + (item.authored ? item.target_points : item.first_pass_points), 0)
}

/**
 * Exact attribute points earned from levels 1-50.
 * Most level-ups grant one point, levels ending in 5 grant two, and multiples of 10 grant three.
 */
export function attributePointsForLevel(level) {
  const value = Math.max(1, Math.min(50, Math.trunc(Number(level) || 1)))
  let points = 0
  for (let reached = 2; reached <= value; reached += 1) {
    if (reached % 10 === 0) points += 3
    else if (reached % 10 === 5) points += 2
    else points += 1
  }
  return points
}

export const ATTRIBUTE_KEYS = ['magicka', 'health', 'stamina']

export function readAttributes(source) {
  const out = {}
  for (const key of ATTRIBUTE_KEYS) {
    const n = Number(source?.[key])
    out[key] = Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0
  }
  return out
}
export function attributeTotal(source) { return ATTRIBUTE_KEYS.reduce((sum, key) => sum + readAttributes(source)[key], 0) }

export function attributeSummary(character, build) {
  const actual = readAttributes(character?.attributes)
  const target = readAttributes(build?.defaults?.attributes)
  const available = attributePointsForLevel(character?.level)
  const spent = attributeTotal(actual)
  const difference = {}
  for (const key of ATTRIBUTE_KEYS) difference[key] = actual[key] - target[key]
  return {
    actual, target, available, spent,
    targetTotal: attributeTotal(target),
    remaining: available - spent,
    overAvailable: Math.max(0, spent - available),
    matchesTarget: ATTRIBUTE_KEYS.every(key => actual[key] === target[key]),
    difference
  }
}

// Build files list passive ranks as separate rows ("Fated Fortune I", "Fated Fortune II") and rarely
// wire requires between them. Derive that order instead of trusting whoever wrote the JSON.
const requirementCache = new WeakMap()
function requirementMap(build) {
  if (!build) return new Map()
  const cached = requirementCache.get(build)
  if (cached) return cached
  const map = new Map()
  for (const lineMap of buildIndex(build).byLine.values()) {
    for (const family of lineMap.values()) {
      family.forEach((item, index) => {
        const explicit = (item.requires || []).filter(id => typeof id === 'string')
        const priorRank = index > 0 ? [family[index - 1].id] : []
        map.set(item.id, [...new Set([...explicit, ...priorRank])])
      })
    }
  }
  requirementCache.set(build, map)
  return map
}
export function requirementsFor(build, itemId) { return requirementMap(build).get(itemId) || [] }


export function effectiveCompletedSet(build, character) {
  const index = buildIndex(build)
  const completed = new Set()
  const raw = new Set(character?.completed || [])

  // Preserve manual/legacy completion rows that already use build unlock ids.
  for (const id of raw) if (index.byItemId.has(id)) completed.add(id)

  // Synced ESO characters store catalog skill allocations rather than build-row ids.
  // Translate those authoritative allocations back into the build's unlock rows so
  // overview/recommendation logic and the full skill-line pages agree.
  for (const [skillId, family] of index.bySkillId) {
    const allocation = Math.max(0, Number(character?.skill_allocations?.[skillId]) || 0)
    if (!allocation) continue
    const skillHit = catalogSkillMap.get(skillId)?.skill
    if (skillHit?.type === 'Passive') {
      family.slice(0, allocation).forEach(item => completed.add(item.id))
    } else {
      family.forEach(item => completed.add(item.id))
    }
  }
  return completed
}

function temporaryStateOverride(item, character) {
  if (item?.status !== 'temporary') return null
  const value = character?.temporary_unlock_states?.[item.id]
  return value === 'retired' || value === 'active' ? value : null
}

export function temporaryRetirementState(item, character, build = null) {
  if (item?.status !== 'temporary') return { retired: false, source: null, reason: '' }
  const override = temporaryStateOverride(item, character)
  if (override === 'retired') return { retired: true, source: 'manual', reason: 'Marked done by you.' }
  if (override === 'active') return { retired: false, source: 'manual-active', reason: 'Kept active by you.' }

  const rule = item.retire_when
  if (!isObj(rule)) return { retired: false, source: null, reason: '' }
  if (rule.type === 'character_level') {
    const target = Math.max(1, Math.min(50, Math.trunc(Number(rule.level) || 0)))
    const current = Math.max(1, Math.trunc(Number(character?.level) || 1))
    if (target && current >= target) return { retired: true, source: 'build', reason: `Build cutoff reached at character level ${target}.` }
  }
  if (rule.type === 'skill_line_rank') {
    const line = typeof rule.line === 'string' && rule.line ? rule.line : item.line
    const target = Math.max(0, Math.trunc(Number(rule.rank) || 0))
    const current = Math.max(0, Math.trunc(Number(character?.skill_ranks?.[line]) || 0))
    if (target && current >= target) {
      const name = catalogLineMap.get(line)?.name || line
      return { retired: true, source: 'build', reason: `${name} reached Rank ${target}, the build's cutoff for this temporary step.` }
    }
  }
  if (rule.type === 'unlock_completed' && build && typeof rule.unlock_id === 'string' && rule.unlock_id) {
    if (effectiveCompletedSet(build, character).has(rule.unlock_id)) {
      const replacement = buildIndex(build).byItemId.get(rule.unlock_id)
      return { retired: true, source: 'build', reason: replacement ? `Replaced by ${replacement.name}.` : 'The build replacement is complete.' }
    }
  }
  return { retired: false, source: null, reason: '' }
}

const authoredSkillPointCost = item => Math.max(0, item?.skill_point_cost === undefined ? 1 : Number(item?.skill_point_cost) || 0)

// A base ability's point is not really free while a morph of it is still slotted.
// Refunding the base in ESO would drop the morph the character is actually using, so
// return that morph's name to explain why the point stays spent for now.
function activeMorphBlockingReclaim(item, build, character, completed) {
  const morphIds = catalogSkillMap.get(item?.catalog_skill_id)?.skill?.morph_ids
  if (!Array.isArray(morphIds) || !morphIds.length) return null
  const completedRaw = new Set(character?.completed || [])
  const index = buildIndex(build)

  for (const morphId of morphIds) {
    const hit = catalogSkillMap.get(morphId)
    if (!hit) continue
    const owned = effectiveAllocation(character, build, hit.line.id, hit.skill) > 0 || completedRaw.has(morphId)
    if (!owned) continue

    const rows = index.bySkillId.get(morphId) || []
    if (!rows.length) return hit.skill.name || 'a morph'

    const activeRow = rows.find(row => completed.has(row.id) && !temporaryRetirementState(row, character, build).retired)
    if (activeRow) return activeRow.name || hit.skill.name || 'a morph'
  }
  return null
}

export function reclaimablePointsFor(item, build, character) {
  const completed = effectiveCompletedSet(build, character)
  if (!completed.has(item?.id)) return 0
  if (activeMorphBlockingReclaim(item, build, character, completed)) return 0
  return authoredSkillPointCost(item)
}

export function retiredTemporaryUnlocks(build, character) {
  if (!build) return []
  const completed = effectiveCompletedSet(build, character)
  return (build.unlock_order || [])
    .filter(item => item?.status === 'temporary')
    .map(item => {
      const retirement = temporaryRetirementState(item, character, build)
      const owned = completed.has(item.id)
      const blockingMorph = owned ? activeMorphBlockingReclaim(item, build, character, completed) : null
      return {
        ...item,
        retirement,
        owned,
        reclaim_blocked_by: blockingMorph,
        reclaimable_points: owned && !blockingMorph ? authoredSkillPointCost(item) : 0
      }
    })
    .filter(item => item.retirement.retired)
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0))
}

function catalogPassiveRankGate(item, build) {
  if (!item?.catalog_skill_id || !build) return 0
  const hit = catalogSkillMap.get(item.catalog_skill_id)
  const gates = hit?.skill?.unlock_ranks
  if (hit?.skill?.type !== 'Passive' || !Array.isArray(gates) || !gates.length) return 0
  const family = buildIndex(build).bySkillId.get(item.catalog_skill_id) || []
  const index = family.findIndex(row => row.id === item.id)
  return index >= 0 ? Math.max(0, Number(gates[index]) || 0) : 0
}

export function requiredRankFor(item, build = null) {
  const authored = Math.max(0, Number(item?.required_rank) || 0)
  const catalog = Math.max(0, Number(catalogSkillMap.get(item?.catalog_skill_id)?.skill?.required_rank) || 0)
  const passivePointGate = catalogPassiveRankGate(item, build)
  // The catalog is allowed to raise an older authored gate. Per-point passive gates are especially
  // important because rank I and rank II/III often unlock at very different skill-line ranks.
  return Math.max(authored, catalog, passivePointGate)
}

export function unlockState(item, character, build = null) {
  if (temporaryRetirementState(item, character, build).retired) return 'retired'
  const completed = build ? effectiveCompletedSet(build, character) : new Set(character?.completed || [])
  if (completed.has(item.id)) return 'complete'
  const requires = build ? requirementsFor(build, item.id) : (item.requires || [])
  if (requires.some(id => !completed.has(id))) return 'blocked'
  const rank = item.line ? Number(character?.skill_ranks?.[item.line] || 0) : Infinity
  if (rank < requiredRankFor(item, build)) return 'locked'
  // ATTB cannot prove the base ability has reached rank IV yet, so a morph is a training target,
  // not an immediately purchasable recommendation.
  if (item.kind === 'Morph') return 'train'
  return 'available'
}

const STATE_ORDER = { available: 0, train: 1, locked: 2, blocked: 3, complete: 4, retired: 5 }
function lineRankGap(item, character, build) {
  if (!item?.line) return 0
  const current = Number(character?.skill_ranks?.[item.line] || 0)
  return Math.max(0, requiredRankFor(item, build) - current)
}
export function recommendedUnlocks(build, character) {
  return (build?.unlock_order || [])
    .map(item => ({ ...item, state: unlockState(item, character, build) }))
    .sort((a, b) => {
      const state = STATE_ORDER[a.state] - STATE_ORDER[b.state]
      if (state) return state
      if (a.state === 'locked') {
        const distance = lineRankGap(a, character, build) - lineRankGap(b, character, build)
        if (distance) return distance
      }
      return (Number(a.priority) || 0) - (Number(b.priority) || 0)
    })
}

// "Do these next" must mean exactly that: every row returned here is purchasable from the
// character state ATTB currently knows. Locked/blocked rows and morph-training reminders stay on
// the full line pages instead of masquerading as Suggested Next Picks.
export function actionableUnlocks(build, character) {
  const points = Math.max(0, Number(character?.actual_unspent_skill_points) || 0)
  return recommendedUnlocks(build, character).filter(item => {
    if (item.state !== 'available') return false
    const hit = catalogSkillMap.get(item?.catalog_skill_id)
    const catalogSkill = hit?.skill
    // If this row spends a special currency (for example Class Mastery), ATTB does not currently
    // track that currency balance. Exclude it from "Do these next" rather than claim it is buyable.
    if (catalogSkill?.currency && catalogSkill.currency !== 'skill_point') return false

    // For passives, an authored build row is not enough proof that the live ESO rank gate is still
    // correct. Verified per-point gates live in the catalog. Until a passive has those gates, the
    // conservative safe point is the skill-line maximum, where every rank in that line is unlocked.
    // This intentionally prefers a missed suggestion over another false "AVAILABLE" card.
    if (catalogSkill?.type === 'Passive' && catalogPassiveRankGate(item, build) <= 0) {
      const currentRank = Number(character?.skill_ranks?.[item.line] || 0)
      const lineMax = Math.max(1, Number(hit?.line?.max_rank || catalogLineMap.get(item.line)?.max_rank) || 50)
      if (currentRank < lineMax) return false
    }

    const cost = Math.max(1, Number(item.skill_point_cost) || 1)
    return points >= cost
  })
}

export function currentPhase(build, level, championPoints = 0, loadoutId = '') {
  const phases = build?.phases || []
  const value = Number(level) || 0
  const cp = Math.max(0, Math.trunc(Number(championPoints) || 0))
  const scoped = phases.filter(phase => !Array.isArray(phase?.loadout_ids) || !phase.loadout_ids.length || phase.loadout_ids.includes(loadoutId))
  const levelMatches = scoped.filter(phase => value >= Number(phase?.min_level ?? 0) && value <= Number(phase?.max_level ?? Infinity))
  return levelMatches.find(phase => cp >= Number(phase?.min_cp ?? 0) && cp <= Number(phase?.max_cp ?? Infinity))
    || levelMatches.at(-1)
    || scoped.at(-1)
    || null
}

// Stable piece IDs keep equipment progress attached to the same physical slot across display-text changes.
export function pieceKey(piece, index) { return piece?.id ? `id:${piece.id}` : legacyPieceKey(piece, index) }
function legacyPieceKey(piece, index) { return `${index}:${piece?.slot}:${piece?.set}` }
export function isPieceChecked(gear, stageId, piece, index) {
  const stage = gear?.[stageId]
  if (!stage) return false
  return !!stage[pieceKey(piece, index)] || !!stage[legacyPieceKey(piece, index)]
}

function withRequirements(build, id, visited = new Set()) {
  if (visited.has(id)) return visited
  visited.add(id)
  for (const req of requirementsFor(build, id)) withRequirements(build, req, visited)
  return visited
}

function withDependents(build, id, out = new Set([id])) {
  for (const item of build?.unlock_order || []) {
    if (out.has(item.id)) continue
    if (requirementsFor(build, item.id).some(req => out.has(req))) {
      out.add(item.id)
      return withDependents(build, id, out)
    }
  }
  return out
}


// Keep skill_allocations in step with completed. Without this, unchecking a skill left its points on
// the Status page ledger forever.
function reconcileAllocations(build, character, completedInput, overrides = {}) {
  const completed = completedInput instanceof Set ? new Set(completedInput) : new Set(completedInput || [])
  const allocations = { ...(character?.skill_allocations || {}) }
  const pinned = new Set()
  for (const [skillId, points] of Object.entries(overrides)) {
    pinned.add(skillId)
    if (points > 0) allocations[skillId] = points; else delete allocations[skillId]
  }
  for (const [skillId, family] of buildIndex(build).bySkillId) {
    if (pinned.has(skillId)) continue
    const owned = family.filter(item => completed.has(item.id)).length
    if (owned) allocations[skillId] = owned; else delete allocations[skillId]
  }
  return { completed: [...completed], allocations }
}

// Single place that decides what "checking this thing" means. The main process, the skill line page,
// and the status page each used to have their own copy, and they drifted.
export function applyCompletionChange(build, character, itemId, done) {
  const completed = new Set(character?.completed || [])
  if (done) for (const id of withRequirements(build, itemId)) completed.add(id)
  else for (const id of withDependents(build, itemId)) completed.delete(id)
  return reconcileAllocations(build, character, completed)
}

// Selecting a catalog skill directly: set its points, then mirror that onto the build's unlock rows.
export function applyAllocationChange(build, character, lineId, skill, points, siblingSkills = []) {
  const max = Number(skill?.max_points) || 1
  const value = Math.max(0, Math.min(max, Number(points) || 0))
  const completed = new Set(character?.completed || [])
  const overrides = {}

  const setSkill = (target, targetPoints) => {
    overrides[target.id] = targetPoints
    const family = buildIndex(build).bySkillId.get(target.id) || buildIndex(build).byLine.get(lineId)?.get(normalizeSkillName(target.name)) || []
    if (target.type === 'Passive') {
      family.forEach((item, index) => {
        if (index < targetPoints) for (const id of withRequirements(build, item.id)) completed.add(id)
        else for (const id of withDependents(build, item.id)) completed.delete(id)
      })
    } else {
      for (const item of family) {
        if (targetPoints > 0) for (const id of withRequirements(build, item.id)) completed.add(id)
        else for (const id of withDependents(build, item.id)) completed.delete(id)
      }
    }
  }

  setSkill(skill, value)

  if (skill.type === 'Morph' && value > 0) {
    const base = siblingSkills.find(item => item.id === skill.base_id)
    if (base) {
      setSkill(base, 1)
      // ESO only lets one morph exist at a time, so drop the other branch.
      for (const siblingId of base.morph_ids || []) {
        if (siblingId === skill.id) continue
        const sibling = siblingSkills.find(item => item.id === siblingId)
        if (sibling) setSkill(sibling, 0)
      }
    }
  }
  if ((skill.type === 'Active' || skill.type === 'Ultimate') && value === 0) {
    for (const morphId of skill.morph_ids || []) {
      const morph = siblingSkills.find(item => item.id === morphId)
      if (morph) setSkill(morph, 0)
    }
  }
  return reconcileAllocations(build, character, completed, overrides)
}
