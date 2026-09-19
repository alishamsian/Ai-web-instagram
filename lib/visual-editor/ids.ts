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
