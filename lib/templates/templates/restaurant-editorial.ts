import { BRAND_EDITORIAL } from "@/lib/templates/brand-presets";
import { defineTemplate, page, sec } from "@/lib/templates/define";

export const restaurantEditorialTemplate = defineTemplate({
  id: "restaurant-editorial",
  slug: "restaurant-editorial",
  name: { fa: "رستوران ادیتوریال", en: "Restaurant Editorial" },
  description: {
    fa: "خانه، منو، رزرو و تماس برای فضای غذایی با روایت فصلی.",
    en: "Home, menu, reservations, and contact for seasonal dining.",
  },
  category: "restaurant",
  style: "editorial",
  tags: ["restaurant", "menu", "dining"],
  features: ["menu", "booking", "gallery", "contact-form"],
  legacyTemplate: "restaurant",
  brand: BRAND_EDITORIAL,
  metadata: {
    industry: "restaurant",
    businessTypes: ["restaurant"],
  },
  pages: [
    page("home", "", { fa: "خانه", en: "Home" }, "home", [
      sec("hero", "section-hero", {
        variant: "overlay",
        canonical: true,
        content: {
          headline: { fa: "غذای فصلی تازه", en: "Fresh seasonal dining" },
          subheadline: { fa: "آشپزخانه‌ای بر پایه محصول محلی و شب‌های آرام.", en: "A kitchen rooted in local produce and slow evenings." },
          cta: { fa: "رزرو میز", en: "Reserve a table" },
        },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: { fa: "آشپزخانه ما", en: "Our kitchen" },
          body: { fa: "آنچه فصل می‌دهد می‌پزیم — منوی کوتاه، طعم روشن، مهمان‌نوازی گرم.", en: "We cook what the season offers — short menus, clear flavors, warm hospitality." },
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "masonry",
        content: { title: { fa: "سالن", en: "The room" } },
      }),
      sec("cta", "section-cta", {
        variant: "full-width",
        content: { title: { fa: "رزرو میز", en: "Reserve a table" }, cta: { fa: "همین حالا رزرو کنید", en: "Book now" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("menu", "menu", { fa: "منو", en: "Menu" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: { fa: "منوی ما", en: "Our menu" },
          subheadline: { fa: "پیش‌غذا، غذای اصلی و دسر — به‌روز هفتگی.", en: "Starters, mains, and dessert — updated weekly." },
          cta: { fa: "منوی امشب", en: "See tonight" },
        },
      }),
      sec("products", "section-menu", {
        content: { title: { fa: "امشب", en: "Tonight" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: { fa: "درباره ما", en: "About us" },
          body: { fa: "رستوران محله‌ای با نگاه ادیتوریال — غذا اول، بدون حاشیه.", en: "A neighborhood restaurant with an editorial eye — food first, no fuss." },
        },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "quote",
        content: { title: { fa: "مهمان‌ها می‌گویند", en: "Guests say" } },
      }),
      sec("footer", "section-footer"),
    ]),
    page(
      "reservations",
      "reservations",
      { fa: "رزرو", en: "Reservations" },
      "custom",
      [
        sec("hero", "section-hero", {
          variant: "centered",
          content: {
            headline: { fa: "رزرو", en: "Reservations" },
            subheadline: { fa: "میز شام و دورهمی‌های خصوصی.", en: "Dinner seats and private gatherings." },
            cta: { fa: "درخواست میز", en: "Request a table" },
          },
        }),
        sec("location", "section-location", {
          content: { title: { fa: "رزرو و مکان", en: "Reservations & location" } },
        }),
        sec("cta", "section-cta", {
          variant: "simple",
          content: { title: { fa: "شب‌تان را رزرو کنید", en: "Book your evening" }, cta: { fa: "رزرو", en: "Reserve" } },
        }),
        sec("contact", "section-contact", {
          content: {
            title: { fa: "یا تماس بگیرید", en: "Or call us" },
            body: { fa: "برای مهمانی و رویداد بزرگ‌تر با پذیرش تماس بگیرید.", en: "For larger parties and events, reach the front desk." },
          },
        }),
        sec("footer", "section-footer"),
      ],
    ),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: { fa: "پیدا کردن ما", en: "Find us" },
          body: { fa: "ساعات، مکان و مسیر.", en: "Hours, location, and directions." },
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
