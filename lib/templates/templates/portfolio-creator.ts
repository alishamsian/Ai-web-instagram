import { BRAND_PORTFOLIO } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const portfolioCreatorTemplate = defineTemplate({
  id: "portfolio-creator",
  slug: "portfolio-creator",
  name: { fa: "پورتفولیو کرییتور", en: "Portfolio Creator" },
  description: {
    fa: "نمونه‌کار تمیز برای طراح، عکاس و فریلنسر.",
    en: "Clean portfolio for designers, photographers, and freelancers.",
  },
  category: "portfolio",
  style: "minimal",
  tags: ["portfolio", "creator", "personal"],
  features: ["portfolio", "gallery", "contact-form"],
  legacyTemplate: "portfolio",
  brand: BRAND_PORTFOLIO,
  metadata: {
    industry: "creator",
    businessTypes: ["creator"],
  },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "minimal",
        canonical: true,
        content: {
          headline: "Selected work",
          subheadline: "A focused portfolio for people who ship craft.",
          cta: "View work",
        },
      }),
      sec("portfolio", "section-portfolio", {
        content: { title: "Projects" },
      }),
      sec("about", "section-about", {
        canonical: true,
        content: {
          title: "About",
          body: "Independent designer working across brand, web, and editorial.",
        },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: "Available for select projects", cta: "Email me" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("work", "work", { fa: "کارها", en: "Work" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Work",
          subheadline: "Case studies and stills.",
          cta: "Contact",
        },
      }),
      sec("portfolio", "section-portfolio", { content: { title: "Work" } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "Bio",
          body: "I help brands find a calmer visual language — online and in print.",
        },
      }),
      sec("services", "section-services", {
        content: { title: "Capabilities" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Contact",
          body: "Commissions and collaborations.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
