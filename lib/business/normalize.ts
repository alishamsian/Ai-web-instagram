import type { BusinessProfile } from "@/lib/business/types";
import {
  coerceBusinessProfile,
  safeParseBusinessProfile,
  type BusinessProfileParsed,
} from "@/lib/business/schema";

function uniqStrings(values: Array<string | null | undefined>, max = 32): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Immutable normalization — never mutates input.
 * Malformed payloads coerce to a safe empty-ish profile.
 */
export function normalizeBusinessProfile(input: unknown): BusinessProfile {
  const parsed: BusinessProfileParsed = coerceBusinessProfile(
    structuredClone(input ?? {}),
  );

  const brandName =
    parsed.brand?.name?.trim() ||
    parsed.displayName?.trim() ||
    null;

  const products = (parsed.products ?? [])
    .map((product, index) => {
      const name = product.name?.trim() || null;
      const description = product.description?.trim() || null;
      if (!name && !description && !product.imageUrl) return null;
      return {
        id: product.id?.trim() || `p-${index + 1}`,
        name,
        description,
        imageUrl: product.imageUrl ?? null,
        // Preserve source prices only — never invent
        price: product.price ?? null,
        currency: product.currency?.trim() || null,
        attributes: product.attributes
          ? { ...product.attributes }
          : undefined,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const images = (parsed.media?.images ?? [])
    .map((image) => {
      const url = image.url?.trim();
      if (!url) return null;
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return null;
        }
        return {
          url: parsedUrl.toString(),
          alt: image.alt?.trim() || null,
          source: image.source?.trim() || null,
        };
      } catch {
        return null;
      }
    })
    .filter((i): i is NonNullable<typeof i> => i != null);

  return {
    source: parsed.source ?? "unknown",
    username: parsed.username?.trim() || null,
    displayName: parsed.displayName?.trim() || null,
    bio: parsed.bio?.trim() || null,
    website: parsed.website ?? null,
    locale: parsed.locale?.trim() || null,
    languages: uniqStrings(parsed.languages ?? []),
    category: parsed.category?.trim() || null,
    subCategory: parsed.subCategory?.trim() || null,
    brand: {
      name: brandName,
      tagline: parsed.brand?.tagline?.trim() || null,
      logoUrl: parsed.brand?.logoUrl ?? null,
      colors: uniqStrings(parsed.brand?.colors ?? [], 8),
    },
    media: {
      images,
      videos: (parsed.media?.videos ?? [])
        .map((video) => {
          const url = video.url?.trim();
          if (!url) return null;
          return {
            url,
            thumbnailUrl: video.thumbnailUrl ?? null,
          };
        })
        .filter((v): v is NonNullable<typeof v> => v != null),
    },
    products,
    signals: {
      productSignals: uniqStrings(parsed.signals?.productSignals ?? []),
      contentSignals: uniqStrings(parsed.signals?.contentSignals ?? []),
      brandSignals: uniqStrings(parsed.signals?.brandSignals ?? []),
      audienceSignals: uniqStrings(parsed.signals?.audienceSignals ?? []),
    },
    metadata: parsed.metadata ? { ...parsed.metadata } : undefined,
  };
}

export { safeParseBusinessProfile, coerceBusinessProfile };
