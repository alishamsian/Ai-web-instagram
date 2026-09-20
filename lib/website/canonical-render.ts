import type { SectionConfig, WebsiteConfig, WebsitePage } from "@/types/website";

/**
 * New full-site template instances carry catalog metadata.
 * Legacy Instagram/import sites do not.
 */
export function isTemplateCatalogSite(config: WebsiteConfig): boolean {
  return Boolean(config.templateCatalogId?.trim());
}

export function findHomePage(config: WebsiteConfig): WebsitePage | undefined {
  return (config.pages ?? []).find((p) => p.id === "home" || p.kind === "home");
}

/**
 * Prefer home page.sections when present; otherwise top-level config.sections.
 */
export function resolveHomeSections(config: WebsiteConfig): SectionConfig[] {
  const home = findHomePage(config);
  if (home?.sections && home.sections.length > 0) {
    return home.sections;
  }
  return config.sections ?? [];
}

/**
 * Home sections for Visual Editor projection.
 * Structure/order comes from resolveHomeSections (page.sections when present).
 * Matching top-level section meta (visible/variant/settings) is overlaid so
 * Classic / dual-write edits on config.sections still reach the canvas.
 */
export function resolveHomeSectionsForProjection(
  config: WebsiteConfig,
): SectionConfig[] {
  const resolved = resolveHomeSections(config);
  const top = config.sections ?? [];
  if (top.length === 0) return resolved;
  const topById = new Map(top.map((s) => [s.id, s]));
  return resolved.map((s) => {
    const overlay = topById.get(s.id);
    if (!overlay) return s;
    return {
      ...s,
      visible: overlay.visible,
      variant: overlay.variant ?? s.variant,
      settings: overlay.settings ?? s.settings,
    };
  });
}

/**
 * New template sites render Home through shared WebsiteRenderer + page.sections.
 * Legacy store sites keep StoreRenderer compatibility.
 */
export function shouldUseCanonicalHomeRenderer(
  config: WebsiteConfig,
): boolean {
  if (!isTemplateCatalogSite(config)) return false;
  return resolveHomeSections(config).length > 0;
}

/**
 * Collect section types across top-level + all page.sections (for preflight).
 */
export function collectVisibleSectionTypes(
  config: WebsiteConfig,
): Set<string> {
  const types = new Set<string>();
  for (const s of config.sections ?? []) {
    if (s.visible !== false) types.add(s.type);
  }
  for (const page of config.pages ?? []) {
    for (const s of page.sections ?? []) {
      if (s.visible !== false) types.add(s.type);
    }
  }
  return types;
}
