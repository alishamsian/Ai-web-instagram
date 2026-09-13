import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export const jewelryPack: VerticalPack = {
  id: "jewelry",
  label: { fa: "جواهرات", en: "Jewelry" },
  description: {
    fa: "انگشتر، گردنبند، گوشواره و ساعت",
    en: "Rings, necklaces, earrings, and watches",
  },
  subVerticals: [
    { id: "rings", label: { fa: "انگشتر", en: "Rings" } },
    { id: "necklaces", label: { fa: "گردنبند", en: "Necklaces" } },
    { id: "earrings", label: { fa: "گوشواره", en: "Earrings" } },
    { id: "bracelets", label: { fa: "دستبند", en: "Bracelets" } },
    { id: "watches", label: { fa: "ساعت", en: "Watches" } },
  ],
  sectionTypes: [
    ...CORE_ECOMMERCE_SECTIONS,
    "shop-by-material",
    "shop-by-occasion",
    "collection-story",
    "jewelry-care",
  ],
  recommendedSections: [
    "hero",
    "categories",
    "featured-products",
    "product-spotlight",
    "gallery",
    "products",
    "about",
    "faq",
  ],
  templates: ["jewelry-editorial"],
  productAttributes: [
    {
      key: "material",
      kind: "select",
      label: { fa: "متریال", en: "Material" },
      filterable: true,
      options: [
        { value: "gold", label: { fa: "طلا", en: "Gold" } },
        { value: "silver", label: { fa: "نقره", en: "Silver" } },
        { value: "steel", label: { fa: "استیل", en: "Steel" } },
        { value: "plated", label: { fa: "آبکاری", en: "Plated" } },
      ],
    },
    {
      key: "metal",
      kind: "select",
      label: { fa: "فلز", en: "Metal" },
      filterable: true,
      options: [
        { value: "yellow-gold", label: { fa: "زرد", en: "Yellow gold" } },
        { value: "white-gold", label: { fa: "سفید", en: "White gold" } },
        { value: "rose-gold", label: { fa: "رزگلد", en: "Rose gold" } },
      ],
    },
    {
      key: "stone",
      kind: "text",
      label: { fa: "سنگ", en: "Stone" },
      filterable: true,
    },
    {
      key: "occasion",
      kind: "select",
      label: { fa: "مناسبت", en: "Occasion" },
      filterable: true,
      options: [
        { value: "everyday", label: { fa: "روزمره", en: "Everyday" } },
        { value: "bridal", label: { fa: "عروس", en: "Bridal" } },
        { value: "gift", label: { fa: "هدیه", en: "Gift" } },
      ],
    },
    {
      key: "collection",
      kind: "text",
      label: { fa: "کالکشن", en: "Collection" },
    },
    {
      key: "finish",
      kind: "select",
      label: { fa: "فینیش", en: "Finish" },
      options: [
        { value: "polished", label: { fa: "براق", en: "Polished" } },
        { value: "matte", label: { fa: "مات", en: "Matte" } },
        { value: "textured", label: { fa: "بافت‌دار", en: "Textured" } },
      ],
    },
    {
      key: "size",
      kind: "text",
      label: { fa: "سایز", en: "Size" },
      filterable: true,
      subVerticals: ["rings", "bracelets"],
    },
  ],
  filters: [
    { key: "material", attribute: "material", label: { fa: "متریال", en: "Material" }, kind: "select" },
    { key: "occasion", attribute: "occasion", label: { fa: "مناسبت", en: "Occasion" }, kind: "select" },
  ],
  capabilities: {},
};
