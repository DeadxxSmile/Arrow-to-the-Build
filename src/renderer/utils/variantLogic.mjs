export {
  applyBuildSelection,
  applyLoadout,
  applyVariant,
  availableLoadouts,
  availableVariants,
  changedSections,
  defaultLoadoutId,
  defaultVariantId,
  describeLoadout,
  describeVariant,
  findLoadout,
  findVariant,
  listLoadouts,
  listVariants,
  mergeOverrides
} from '../../shared/variantLogic.mjs'

export function displayVariantName(variant) {
  const name = variant?.name || 'Base'
  if (variant?.changes?.length || /\(base\)\s*$/i.test(name)) return name
  return `${name} (base)`
}
