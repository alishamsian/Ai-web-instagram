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
          headline: "Fresh seasonal dining",
          subheadline: "A kitchen rooted in local produce and slow evenings.",
          cta: "Reserve a table",
        },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: "Our kitchen",
          body: "We cook what the season offers — short menus, clear flavors, warm hospitality.",
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "masonry",
        content: { title: "The room" },
      }),
      sec("cta", "section-cta", {
        variant: "full-width",
        content: { title: "Reserve a table", cta: "Book now" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("menu", "menu", { fa: "منو", en: "Menu" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Our menu",
          subheadline: "Starters, mains, and dessert — updated weekly.",
          cta: "See tonight",
        },
      }),
      sec("products", "section-products", {
        content: { title: "Tonight" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "About us",
          body: "A neighborhood restaurant with an editorial eye — food first, no fuss.",
        },
      }),
      sec("testimonials", "section-testimonials", {
        variant: "quote",
        content: { title: "Guests say" },
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
            headline: "Reservations",
            subheadline: "Dinner seats and private gatherings.",
            cta: "Request a table",
          },
        }),
        sec("cta", "section-cta", {
          variant: "simple",
          content: { title: "Book your evening", cta: "Reserve" },
        }),
        sec("contact", "section-contact", {
          content: {
            title: "Or call us",
            body: "For larger parties and events, reach the front desk.",
          },
        }),
        sec("footer", "section-footer"),
      ],
    ),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Find us",
          body: "Hours, location, and directions.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
