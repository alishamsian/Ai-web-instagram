import { BRAND_COFFEE } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const coffeeModernTemplate = defineTemplate({
  id: "coffee-modern",
  slug: "coffee-modern",
  name: { fa: "کافه مدرن", en: "Coffee Modern" },
  description: {
    fa: "خانه، منو، مکان و تماس برای کافه و رستری.",
    en: "Home, menu, location, and contact for a modern café.",
  },
  category: "coffee",
  style: "organic",
  tags: ["coffee", "cafe", "menu"],
  features: ["menu", "gallery", "contact-form"],
  legacyTemplate: "restaurant",
  brand: BRAND_COFFEE,
  metadata: { industry: "coffee", businessTypes: ["coffee", "restaurant"] },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "overlay",
        canonical: true,
        content: {
          headline: { fa: "خاستگاه، رست و آیین", en: "Origin, roast, and ritual" },
          subheadline: { fa: "قهوه دسته‌کوچک با روایتی روشن در هر فنجان.", en: "Small-batch coffee with a clear story in every cup." },
          cta: { fa: "مشاهده منو", en: "See the menu" },
        },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: { fa: "رست", en: "The roast" },
          body: { fa: "با دقت تأمین می‌کنیم و در بچ‌های کوتاه رست می‌کنیم — طعم اول، بدون ژست.", en: "We source carefully and roast in short lots — flavor first, no gimmicks." },
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "grid",
        content: { title: { fa: "کافه", en: "The café" } },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: { fa: "همین هفته سر بزنید", en: "Visit us this week" }, cta: { fa: "مسیریابی", en: "Get directions" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("menu", "menu", { fa: "منو", en: "Menu" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "منو", en: "Menu" },
          subheadline: { fa: "اسپرسو، فیلتر و شیرینی.", en: "Espresso, filter, and pastry." },
          cta: { fa: "سفارش از قبل", en: "Order ahead" },
        },
      }),
      sec("products", "section-menu", { content: { title: { fa: "نوشیدنی و غذا", en: "Drinks & food" } } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "داستان ما", en: "Our story" },
          body: { fa: "کافه محله‌ای حول قهوه صادقانه و فضایی آرام.", en: "A neighborhood café built around honest coffee and a calm room." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("location", "location", { fa: "مکان", en: "Location" }, "custom", [
      sec("hero", "section-hero", {
        variant: "centered",
        content: {
          headline: { fa: "مکان", en: "Location" },
          subheadline: { fa: "ساعات کاری و راه رسیدن.", en: "Hours and how to find us." },
          cta: { fa: "باز کردن نقشه", en: "Open maps" },
        },
      }),
      sec("location", "section-location", {
        content: { title: { fa: "مکان", en: "Location" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "تماس", en: "Contact" },
          body: { fa: "عمده، رویداد و سوالات کافه.", en: "Wholesale, events, and café questions." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
