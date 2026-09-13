import type { BusinessProfile } from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";
import {
  CLASSIFICATION_RULES,
  STYLE_RULES,
} from "@/lib/business/understanding/rules";
import {
  buildSignalCorpus,
  keywordHits,
} from "@/lib/business/understanding/signals";
import {
  confidenceBand,
  scoreToConfidence,
} from "@/lib/business/understanding/confidence";
import { hasVertical, getVertical } from "@/lib/store/verticals/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { resolveRecommendedModules } from "@/lib/business/understanding/modules";

/**
 * Deterministic business classifier — no AI, no network.
 */
export function classifyBusiness(profile: BusinessProfile): BusinessAnalysis {
  const corpus = buildSignalCorpus(profile);
  const verticalScores = new Map<string, number>();
  const subVerticalScores = new Map<string, number>();

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    if (rule.keywords?.length) {
      score += keywordHits(corpus, rule.keywords) * rule.weight;
    }
    if (rule.categories?.length) {
      for (const category of rule.categories) {
        if (corpus.categories.some((c) => c.includes(category.toLowerCase()))) {
          score += 2.5 * rule.weight;
        }
      }
    }
    if (rule.attributes?.length) {
      for (const attr of rule.attributes) {
        if (corpus.attributes.includes(attr)) {
          score += 1.5 * rule.weight;
        }
      }
    }
    if (score <= 0) continue;

    verticalScores.set(
      rule.vertical,
      (verticalScores.get(rule.vertical) ?? 0) + score,
    );
    if (rule.subVertical) {
      const key = `${rule.vertical}::${rule.subVertical}`;
      subVerticalScores.set(key, (subVerticalScores.get(key) ?? 0) + score);
    }
  }

  const ranked = [...verticalScores.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const second = ranked[1];

  let vertical = "generic";
  let confidence = scoreToConfidence({
    topScore: top?.[1] ?? 0,
    secondScore: second?.[1] ?? 0,
    corpusTokens: corpus.tokens.length,
  });

  if (top && hasVertical(top[0]) && top[1] > 0) {
    vertical = resolveVerticalId(top[0]);
  } else {
    vertical = "generic";
    confidence = Math.min(confidence, 0.35);
  }

  const pack = getVertical(vertical);
  let subVertical: string | null = null;
  const subCandidates = [...subVerticalScores.entries()]
    .filter(([key]) => key.startsWith(`${vertical}::`))
    .sort((a, b) => b[1] - a[1]);
  const bestSub = subCandidates[0]?.[0]?.split("::")[1];
  if (bestSub && pack?.subVerticals?.some((s) => s.id === bestSub)) {
    subVertical = bestSub;
  }

  let style: string | null = null;
  let mood: string | null = null;
  let styleScore = 0;
  for (const rule of STYLE_RULES) {
    const hits = keywordHits(corpus, rule.keywords) * rule.weight;
    if (hits > styleScore) {
      styleScore = hits;
      style = rule.style;
      mood = rule.mood ?? rule.style;
    }
  }
  if (styleScore < 1) {
    style = null;
    mood = null;
  }

  const band = confidenceBand(confidence);
  const modules = resolveRecommendedModules({
    vertical,
    confidenceBand: band,
  });

  const productAttributes =
    pack?.productAttributes
      ?.filter((attr) => {
        if (!subVertical || !attr.subVerticals?.length) return true;
        return attr.subVerticals.includes(subVertical);
      })
      .map((attr) => attr.key) ?? [];

  const recommendedTemplate =
    band === "low"
      ? "generic-store"
      : (pack?.templates?.[0] ?? "generic-store");

  return {
    vertical,
    subVertical,
    style,
    mood,
    confidence,
    confidenceBand: band,
    recommendedTemplate,
    recommendedModules: modules,
    productAttributes,
    productSignals: corpus.productSignals,
    contentSignals: corpus.contentSignals,
    brandSignals: corpus.brandSignals,
    source: "rules",
    scores: Object.fromEntries(ranked),
  };
}
