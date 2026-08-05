// Vite's renderer must consume a real ES module. Importing the CommonJS helper
// directly leaves `module.exports` in browser code and prevents React from mounting.
export {
  applyVariant,
  availableVariants,
  changedSections,
  defaultVariantId,
  describeVariant,
  findVariant,
  listVariants,
  mergeOverrides
} from '../../shared/variantLogic.mjs'
