import { getLibrarySections } from "@/lib/store/registry/catalog";
import type { SectionCategory } from "@/lib/store/registry/types";
import type { WebsiteSectionType } from "@/types/website";

/**
 * Adapter: Section Library UI reads Registry (single source of truth).
 * Kept for backward-compatible imports from editor-presets.
 */
export type SectionLibraryItem = {
  type: WebsiteSectionType;
  category: SectionCategory;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
};

export function getSectionLibraryItems(): SectionLibraryItem[] {
  return getLibrarySections()
    .filter((def) => def.chrome !== "announcement" && def.chrome !== "header")
    .map((def) => ({
      type: def.type as WebsiteSectionType,
      category: def.category,
      label: def.label,
      description: def.description,
    }));
}
