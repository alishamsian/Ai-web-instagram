import { z } from "zod";
import type {
  BusinessProfile,
  BusinessProductInput,
  BusinessSource,
} from "@/lib/business/types";

export const MAX_PRODUCTS = 48;
export const MAX_IMAGES = 40;
export const MAX_VIDEOS = 12;
export const MAX_COLORS = 8;
export const MAX_SIGNALS = 32;
export const MAX_LANGUAGES = 8;

const UNSAFE_URL_PROTOCOLS = /^(javascript|data|file|vbscript):/i;

/** Only http(s) URLs — never javascript/data/file. */
export function sanitizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || UNSAFE_URL_PROTOCOLS.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function softString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function softStringArray(
  value: unknown,
  maxItems: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = softString(item, maxLen);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

export const businessProductSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  price: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(12).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export type BusinessProfileParsed = BusinessProfile;

export function safeParseBusinessProfile(input: unknown): {
  ok: boolean;
  data?: BusinessProfile;
  error?: z.ZodError;
} {
  try {
    const data = coerceBusinessProfile(input);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error };
    return { ok: false };
  }
}

function coerceProduct(raw: unknown): BusinessProductInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;

  const name = softString(item.name, 200);
  const description = softString(item.description, 2000);
  const imageUrl = sanitizeHttpUrl(item.imageUrl);
  const id = softString(item.id, 120) ?? undefined;

  let price: number | null = null;
  if (typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0) {
    price = item.price;
  } else if (item.price === null) {
    price = null;
  } else if (item.price !== undefined) {
    // malformed price — discard product? keep product without price
    price = null;
  }

  const currency = softString(item.currency, 12);

  let attributes: Record<string, unknown> | undefined;
  if (item.attributes && typeof item.attributes === "object" && !Array.isArray(item.attributes)) {
    attributes = { ...(item.attributes as Record<string, unknown>) };
  }

  let confidence: number | null | undefined;
  if (typeof item.confidence === "number" && Number.isFinite(item.confidence)) {
    confidence = Math.max(0, Math.min(1, item.confidence));
  } else if (item.confidence === null) {
    confidence = null;
  }

  // Completely empty / junk row
  if (!name && !description && !imageUrl && !id) return null;

  return {
    id,
    name,
    description,
    imageUrl,
    price,
    currency,
    attributes,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

/**
 * Field-level coercion — one bad nested item never destroys the profile.
 */
export function coerceBusinessProfile(input: unknown): BusinessProfile {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      source: "unknown",
      brand: { name: null, tagline: null, description: null, logoUrl: null, colors: [] },
      media: { images: [], videos: [] },
      products: [],
      signals: {
        productSignals: [],
        contentSignals: [],
        brandSignals: [],
        audienceSignals: [],
      },
    };
  }

  const raw = input as Record<string, unknown>;

  const sourceRaw = softString(raw.source, 32);
  const source: BusinessSource =
    sourceRaw === "instagram" ||
    sourceRaw === "manual" ||
    sourceRaw === "import" ||
    sourceRaw === "unknown"
      ? sourceRaw
      : "unknown";

  const brandRaw =
    raw.brand && typeof raw.brand === "object" && !Array.isArray(raw.brand)
      ? (raw.brand as Record<string, unknown>)
      : {};

  const mediaRaw =
    raw.media && typeof raw.media === "object" && !Array.isArray(raw.media)
      ? (raw.media as Record<string, unknown>)
      : {};

  const signalsRaw =
    raw.signals && typeof raw.signals === "object" && !Array.isArray(raw.signals)
      ? (raw.signals as Record<string, unknown>)
      : Array.isArray(raw.signals)
        ? { contentSignals: raw.signals }
        : {};

  const products: BusinessProductInput[] = [];
  if (Array.isArray(raw.products)) {
    for (const row of raw.products.slice(0, MAX_PRODUCTS * 2)) {
      const product = coerceProduct(row);
      if (product) products.push(product);
      if (products.length >= MAX_PRODUCTS) break;
    }
  }

  const images: NonNullable<BusinessProfile["media"]>["images"] = [];
  const imageInput = mediaRaw.images;
  if (Array.isArray(imageInput)) {
    for (const row of imageInput) {
      if (images.length >= MAX_IMAGES) break;
      if (typeof row === "string") {
        const url = sanitizeHttpUrl(row);
        if (url) images.push({ url, alt: null, source: null });
        continue;
      }
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const obj = row as Record<string, unknown>;
        const url = sanitizeHttpUrl(obj.url);
        if (!url) continue;
        images.push({
          url,
          alt: softString(obj.alt, 240),
          source: softString(obj.source, 64),
        });
      }
    }
  }

  const videos: NonNullable<BusinessProfile["media"]>["videos"] = [];
  if (Array.isArray(mediaRaw.videos)) {
    for (const row of mediaRaw.videos) {
      if (videos.length >= MAX_VIDEOS) break;
      if (typeof row === "string") {
        const url = sanitizeHttpUrl(row);
        if (url) videos.push({ url, thumbnailUrl: null });
        continue;
      }
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const obj = row as Record<string, unknown>;
        const url = sanitizeHttpUrl(obj.url);
        if (!url) continue;
        videos.push({
          url,
          thumbnailUrl: sanitizeHttpUrl(obj.thumbnailUrl),
        });
      }
    }
  }

  const metadata =
    raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
      ? { ...(raw.metadata as Record<string, unknown>) }
      : undefined;

  return {
    source,
    username: softString(raw.username, 64),
    displayName: softString(raw.displayName, 160),
    bio: softString(raw.bio, 2000),
    website: sanitizeHttpUrl(raw.website),
    locale: softString(raw.locale, 16),
    languages: softStringArray(raw.languages, MAX_LANGUAGES, 16),
    category: softString(raw.category, 120),
    subCategory: softString(raw.subCategory, 120),
    brand: {
      name: softString(brandRaw.name, 160),
      tagline: softString(brandRaw.tagline, 240),
      description: softString(brandRaw.description, 2000),
      logoUrl: sanitizeHttpUrl(brandRaw.logoUrl),
      colors: softStringArray(brandRaw.colors, MAX_COLORS, 32),
    },
    media: { images, videos },
    products,
    signals: {
      productSignals: softStringArray(signalsRaw.productSignals, MAX_SIGNALS, 80),
      contentSignals: softStringArray(signalsRaw.contentSignals, MAX_SIGNALS, 80),
      brandSignals: softStringArray(signalsRaw.brandSignals, MAX_SIGNALS, 80),
      audienceSignals: softStringArray(
        signalsRaw.audienceSignals,
        MAX_SIGNALS,
        80,
      ),
    },
    metadata,
  };
}

/** @deprecated Use coerceBusinessProfile — kept for callers expecting Zod schema export */
export const businessProfileSchema = z.object({
  source: z.enum(["instagram", "manual", "import", "unknown"]).optional(),
});
