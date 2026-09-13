import type { BusinessProfile } from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";
import type {
  ContentLocale,
  GeneratedWebsiteContent,
} from "@/lib/business/content/schema";
import {
  resolveCopyBlock,
  SECTION_COPY,
} from "@/lib/business/content/templates";

function resolveLocale(
  profile: BusinessProfile,
  explicit?: ContentLocale,
): ContentLocale {
  if (explicit) return explicit;
  const locale = (profile.locale ?? profile.languages?.[0] ?? "en").toLowerCase();
  if (locale.startsWith("fa") || locale.startsWith("ar")) return "fa";
  return "en";
}

function brandNameOf(profile: BusinessProfile, locale: ContentLocale): string {
  return (
    profile.brand?.name?.trim() ||
    profile.displayName?.trim() ||
    profile.username?.trim() ||
    (locale === "fa" ? "فروشگاه" : "Store")
  );
}

/**
 * Deterministic semantic content — never invents prices, reviews, awards, shipping.
 */
export function generateDeterministicContent(params: {
  profile: BusinessProfile;
  analysis: BusinessAnalysis;
  locale?: ContentLocale;
}): GeneratedWebsiteContent {
  const locale = resolveLocale(params.profile, params.locale);
  const name = brandNameOf(params.profile, locale);
  const copy = resolveCopyBlock(params.analysis.vertical, locale);
  const hasProducts = (params.profile.products?.length ?? 0) > 0;
  const hasBio = Boolean(params.profile.bio?.trim());

  const sectionCopy: GeneratedWebsiteContent["sectionCopy"] = {};
  for (const moduleType of params.analysis.recommendedModules) {
    const preset = SECTION_COPY[moduleType]?.[locale];
    if (preset) {
      sectionCopy[moduleType] = { ...preset };
    }
  }

  return {
    brandName: name,
    tagline: params.profile.brand?.tagline?.trim() || copy.tagline,
    hero: {
      headline: copy.heroHeadline(name),
      subheadline: hasBio
        ? params.profile.bio!.trim().slice(0, 160)
        : copy.heroSub,
      cta: copy.cta,
    },
    about: {
      title: copy.aboutTitle,
      body: hasBio
        ? params.profile.bio!.trim()
        : copy.aboutBody(name),
    },
    productsTitle: hasProducts ? copy.productsTitle : copy.productsTitle,
    newsletterHint: copy.newsletter,
    sectionCopy,
  };
}

export type { GeneratedWebsiteContent, ContentLocale };
