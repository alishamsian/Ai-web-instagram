import type { BusinessProfile } from "@/lib/business/types";
import {
  coerceBusinessProfile,
  safeParseBusinessProfile,
} from "@/lib/business/schema";

/**
 * Immutable normalization — never mutates input.
 * Field-level: one bad product cannot wipe the profile.
 */
export function normalizeBusinessProfile(input: unknown): BusinessProfile {
  const clone = structuredClone(input ?? {});
  const coerced = coerceBusinessProfile(clone);

  const brandName =
    coerced.brand?.name?.trim() ||
    coerced.displayName?.trim() ||
    null;

  // Keep products with at least one real signal; names stay null if missing
  const products = (coerced.products ?? []).map((product) => ({
    ...product,
    name: product.name?.trim() || null,
    description: product.description?.trim() || null,
    imageUrl: product.imageUrl ?? null,
    price: product.price ?? null,
    currency: product.currency?.trim() || null,
    attributes: product.attributes ? { ...product.attributes } : undefined,
    confidence:
      typeof product.confidence === "number" ? product.confidence : product.confidence === null ? null : undefined,
  }));

  return {
    source: coerced.source ?? "unknown",
    username: coerced.username ?? null,
    displayName: coerced.displayName ?? null,
    bio: coerced.bio ?? null,
    website: coerced.website ?? null,
    locale: coerced.locale ?? null,
    languages: [...(coerced.languages ?? [])],
    category: coerced.category ?? null,
    subCategory: coerced.subCategory ?? null,
    brand: {
      name: brandName,
      tagline: coerced.brand?.tagline ?? null,
      description: coerced.brand?.description ?? null,
      logoUrl: coerced.brand?.logoUrl ?? null,
      colors: [...(coerced.brand?.colors ?? [])],
    },
    media: {
      images: (coerced.media?.images ?? []).map((image) => ({ ...image })),
      videos: (coerced.media?.videos ?? []).map((video) => ({ ...video })),
    },
    products,
    signals: {
      productSignals: [...(coerced.signals?.productSignals ?? [])],
      contentSignals: [...(coerced.signals?.contentSignals ?? [])],
      brandSignals: [...(coerced.signals?.brandSignals ?? [])],
      audienceSignals: [...(coerced.signals?.audienceSignals ?? [])],
    },
    metadata: coerced.metadata ? { ...coerced.metadata } : undefined,
  };
}

export { safeParseBusinessProfile, coerceBusinessProfile };
