const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value)
const keyedList = list => Array.isArray(list) && list.length > 0 && list.every(item => isPlainObject(item) && typeof item.id === 'string')

// Browser-safe ES module counterpart to variantLogic.cjs. The Electron main process
// remains CommonJS, while Vite bundles this module for the renderer.
function mergeOverrides(base, override) {
  if (override === undefined) return structuredClone(base)
  if (override === null) return null
  if (Array.isArray(override)) return mergeArray(base, override)
  if (!isPlainObject(override)) return structuredClone(override)
  const out = isPlainObject(base) ? { ...base } : {}
  for (const [key, value] of Object.entries(override)) out[key] = mergeOverrides(out[key], value)
  return out
}

function mergeArray(base, override) {
  if (!keyedList(base) || !keyedList(override)) return structuredClone(override)
  const out = base.map(entry => structuredClone(entry))
  const indexById = new Map(out.map((entry, index) => [entry.id, index]))
  for (const patch of override) {
    const at = indexById.get(patch.id)
    if (patch.$remove) {
      if (at !== undefined) out[at] = null
      continue
    }
    if (at === undefined) {
      indexById.set(patch.id, out.length)
      out.push(structuredClone(patch))
      continue
    }
    out[at] = mergeOverrides(out[at], patch)
  }
  return out.filter(Boolean)
}

function changedSections(overrides) {
  if (!isPlainObject(overrides)) return []
  return Object.keys(overrides).filter(key => overrides[key] !== undefined).sort()
}

function listVariants(build) {
  return (build?.variants || []).filter(variant => variant && typeof variant.id === 'string').map(variant => ({
    ...variant,
    available: variant.available !== false,
    changes: changedSections(variant.overrides)
  }))
}

function availableVariants(build) { return listVariants(build).filter(variant => variant.available) }
function findVariant(build, variantId) { return listVariants(build).find(variant => variant.id === variantId) || null }

function defaultVariantId(build) {
  const usable = availableVariants(build)
  return usable[0]?.id || listVariants(build)[0]?.id || null
}

function describeVariant(variant) {
  if (!variant) return ''
  if (!variant.available) return variant.unavailable_reason || 'Not available in this build file.'
  if (variant.summary) return variant.summary
  if (!variant.changes.length) return 'Base build, nothing overridden.'
  return `Overrides: ${variant.changes.join(', ')}.`
}

function applyVariant(base, variantId) {
  if (!base) return null
  const variant = findVariant(base, variantId)
  const usable = variant && variant.available ? variant : null
  const overrides = isPlainObject(usable?.overrides) ? usable.overrides : {}
  const merged = mergeOverrides(base, overrides)
  merged.variants = structuredClone(base.variants || [])
  merged.id = base.id
  merged.active_variant = usable || null
  merged.variant_unavailable = variant && !variant.available ? variant : null
  return merged
}

export {
  applyVariant,
  availableVariants,
  changedSections,
  defaultVariantId,
  describeVariant,
  findVariant,
  isPlainObject,
  listVariants,
  mergeOverrides
}
