import { FORBIDDEN_KEYS } from './jsonSafety.mjs'

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value)
const keyedList = list => Array.isArray(list) && list.length > 0 && list.every(item => isPlainObject(item) && typeof item.id === 'string')

function safeClone(value) {
  if (Array.isArray(value)) return value.map(safeClone)
  if (!isPlainObject(value)) return structuredClone(value)
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    out[key] = safeClone(item)
  }
  return out
}

// Browser-safe counterpart to variantLogic.cjs.
function mergeOverrides(base, override) {
  if (override === undefined) return safeClone(base)
  if (override === null) return null
  if (Array.isArray(override)) return mergeArray(base, override)
  if (!isPlainObject(override)) return safeClone(override)
  const out = isPlainObject(base) ? { ...base } : {}
  for (const [key, value] of Object.entries(override)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    out[key] = mergeOverrides(out[key], value)
  }
  return out
}

function mergeArray(base, override) {
  if (!keyedList(base) || !keyedList(override)) return safeClone(override)
  const out = base.map(entry => safeClone(entry))
  const indexById = new Map(out.map((entry, index) => [entry.id, index]))
  for (const patch of override) {
    const at = indexById.get(patch.id)
    if (patch.$remove) { if (at !== undefined) out[at] = null; continue }
    if (at === undefined) { indexById.set(patch.id, out.length); out.push(safeClone(patch)); continue }
    out[at] = mergeOverrides(out[at], patch)
  }
  return out.filter(Boolean)
}

function changedSections(overrides) {
  if (!isPlainObject(overrides)) return []
  return Object.keys(overrides).filter(key => !FORBIDDEN_KEYS.has(key) && overrides[key] !== undefined).sort()
}
function mapSelections(rows) {
  return (rows || []).filter(row => row && typeof row.id === 'string').map(row => ({ ...row, available: row.available !== false, changes: changedSections(row.overrides) }))
}

function listLoadouts(build) { return mapSelections(build?.loadouts) }
function availableLoadouts(build) { return listLoadouts(build).filter(loadout => loadout.available) }
function findLoadout(build, loadoutId) { return listLoadouts(build).find(loadout => loadout.id === loadoutId) || null }
function defaultLoadoutId(build) {
  const requested = build?.default_loadout_id
  if (requested && availableLoadouts(build).some(loadout => loadout.id === requested)) return requested
  return availableLoadouts(build)[0]?.id || listLoadouts(build)[0]?.id || ''
}
function applyLoadout(base, loadoutId) {
  if (!base) return null
  const loadout = findLoadout(base, loadoutId || defaultLoadoutId(base))
  const usable = loadout && loadout.available ? loadout : null
  const merged = mergeOverrides(base, isPlainObject(usable?.overrides) ? usable.overrides : {})
  merged.loadouts = safeClone(base.loadouts || [])
  merged.default_loadout_id = base.default_loadout_id || ''
  merged.id = base.id
  merged.active_loadout = usable || null
  merged.loadout_unavailable = loadout && !loadout.available ? loadout : null
  return merged
}

function listVariants(build) { return mapSelections(build?.variants) }
function availableVariants(build, loadoutId = '') {
  return listVariants(build).filter(variant => variant.available && (!Array.isArray(variant.loadout_ids) || !variant.loadout_ids.length || variant.loadout_ids.includes(loadoutId)))
}
function findVariant(build, variantId) { return listVariants(build).find(variant => variant.id === variantId) || null }
function defaultVariantId(build, loadoutId = '') { return availableVariants(build, loadoutId)[0]?.id || listVariants(build)[0]?.id || null }
function describeSelection(selection, baseLabel) {
  if (!selection) return ''
  if (!selection.available) return selection.unavailable_reason || 'Not available in this build file.'
  if (selection.summary) return selection.summary
  if (!selection.changes.length) return baseLabel
  return `Overrides: ${selection.changes.join(', ')}.`
}
function describeVariant(variant) { return describeSelection(variant, 'Base build, nothing overridden.') }
function describeLoadout(loadout) { return describeSelection(loadout, 'Uses the base build sections.') }
function applyVariant(base, variantId, loadoutId = '') {
  if (!base) return null
  const variant = findVariant(base, variantId)
  const allowed = variant && availableVariants(base, loadoutId).some(item => item.id === variant.id)
  const usable = allowed ? variant : null
  const merged = mergeOverrides(base, isPlainObject(usable?.overrides) ? usable.overrides : {})
  merged.variants = safeClone(base.variants || [])
  merged.id = base.id
  merged.active_variant = usable || null
  merged.variant_unavailable = variant && !allowed ? variant : null
  return merged
}
function applyBuildSelection(base, loadoutId, variantId) {
  const loadoutBuild = applyLoadout(base, loadoutId)
  return applyVariant(loadoutBuild, variantId, loadoutBuild?.active_loadout?.id || '')
}

export {
  applyBuildSelection, applyLoadout, applyVariant, availableLoadouts, availableVariants, changedSections,
  defaultLoadoutId, defaultVariantId, describeLoadout, describeVariant, findLoadout, findVariant,
  isPlainObject, listLoadouts, listVariants, mergeOverrides
}
