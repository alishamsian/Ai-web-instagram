import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export const beautyPack: VerticalPack = {
  id: "beauty",
  label: { fa: "زیبایی", en: "Beauty" },
  description: {
    fa: "مراقبت پوست، آرایش، مو و بدن",
    en: "Skincare, makeup, hair, and body care",
  },
  subVerticals: [
    { id: "skincare", label: { fa: "مراقبت پوست", en: "Skincare" } },
    { id: "makeup", label: { fa: "آرایش", en: "Makeup" } },
    { id: "haircare", label: { fa: "مراقبت مو", en: "Haircare" } },
    { id: "bodycare", label: { fa: "مراقبت بدن", en: "Bodycare" } },
  ],
  sectionTypes: [
    ...CORE_ECOMMERCE_SECTIONS,
    // Planned (not registered until renderers exist)
    "shop-by-concern",
    "shop-by-skin-type",
    "routine",
    "ingredient-story",
    "product-finder",
  ],
  recommendedSections: [
    "hero",
    "categories",
    "bestsellers",
    "featured-products",
    "product-spotlight",
    "gallery",
    "about",
    "faq",
  ],
  templates: ["beauty-editorial", "beauty-commerce"],
  productAttributes: [
    {
      key: "skinType",
      kind: "multiselect",
      label: { fa: "نوع پوست", en: "Skin type" },
      filterable: true,
      subVerticals: ["skincare", "makeup"],
      options: [
        { value: "oily", label: { fa: "چرب", en: "Oily" } },
        { value: "dry", label: { fa: "خشک", en: "Dry" } },
        { value: "combination", label: { fa: "مختلط", en: "Combination" } },
        { value: "sensitive", label: { fa: "حساس", en: "Sensitive" } },
        { value: "normal", label: { fa: "نرمال", en: "Normal" } },
      ],
    },
    {
      key: "concerns",
      kind: "multiselect",
      label: { fa: "نگرانی‌ها", en: "Concerns" },
      filterable: true,
      subVerticals: ["skincare"],
      options: [
        { value: "acne", label: { fa: "جوش", en: "Acne" } },
        { value: "aging", label: { fa: "ضدپیری", en: "Aging" } },
        { value: "hydration", label: { fa: "آبرسانی", en: "Hydration" } },
        { value: "pigmentation", label: { fa: "لک", en: "Pigmentation" } },
        { value: "barrier", label: { fa: "سد پوستی", en: "Barrier" } },
      ],
    },
    {
      key: "ingredients",
      kind: "text",
      label: { fa: "مواد کلیدی", en: "Key ingredients" },
      filterable: true,
      subVerticals: ["skincare", "haircare", "bodycare"],
    },
    {
      key: "routineStep",
      kind: "select",
      label: { fa: "مرحله روتین", en: "Routine step" },
      subVerticals: ["skincare"],
      options: [
        { value: "cleanse", label: { fa: "پاکسازی", en: "Cleanse" } },
        { value: "treat", label: { fa: "درمان", en: "Treat" } },
        { value: "moisturize", label: { fa: "مرطوب‌کننده", en: "Moisturize" } },
        { value: "protect", label: { fa: "محافظت", en: "Protect" } },
      ],
    },
    {
      key: "finish",
      kind: "select",
      label: { fa: "فینیش", en: "Finish" },
      subVerticals: ["makeup"],
      options: [
        { value: "matte", label: { fa: "مات", en: "Matte" } },
        { value: "dewy", label: { fa: "براق", en: "Dewy" } },
        { value: "natural", label: { fa: "طبیعی", en: "Natural" } },
      ],
    },
    {
      key: "coverage",
      kind: "select",
      label: { fa: "پوشش", en: "Coverage" },
      subVerticals: ["makeup"],
      options: [
        { value: "sheer", label: { fa: "کم", en: "Sheer" } },
        { value: "medium", label: { fa: "متوسط", en: "Medium" } },
        { value: "full", label: { fa: "کامل", en: "Full" } },
      ],
    },
    {
      key: "formulation",
      kind: "select",
      label: { fa: "فرمولاسیون", en: "Formulation" },
      options: [
        { value: "cream", label: { fa: "کرم", en: "Cream" } },
        { value: "serum", label: { fa: "سرم", en: "Serum" } },
        { value: "oil", label: { fa: "روغن", en: "Oil" } },
        { value: "powder", label: { fa: "پودر", en: "Powder" } },
        { value: "gel", label: { fa: "ژل", en: "Gel" } },
      ],
    },
  ],
  filters: [
    { key: "concern", attribute: "concerns", label: { fa: "نگرانی", en: "Concern" }, kind: "multiselect" },
    { key: "skinType", attribute: "skinType", label: { fa: "نوع پوست", en: "Skin type" }, kind: "multiselect" },
    { key: "ingredient", attribute: "ingredients", label: { fa: "ماده", en: "Ingredient" }, kind: "select" },
  ],
  contentSignals: [
    {
      key: "routineEducation",
      label: { fa: "آموزش روتین", en: "Routine education" },
      examples: ["AM/PM routine", "concern-led paths"],
    },
  ],
  capabilities: { concerns: true, lookbooks: true },
};
