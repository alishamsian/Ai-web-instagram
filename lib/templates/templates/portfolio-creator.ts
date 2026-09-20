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
          headline: { fa: "نمونه کارها", en: "Selected work" },
          subheadline: { fa: "پورتفولیوی متمرکز برای کسانی که کار دستی می‌سازند.", en: "A focused portfolio for people who ship craft." },
          cta: { fa: "مشاهده کارها", en: "View work" },
        },
      }),
      sec("portfolio", "section-portfolio", {
        content: { title: { fa: "پروژه‌ها", en: "Projects" } },
      }),
      sec("about", "section-about", {
        canonical: true,
        content: {
          title: { fa: "درباره", en: "About" },
          body: { fa: "طراح مستقل در برند، وب و ادیتوریال.", en: "Independent designer working across brand, web, and editorial." },
        },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: { fa: "آماده پروژه‌های منتخب", en: "Available for select projects" }, cta: { fa: "ایمیل بزنید", en: "Email me" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("work", "work", { fa: "کارها", en: "Work" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "کارها", en: "Work" },
          subheadline: { fa: "کیس‌استادی و تصاویر.", en: "Case studies and stills." },
          cta: { fa: "تماس", en: "Contact" },
        },
      }),
      sec("portfolio", "section-portfolio", { content: { title: { fa: "کارها", en: "Work" } } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "بیو", en: "Bio" },
          body: { fa: "به برندها کمک می‌کنم زبان بصری آرام‌تری پیدا کنند — آنلاین و چاپی.", en: "I help brands find a calmer visual language — online and in print." },
        },
      }),
      sec("services", "section-services", {
        content: { title: { fa: "توانمندی‌ها", en: "Capabilities" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "تماس", en: "Contact" },
          body: { fa: "سفارش و همکاری.", en: "Commissions and collaborations." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
