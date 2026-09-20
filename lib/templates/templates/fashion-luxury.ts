import { BRAND_LUXURY } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const fashionLuxuryTemplate = defineTemplate({
  id: "fashion-luxury",
  slug: "fashion-luxury",
  name: { fa: "فشن لوکس", en: "Fashion Luxury" },
  description: {
    fa: "فروشگاه پوشاک با لوک‌بوک، کالکشن و تماس — حس ادیتوریال لوکس.",
    en: "Apparel storefront with lookbook, collection, and contact — luxury editorial feel.",
  },
  category: "fashion",
  style: "luxury",
  tags: ["fashion", "luxury", "lookbook", "shop"],
  features: ["ecommerce", "lookbook", "gallery", "contact-form"],
  legacyTemplate: "store",
  brand: BRAND_LUXURY,
  metadata: {
    industry: "fashion",
    audience: "premium apparel",
    businessTypes: ["fashion"],
  },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "split",
        canonical: true,
        content: {
          headline: { fa: "کالکشن جدید", en: "New collection" },
          subheadline: { fa: "لوکس آرام برای حرکت روزمره.", en: "Quiet luxury for everyday movement." },
          cta: { fa: "خرید کالکشن", en: "Shop the collection" },
        },
      }),
      sec("lookbook", "section-lookbook", {
        content: { title: { fa: "لوک‌بوک", en: "Lookbook" } },
      }),
      sec("featured", "section-featured-products", {
        content: { title: { fa: "قطعات منتخب", en: "Selected pieces" } },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: { fa: "آتلیه", en: "The atelier" },
          body: { fa: "پوشاک با برش دقیق و پارچه طبیعی — از روز تا شب.", en: "We design apparel with precise cuts and natural fabrics — made to move from day to evening." },
        },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        canonical: true,
        content: {
          title: { fa: "کشف این لوک", en: "Discover the look" },
          cta: { fa: "مرور فروشگاه", en: "Browse shop" },
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("shop", "shop", { fa: "فروشگاه", en: "Shop" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "فروشگاه", en: "Shop" },
          subheadline: { fa: "ضروری‌ها و دراپ‌های فصلی.", en: "Essentials and seasonal drops." },
          cta: { fa: "مشاهده همه", en: "View all" },
        },
      }),
      sec("products", "section-products", {
        content: { title: { fa: "کالکشن", en: "Collection" } },
      }),
      sec("categories", "section-categories", {
        content: { title: { fa: "خرید بر اساس دسته", en: "Shop by category" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        variant: "story",
        content: {
          title: { fa: "داستان ما", en: "Our story" },
          body: { fa: "برندی معاصر با تمرکز روی فرم‌های آرام و متریال ماندگار.", en: "A contemporary label focused on calm silhouettes and lasting materials." },
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "grid",
        content: { title: { fa: "استودیو", en: "Studio" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("lookbook", "lookbook", { fa: "لوک‌بوک", en: "Lookbook" }, "custom", [
      sec("hero", "section-hero", {
        variant: "editorial",
        content: {
          headline: { fa: "لوک‌بوک فصل", en: "Season lookbook" },
          subheadline: { fa: "لوک‌های استایل‌شده بدون شلوغی.", en: "Styled looks without the noise." },
          cta: { fa: "خرید این لوک", en: "Shop the look" },
        },
      }),
      sec("lookbook", "section-lookbook"),
      sec("shop-the-look", "section-shop-the-look"),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "تماس", en: "Contact" },
          body: { fa: "سوال سایز، ارسال یا سفارش سفارشی — به ما بنویسید.", en: "Questions about sizing, shipping, or custom orders — write to us." },
        },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: { fa: "بازدید از آتلیه", en: "Visit the atelier" }, cta: { fa: "رزرو بازدید", en: "Book a visit" } },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
