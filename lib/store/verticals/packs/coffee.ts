import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export const coffeePack: VerticalPack = {
  id: "coffee",
  label: { fa: "قهوه", en: "Coffee" },
  description: {
    fa: "دانه، رستری، تجهیزات و اشتراک",
    en: "Beans, roastery, equipment, and subscriptions",
  },
  subVerticals: [
    { id: "beans", label: { fa: "دانه", en: "Beans" } },
    { id: "roastery", label: { fa: "رستری", en: "Roastery" } },
    { id: "subscription", label: { fa: "اشتراک", en: "Subscription" } },
    { id: "equipment", label: { fa: "تجهیزات", en: "Equipment" } },
  ],
  sectionTypes: [
    ...CORE_ECOMMERCE_SECTIONS,
    "origin-explorer",
    "flavor-profile",
    "brew-guide",
    "roaster-story",
    "subscription",
    "coffee-finder",
  ],
  recommendedSections: [
    "hero",
    "about",
    "featured-products",
    "products",
    "bestsellers",
    "gallery",
    "faq",
    "cta",
  ],
  templates: ["coffee-story", "coffee-commerce"],
  productAttributes: [
    {
      key: "origin",
      kind: "text",
      label: { fa: "خاستگاه", en: "Origin" },
      filterable: true,
      subVerticals: ["beans", "roastery"],
    },
    {
      key: "roastLevel",
      kind: "select",
      label: { fa: "درجه برشته", en: "Roast level" },
      filterable: true,
      subVerticals: ["beans"],
      options: [
        { value: "light", label: { fa: "لایت", en: "Light" } },
        { value: "medium", label: { fa: "مدیوم", en: "Medium" } },
        { value: "dark", label: { fa: "دارک", en: "Dark" } },
      ],
    },
    {
      key: "flavorNotes",
      kind: "text",
      label: { fa: "نت طعم", en: "Flavor notes" },
      filterable: true,
      subVerticals: ["beans"],
    },
    {
      key: "process",
      kind: "select",
      label: { fa: "فرآیند", en: "Process" },
      filterable: true,
      subVerticals: ["beans"],
      options: [
        { value: "washed", label: { fa: "شسته", en: "Washed" } },
        { value: "natural", label: { fa: "طبیعی", en: "Natural" } },
        { value: "honey", label: { fa: "هانی", en: "Honey" } },
      ],
    },
    {
      key: "altitude",
      kind: "text",
      label: { fa: "ارتفاع", en: "Altitude" },
      subVerticals: ["beans"],
    },
    {
      key: "brewMethod",
      kind: "multiselect",
      label: { fa: "روش دم", en: "Brew method" },
      filterable: true,
      options: [
        { value: "espresso", label: { fa: "اسپرسو", en: "Espresso" } },
        { value: "filter", label: { fa: "فیلتر", en: "Filter" } },
        { value: "french-press", label: { fa: "فرنچ‌پرس", en: "French press" } },
        { value: "cold-brew", label: { fa: "کلدبرو", en: "Cold brew" } },
      ],
    },
    {
      key: "grind",
      kind: "select",
      label: { fa: "آسیاب", en: "Grind" },
      subVerticals: ["beans"],
      options: [
        { value: "whole", label: { fa: "دانه کامل", en: "Whole bean" } },
        { value: "ground", label: { fa: "آسیاب‌شده", en: "Ground" } },
      ],
    },
  ],
  filters: [
    { key: "origin", attribute: "origin", label: { fa: "خاستگاه", en: "Origin" }, kind: "select" },
    { key: "roastLevel", attribute: "roastLevel", label: { fa: "برشته", en: "Roast" }, kind: "select" },
    { key: "process", attribute: "process", label: { fa: "فرآیند", en: "Process" }, kind: "select" },
  ],
  capabilities: { subscriptions: true, origins: true },
};
