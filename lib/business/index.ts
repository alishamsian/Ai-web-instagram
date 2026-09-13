export type {
  BusinessProfile,
  BusinessSource,
  BusinessProductInput,
  BusinessUnderstandingMode,
  ConfidenceBand,
} from "@/lib/business/types";

export {
  safeParseBusinessProfile,
  coerceBusinessProfile,
  businessProfileSchema,
  sanitizeHttpUrl,
} from "@/lib/business/schema";

export { normalizeBusinessProfile } from "@/lib/business/normalize";

export {
  understandBusiness,
  understandBusinessSync,
  classifyBusiness,
  CONFIDENCE,
  confidenceBand,
  clampConfidence,
  resolveRecommendedModules,
  mergeHybridAnalysis,
  type BusinessAnalysis,
} from "@/lib/business/understanding";

export {
  generateDeterministicContent,
  type GeneratedWebsiteContent,
} from "@/lib/business/content";

export {
  generateWebsiteFromBusinessProfile,
  generateWebsiteFromBusinessProfileSync,
  applyGeneratedContent,
  mapBusinessProductsToCatalog,
  isGeneratedContentPathAllowed,
  GENERATED_CONTENT_ALLOWLIST,
  type GenerateWebsiteResult,
} from "@/lib/business/generation";
