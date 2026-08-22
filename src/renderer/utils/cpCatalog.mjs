import cpCatalogData from '../../../resources/data/eso-cp-catalog.json' with { type: 'json' }
import cpLayoutData from '../../../resources/data/eso-cp-layout.json' with { type: 'json' }

export const CP_CATALOG = cpCatalogData
export const CP_LAYOUT = cpLayoutData
export const CP_TREES = ['craft', 'warfare', 'fitness']

export const cpStarMap = new Map((cpCatalogData.stars || []).map(star => [star.id, star]))
export const cpStarByEsoId = new Map((cpCatalogData.stars || []).map(star => [Number(star.eso_skill_id), star]))
export const cpLayoutMap = new Map((cpLayoutData.stars || []).map(row => [row.id, row]))

export function getCpStar(id) {
  return cpStarMap.get(id) || null
}

export function getCpStarByEsoId(skillId) {
  return cpStarByEsoId.get(Number(skillId)) || null
}

export function cpStarsForTree(tree) {
  return (cpCatalogData.stars || []).filter(star => star.tree === tree)
}

export function getCpLayout(id) {
  return cpLayoutMap.get(id) || null
}

export function cpLayoutForTree(tree) {
  return (cpLayoutData.stars || []).filter(row => row.tree === tree)
}

export function cpTreeInfo(tree) {
  return cpCatalogData.trees?.[tree] || null
}

const whole = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isInteger(number) ? number : fallback
}

/**
 * Merge build-authored strategy with canonical ESO facts.
 *
 * Schema-4 legacy CP rows embedded ESO facts directly in the build. During the
 * compatibility window a legacy max lower than the catalog max means "spend this
 * much on the first pass", not that ESO's maximum is actually lower.
 */
export function resolveCpNode(node, tree = null) {
  if (!node || typeof node !== 'object') return null
  const canonical = getCpStar(node.id)
  if (!canonical) {
    const max = Math.max(0, whole(node.max_points, 0))
    const first = Math.max(0, Math.min(max, whole(node.first_pass_points, max)))
    const target = Math.max(first, Math.min(max, whole(node.target_points, max)))
    return {
      ...node,
      tree: tree || node.tree || null,
      max_points: max,
      first_pass_points: first,
      target_points: target,
      jump_points: Array.isArray(node.jump_points) ? node.jump_points.map(Number).filter(Number.isFinite) : [],
      slottable: node.slottable === true,
      unlock_points: Math.max(1, first || max || 1),
      prerequisite_path: Array.isArray(node.requires) ? [...node.requires] : [],
      catalog_backed: false
    }
  }

  const actualMax = Math.max(1, whole(canonical.max_points, 1))
  const legacyMax = whole(node.max_points, actualMax)
  const inferredFirst = legacyMax > 0 && legacyMax < actualMax ? legacyMax : actualMax
  const first = Math.max(1, Math.min(actualMax, whole(node.first_pass_points, inferredFirst)))
  const target = Math.max(first, Math.min(actualMax, whole(node.target_points, actualMax)))
  const manualRequires = Array.isArray(node.requires) ? node.requires.filter(Boolean) : null

  return {
    ...node,
    ...canonical,
    // Build-owned fields intentionally survive canonical merging.
    note: node.note || undefined,
    first_pass_points: first,
    target_points: target,
    prerequisite_path: manualRequires || [...(canonical.prerequisite_path || [])],
    manual_prerequisites: !!manualRequires,
    catalog_backed: true,
    canonical_tree_matches: !tree || canonical.tree === tree
  }
}

export function canonicalCpNode(id, overrides = {}) {
  const star = getCpStar(id)
  if (!star) return null
  return resolveCpNode({ id, ...overrides }, star.tree)
}

/** Map one addon Champion snapshot discipline into canonical ATTB star ids. */
export function observedCpState(observedChampion, tree) {
  const result = { points: new Map(), discipline: null, unspent: 0, spent: 0, earned: 0, liveStars: [] }
  if (!observedChampion || typeof observedChampion !== 'object') return result

  const disciplines = Array.isArray(observedChampion.disciplines) ? observedChampion.disciplines : []
  const discipline = disciplines.find(row => {
    const key = String(row?.tree || row?.name || '').toLowerCase()
    return key === tree || key.includes(tree)
  }) || null
  result.discipline = discipline
  if (!discipline) return result

  result.unspent = Math.max(0, whole(discipline.unspent, 0))
  result.spent = Math.max(0, whole(discipline.spent, 0))
  result.earned = result.spent + result.unspent
  result.liveStars = Array.isArray(discipline.stars) ? discipline.stars : []

  for (const live of result.liveStars) {
    const star = getCpStarByEsoId(live?.skillId) || getCpStar(live?.id)
    if (!star) continue
    result.points.set(star.id, Math.max(0, whole(live.points, 0)))
  }
  return result
}

export default cpCatalogData
