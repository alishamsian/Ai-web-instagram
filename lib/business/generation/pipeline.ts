import type { BusinessIntelligenceProvider } from "@/lib/ai/business-intelligence";
import type {
  BusinessProfile,
  BusinessUnderstandingMode,
} from "@/lib/business/types";
import type { BusinessAnalysis } from "@/lib/business/understanding/types";
import type { WebsiteConfig } from "@/types/website";
import type { GeneratedWebsiteContent } from "@/lib/business/content/schema";
import type { Product } from "@/types/ai";
import { normalizeBusinessProfile } from "@/lib/business/normalize";
import {
  understandBusiness,
  understandBusinessSync,
} from "@/lib/business/understanding";
import { generateDeterministicContent } from "@/lib/business/content/generator";
import {
  applyGeneratedContent,
  mapBusinessProductsToCatalog,
} from "@/lib/business/generation/apply-content";
import {
  applyDataAwareComposition,
  inspectBusinessData,
} from "@/lib/business/generation/data-aware";
import {
  buildWebsiteConfigFromRecipe,
  resolveRecipe,
} from "@/lib/store/recipes/builder";
import { getRecipe } from "@/lib/store/recipes/registry";
import { getVertical } from "@/lib/store/verticals/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { CONFIDENCE } from "@/lib/business/understanding/confidence";
import { sanitizeHttpUrl } from "@/lib/business/schema";

export type GenerateWebsiteResult = {
  profile: BusinessProfile;
  analysis: BusinessAnalysis;
  content: GeneratedWebsiteContent;
  config: WebsiteConfig;
  mode: BusinessUnderstandingMode;
};

function resolveLocale(
  profile: BusinessProfile,
  explicit?: "fa" | "en",
): "fa" | "en" {
  if (explicit) return explicit;
  const locale = (profile.locale ?? "").toLowerCase();
  if (locale.startsWith("en")) return "en";
  if (locale.startsWith("fa") || locale.startsWith("ar")) return "fa";
  // Product default is Persian (DEFAULT_LOCALE).
  return "fa";
}

/** Stable non-cryptographic id from URL for deterministic media keys. */
function stableMediaId(prefix: string, url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return `${prefix}-${Math.abs(hash).toString(36)}`;
}

/**
 * Confidence-aware recipe selection.
 * high → vertical recipe (editorial preferred)
 * medium → conservative commerce recipe when available
 * low → generic-store
 */
export function resolveRecipeId(
  analysis: BusinessAnalysis,
  profile?: BusinessProfile,
): string {
  if (
    analysis.confidenceBand === "low" ||
    analysis.confidence < CONFIDENCE.MEDIUM
  ) {
    return "generic-store";
  }

  const pack = getVertical(analysis.vertical);
  const templates = pack?.templates ?? [];
  const productCount = (profile?.products ?? []).filter((p) =>
    Boolean(p.name?.trim()),
  ).length;

  const pickValid = (id: string | null | undefined) =>
    id && getRecipe(id) ? id : null;

  if (analysis.confidenceBand === "medium") {
    const commerce =
      templates.find((id) => id.includes("commerce")) ?? templates[1];
    const conservative =
      pickValid(commerce) ??
      pickValid(analysis.recommendedTemplate) ??
      pickValid(templates[0]);
    return conservative ?? "generic-store";
  }

  // high confidence
  const preferred =
    pickValid(analysis.recommendedTemplate) ??
    // Prefer editorial when media-rich; commerce when product-rich
    (productCount >= 4
      ? pickValid(templates.find((id) => id.includes("commerce"))) ??
        pickValid(templates[0])
      : pickValid(templates[0]) ??
        pickValid(templates.find((id) => id.includes("commerce")))) ??
    pickValid(templates[0]);

  return preferred ?? "generic-store";
}

function presentationBrandName(
  profile: BusinessProfile,
  locale: "fa" | "en",
): string {
  return (
    profile.brand?.name?.trim() ||
    profile.displayName?.trim() ||
    profile.username?.trim() ||
    (locale === "fa" ? "فروشگاه" : "Store")
  );
}

