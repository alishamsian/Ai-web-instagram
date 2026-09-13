import type { WebsiteConfig } from "@/types/website";
import type { GeneratedWebsiteContent } from "@/lib/business/content/schema";
import type { Product } from "@/types/ai";
import type { BusinessProfile } from "@/lib/business/types";
import { isAllowedSchemaPath } from "@/lib/store/registry/element-schema";

const APPROVED_CONTENT_PATHS = new Set([
  "brand.name",
  "brand.tagline",
  "content.hero.headline",
  "content.hero.subheadline",
  "content.hero.cta",
  "content.about.title",
  "content.about.body",
  "content.products.title",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setPathImmutable(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  if (!isAllowedSchemaPath(path) && !APPROVED_CONTENT_PATHS.has(path)) {
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
 * Immutable, path-safe — no CSS, no JSX, no unknown bags.
 */
export function applyGeneratedContent(
  config: WebsiteConfig,
  content: GeneratedWebsiteContent,
): WebsiteConfig {
  const before = structuredClone(config) as unknown as Record<string, unknown>;
  let next = before;

  next = setPathImmutable(next, "brand.name", content.brandName);
  if (content.tagline) {
    next = setPathImmutable(next, "brand.tagline", content.tagline);
  }
  next = setPathImmutable(next, "content.hero.headline", content.hero.headline);
  next = setPathImmutable(
    next,
    "content.hero.subheadline",
    content.hero.subheadline,
  );
  next = setPathImmutable(next, "content.hero.cta", content.hero.cta);

  if (content.about) {
    next = setPathImmutable(next, "content.about.title", content.about.title);
    next = setPathImmutable(next, "content.about.body", content.about.body);
  }
  if (content.productsTitle) {
    next = setPathImmutable(
      next,
      "content.products.title",
      content.productsTitle,
    );
  }

  const typed = next as unknown as WebsiteConfig;
  typed.sections = typed.sections.map((section) => {
    const copy = content.sectionCopy[section.type];
    if (!copy) return section;
    return {
      ...section,
      settings: {
        ...section.settings,
        ...(copy.kicker ? { kicker: copy.kicker } : {}),
        ...(copy.title ? { title: copy.title } : {}),
        ...(copy.description ? { description: copy.description } : {}),
      },
    };
  });

  typed.seo = {
    ...typed.seo,
    title: content.brandName,
    description: content.hero.subheadline.slice(0, 160),
  };

  return typed;
}

/**
 * Map BusinessProfile products → existing Product model.
 * Never invents price/currency when missing.
 */
export function mapBusinessProductsToCatalog(
  profile: BusinessProfile,
): Product[] {
  return (profile.products ?? []).map((product, index) => {
    const imageIds: string[] = [];
    // Media attachment happens in pipeline when media map is built
    return {
      id: product.id ?? `biz-${index + 1}`,
      name: product.name?.trim() || `Product ${index + 1}`,
      description: product.description?.trim() || "",
      category: "",
      price: product.price ?? null,
      currency: product.currency ?? null,
      imageIds,
      confidence: 1,
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
    } satisfies Product;
  });
}
