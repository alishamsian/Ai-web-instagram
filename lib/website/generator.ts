import type { WebsiteAIAnalysis } from "@/types/ai";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteConfig } from "@/types/website";
import { slugify } from "@/lib/utils";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { businessProfileFromInstagram } from "@/lib/business/from-instagram";
import { generateWebsiteFromBusinessProfileSync } from "@/lib/business/generation/pipeline";
import { heuristicAnalysisFromImport } from "@/lib/instagram/pipeline";
// Side-effect seeds for Vertical / Recipe / Section registries
import "@/lib/store/verticals/packs";
import "@/lib/store/recipes/registry";
import "@/lib/store/registry/catalog";

/**
 * Instagram import → WebsiteConfig via the canonical BusinessProfile pipeline.
 * No fabricated product names. Recipe + data-aware composition.
 */
export function generateWebsiteConfig(input: {
  imported: InstagramImport;
  analysis: WebsiteAIAnalysis;
  locale: "fa" | "en";
}): WebsiteConfig {
  const profile = businessProfileFromInstagram({
    imported: input.imported,
    analysis: input.analysis,
    locale: input.locale,
  });

  const { config } = generateWebsiteFromBusinessProfileSync({
    profile,
    locale: input.locale,
  });

  const withContact: WebsiteConfig = {
    ...config,
    content: {
      ...config.content,
      contact: {
        title:
          config.content.contact?.title ??
          (input.locale === "fa" ? "ارتباط" : "Contact"),
        body:
          config.content.contact?.body ??
          (input.locale === "fa"
            ? "برای سفارش و همکاری پیام بگذارید."
            : "Get in touch for orders and collaborations."),
        info: input.analysis.contactInfo,
      },
    },
  };

  return polishWebsiteConfig(withContact);
}

/**
 * Canonical Phase 5 mapper: InstagramImport → existing WebsiteConfig.
 * Analysis is optional — falls back to deterministic heuristic (AI stays optional).
 */
export function buildWebsiteConfigFromInstagram(input: {
  imported: InstagramImport;
  analysis?: WebsiteAIAnalysis | null;
  locale: "fa" | "en";
}): WebsiteConfig {
  const analysis =
    input.analysis ?? heuristicAnalysisFromImport(input.imported, input.locale);
  return generateWebsiteConfig({
    imported: input.imported,
    analysis,
    locale: input.locale,
  });
}

export function websiteSlug(name: string, username: string) {
  return slugify(username || name) || "site";
}

export { allocateUniqueSlug } from "./slug";