function attachMediaAndProducts(
  config: WebsiteConfig,
  profile: BusinessProfile,
): { config: WebsiteConfig; products: Product[]; galleryCount: number } {
  const media: WebsiteConfig["media"] = { ...config.media };
  const products = mapBusinessProductsToCatalog(profile);
  const urlToMediaId = new Map<string, string>();

  const registerImage = (
    url: string,
    alt: string,
    preferredId?: string | null,
  ): string | null => {
    const safe = sanitizeHttpUrl(url);
    if (!safe) return null;
    const existing = urlToMediaId.get(safe);
    if (existing) return existing;
    const id =
      (preferredId && preferredId.trim()) ||
      stableMediaId("biz-img", safe);
    // Avoid colliding with existing keys
    let finalId = id;
    let n = 1;
    while (media[finalId] && media[finalId]!.url !== safe) {
      finalId = `${id}-${n++}`;
    }
    media[finalId] = {
      url: safe,
      alt,
      type: "image",
    };
    urlToMediaId.set(safe, finalId);
    return finalId;
  };

  for (const image of profile.media?.images ?? []) {
    registerImage(
      image.url,
      image.alt ?? profile.brand?.name ?? "Image",
      image.source,
    );
  }

  if (profile.brand?.logoUrl) {
    const logo = sanitizeHttpUrl(profile.brand.logoUrl);
    if (logo) {
      media.logo = {
        url: logo,
        alt: profile.brand.name ?? "Logo",
        type: "image",
      };
    }
  }

  const sourceByKey = new Map<
    string,
    NonNullable<BusinessProfile["products"]>[number]
  >();
  for (const source of profile.products ?? []) {
    if (source.id) sourceByKey.set(`id:${source.id}`, source);
    if (source.name?.trim()) {
      sourceByKey.set(`name:${source.name.trim().toLowerCase()}`, source);
    }
  }

  const items: Product[] = products.map((product) => {
    const source =
      (product.id ? sourceByKey.get(`id:${product.id}`) : undefined) ??
      sourceByKey.get(`name:${product.name.toLowerCase()}`);
    const imageUrl = source?.imageUrl;
    if (!imageUrl) return product;
    const mediaId = registerImage(
      imageUrl,
      product.name,
      source?.id ? `product-${source.id}` : null,
    );
    if (!mediaId) return product;
    return { ...product, imageIds: [mediaId] };
  });

  const galleryIds = [...urlToMediaId.values()].filter((id) => id !== "logo");
  const heroImageId =
    galleryIds.find((id) => media[id]?.type === "image") ??
    items.find((p) => p.imageIds[0])?.imageIds[0];

  const aboutImageId =
    galleryIds.find((id) => id !== heroImageId) ?? heroImageId;

  const next: WebsiteConfig = {
    ...config,
    media,
    brand: {
      ...config.brand,
      logo: media.logo?.url ?? config.brand.logo,
    },
    content: {
      ...config.content,
      hero: {
        ...config.content.hero,
        ...(heroImageId ? { imageId: heroImageId } : {}),
      },
      about: config.content.about
        ? {
            ...config.content.about,
            ...(aboutImageId ? { imageId: aboutImageId } : {}),
          }
        : config.content.about,
      products: {
        title: config.content.products?.title ?? "Products",
        items,
      },
      gallery:
        galleryIds.length > 0
          ? {
              title:
                config.settings.language === "fa" ? "گالری" : "Gallery",
              imageIds: galleryIds.slice(0, 12),
            }
          : undefined,
    },
  };

  // Wire story sections with a real gallery image when settings lack imageId
  next.sections = next.sections.map((section) => {
    if (section.settings?.imageId) return section;
    if (!heroImageId) return section;
    const storyTypes = new Set([
      "ingredient-story",
      "collection-story",
      "roaster-story",
      "designer-spotlight",
      "jewelry-care",
      "style-guide",
    ]);
    if (!storyTypes.has(String(section.type))) return section;
    return {
      ...section,
      settings: { ...section.settings, imageId: aboutImageId ?? heroImageId },
    };
  });

  return { config: next, products: items, galleryCount: galleryIds.length };
}

