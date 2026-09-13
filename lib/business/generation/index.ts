export {
  generateWebsiteFromBusinessProfile,
  generateWebsiteFromBusinessProfileSync,
  resolveRecipeId,
  type GenerateWebsiteResult,
} from "@/lib/business/generation/pipeline";
export {
  applyGeneratedContent,
  mapBusinessProductsToCatalog,
  isGeneratedContentPathAllowed,
  GENERATED_CONTENT_ALLOWLIST,
} from "@/lib/business/generation/apply-content";
export {
  applyDataAwareComposition,
  filterSectionsByAvailableData,
  inspectBusinessData,
  sectionSatisfiesData,
  type BusinessDataAvailability,
  type SectionDataRequirements,
} from "@/lib/business/generation/data-aware";
