import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export const fashionPack: VerticalPack = {
  id: "fashion",
  label: { fa: "مد و پوشاک", en: "Fashion" },
  description: {
    fa: "پوشاک، اکسسوری و استایل",
    en: "Apparel, accessories, and style",
  },
  subVerticals: [
    { id: "women", label: { fa: "زنانه", en: "Women" } },
    { id: "men", label: { fa: "مردانه", en: "Men" } },
    { id: "unisex", label: { fa: "یونیسکس", en: "Unisex" } },
    { id: "accessories", label: { fa: "اکسسوری", en: "Accessories" } },
  ],
  sectionTypes: [
    ...CORE_ECOMMERCE_SECTIONS,
    "lookbook",
    "shop-the-look",
    "collection-story",
    "style-guide",
    "fit-guide",
  ],
  recommendedSections: [
    "hero",
    "categories",
    "featured-products",
    "gallery",
    "bestsellers",
    "products",
    "about",
    "cta",
  ],
  templates: ["fashion-editorial", "fashion-commerce"],
  productAttributes: [
    {
      key: "size",
      kind: "select",
      label: { fa: "سایز", en: "Size" },
      filterable: true,
      options: [
        { value: "xs", label: { fa: "XS", en: "XS" } },
        { value: "s", label: { fa: "S", en: "S" } },
        { value: "m", label: { fa: "M", en: "M" } },
        { value: "l", label: { fa: "L", en: "L" } },
        { value: "xl", label: { fa: "XL", en: "XL" } },
      ],
    },
    {
      key: "color",
      kind: "text",
      label: { fa: "رنگ", en: "Color" },
      filterable: true,
    },
    {
      key: "material",
      kind: "text",
      label: { fa: "جنس", en: "Material" },
      filterable: true,
    },
    {
      key: "fit",
      kind: "select",
      label: { fa: "فیت", en: "Fit" },
      filterable: true,
      options: [
        { value: "slim", label: { fa: "اسلیم", en: "Slim" } },
        { value: "regular", label: { fa: "معمولی", en: "Regular" } },
        { value: "oversized", label: { fa: "اورسایز", en: "Oversized" } },
      ],
    },
    {
      key: "occasion",
      kind: "select",
      label: { fa: "مناسبت", en: "Occasion" },
      filterable: true,
      options: [
        { value: "casual", label: { fa: "روزمره", en: "Casual" } },
        { value: "work", label: { fa: "کار", en: "Work" } },
        { value: "evening", label: { fa: "شب", en: "Evening" } },
      ],
    },
    {
      key: "season",
      kind: "select",
      label: { fa: "فصل", en: "Season" },
      options: [
        { value: "ss", label: { fa: "بهار/تابستان", en: "SS" } },
        { value: "fw", label: { fa: "پاییز/زمستان", en: "FW" } },
        { value: "all", label: { fa: "تمام‌فصل", en: "All-season" } },
      ],
    },
    {
      key: "style",
      kind: "text",
      label: { fa: "استایل", en: "Style" },
    },
  ],
  filters: [
    { key: "size", attribute: "size", label: { fa: "سایز", en: "Size" }, kind: "select" },
    { key: "color", attribute: "color", label: { fa: "رنگ", en: "Color" }, kind: "select" },
    { key: "fit", attribute: "fit", label: { fa: "فیت", en: "Fit" }, kind: "select" },
  ],
  capabilities: { lookbooks: true },
};
