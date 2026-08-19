export const STARTING_POINTS = Object.freeze(['new_character', 'level_50', 'cp160_plus'])
export const DEFAULT_PROGRESSION_SCOPE = Object.freeze({
  starting_point: 'new_character',
  leveling_content_required: true,
  description: ''
})

function isObj(value) { return !!value && typeof value === 'object' && !Array.isArray(value) }

export function resolveProgressionScope(input) {
  const scope = isObj(input?.progression_scope) ? input.progression_scope : isObj(input) ? input : null
  if (!scope || !STARTING_POINTS.includes(scope.starting_point)) return { ...DEFAULT_PROGRESSION_SCOPE }
  return {
    starting_point: scope.starting_point,
    leveling_content_required: typeof scope.leveling_content_required === 'boolean'
      ? scope.leveling_content_required
      : scope.starting_point === 'new_character',
    description: typeof scope.description === 'string' ? scope.description : ''
  }
}

export function scopeForStartingPoint(startingPoint, description = '') {
  const safe = STARTING_POINTS.includes(startingPoint) ? startingPoint : 'new_character'
  return {
    starting_point: safe,
    leveling_content_required: safe === 'new_character',
    ...(description ? { description } : {})
  }
}

export function inferStartingPoint({ level = 1, championPoints = 0 } = {}) {
  const safeLevel = Number(level) || 1
  const safeCp = Math.max(0, Number(championPoints) || 0)
  if (safeLevel < 50) return 'new_character'
  return safeCp >= 160 ? 'cp160_plus' : 'level_50'
}

