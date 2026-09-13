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
  getSectionRenderer,
  hasSectionRenderer,
  resetRegistryForTests,
} from "@/lib/store/registry/catalog";
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
export {
  resolveStoreSections,
  resolveStoreBodySections,
  resolveStoreFooterSection,
  sectionIsDimmed,
  shouldRenderFooter,
  isKnownStoreSection,
  sectionRenderKey,
} from "@/lib/store/registry/resolve";
