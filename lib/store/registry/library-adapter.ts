import {
  getLibrarySections,
  hasSection,
} from "@/lib/store/registry/catalog";
import type { SectionCategory } from "@/lib/store/registry/types";
import type { WebsiteSectionType } from "@/types/website";
import {
  getRecommendedSectionsForVertical,
  getSectionsForVertical,
  resolveVerticalId,
} from "@/lib/store/verticals/resolve";

/**
 * Adapter: Section Library UI reads Registry (single source of truth).
 * Vertical Engine filters/recommends without duplicating registry data.
 */
export type SectionLibraryItem = {
  type: WebsiteSectionType;
  category: SectionCategory;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
  recommended?: boolean;
  preview?: {
    thumbnailTone?: "warm" | "cool" | "dark" | "neutral";
    aspect?: "16/9" | "4/3" | "1/1";
  };
};

export type LibraryQuery = {
  vertical?: string | null;
};

export function getSectionLibraryItems(
  query?: LibraryQuery,
): SectionLibraryItem[] {
  const vertical = query?.vertical
    ? resolveVerticalId(query.vertical)
    : null;

  const recommended = new Set(
    vertical ? getRecommendedSectionsForVertical(vertical) : [],
  );

  const allowed = vertical
    ? new Set(getSectionsForVertical(vertical).map((d) => d.type))
    : null;

  const defs = getLibrarySections().filter((def) => {
    if (def.chrome === "announcement" || def.chrome === "header") return false;
    if (allowed && !allowed.has(def.type)) return false;
    return true;
  });

  const items = defs.map((def) => ({
    type: def.type as WebsiteSectionType,
    category: def.category,
    label: def.label,
    description: def.description,
    recommended: recommended.has(def.type),
    preview: def.preview,
  }));

  if (!vertical) return items;

  return items.sort((a, b) => {
    if (a.recommended === b.recommended) return 0;
    return a.recommended ? -1 : 1;
  });
}

/** Convenience for editor plumbing */
export function getLibrarySectionsForVertical(vertical?: string | null) {
  return getSectionLibraryItems({ vertical });
}

export function isLibrarySectionAvailable(
  type: string,
  vertical?: string | null,
): boolean {
  if (!hasSection(type)) return false;
  if (!vertical) return true;
  return getSectionsForVertical(vertical).some((d) => d.type === type);
}
