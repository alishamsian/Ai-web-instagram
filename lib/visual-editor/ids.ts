/**
 * Stable identity helpers for WebsiteConfig ↔ GrapesJS projection.
 * Application IDs must survive open → edit → save → reload.
 */

/** Deterministic component id scoped to a section + role. */
export function visualComponentId(sectionId: string, role: string): string {
  const safeSection = sectionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeRole = role.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeSection}__${safeRole}`;
}

/** Stable page ids used by the Visual Editor. */
export const VISUAL_PAGE_HOME = "home";
export const VISUAL_PAGE_ABOUT = "about";

export function isReservedVisualPageId(pageId: string): boolean {
  return pageId === VISUAL_PAGE_HOME || pageId === VISUAL_PAGE_ABOUT;
}

export type VisualCollectionKey = "products" | "faq" | "testimonials" | "services";

/**
 * Deterministic collection item id.
 * Prefer explicit id, then slug, then a stable legacy fallback keyed by index
 * (persisted on first visual sync so later reorders keep identity).
 */
export function stableCollectionItemId(
  collection: VisualCollectionKey,
  item: { id?: string; slug?: string } | null | undefined,
  index: number,
): string {
  const explicit = item?.id?.trim();
  if (explicit) return explicit;
  const slug = item?.slug?.trim();
  if (slug) {
    const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${collection}__${safe}`;
  }
  return `${collection}__idx_${index}`;
}
