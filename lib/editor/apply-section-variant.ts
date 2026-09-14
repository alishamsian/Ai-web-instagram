import type { WebsiteConfig } from "@/types/website";
import {
  cloneWebsiteConfig,
  findSection,
  type EditorCommandResult,
} from "@/lib/editor/types";
import { commandSetSectionVariant } from "@/lib/editor/commands";
import {
  isVariantSupported,
  resolveSectionVariant,
} from "@/lib/store/registry/variant-api";

/**
 * Thin apply engine for section variants.
 * Always goes through commandSetSectionVariant — never mutates config in place.
 */
export function applySectionVariant(
  config: WebsiteConfig,
  sectionId: string,
  variantId: string,
): EditorCommandResult | null {
  const section = findSection(config, sectionId);
  if (!section) return null;
  if (!isVariantSupported(section.type, variantId)) return null;

  const resolved = resolveSectionVariant(section.type, variantId);
  if (!resolved.id) return null;

  // Already applied (canonical) — no history noise.
  if (section.variant === resolved.id) return null;

  return commandSetSectionVariant(config, sectionId, resolved.id);
}

/**
 * Build a deep-cloned config for preview only.
 * Never pass the result to onChange / history / autosave.
 * Isolation: mutating preview trees must not touch editor WebsiteConfig.
 */
export function buildVariantPreviewConfig(
  config: WebsiteConfig,
  sectionId: string,
  variantId: string,
): { config: WebsiteConfig; sectionId: string; variantId: string } | null {
  const section = findSection(config, sectionId);
  if (!section) return null;
  const resolved = resolveSectionVariant(section.type, variantId);
  if (!resolved.id) return null;

  const next = cloneWebsiteConfig(config);
  const target = next.sections.find((s) => s.id === sectionId);
  if (!target) return null;
  target.variant = resolved.id;

  if (section.type === "hero") {
    next.content.hero = {
      ...next.content.hero,
      style: resolved.id as typeof next.content.hero.style,
    };
  }

  return { config: next, sectionId, variantId: resolved.id };
}
