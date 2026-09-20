import { BRAND_REAL_ESTATE } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const realEstateTemplate = defineTemplate({
  id: "real-estate",
  slug: "real-estate",
  name: { fa: "املاک", en: "Real Estate" },
  description: {
    fa: "خانه، ملک‌ها، درباره و تماس برای مشاور املاک.",
    en: "Home, listings, about, and contact for property advisors.",
  },
  category: "real-estate",
  style: "corporate",
  tags: ["real-estate", "property", "listings"],
  features: ["gallery", "contact-form", "testimonials"],
  legacyTemplate: "services",
  brand: BRAND_REAL_ESTATE,
  metadata: {
    industry: "real-estate",
    businessTypes: ["real-estate"],
  },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "split",
        canonical: true,
        content: {
          headline: "Homes with presence",
          subheadline: "Curated listings and calm guidance through every step.",
          cta: "View properties",
        },
      }),
      sec("featured", "section-featured-products", {
        content: { title: "Featured homes" },
      }),
      sec("about", "section-about", {
        canonical: true,
        content: {
          title: "Advisory",
          body: "We help buyers and sellers move with clarity — fewer listings, better fits.",
        },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "cards",
        content: { title: "Client stories" },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: "Ready to talk?", cta: "Contact an advisor" },
      }),
      sec("footer", "section-footer"),
    ]),
    page(
      "properties",
      "properties",
      { fa: "ملک‌ها", en: "Properties" },
      "custom",
      [
        sec("hero", "section-hero", {
          variant: "minimal",
          content: {
            headline: "Properties",
            subheadline: "Active listings and private viewings.",
            cta: "Request a tour",
          },
        }),
        sec("products", "section-products", {
          content: { title: "Listings" },
        }),
        sec("gallery", "section-gallery", { content: { title: "Galleries" } }),
        sec("footer", "section-footer"),
      ],
    ),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "About the practice",
          body: "A focused real-estate studio for city homes and quiet suburbs.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Contact",
          body: "Buying, selling, and valuation inquiries.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
