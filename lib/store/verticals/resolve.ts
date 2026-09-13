import {
  getVertical,
  hasVertical,
} from "@/lib/store/verticals/registry";
import type {
  ProductAttributeDefinition,
  VerticalId,
  VerticalPack,
} from "@/lib/store/verticals/types";
import { VERTICAL_CONFIDENCE_THRESHOLD } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";
import {
  getSectionDefinition,
  getSectionsForVertical as catalogSectionsForVertical,
  hasSection,
} from "@/lib/store/registry/catalog";
import type { RegistrySectionType, SectionDefinition } from "@/lib/store/registry/types";

/** Ensure core packs are registered when resolve APIs are used. */
import "@/lib/store/verticals/packs";

export function resolveVerticalId(
  id: string | null | undefined,
  fallback: string = "generic",
): string {
  if (id && hasVertical(id)) return id.trim().toLowerCase();
  if (fallback && hasVertical(fallback)) return fallback.trim().toLowerCase();
  return "generic";
}

export function resolveVerticalPack(
  id: string | null | undefined,
  fallback: string = "generic",
): VerticalPack {
  const resolved = resolveVerticalId(id, fallback);
  return getVertical(resolved) ?? getVertical("generic")!;
}

/**
 * Sections available for a vertical:
 * Registry defs matching vertical (incl. *) ∪ pack.sectionTypes that exist in Registry.
 */
export function getSectionsForVertical(
  verticalId: string | null | undefined,
): SectionDefinition[] {
  const pack = resolveVerticalPack(verticalId);
  const fromCatalog = catalogSectionsForVertical(pack.id);
  const byType = new Map(fromCatalog.map((d) => [d.type, d]));

  for (const type of pack.sectionTypes ?? []) {
    if (!byType.has(type) && hasSection(type)) {
      const def = getSectionDefinition(type);
      if (def) byType.set(type, def);
    }
  }

  // Always keep core ecommerce defs if registered
  for (const type of CORE_ECOMMERCE_SECTIONS) {
    if (!byType.has(type) && hasSection(type)) {
      const def = getSectionDefinition(type);
      if (def) byType.set(type, def);
    }
  }

  return [...byType.values()];
}

export function getRecommendedSectionsForVertical(
  verticalId: string | null | undefined,
): RegistrySectionType[] {
  const pack = resolveVerticalPack(verticalId);
  const supported = new Set(
    getSectionsForVertical(verticalId).map((d) => d.type),
  );
  const recommended = (pack.recommendedSections ?? []).filter((type) =>
    supported.has(type),
  );
  return recommended;
}

export function isSectionSupportedByVertical(
  sectionType: string,
  verticalId: string | null | undefined,
): boolean {
  return getSectionsForVertical(verticalId).some((d) => d.type === sectionType);
}

export function getProductAttributesForVertical(
  verticalId: string | null | undefined,
  subVertical?: string | null,
): ProductAttributeDefinition[] {
  const pack = resolveVerticalPack(verticalId);
  const attrs = pack.productAttributes ?? [];
  if (!subVertical) return attrs;
  return attrs.filter(
    (attr) =>
      !attr.subVerticals ||
      attr.subVerticals.length === 0 ||
      attr.subVerticals.includes(subVertical),
  );
}

export function getFiltersForVertical(verticalId: string | null | undefined) {
  return resolveVerticalPack(verticalId).filters ?? [];
}

export function isKnownVerticalId(id: string): id is VerticalId {
  return hasVertical(id);
}

/**
 * Confidence-aware vertical pick — no fabricated scores.
 * Missing confidence → use vertical if known, else fallback/generic.
 */
export function pickVerticalWithConfidence(input: {
  vertical?: string | null;
  fallbackVertical?: string | null;
  confidence?: number | null;
}): { vertical: string; uncertain: boolean } {
  const fallback = resolveVerticalId(input.fallbackVertical ?? "generic");
  const primary =
    input.vertical && hasVertical(input.vertical)
      ? input.vertical.trim().toLowerCase()
      : null;

  if (!primary) {
    return { vertical: fallback, uncertain: true };
  }

  if (
    input.confidence != null &&
    Number.isFinite(input.confidence) &&
    input.confidence < VERTICAL_CONFIDENCE_THRESHOLD
  ) {
    return { vertical: fallback, uncertain: true };
  }

  return { vertical: primary, uncertain: false };
}
