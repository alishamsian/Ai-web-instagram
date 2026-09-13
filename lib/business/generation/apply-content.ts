import type { WebsiteConfig } from "@/types/website";
import type { GeneratedWebsiteContent } from "@/lib/business/content/schema";
import type { Product } from "@/types/ai";
import type { BusinessProfile } from "@/lib/business/types";

/**
 * Strict allowlist for generated-content writes.
 * Broader schema editor paths are intentionally NOT used here.
 */
export const GENERATED_CONTENT_ALLOWLIST = new Set([
  "brand.name",
  "brand.tagline",
  "content.hero.headline",
  "content.hero.subheadline",
  "content.hero.cta",
  "content.about.title",
  "content.about.body",
  "content.products.title",
  "seo.title",
  "seo.description",
]);

const SECTION_SETTING_KEYS = new Set(["kicker", "title", "description"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setAllowedPath(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  if (!GENERATED_CONTENT_ALLOWLIST.has(path)) {
    return root;
  }
  if (typeof value !== "string") {
    return root;
  }
  const parts = path.split(".");
  const clone: Record<string, unknown> = { ...root };
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cursor[key];
    cursor[key] = isPlainObject(next) ? { ...next } : {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
  return clone;
}

/**
 * Apply generated semantic content onto WebsiteConfig.
 * Immutable + explicit allowlist only.
 */
export function applyGeneratedContent(
  config: WebsiteConfig,
  content: GeneratedWebsiteContent,
): WebsiteConfig {
  let next = structuredClone(config) as unknown as Record<string, unknown>;

  next = setAllowedPath(next, "brand.name", content.brandName);
  if (content.tagline) {
    next = setAllowedPath(next, "brand.tagline", content.tagline);
  }
  next = setAllowedPath(next, "content.hero.headline", content.hero.headline);
  next = setAllowedPath(
    next,
    "content.hero.subheadline",
    content.hero.subheadline,
  );
  next = setAllowedPath(next, "content.hero.cta", content.hero.cta);

  if (content.about) {
    next = setAllowedPath(next, "content.about.title", content.about.title);
    next = setAllowedPath(next, "content.about.body", content.about.body);
  }
  if (content.productsTitle) {
    next = setAllowedPath(next, "content.products.title", content.productsTitle);
  }

  next = setAllowedPath(next, "seo.title", content.brandName);
  next = setAllowedPath(
    next,
    "seo.description",
    content.hero.subheadline.slice(0, 160),
  );

  const typed = next as unknown as WebsiteConfig;
  typed.sections = typed.sections.map((section) => {
    const copy = content.sectionCopy[section.type];
    if (!copy) return { ...section };
    const settings: Record<string, unknown> = { ...section.settings };
    if (copy.kicker && SECTION_SETTING_KEYS.has("kicker")) {
      settings.kicker = copy.kicker;
    }
    if (copy.title && SECTION_SETTING_KEYS.has("title")) {
      settings.title = copy.title;
    }
    if (copy.description && SECTION_SETTING_KEYS.has("description")) {
      settings.description = copy.description;
    }
    return {
      ...section,
      settings,
    };
  });

  return typed;
}

/**
 * Map BusinessProfile products → Product model.
 * - Skips products without a real name (no "Product N" fabrication)
 * - Never invents price/currency/category
 * - confidence comes from source or 0 (unknown), never forced to 1
 */
export function mapBusinessProductsToCatalog(
  profile: BusinessProfile,
): Product[] {
  const out: Product[] = [];
  for (const product of profile.products ?? []) {
    const name = product.name?.trim();
    if (!name) continue;

    const attrCategory = product.attributes?.category;
    const category =
      typeof attrCategory === "string" && attrCategory.trim()
        ? attrCategory.trim()
        : "";

    const confidence =
      typeof product.confidence === "number" &&
      Number.isFinite(product.confidence)
        ? Math.max(0, Math.min(1, product.confidence))
        : 0;

    out.push({
      id: product.id,
      name,
      description: product.description?.trim() || "",
      category,
      price: product.price ?? null,
      currency: product.currency ?? null,
      imageIds: [],
      confidence,
      industryData: product.attributes
        ? {
            attributes: Object.fromEntries(
              Object.entries(product.attributes).map(([key, value]) => [
                key,
                value as string | number | boolean | string[] | null,
              ]),
            ),
          }
        : undefined,
    });
  }
  return out;
}

/** Test helper: reject unsafe generated paths */
export function isGeneratedContentPathAllowed(path: string): boolean {
  return GENERATED_CONTENT_ALLOWLIST.has(path);
}
