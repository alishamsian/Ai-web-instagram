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
  buildWebsiteConfigFromRecipe,
  resolveRecipe,
} from "@/lib/store/recipes/builder";
import { getRecipe } from "@/lib/store/recipes/registry";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";
import { CONFIDENCE } from "@/lib/business/understanding/confidence";

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
  if (locale.startsWith("fa")) return "fa";
  return "en";
}

function resolveRecipeId(analysis: BusinessAnalysis): string {
  if (
    analysis.confidenceBand === "low" ||
    analysis.confidence < CONFIDENCE.MEDIUM
  ) {
    return "generic-store";
  }
  if (
    analysis.recommendedTemplate &&
    getRecipe(analysis.recommendedTemplate)
  ) {
    return analysis.recommendedTemplate;
  }
  return "generic-store";
}

function attachMediaAndProducts(
  config: WebsiteConfig,
  profile: BusinessProfile,
): WebsiteConfig {
  const media: WebsiteConfig["media"] = { ...config.media };
  const products = mapBusinessProductsToCatalog(profile);

  const images = profile.media?.images ?? [];
  images.forEach((image, index) => {
    const id = `biz-img-${index + 1}`;
    media[id] = {
      url: image.url,
      alt: image.alt ?? profile.brand?.name ?? "Image",
      type: "image",
    };
  });

  if (profile.brand?.logoUrl) {
    media.logo = {
      url: profile.brand.logoUrl,
      alt: profile.brand.name ?? "Logo",
      type: "image",
    };
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

  const items: Product[] = products.map((product, index) => {
    const source =
      (product.id ? sourceByKey.get(`id:${product.id}`) : undefined) ??
      sourceByKey.get(`name:${product.name.toLowerCase()}`);
    const imageUrl = source?.imageUrl;
    if (!imageUrl) return product;
    const id = `biz-product-img-${index + 1}`;
    media[id] = {
      url: imageUrl,
      alt: product.name,
      type: "image",
    };
    return { ...product, imageIds: [id] };
  });

  const galleryIds = Object.keys(media).filter((id) =>
    id.startsWith("biz-img-"),
  );

  return {
    ...config,
    media,
    content: {
      ...config.content,
      products: {
        title: config.content.products?.title ?? "Products",
        items,
      },
      gallery:
        galleryIds.length > 0
          ? {
              title:
                config.settings.language === "fa" ? "گالری" : "Gallery",
              imageIds: galleryIds,
            }
          : config.content.gallery,
      about: config.content.about,
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
  const recipe = resolveRecipe(resolveRecipeId(analysis));
  const brandName =
    profile.brand?.name ||
    profile.displayName ||
    profile.username ||
    (locale === "fa" ? "فروشگاه" : "Store");

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
  config = attachMediaAndProducts(config, profile);

  if (content.about) {
    config = {
      ...config,
      content: {
        ...config.content,
        about: content.about,
      },
    };
  }

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
