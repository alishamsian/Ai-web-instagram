import type { ConfidenceBand } from "@/lib/business/types";
import { getRecommendedSectionsForVertical } from "@/lib/store/verticals/resolve";
import { hasSection } from "@/lib/store/registry/catalog";

/**
 * Only recommend modules that exist in the Section Registry.
 * Confidence controls how many recommendations are kept.
 */
export function resolveRecommendedModules(params: {
  vertical: string;
  confidenceBand: ConfidenceBand;
}): string[] {
  const recommended = getRecommendedSectionsForVertical(params.vertical).filter(
    (type) => hasSection(type),
  );

  if (params.confidenceBand === "high") {
    return recommended;
  }
  if (params.confidenceBand === "medium") {
    // Conservative: keep core-ish recommendations (first 6)
    return recommended.slice(0, 6);
  }
  // Low: generic-safe subset
  return getRecommendedSectionsForVertical("generic")
    .filter((type) => hasSection(type))
    .slice(0, 5);
}
