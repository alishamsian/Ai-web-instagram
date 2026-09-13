import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export const furniturePack: VerticalPack = {
  id: "furniture",
  label: { fa: "مبلمان", en: "Furniture" },
  description: {
    fa: "خانه، اداری و فضای باز",
    en: "Home, office, and outdoor furniture",
  },
  subVerticals: [
    { id: "living", label: { fa: "نشیمن", en: "Living" } },
    { id: "bedroom", label: { fa: "خواب", en: "Bedroom" } },
    { id: "dining", label: { fa: "ناهارخوری", en: "Dining" } },
    { id: "office", label: { fa: "اداری", en: "Office" } },
    { id: "outdoor", label: { fa: "فضای باز", en: "Outdoor" } },
  ],
  sectionTypes: [
    ...CORE_ECOMMERCE_SECTIONS,
    "shop-by-room",
    "shop-by-designer",
    "materials",
    "room-inspiration",
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
  templates: ["furniture-editorial"],
  productAttributes: [
    {
      key: "material",
      kind: "text",
      label: { fa: "متریال", en: "Material" },
      filterable: true,
    },
    {
      key: "dimensions",
      kind: "text",
      label: { fa: "ابعاد", en: "Dimensions" },
    },
    {
      key: "room",
      kind: "select",
      label: { fa: "فضا", en: "Room" },
      filterable: true,
      options: [
        { value: "living", label: { fa: "نشیمن", en: "Living" } },
        { value: "bedroom", label: { fa: "خواب", en: "Bedroom" } },
        { value: "dining", label: { fa: "ناهارخوری", en: "Dining" } },
        { value: "office", label: { fa: "اداری", en: "Office" } },
        { value: "outdoor", label: { fa: "فضای باز", en: "Outdoor" } },
      ],
    },
    {
      key: "style",
      kind: "text",
      label: { fa: "استایل", en: "Style" },
      filterable: true,
    },
    {
      key: "finish",
      kind: "text",
      label: { fa: "فینیش", en: "Finish" },
    },
    {
      key: "assembly",
      kind: "select",
      label: { fa: "مونتاژ", en: "Assembly" },
      options: [
        { value: "ready", label: { fa: "آماده", en: "Ready" } },
        { value: "flat-pack", label: { fa: "فلت‌پک", en: "Flat-pack" } },
        { value: "professional", label: { fa: "حرفه‌ای", en: "Professional" } },
      ],
    },
    {
      key: "care",
      kind: "textarea",
      label: { fa: "نگهداری", en: "Care" },
    },
  ],
  filters: [
    { key: "room", attribute: "room", label: { fa: "فضا", en: "Room" }, kind: "select" },
    { key: "material", attribute: "material", label: { fa: "متریال", en: "Material" }, kind: "select" },
    { key: "style", attribute: "style", label: { fa: "استایل", en: "Style" }, kind: "select" },
  ],
  capabilities: { rooms: true },
};
