export type {
  WebsiteTemplate,
  TemplateCategory,
  TemplateStyle,
  TemplateFeature,
  TemplateCatalogItem,
  TemplateFilter,
  InstantiateTemplateOptions,
  InstantiateTemplateResult,
  TemplateBrandPreset,
  TemplatePageDef,
  TemplateSectionDef,
  TemplateNavItem,
} from "@/lib/templates/types";
export { TEMPLATE_SCHEMA_VERSION, sectionTypeFromBlockId } from "@/lib/templates/types";
export {
  TEMPLATE_CATEGORIES,
  TEMPLATE_STYLES,
  isTemplateCategory,
  isTemplateStyle,
} from "@/lib/templates/categories";
export {
  BUSINESS_TYPE_CATEGORY_MAP,
  recommendedCategoriesForBusinessType,
  listBusinessTypes,
  type BusinessTypeId,
} from "@/lib/templates/business-types";
export {
  registerTemplate,
  getTemplate,
  getTemplateBySlug,
  getTemplates,
  resetTemplateRegistry,
} from "@/lib/templates/registry";
export {
  getTemplateCatalog,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  filterTemplates,
  toCatalogItem,
  listCatalogCategories,
  listCatalogStyles,
} from "@/lib/templates/catalog";
export {
  instantiateTemplate,
  instantiateTemplateDefinition,
  resolveNavHrefForPageId,
} from "@/lib/templates/instantiate";
export {
  validateTemplate,
  TemplateValidationError,
} from "@/lib/templates/validation";
export {
  migrateTemplate,
  currentTemplateSchemaVersion,
} from "@/lib/templates/migration";
export { ALL_WEBSITE_TEMPLATES } from "@/lib/templates/templates";
export { defineTemplate, page, sec } from "@/lib/templates/define";
export { BRAND_LUXURY, BRAND_EDITORIAL, BRAND_MODERN } from "@/lib/templates/brand-presets";
export {
  buildCanonicalTemplateContent,
  sanitizeExternalUrl,
} from "@/lib/templates/canonical-content";