function applyTrustedMetadata(
  config: WebsiteConfig,
  profile: BusinessProfile,
): WebsiteConfig {
  const meta = profile.metadata ?? {};
  const seoTitle =
    typeof meta.seoTitle === "string" && meta.seoTitle.trim()
      ? meta.seoTitle.trim()
      : null;
  const seoDescription =
    typeof meta.seoDescription === "string" && meta.seoDescription.trim()
      ? meta.seoDescription.trim()
      : null;
  const heroHeadline =
    typeof meta.heroHeadline === "string" && meta.heroHeadline.trim()
      ? meta.heroHeadline.trim()
      : null;
  const heroSub =
    typeof meta.heroSubheadline === "string" && meta.heroSubheadline.trim()
      ? meta.heroSubheadline.trim()
      : null;
  const cta =
    typeof meta.suggestedCta === "string" && meta.suggestedCta.trim()
      ? meta.suggestedCta.trim()
      : null;

  // Reject obvious fabricated ranking claims in AI SEO
  const unsafe = /#\s*1|award|certified|10,?000|best in/i;
  const safeTitle =
    seoTitle && !unsafe.test(seoTitle) ? seoTitle : config.seo.title;
  const safeDescription =
    seoDescription && !unsafe.test(seoDescription)
      ? seoDescription.slice(0, 160)
      : config.seo.description;

  return {
    ...config,
    content: {
      ...config.content,
      hero: {
        ...config.content.hero,
        ...(heroHeadline ? { headline: heroHeadline } : {}),
        ...(heroSub ? { subheadline: heroSub } : {}),
        ...(cta ? { cta } : {}),
      },
    },
    seo: {
      ...config.seo,
      title: safeTitle,
      description: safeDescription,
    },
  };
}

function assembleConfig(params: {
  profile: BusinessProfile;
  analysis: BusinessAnalysis;
  locale: "fa" | "en";
  mode: BusinessUnderstandingMode;
}): GenerateWebsiteResult {
  const { profile, locale, mode } = params;
  const vertical = resolveVerticalId(params.analysis.vertical);
  const analysis = { ...params.analysis, vertical };
  const recipeId = resolveRecipeId(analysis, profile);
  const recipe = resolveRecipe(recipeId);
  const brandName = presentationBrandName(profile, locale);

  let config = buildWebsiteConfigFromRecipe({
    recipe,
    seed: {
      brandName,
      locale,
      settings: {
        language: locale,
        direction: locale === "fa" ? "rtl" : "ltr",
        showBranding: true,
        published: false,
        vertical,
        recipeId: recipe.id,
      },
    },
  });

  if (profile.brand?.tagline) {
    config = {
      ...config,
      brand: { ...config.brand, tagline: profile.brand.tagline },
    };
  }
  if (profile.brand?.colors?.length) {
    config = {
      ...config,
      brand: {
        ...config.brand,
        colors: {
          ...config.brand.colors,
          primary: profile.brand.colors[0] ?? config.brand.colors.primary,
          secondary: profile.brand.colors[1] ?? config.brand.colors.secondary,
          accent: profile.brand.colors[2] ?? config.brand.colors.accent,
        },
      },
    };
  }

  const content = generateDeterministicContent({
    profile,
    analysis,
    locale,
  });

  config = applyGeneratedContent(config, content);
  const attached = attachMediaAndProducts(config, profile);
  config = attached.config;

  if (content.about) {
    config = {
      ...config,
      content: {
        ...config.content,
        about: {
          ...content.about,
          imageId: config.content.about?.imageId,
        },
      },
    };
  }

  config = applyTrustedMetadata(config, profile);

  const data = inspectBusinessData({
    profile,
    products: attached.products,
    galleryCount: attached.galleryCount,
  });
  config = applyDataAwareComposition(config, data);

  return { profile, analysis, content, config, mode };
}

/**
 * Pure-ish orchestrator: BusinessProfile → WebsiteConfig.
 * No DB writes. AI optional.
 */
export async function generateWebsiteFromBusinessProfile(input: {
  profile: unknown;
  locale?: "fa" | "en";
  mode?: BusinessUnderstandingMode;
  aiProvider?: BusinessIntelligenceProvider | null;
}): Promise<GenerateWebsiteResult> {
  const mode = input.mode ?? "deterministic";
  const profile = normalizeBusinessProfile(input.profile);
  const locale = resolveLocale(profile, input.locale);

  const analysis = await understandBusiness({
    profile,
    mode,
    aiProvider: input.aiProvider ?? null,
  });

  return assembleConfig({ profile, analysis, locale, mode });
}

/** Sync path — deterministic only (no AI). */
export function generateWebsiteFromBusinessProfileSync(input: {
  profile: unknown;
  locale?: "fa" | "en";
}): GenerateWebsiteResult {
  const profile = normalizeBusinessProfile(input.profile);
  const locale = resolveLocale(profile, input.locale);
  const analysis = understandBusinessSync(profile);
  return assembleConfig({
    profile,
    analysis,
    locale,
    mode: "deterministic",
  });
}
