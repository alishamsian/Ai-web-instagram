export {
  getSectionDefinition,
  hasSection,
  getSections,
  getSectionsByCategory,
  getSectionsForVertical,
  getSectionVariants,
  getLibrarySections,
  getSectionSchema,
  registerSections,
  registerSectionRenderer,
  registerSectionRenderers,
  registerVariantRenderer,
  getVariantRenderer,
  getSectionRenderer,
  resolveSectionRenderer,
  hasSectionRenderer,
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
} from "@/lib/store/registry/catalog";
export { VERTICAL_SECTION_DEFINITIONS } from "@/lib/store/registry/vertical-definitions";
export { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
export { getSectionLibraryItems } from "@/lib/store/registry/library-adapter";
export { normalizeStoreSections } from "@/lib/store/registry/normalize";
export {
  schemaToLegacyInspectorFields,
  getLegacyInspectorFieldsForSection,
} from "@/lib/store/registry/schema-adapter";
export * from "@/lib/store/registry/element-schema";
export type * from "@/lib/store/registry/types";
export type * from "@/lib/store/registry/render-contract";
export type * from "@/lib/store/registry/variant-contract";
export {
  VARIANT_RESPONSIVE_STRATEGIES,
  VARIANT_SIGNATURE_KEYS,
  isVariantResponsiveStrategy,
} from "@/lib/store/registry/variant-contract";
export {
  getVariant,
  getVariantsForSection,
  getDefaultVariant,
  isVariantSupported,
  resolveSectionVariant,
  getVariantRendererKey,
  getRecommendedVariants,
  areVariantsVisuallyDistinct,
  validateSectionVariantCatalog,
  normalizeSectionVariants,
  normalizeSectionVariant,
  signature,
} from "@/lib/store/registry/variant-api";
export type {
  VariantResolveSource,
  ResolvedSectionVariant,
  VariantCatalogValidation,
} from "@/lib/store/registry/variant-api";
export {
  resolveStoreSections,
  resolveStoreBodySections,
  resolveStoreFooterSection,
  sectionIsDimmed,
  shouldRenderFooter,
  isKnownStoreSection,
  sectionRenderKey,
} from "@/lib/store/registry/resolve";
