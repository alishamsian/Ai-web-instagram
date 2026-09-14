import type { WebsiteConfig } from "@/types/website";
import type { EditorCommandResult } from "@/lib/editor/types";
import { commandSetSectionVariant } from "@/lib/editor/commands";
import {
  isVariantSupported,
  resolveSectionVariant,
} from "@/lib/store/registry/variant-api";
import { findSection } from "@/lib/editor/types";

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
 * Build an in-memory config clone for preview only.
 * Never pass the result to onChange / history / autosave.
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

  let next: WebsiteConfig = {
    ...config,
    sections: config.sections.map((s) =>
      s.id === sectionId ? { ...s, variant: resolved.id! } : s,
    ),
  };

  if (section.type === "hero") {
    next = {
      ...next,
      content: {
        ...next.content,
        hero: {
          ...next.content.hero,
          style: resolved.id as typeof next.content.hero.style,
        },
      },
    };
  }

  return { config: next, sectionId, variantId: resolved.id };
}
