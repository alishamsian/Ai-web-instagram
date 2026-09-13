import type { BusinessProfile } from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";
import type { BusinessIntelligenceProvider } from "@/lib/ai/business-intelligence";
import { classifyBusiness } from "@/lib/business/understanding/classifier";
import {
  confidenceBand,
  clampConfidence,
} from "@/lib/business/understanding/confidence";
import { resolveRecommendedModules } from "@/lib/business/understanding/modules";
import { hasVertical } from "@/lib/store/verticals/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { hasSection } from "@/lib/store/registry/catalog";
import { getRecipe } from "@/lib/store/recipes/registry";

export type BusinessUnderstandingMode = "deterministic" | "ai" | "hybrid";

function sanitizeModules(modules: string[] | undefined, fallback: string[]) {
  const list = (modules?.length ? modules : fallback).filter((type) =>
    hasSection(type),
  );
  return [...new Set(list)];
}

/**
 * Field-specific merge — AI cannot freely overwrite trusted semantic fields.
 */
export function mergeHybridAnalysis(
  baseline: BusinessAnalysis,
  aiResult: BusinessAnalysis,
): BusinessAnalysis {
  const aiVerticalOk =
    typeof aiResult.vertical === "string" && hasVertical(aiResult.vertical);
  const vertical = aiVerticalOk
    ? resolveVerticalId(aiResult.vertical)
    : baseline.vertical;

  // AI may suggest vertical only when confidence is high and registry-valid
  const useAiVertical =
    aiVerticalOk &&
    clampConfidence(aiResult.confidence ?? 0) >= 0.85 &&
    aiResult.confidenceBand === "high";

  const resolvedVertical = useAiVertical ? vertical : baseline.vertical;

  const confidence = clampConfidence(
    Math.max(baseline.confidence, aiResult.confidence ?? 0),
  );
  const band = confidenceBand(confidence);

  const modules = sanitizeModules(
    [
      ...baseline.recommendedModules,
      // AI modules only as additive suggestions, then filtered by registry
      ...(aiResult.recommendedModules ?? []),
    ],
    resolveRecommendedModules({
      vertical: resolvedVertical,
      confidenceBand: band,
    }),
  );

  const templateCandidate =
    aiResult.recommendedTemplate && getRecipe(aiResult.recommendedTemplate)
      ? aiResult.recommendedTemplate
      : baseline.recommendedTemplate;

  // Style/mood: AI may enhance wording-level hints when baseline empty
  const style = baseline.style ?? aiResult.style ?? null;
  const mood = baseline.mood ?? aiResult.mood ?? null;

  // SubVertical: keep deterministic unless AI matches pack and baseline empty
  const subVertical = baseline.subVertical ?? null;

  return {
    ...baseline,
    vertical: resolvedVertical,
    subVertical,
    style,
    mood,
    confidence,
    confidenceBand: band,
    recommendedTemplate: templateCandidate,
    recommendedModules: modules,
    productAttributes: baseline.productAttributes,
    productSignals: baseline.productSignals,
    contentSignals: baseline.contentSignals,
    brandSignals: baseline.brandSignals,
    source: "hybrid",
    scores: baseline.scores,
    evidence: baseline.evidence,
  };
}

function validateAiOnly(
  analysis: BusinessAnalysis,
  baseline: BusinessAnalysis,
): BusinessAnalysis {
  const vertical = hasVertical(analysis.vertical)
    ? resolveVerticalId(analysis.vertical)
    : baseline.vertical;
  const confidence = clampConfidence(analysis.confidence ?? baseline.confidence);
  const band = confidenceBand(confidence);
  return {
    ...baseline,
    vertical,
    confidence,
    confidenceBand: band,
    recommendedModules: sanitizeModules(
      analysis.recommendedModules,
      baseline.recommendedModules,
    ),
    recommendedTemplate:
      analysis.recommendedTemplate && getRecipe(analysis.recommendedTemplate)
        ? analysis.recommendedTemplate
        : baseline.recommendedTemplate,
    style: analysis.style ?? baseline.style,
    mood: analysis.mood ?? baseline.mood,
    // Protect product attribute schema + source signals
    productAttributes: baseline.productAttributes,
    productSignals: baseline.productSignals,
    contentSignals: baseline.contentSignals,
    brandSignals: baseline.brandSignals,
    source: "ai",
    evidence: baseline.evidence,
    scores: analysis.scores ?? baseline.scores,
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
      return validateAiOnly({ ...aiResult, source: "ai" }, baseline);
    }
    return mergeHybridAnalysis(baseline, { ...aiResult, source: "ai" });
  } catch {
    return baseline;
  }
}

export function understandBusinessSync(
  profile: BusinessProfile,
): BusinessAnalysis {
  return classifyBusiness(profile);
}

export type { BusinessAnalysis } from "@/lib/business/understanding/types";
export { classifyBusiness } from "@/lib/business/understanding/classifier";
export {
  CONFIDENCE,
  confidenceBand,
  clampConfidence,
} from "@/lib/business/understanding/confidence";
export { resolveRecommendedModules } from "@/lib/business/understanding/modules";
export type { ClassificationEvidence } from "@/lib/business/understanding/types";
