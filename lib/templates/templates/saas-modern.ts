import { BRAND_MODERN } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const saasModernTemplate = defineTemplate({
  id: "saas-modern",
  slug: "saas-modern",
  name: { fa: "سااس مدرن", en: "SaaS Modern" },
  description: {
    fa: "محصول نرم‌افزاری با فیچر، قیمت‌گذاری و تماس.",
    en: "Software product site with features, pricing, and contact.",
  },
  category: "saas",
  style: "modern",
  tags: ["saas", "product", "pricing"],
  features: ["pricing", "contact-form", "testimonials"],
  legacyTemplate: "services",
  brand: BRAND_MODERN,
  metadata: { industry: "saas", businessTypes: ["saas"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "split",
        canonical: true,
        content: {
          headline: "Build better workflows",
          subheadline: "A calm product site for teams that ship.",
          cta: "Start free",
        },
      }),
      sec("services", "section-services", {
        canonical: true,
        content: { title: "Explore features" },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: "Trusted by teams" },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: "Start free today", cta: "Create account" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("features", "features", { fa: "قابلیت‌ها", en: "Features" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Features",
          subheadline: "Everything you need to move faster.",
          cta: "See pricing",
        },
      }),
      sec("services", "section-services", {
        content: { title: "Product capabilities" },
      }),
      sec("faq", "section-faq", { content: { title: "FAQ" } }),
      sec("footer", "section-footer"),
    ]),
    page("pricing", "pricing", { fa: "قیمت", en: "Pricing" }, "custom", [
      sec("hero", "section-hero", {
        variant: "centered",
        content: {
          headline: "Simple pricing",
          subheadline: "Start free. Upgrade when you grow.",
          cta: "Compare plans",
        },
      }),
      sec("cta", "section-cta", {
        variant: "full-width",
        content: { title: "Ready when you are", cta: "Start free" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "About the product",
          body: "We build focused tools for operators who care about clarity over clutter.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Talk to us",
          body: "Sales, support, and partnerships.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
