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
} from "@/lib/business/schema";

export { normalizeBusinessProfile } from "@/lib/business/normalize";

export {
  understandBusiness,
  understandBusinessSync,
  classifyBusiness,
  CONFIDENCE,
  confidenceBand,
  resolveRecommendedModules,
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
  type GenerateWebsiteResult,
} from "@/lib/business/generation";
