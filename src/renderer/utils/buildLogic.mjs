import { buildIndex, catalogLineMap, catalogSkillMap, effectiveAllocation, normalizeSkillName } from './catalogLogic.mjs'

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

function fill(nodes, remaining) {
  const out = []
  for (const node of nodes || []) {
    const max = Math.max(0, Math.trunc(Number(node?.max_points) || 0))
    const points = Math.min(remaining, max)
    remaining -= points
    const jumps = (node?.jump_points || []).map(Number).filter(n => Number.isFinite(n) && n <= points)
    out.push({ node: { ...node, max_points: max }, points, stage: jumps.length ? Math.max(...jumps) : 0, full: max > 0 && points === max })
  }
  return { entries: out, remaining }
}

/**
 * Spend a constellation total: core path first, then each flex group in order.
 * Anything left once every listed star is full is "unassigned", meaning free points, not an error.
 */
export function allocateCp(plan, total) {
  const budget = Math.max(0, Math.min(CP_TREE_MAX, Math.trunc(Number(total) || 0)))
  const { core, flex } = planSections(plan)

  const coreFill = fill(core, budget)
  const coreCapacity = core.reduce((sum, n) => sum + Math.max(0, Math.trunc(Number(n?.max_points) || 0)), 0)
  const corePoints = budget - coreFill.remaining
  const coreComplete = corePoints >= coreCapacity

  let remaining = coreFill.remaining
  const groups = []
  for (const group of flex) {
    const capacity = group.nodes.reduce((sum, n) => sum + Math.max(0, Math.trunc(Number(n?.max_points) || 0)), 0)
    const optional = group.optional === true
    // Optional branches are real alternatives, not a command to spend every leftover point there.
    const filled = optional ? fill(group.nodes, 0) : fill(group.nodes, remaining)
    const spent = optional ? 0 : remaining - filled.remaining
    if (!optional) remaining = filled.remaining
    groups.push({ group, entries: filled.entries, capacity, points: spent, optional, full: !optional && capacity > 0 && spent === capacity })
  }

  const recommendedGroups = groups.filter(group => !group.optional)
  const allEntries = [...coreFill.entries, ...recommendedGroups.flatMap(g => g.entries)]
  return {
    total: budget,
    core: coreFill.entries,
    coreCapacity,
    corePoints,
    coreComplete,
    coreRemaining: Math.max(0, coreCapacity - corePoints),
    groups,
    flexPoints: budget - corePoints,
    flexCapacity: recommendedGroups.reduce((sum, g) => sum + g.capacity, 0),
    optionalCapacity: groups.filter(group => group.optional).reduce((sum, g) => sum + g.capacity, 0),
    unassigned: remaining,
    next: allEntries.find(x => x.points < x.node.max_points) || null,
    allocations: [...coreFill.entries, ...groups.flatMap(g => g.entries)],
    overCap: Math.max(0, Math.trunc(Number(total) || 0) - budget)
  }
}

export function cpPlanCapacity(plan) {
  const { core, flex } = planSections(plan)
  const sum = nodes => (nodes || []).reduce((n, node) => n + Math.max(0, Math.trunc(Number(node?.max_points) || 0)), 0)
  return sum(core) + flex.reduce((n, group) => n + sum(group.nodes), 0)
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
export function legacyPieceKey(piece, index) { return `${index}:${piece?.slot}:${piece?.set}` }
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

// Public build rows carry catalog_skill_id. The name fallback only supports in-memory test fixtures.
const skillIdCache = new WeakMap()
export function catalogSkillIdFor(build, lineId, item) {
  if (item?.catalog_skill_id) return item.catalog_skill_id
  let cache = skillIdCache.get(build)
  if (!cache) { cache = new Map(); skillIdCache.set(build, cache) }
  const target = normalizeSkillName(item?.name)
  const key = `${lineId}::${target}`
  if (cache.has(key)) return cache.get(key)
  const hits = (catalogLineMap.get(lineId)?.skills || []).filter(skill => normalizeSkillName(skill.name) === target)
  const value = hits.length === 1 ? hits[0].id : null
  cache.set(key, value)
  return value
}

// Keep skill_allocations in step with completed. Without this, unchecking a skill left its points on
// the Status page ledger forever.
export function reconcileAllocations(build, character, completedInput, overrides = {}) {
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
