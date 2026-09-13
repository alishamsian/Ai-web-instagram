import type { WebsiteConfig } from "@/types/website";
import { runPublishPreflight } from "@/lib/editor/validation";

export type QualityCategory =
  | "design"
  | "content"
  | "commerce"
  | "mobile"
  | "accessibility"
  | "seo"
  | "performance";

export type QualityDeduction = {
  category: QualityCategory;
  points: number;
  reason: { fa: string; en: string };
};

export type WebsiteQualityScore = {
  total: number;
  categories: Record<QualityCategory, number>;
  deductions: QualityDeduction[];
};

const BASE = 100;

/**
 * Explainable quality score — never random.
 * Every deduction has a concrete reason from config inspection.
 */
export function scoreWebsiteQuality(
  config: WebsiteConfig,
): WebsiteQualityScore {
  const deductions: QualityDeduction[] = [];
  const categories: Record<QualityCategory, number> = {
    design: 100,
    content: 100,
    commerce: 100,
    mobile: 100,
    accessibility: 100,
    seo: 100,
    performance: 100,
  };

  const deduct = (d: QualityDeduction) => {
    deductions.push(d);
    categories[d.category] = Math.max(0, categories[d.category] - d.points);
  };

  if (!config.brand.tagline?.trim()) {
    deduct({
      category: "content",
      points: 6,
      reason: {
        fa: "شعار برند خالی است.",
        en: "Brand tagline is empty.",
      },
    });
  }

  if (!config.content.hero.imageId) {
    deduct({
      category: "design",
      points: 8,
      reason: {
        fa: "هیرو بدون تصویر است.",
        en: "Hero has no image.",
      },
    });
  }

  const products = (config.content.products?.items ?? []).filter(
    (p) => !p.hidden && p.name?.trim(),
  );
  if (products.length === 0) {
    deduct({
      category: "commerce",
      points: 25,
      reason: {
        fa: "محصول قابل‌نمایش وجود ندارد.",
        en: "No visible products.",
      },
    });
  } else if (products.length < 3) {
    deduct({
      category: "commerce",
      points: 8,
      reason: {
        fa: "کاتالوگ کم‌حجم است (کمتر از ۳ محصول).",
        en: "Thin catalog (fewer than 3 products).",
      },
    });
  }

  const withImages = products.filter((p) => p.imageIds.length > 0).length;
  if (products.length > 0 && withImages / products.length < 0.5) {
    deduct({
      category: "commerce",
      points: 10,
      reason: {
        fa: "بیش از نیمی از محصولات تصویر ندارند.",
        en: "More than half of products lack images.",
      },
    });
  }

  if (!config.seo.title?.trim()) {
    deduct({
      category: "seo",
      points: 12,
      reason: { fa: "عنوان SEO خالی است.", en: "SEO title is empty." },
    });
  }
  if (!config.seo.description?.trim()) {
    deduct({
      category: "seo",
      points: 10,
      reason: {
        fa: "توضیح SEO خالی است.",
        en: "SEO description is empty.",
      },
    });
  }

  const mediaCount = Object.keys(config.media).length;
  if (mediaCount > 40) {
    deduct({
      category: "performance",
      points: 8,
      reason: {
        fa: "تعداد media زیاد است؛ lazy-load را بررسی کنید.",
        en: "Large media set — review lazy-loading.",
      },
    });
  }

  let missingAlt = 0;
  for (const m of Object.values(config.media)) {
    if (m.type === "image" && !m.alt?.trim()) missingAlt += 1;
  }
  if (missingAlt > 0) {
    deduct({
      category: "accessibility",
      points: Math.min(20, missingAlt * 4),
      reason: {
        fa: `${missingAlt} تصویر بدون alt.`,
        en: `${missingAlt} image(s) missing alt text.`,
      },
    });
  }

  const visible = config.sections.filter((s) => s.visible !== false);
  if (visible.length < 3) {
    deduct({
      category: "design",
      points: 10,
      reason: {
        fa: "ترکیب صفحه خیلی کم‌حجم است.",
        en: "Page composition is very sparse.",
      },
    });
  }

  // Mobile readiness: recipe-driven or has sections — advisory
  if (!config.settings.recipeId && visible.length > 8) {
    deduct({
      category: "mobile",
      points: 5,
      reason: {
        fa: "صفحه طولانی؛ فاصله‌گذاری موبایل را بررسی کنید.",
        en: "Long page — review mobile spacing.",
      },
    });
  }

  const preflight = runPublishPreflight(config);
  if (!preflight.ok) {
    deduct({
      category: "content",
      points: 5,
      reason: {
        fa: "پیش‌نیازهای انتشار هنوز کامل نیست.",
        en: "Publish preflight still has errors.",
      },
    });
  }

  const total = Math.max(
    0,
    Math.min(
      BASE,
      Math.round(
        Object.values(categories).reduce((a, b) => a + b, 0) /
          Object.keys(categories).length,
      ),
    ),
  );

  return { total, categories, deductions };
}
