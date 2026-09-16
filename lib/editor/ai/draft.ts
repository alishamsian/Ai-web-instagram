/**
 * Bounded unsaved draft overlay for AI co-design.
 * Never trusts a full client WebsiteConfig.
 */

import type { WebsiteConfig } from "@/types/website";
import { cloneWebsiteConfig } from "@/lib/editor/types";
import { commandSetContentPath, commandSetBrandColor } from "@/lib/editor/commands";

const MAX_CONTENT_PATHS = 24;
const MAX_VALUE_LENGTH = 2000;

const BRAND_KEYS = new Set([
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "muted",
]);

export type AiDraftHints = {
  /** Allowlisted content paths only — applied via commandSetContentPath. */
  contentPaths?: Array<{ path: string; value: string }>;
  brandColors?: Partial<WebsiteConfig["brand"]["colors"]>;
};

export type MergeDraftResult =
  | { ok: true; config: WebsiteConfig; applied: number }
  | { ok: false; reason: string };

/**
 * Start from canonical server WebsiteConfig, then overlay only allowlisted
 * unsaved content/brand hints. Rejects oversized or unknown shapes.
 */
export function mergeTrustedDraftHints(
  serverConfig: WebsiteConfig,
  draft?: AiDraftHints | null,
): MergeDraftResult {
  if (!draft) {
    return { ok: true, config: cloneWebsiteConfig(serverConfig), applied: 0 };
  }

  let next = cloneWebsiteConfig(serverConfig);
  let applied = 0;

  const paths = draft.contentPaths;
  if (paths != null) {
    if (!Array.isArray(paths) || paths.length > MAX_CONTENT_PATHS) {
      return { ok: false, reason: "draft_paths_overflow" };
    }
    for (const row of paths) {
      if (
        !row ||
        typeof row.path !== "string" ||
        typeof row.value !== "string"
      ) {
        return { ok: false, reason: "draft_path_invalid" };
      }
      if (row.value.length > MAX_VALUE_LENGTH) {
        return { ok: false, reason: "draft_value_too_long" };
      }
      // Product / media / publish must never ride along as draft.
      if (
        row.path.startsWith("content.products.items") ||
        row.path.startsWith("media") ||
        row.path.startsWith("settings.published") ||
        row.path.includes(".price")
      ) {
        return { ok: false, reason: "draft_path_protected" };
      }
      const result = commandSetContentPath(next, row.path, row.value);
      if (!result) {
        // Skip unknown paths rather than failing the whole request —
        // client may send stale aliases. Only fail on protected paths above.
        continue;
      }
      next = result.config;
      applied += 1;
    }
  }

  if (draft.brandColors && typeof draft.brandColors === "object") {
    for (const [key, value] of Object.entries(draft.brandColors)) {
      if (!BRAND_KEYS.has(key)) {
        return { ok: false, reason: "draft_brand_key_invalid" };
      }
      if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
        return { ok: false, reason: "draft_brand_color_invalid" };
      }
      next = commandSetBrandColor(
        next,
        key as keyof WebsiteConfig["brand"]["colors"],
        value,
      ).config;
      applied += 1;
    }
  }

  return { ok: true, config: next, applied };
}

/** Build draft hints from live editor config (client-side helper). */
export function buildDraftHintsFromConfig(config: WebsiteConfig): AiDraftHints {
  const contentPaths: Array<{ path: string; value: string }> = [];
  const push = (path: string, value: unknown) => {
    if (typeof value === "string" && value.length <= MAX_VALUE_LENGTH) {
      contentPaths.push({ path, value });
    }
  };

  push("content.hero.headline", config.content.hero.headline);
  push("content.hero.subheadline", config.content.hero.subheadline);
  push("content.hero.cta", config.content.hero.cta);
  push("content.hero.ctaHref", config.content.hero.ctaHref);
  push("content.about.title", config.content.about?.title);
  push("content.about.body", config.content.about?.body);
  push("content.products.title", config.content.products?.title);
  push("content.services.title", config.content.services?.title);
  push("content.gallery.title", config.content.gallery?.title);
  push("content.testimonials.title", config.content.testimonials?.title);
  push("content.faq.title", config.content.faq?.title);
  push("content.contact.title", config.content.contact?.title);
  push("content.contact.body", config.content.contact?.body);
  push("content.promo.title", config.content.promo?.title);
  push("content.promo.cta", config.content.promo?.cta);
  push("seo.title", config.seo.title);
  push("seo.description", config.seo.description);
  push("brand.name", config.brand.name);
  push("brand.tagline", config.brand.tagline);

  return {
    contentPaths,
    brandColors: { ...config.brand.colors },
  };
}
