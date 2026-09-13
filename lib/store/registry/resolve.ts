import type { WebsiteRenderMode } from "@/components/editor/EditContext";
import type { SectionConfig, WebsiteConfig } from "@/types/website";
import { hasSection } from "@/lib/store/registry/catalog";
import { normalizeStoreSections } from "@/lib/store/registry/normalize";

/**
 * Pure helpers for config-driven Store rendering.
 * WebsiteConfig.sections (+ normalize) is authoritative for order + identity.
 */

export function resolveStoreSections(
  config: WebsiteConfig,
  mode: WebsiteRenderMode,
): SectionConfig[] {
  const normalized = normalizeStoreSections(config);
  return normalized.filter((section) => {
    if (mode === "editor") return true;
    return section.visible !== false;
  });
}

export function sectionIsDimmed(
  section: SectionConfig,
  mode: WebsiteRenderMode,
): boolean {
  return mode === "editor" && section.visible === false;
}

/** Body sections (footer chrome handled separately). */
export function resolveStoreBodySections(
  config: WebsiteConfig,
  mode: WebsiteRenderMode,
): SectionConfig[] {
  return resolveStoreSections(config, mode).filter(
    (section) => section.type !== "footer",
  );
}

export function resolveStoreFooterSection(
  config: WebsiteConfig,
): SectionConfig | undefined {
  return normalizeStoreSections(config).find(
    (section) => section.type === "footer",
  );
}

export function shouldRenderFooter(
  config: WebsiteConfig,
  mode: WebsiteRenderMode,
): boolean {
  const footer = resolveStoreFooterSection(config);
  if (!footer) return true;
  if (mode === "editor") return true;
  return footer.visible !== false;
}

export function isKnownStoreSection(type: string): boolean {
  return hasSection(type);
}

/** Stable React keys — never use array index. */
export function sectionRenderKey(section: SectionConfig): string {
  return section.id;
}
