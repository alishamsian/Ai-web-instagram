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
          headline: { fa: "طراحی که توجه می‌گیرد", en: "Design that earns attention" },
          subheadline: { fa: "سایت برند، لانچ و سیستم‌ها — زنده و دقیق.", en: "Brand sites, launches, and systems — crafted live." },
          cta: { fa: "شروع پروژه", en: "Start a project" },
        },
      }),
      sec("services", "section-services", {
        content: { title: { fa: "چه می‌کنیم", en: "What we do" } },
      }),
      sec("portfolio", "section-portfolio", {
        content: { title: { fa: "نمونه کارها", en: "Selected work" } },
      }),
      sec("cta", "section-cta", {
        variant: "split",
        content: { title: { fa: "بریف دارید؟", en: "Have a brief?" }, cta: { fa: "تماس با ما", en: "Contact us" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("services", "services", { fa: "خدمات", en: "Services" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "خدمات", en: "Services" },
          subheadline: { fa: "از ایده تا اثر منتشرشده.", en: "From concept to published craft." },
          cta: { fa: "مشاهده کارها", en: "See work" },
        },
      }),
      sec("services", "section-services"),
      sec("footer", "section-footer"),
    ]),
    page("work", "work", { fa: "نمونه‌کار", en: "Work" }, "custom", [
      sec("hero", "section-hero", {
        variant: "editorial",
        content: {
          headline: { fa: "کارها", en: "Work" },
          subheadline: { fa: "لانچ‌ها و سیستم‌های اخیر.", en: "Recent launches and systems." },
          cta: { fa: "استعلام", en: "Inquire" },
        },
      }),
      sec("portfolio", "section-portfolio", { content: { title: { fa: "کارها", en: "Work" } } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "استودیو", en: "The studio" },
          body: { fa: "تیمی کوچک با تمرکز روی وضوح، حرکت و سیستم‌های برند ماندگار.", en: "A small team focused on clarity, motion, and durable brand systems." },
        },
      }),
      sec("testimonials", "section-testimonials", { variant: "quote" }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "شروع پروژه", en: "Start a project" },
          body: { fa: "از زمان‌بندی، اهداف و محدودیت‌ها بگویید.", en: "Tell us about timeline, goals, and constraints." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
