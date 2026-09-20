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
          headline: "New collection",
          subheadline: "Quiet luxury for everyday movement.",
          cta: "Shop the collection",
        },
      }),
      sec("lookbook", "section-lookbook", {
        content: { title: "Lookbook" },
      }),
      sec("featured", "section-featured-products", {
        content: { title: "Selected pieces" },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: "The atelier",
          body: "We design apparel with precise cuts and natural fabrics — made to move from day to evening.",
        },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        canonical: true,
        content: {
          title: "Discover the look",
          cta: "Browse shop",
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("shop", "shop", { fa: "فروشگاه", en: "Shop" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Shop",
          subheadline: "Essentials and seasonal drops.",
          cta: "View all",
        },
      }),
      sec("products", "section-products", {
        content: { title: "Collection" },
      }),
      sec("categories", "section-categories", {
        content: { title: "Shop by category" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        variant: "story",
        content: {
          title: "Our story",
          body: "A contemporary label focused on calm silhouettes and lasting materials.",
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "grid",
        content: { title: "Studio" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("lookbook", "lookbook", { fa: "لوک‌بوک", en: "Lookbook" }, "custom", [
      sec("hero", "section-hero", {
        variant: "editorial",
        content: {
          headline: "Season lookbook",
          subheadline: "Styled looks without the noise.",
          cta: "Shop the look",
        },
      }),
      sec("lookbook", "section-lookbook"),
      sec("shop-the-look", "section-shop-the-look"),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Contact",
          body: "Questions about sizing, shipping, or custom orders — write to us.",
        },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: "Visit the atelier", cta: "Book a visit" },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
