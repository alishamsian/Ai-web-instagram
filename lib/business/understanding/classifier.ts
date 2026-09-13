import type { BusinessProfile } from "@/lib/business/types";
import type {
  BusinessAnalysis,
  ClassificationEvidence,
} from "@/lib/business/understanding/types";
import {
  CLASSIFICATION_RULES,
  STYLE_RULES,
} from "@/lib/business/understanding/rules";
import {
  buildSignalCorpus,
  keywordHits,
  keywordHitDetails,
} from "@/lib/business/understanding/signals";
import {
  CONFIDENCE,
  confidenceBand,
  scoreToConfidence,
} from "@/lib/business/understanding/confidence";
import { hasVertical, getVertical } from "@/lib/store/verticals/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { resolveRecommendedModules } from "@/lib/business/understanding/modules";

/**
 * Deterministic business classifier — no AI, no network, no randomness.
 */
export function classifyBusiness(profile: BusinessProfile): BusinessAnalysis {
  const corpus = buildSignalCorpus(profile);
  const verticalScores = new Map<string, number>();
  const subVerticalScores = new Map<string, number>();
  const evidence: ClassificationEvidence[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;

    if (rule.keywords?.length) {
      const details = keywordHitDetails(corpus, rule.keywords);
      for (const detail of details) {
        const weight = rule.weight;
        score += weight;
        evidence.push({
          signal: detail.keyword,
          source: detail.source,
          weight,
          vertical: rule.vertical,
          subVertical: rule.subVertical,
        });
      }
    }

    if (rule.categories?.length) {
      for (const category of rule.categories) {
        if (corpus.categories.some((c) => c.includes(category.toLowerCase()))) {
          const weight = 2.5 * rule.weight;
          score += weight;
          evidence.push({
            signal: category,
            source: "category",
            weight,
            vertical: rule.vertical,
            subVertical: rule.subVertical,
          });
        }
      }
    }

    if (rule.attributes?.length) {
      for (const attr of rule.attributes) {
        if (corpus.attributes.includes(attr)) {
          const weight = 1.5 * rule.weight;
          score += weight;
          evidence.push({
            signal: attr,
            source: "product.attributes",
            weight,
            vertical: rule.vertical,
            subVertical: rule.subVertical,
          });
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

  // Require meaningful evidence — weak single hits stay generic
  if (top && hasVertical(top[0]) && top[1] >= 2) {
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
  const bestSubEntry = subCandidates[0];
  const bestSub = bestSubEntry?.[0]?.split("::")[1];
  const bestSubScore = bestSubEntry?.[1] ?? 0;
  const topVerticalScore = top?.[1] ?? 0;

  // SubVertical more conservative: need solid share of vertical score + medium band
  if (
    bestSub &&
    pack?.subVerticals?.some((s) => s.id === bestSub) &&
    bestSubScore >= 2.5 &&
    topVerticalScore > 0 &&
    bestSubScore / topVerticalScore >= 0.45 &&
    confidence >= CONFIDENCE.MEDIUM
  ) {
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
  // Style/mood more conservative than vertical
  if (styleScore < 2 || confidence < CONFIDENCE.MEDIUM) {
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
    evidence: evidence.slice(0, 40),
  };
}
