import { BRAND_PREMIUM_SOFT } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const beautyPremiumTemplate = defineTemplate({
  id: "beauty-premium",
  slug: "beauty-premium",
  name: { fa: "زیبایی پریمیوم", en: "Beauty Premium" },
  description: {
    fa: "خدمات، محصولات و داستان برند برای فضای زیبایی.",
    en: "Services, products, and brand story for beauty spaces.",
  },
  category: "beauty",
  style: "elegant",
  tags: ["beauty", "care", "services"],
  features: ["ecommerce", "gallery", "testimonials", "contact-form"],
  legacyTemplate: "store",
  brand: BRAND_PREMIUM_SOFT,
  metadata: { industry: "beauty", businessTypes: ["beauty", "fashion"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "overlay",
        canonical: true,
        content: {
          headline: "Care, calmly presented",
          subheadline: "Routines and treatments with a clear path.",
          cta: "Explore care",
        },
      }),
      sec("services", "section-services", {
        content: { title: "Services" },
      }),
      sec("featured", "section-featured-products", {
        content: { title: "Featured products" },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: "Client notes" },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: "Book a consultation", cta: "Get in touch" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("services", "services", { fa: "خدمات", en: "Services" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Services",
          subheadline: "Facials, rituals, and seasonal care.",
          cta: "Book",
        },
      }),
      sec("services", "section-services"),
      sec("faq", "section-faq", { content: { title: "Before you visit" } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "Our approach",
          body: "Gentle formulas, honest guidance, and a quiet studio atmosphere.",
        },
      }),
      sec("gallery", "section-gallery", { content: { title: "Studio" } }),
      sec("footer", "section-footer"),
    ]),
    page("products", "products", { fa: "محصولات", en: "Products" }, "custom", [
      sec("hero", "section-hero", {
        variant: "split",
        content: {
          headline: "Products",
          subheadline: "Home care that matches the studio ritual.",
          cta: "Shop",
        },
      }),
      sec("products", "section-products", { content: { title: "Care collection" } }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Visit & contact",
          body: "Appointments, product questions, and collaborations.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
