import type { BusinessProfile } from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";
import type { BusinessIntelligenceProvider } from "@/lib/ai/business-intelligence";
import { classifyBusiness } from "@/lib/business/understanding/classifier";
import { confidenceBand, clampConfidence } from "@/lib/business/understanding/confidence";
import { resolveRecommendedModules } from "@/lib/business/understanding/modules";
import { hasVertical } from "@/lib/store/verticals/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { hasSection } from "@/lib/store/registry/catalog";
import { getRecipe } from "@/lib/store/recipes/registry";

export type BusinessUnderstandingMode = "deterministic" | "ai" | "hybrid";

function validateAnalysis(
  analysis: BusinessAnalysis,
  baseline: BusinessAnalysis,
): BusinessAnalysis {
  const vertical = hasVertical(analysis.vertical)
    ? resolveVerticalId(analysis.vertical)
    : baseline.vertical;

  const confidence = clampConfidence(analysis.confidence);
  const band = confidenceBand(confidence);
  const modules = (analysis.recommendedModules?.length
    ? analysis.recommendedModules
    : resolveRecommendedModules({ vertical, confidenceBand: band })
  ).filter((type) => hasSection(type));

  const templateCandidate =
    analysis.recommendedTemplate && getRecipe(analysis.recommendedTemplate)
      ? analysis.recommendedTemplate
      : baseline.recommendedTemplate;

  return {
    ...baseline,
    ...analysis,
    vertical,
    confidence,
    confidenceBand: band,
    recommendedModules: modules,
    recommendedTemplate: templateCandidate,
    productAttributes: analysis.productAttributes ?? baseline.productAttributes,
    source: analysis.source === "ai" ? "ai" : analysis.source,
  };
}

export async function understandBusiness(params: {
  profile: BusinessProfile;
  mode?: BusinessUnderstandingMode;
  aiProvider?: BusinessIntelligenceProvider | null;
}): Promise<BusinessAnalysis> {
  const mode = params.mode ?? "deterministic";
  const baseline = classifyBusiness(params.profile);

  if (mode === "deterministic" || !params.aiProvider) {
    return baseline;
  }

  try {
    const aiResult = await params.aiProvider.analyze(params.profile);
    if (mode === "ai") {
      return validateAnalysis(
        { ...aiResult, source: "ai" },
        baseline,
      );
    }
    // hybrid: prefer AI fields but keep deterministic safety net
    return validateAnalysis(
      {
        ...baseline,
        ...aiResult,
        source: "hybrid",
        confidence: clampConfidence(
          Math.max(baseline.confidence, aiResult.confidence ?? 0),
        ),
        recommendedModules: [
          ...new Set([
            ...(aiResult.recommendedModules ?? []),
            ...baseline.recommendedModules,
          ]),
        ],
      },
      baseline,
    );
  } catch {
    return baseline;
  }
}

export function understandBusinessSync(profile: BusinessProfile): BusinessAnalysis {
  return classifyBusiness(profile);
}

export type { BusinessAnalysis } from "@/lib/business/understanding/types";
export { classifyBusiness } from "@/lib/business/understanding/classifier";
export { CONFIDENCE, confidenceBand } from "@/lib/business/understanding/confidence";
export { resolveRecommendedModules } from "@/lib/business/understanding/modules";
