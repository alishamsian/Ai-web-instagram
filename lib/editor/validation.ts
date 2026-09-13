import type { WebsiteConfig } from "@/types/website";

export type PublishIssue = {
  id: string;
  severity: "error" | "warning";
  category: "content" | "commerce" | "seo" | "accessibility" | "config" | "responsive";
  message: { fa: string; en: string };
};

export type PublishPreflightResult = {
  ok: boolean;
  errors: PublishIssue[];
  warnings: PublishIssue[];
};

export function runPublishPreflight(
  config: WebsiteConfig,
): PublishPreflightResult {
  const errors: PublishIssue[] = [];
  const warnings: PublishIssue[] = [];

  const products = (config.content.products?.items ?? []).filter(
    (p) => !p.hidden && Boolean(p.name?.trim()),
  );

  if (products.length === 0) {
    errors.push({
      id: "no-products",
      severity: "error",
      category: "commerce",
      message: {
        fa: "حداقل یک محصول با نام واقعی لازم است.",
        en: "At least one product with a real name is required.",
      },
    });
  }

  if (!config.brand.name?.trim()) {
    errors.push({
      id: "no-brand",
      severity: "error",
      category: "content",
      message: {
        fa: "نام برند خالی است.",
        en: "Brand name is empty.",
      },
    });
  }

  if (!config.seo.title?.trim()) {
    warnings.push({
      id: "seo-title",
      severity: "warning",
      category: "seo",
      message: {
        fa: "عنوان SEO خالی است.",
        en: "SEO title is empty.",
      },
    });
  }

  if (!config.seo.description?.trim()) {
    warnings.push({
      id: "seo-description",
      severity: "warning",
      category: "seo",
      message: {
        fa: "توضیح SEO خالی است.",
        en: "SEO description is empty.",
      },
    });
  }

  if (!config.content.hero.headline?.trim()) {
    warnings.push({
      id: "hero-headline",
      severity: "warning",
      category: "content",
      message: {
        fa: "تیتر هیرو خالی است.",
        en: "Hero headline is empty.",
      },
    });
  }

  const heroId = config.content.hero.imageId;
  if (heroId && !config.media[heroId]) {
    warnings.push({
      id: "hero-media-missing",
      severity: "warning",
      category: "content",
      message: {
        fa: "تصویر هیرو در media پیدا نشد.",
        en: "Hero image id is missing from media.",
      },
    });
  }

  for (const media of Object.values(config.media)) {
    if (!media.alt?.trim() && media.type === "image") {
      warnings.push({
        id: `alt-${media.url.slice(-24)}`,
        severity: "warning",
        category: "accessibility",
        message: {
          fa: "برخی تصاویر alt متن ندارند.",
          en: "Some images are missing alt text.",
        },
      });
      break;
    }
  }

  const unknownSections = config.sections.filter(
    (s) => typeof s.type !== "string" || !s.type,
  );
  if (unknownSections.length > 0) {
    errors.push({
      id: "invalid-sections",
      severity: "error",
      category: "config",
      message: {
        fa: "سکشن نامعتبر در پیکربندی وجود دارد.",
        en: "Invalid section entries exist in the config.",
      },
    });
  }

  if (!config.sections.some((s) => s.type === "hero" && s.visible !== false)) {
    warnings.push({
      id: "no-visible-hero",
      severity: "warning",
      category: "content",
      message: {
        fa: "هیرو قابل‌مشاهده وجود ندارد.",
        en: "No visible hero section.",
      },
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
