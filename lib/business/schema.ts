import { z } from "zod";

const MAX_PRODUCTS = 48;
const MAX_IMAGES = 40;
const MAX_VIDEOS = 12;
const MAX_COLORS = 8;
const MAX_SIGNALS = 32;
const MAX_LANGUAGES = 8;

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.literal(""))
  .nullable()
  .optional()
  .transform((v) => (v === "" || v == null ? null : v));

const looseUrl = z.preprocess((value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}, z.string().nullable());

export const businessProductSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: looseUrl.optional(),
  price: z.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().max(12).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const businessProfileSchema = z.object({
  source: z
    .enum(["instagram", "manual", "import", "unknown"])
    .optional()
    .default("unknown"),
  username: z.string().trim().max(64).nullable().optional(),
  displayName: z.string().trim().max(160).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  website: looseUrl.optional(),
  locale: z.string().trim().max(16).nullable().optional(),
  languages: z.array(z.string().trim().max(16)).max(MAX_LANGUAGES).optional(),
  category: z.string().trim().max(120).nullable().optional(),
  subCategory: z.string().trim().max(120).nullable().optional(),
  brand: z
    .object({
      name: z.string().trim().max(160).nullable().optional(),
      tagline: z.string().trim().max(240).nullable().optional(),
      logoUrl: looseUrl.optional(),
      colors: z
        .array(z.string().trim().max(32))
        .max(MAX_COLORS)
        .optional(),
    })
    .optional(),
  media: z
    .object({
      images: z
        .array(
          z.object({
            url: z.string().trim().min(1),
            alt: z.string().trim().max(240).nullable().optional(),
            source: z.string().trim().max(64).nullable().optional(),
          }),
        )
        .max(MAX_IMAGES)
        .optional(),
      videos: z
        .array(
          z.object({
            url: z.string().trim().min(1),
            thumbnailUrl: looseUrl.optional(),
          }),
        )
        .max(MAX_VIDEOS)
        .optional(),
    })
    .optional(),
  products: z.array(businessProductSchema).max(MAX_PRODUCTS).optional(),
  signals: z
    .object({
      productSignals: z.array(z.string().trim().max(80)).max(MAX_SIGNALS).optional(),
      contentSignals: z.array(z.string().trim().max(80)).max(MAX_SIGNALS).optional(),
      brandSignals: z.array(z.string().trim().max(80)).max(MAX_SIGNALS).optional(),
      audienceSignals: z.array(z.string().trim().max(80)).max(MAX_SIGNALS).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BusinessProfileInput = z.input<typeof businessProfileSchema>;
export type BusinessProfileParsed = z.output<typeof businessProfileSchema>;

export function safeParseBusinessProfile(input: unknown): {
  ok: boolean;
  data?: BusinessProfileParsed;
  error?: z.ZodError;
} {
  const result = businessProfileSchema.safeParse(input ?? {});
  if (!result.success) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result.data };
}

/** Soft parse: strips invalid fields rather than failing hard. */
export function coerceBusinessProfile(input: unknown): BusinessProfileParsed {
  if (!input || typeof input !== "object") {
    return businessProfileSchema.parse({});
  }
  const result = businessProfileSchema.safeParse(input);
  if (result.success) return result.data;

  // Retry with only known top-level keys to avoid crash on junk
  const raw = input as Record<string, unknown>;
  const soft: Record<string, unknown> = {};
  for (const key of Object.keys(businessProfileSchema.shape)) {
    if (key in raw) soft[key] = raw[key];
  }
  const second = businessProfileSchema.safeParse(soft);
  if (second.success) return second.data;
  return businessProfileSchema.parse({});
}

void optionalUrl;
