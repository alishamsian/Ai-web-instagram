import { BRAND_CREATIVE } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const agencyCreativeTemplate = defineTemplate({
  id: "agency-creative",
  slug: "agency-creative",
  name: { fa: "آژانس خلاق", en: "Agency Creative" },
  description: {
    fa: "خدمات، نمونه‌کار و درباره برای آژانس طراحی.",
    en: "Services, work, and about for a design agency.",
  },
  category: "agency",
  style: "bold",
  tags: ["agency", "creative", "studio"],
  features: ["portfolio", "contact-form", "testimonials"],
  legacyTemplate: "services",
  brand: BRAND_CREATIVE,
  metadata: { industry: "agency", businessTypes: ["agency"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "centered",
        canonical: true,
        content: {
          headline: "Design that earns attention",
          subheadline: "Brand sites, launches, and systems — crafted live.",
          cta: "Start a project",
        },
      }),
      sec("services", "section-services", {
        content: { title: "What we do" },
      }),
      sec("portfolio", "section-portfolio", {
        content: { title: "Selected work" },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: "Have a brief?", cta: "Contact us" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("services", "services", { fa: "خدمات", en: "Services" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Services",
          subheadline: "From concept to published craft.",
          cta: "See work",
        },
      }),
      sec("services", "section-services"),
      sec("footer", "section-footer"),
    ]),
    page("work", "work", { fa: "نمونه‌کار", en: "Work" }, "custom", [
      sec("hero", "section-hero", {
        variant: "editorial",
        content: {
          headline: "Work",
          subheadline: "Recent launches and systems.",
          cta: "Inquire",
        },
      }),
      sec("portfolio", "section-portfolio", { content: { title: "Work" } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "The studio",
          body: "A small team focused on clarity, motion, and durable brand systems.",
        },
      }),
      sec("testimonials", "section-testimonials", { variant: "quote" }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Start a project",
          body: "Tell us about timeline, goals, and constraints.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
