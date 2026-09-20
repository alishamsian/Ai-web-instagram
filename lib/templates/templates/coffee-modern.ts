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
          headline: "Origin, roast, and ritual",
          subheadline: "Small-batch coffee with a clear story in every cup.",
          cta: "See the menu",
        },
      }),
      sec("about", "section-about", {
        variant: "split",
        canonical: true,
        content: {
          title: "The roast",
          body: "We source carefully and roast in short lots — flavor first, no gimmicks.",
        },
      }),
      sec("gallery", "section-gallery", {
        variant: "grid",
        content: { title: "The café" },
      }),
      sec("cta", "section-cta", {
        variant: "simple",
        content: { title: "Visit us this week", cta: "Get directions" },
      }),
      sec("footer", "section-footer"),
    ]),
    page("menu", "menu", { fa: "منو", en: "Menu" }, "custom", [
      sec("hero", "section-hero", {
        variant: "minimal",
        content: {
          headline: "Menu",
          subheadline: "Espresso, filter, and pastry.",
          cta: "Order ahead",
        },
      }),
      sec("products", "section-products", { content: { title: "Drinks & food" } }),
      sec("footer", "section-footer"),
    ]),
    page("about", "about", { fa: "درباره", en: "About" }, "about", [
      sec("about", "section-about", {
        content: {
          title: "Our story",
          body: "A neighborhood café built around honest coffee and a calm room.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("location", "location", { fa: "مکان", en: "Location" }, "custom", [
      sec("hero", "section-hero", {
        variant: "centered",
        content: {
          headline: "Location",
          subheadline: "Hours and how to find us.",
          cta: "Open maps",
        },
      }),
      sec("contact", "section-contact", {
        content: {
          title: "Find the café",
          body: "Weekday mornings through late afternoon — see the board for seasonal hours.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
    page("contact", "contact", { fa: "تماس", en: "Contact" }, "custom", [
      sec("contact", "section-contact", {
        content: {
          title: "Contact",
          body: "Wholesale, events, and café questions.",
        },
      }),
      sec("footer", "section-footer"),
    ]),
  ],
});
