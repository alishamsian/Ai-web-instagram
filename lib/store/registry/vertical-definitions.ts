/**
 * Vertical-specific section definitions — registered into Section Registry.
 * Every type listed here must have a renderer binding.
 */
import type { SectionDefinition } from "@/lib/store/registry/types";
import { DEFAULT_CAPABILITIES } from "@/lib/store/registry/types";

function caps(dataSource = false) {
  return { ...DEFAULT_CAPABILITIES, dataSource };
}

function contentSchema(defaults?: {
  title?: string;
  description?: string;
  kicker?: string;
}) {
  return {
    content: {
      kicker: {
        key: "kicker",
        kind: "text" as const,
        label: { fa: "ابرو", en: "Kicker" },
        path: "settings.kicker",
        defaultValue: defaults?.kicker,
      },
      title: {
        key: "title",
        kind: "text" as const,
        label: { fa: "عنوان", en: "Title" },
        path: "settings.title",
        defaultValue: defaults?.title,
        required: true,
      },
      description: {
        key: "description",
        kind: "textarea" as const,
        label: { fa: "توضیح", en: "Description" },
        path: "settings.description",
        defaultValue: defaults?.description,
      },
    },
    visibility: {
      visible: {
        key: "visible",
        kind: "boolean" as const,
        path: "visible",
        defaultValue: true,
      },
    },
  };
}

function taxonomyDef(
  type: SectionDefinition["type"],
  vertical: string,
  label: { fa: string; en: string },
  description: { fa: string; en: string },
  filterAttribute: string,
): SectionDefinition {
  return {
    type,
    category: "commerce",
    label,
    description,
    verticals: [vertical],
    capabilities: caps(true),
    schema: {
      ...contentSchema(),
      data: {
        filterAttribute: {
          key: "filterAttribute",
          kind: "text",
          path: "settings.filterAttribute",
          defaultValue: filterAttribute,
          hidden: true,
        },
      },
      layout: {
        columns: {
          key: "columns",
          kind: "number",
          path: "settings.columns",
          responsive: true,
          min: 2,
          max: 6,
          defaultValue: { mobile: 2, tablet: 3, desktop: 4 },
        },
      },
    },
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  };
}

function storyDef(
  type: SectionDefinition["type"],
  vertical: string,
  label: { fa: string; en: string },
  description: { fa: string; en: string },
  category: SectionDefinition["category"] = "editorial",
): SectionDefinition {
  return {
    type,
    category,
    label,
    description,
    verticals: [vertical],
    capabilities: caps(),
    schema: contentSchema(),
    preview: { thumbnailTone: "neutral", aspect: "16/9" },
  };
}

function stepsDef(
  type: SectionDefinition["type"],
  vertical: string,
  label: { fa: string; en: string },
  description: { fa: string; en: string },
): SectionDefinition {
  return {
    type,
    category: "content",
    label,
    description,
    verticals: [vertical],
    capabilities: caps(),
    schema: contentSchema(),
    preview: { thumbnailTone: "cool", aspect: "16/9" },
  };
}

function finderDef(
  type: SectionDefinition["type"],
  vertical: string,
  label: { fa: string; en: string },
  description: { fa: string; en: string },
): SectionDefinition {
  return {
    type,
    category: "commerce",
    label,
    description,
    verticals: [vertical],
    capabilities: caps(true),
    schema: {
      ...contentSchema(),
      layout: {
        columns: {
          key: "columns",
          kind: "number",
          path: "settings.columns",
          responsive: true,
          min: 2,
          max: 4,
          defaultValue: { mobile: 2, tablet: 3, desktop: 4 },
        },
      },
    },
    preview: { thumbnailTone: "warm", aspect: "4/3" },
  };
}

export const VERTICAL_SECTION_DEFINITIONS: SectionDefinition[] = [
  // Beauty
  taxonomyDef(
    "shop-by-concern",
    "beauty",
    { fa: "خرید بر اساس نگرانی", en: "Shop by concern" },
    { fa: "مسیر خرید مبتنی بر نگرانی پوست", en: "Concern-led shopping paths" },
    "concerns",
  ),
  taxonomyDef(
    "shop-by-skin-type",
    "beauty",
    { fa: "خرید بر اساس نوع پوست", en: "Shop by skin type" },
    { fa: "فیلتر نوع پوست", en: "Skin-type shopping paths" },
    "skinType",
  ),
  stepsDef(
    "routine",
    "beauty",
    { fa: "روتین", en: "Routine" },
    { fa: "مراحل روتین مراقبت", en: "Skincare routine steps" },
  ),
  storyDef(
    "ingredient-story",
    "beauty",
    { fa: "داستان مواد", en: "Ingredient story" },
    { fa: "روایت مواد کلیدی", en: "Key ingredient narrative" },
  ),
  finderDef(
    "product-finder",
    "beauty",
    { fa: "یابنده محصول", en: "Product finder" },
    { fa: "فیلتر و انتخاب محصول زیبایی", en: "Filter and find beauty products" },
  ),

  // Fashion
  storyDef(
    "lookbook",
    "fashion",
    { fa: "لوک‌بوک", en: "Lookbook" },
    { fa: "ویترین تصویری استایل", en: "Visual style lookbook" },
    "media",
  ),
  finderDef(
    "shop-the-look",
    "fashion",
    { fa: "خرید این لوک", en: "Shop the look" },
    { fa: "محصولات یک لوک", en: "Products from a styled look" },
  ),
  storyDef(
    "collection-story",
    "fashion",
    { fa: "داستان کالکشن", en: "Collection story" },
    { fa: "روایت کالکشن", en: "Collection narrative" },
  ),
  storyDef(
    "style-guide",
    "fashion",
    { fa: "راهنمای استایل", en: "Style guide" },
    { fa: "نکات استایل", en: "Styling guidance" },
    "content",
  ),
  storyDef(
    "designer-spotlight",
    "fashion",
    { fa: "اسپات‌لایت طراح", en: "Designer spotlight" },
    { fa: "معرفی طراح", en: "Designer feature" },
  ),
  stepsDef(
    "fit-guide",
    "fashion",
    { fa: "راهنمای سایز", en: "Fit guide" },
    { fa: "راهنمای انتخاب فیت", en: "How to choose fit" },
  ),

  // Jewelry (collection-story shared id with fashion — one registry type, multi-vertical)
  taxonomyDef(
    "shop-by-material",
    "jewelry",
    { fa: "خرید بر اساس متریال", en: "Shop by material" },
    { fa: "فیلتر متریال جواهرات", en: "Jewelry material paths" },
    "material",
  ),
  taxonomyDef(
    "shop-by-occasion",
    "jewelry",
    { fa: "خرید بر اساس مناسبت", en: "Shop by occasion" },
    { fa: "مناسبت‌های جواهرات", en: "Occasion-led jewelry paths" },
    "occasion",
  ),
  finderDef(
    "stack-builder",
    "jewelry",
    { fa: "استک‌بیلدر", en: "Stack builder" },
    { fa: "ترکیب لایه‌ای جواهرات", en: "Layer jewelry pieces" },
  ),
  storyDef(
    "jewelry-care",
    "jewelry",
    { fa: "نگهداری جواهرات", en: "Jewelry care" },
    { fa: "راهنمای مراقبت", en: "Care guidance" },
    "content",
  ),

  // Coffee
  taxonomyDef(
    "origin-explorer",
    "coffee",
    { fa: "کاشف خاستگاه", en: "Origin explorer" },
    { fa: "مسیر خاستگاه دانه‌ها", en: "Explore bean origins" },
    "origin",
  ),
  storyDef(
    "flavor-profile",
    "coffee",
    { fa: "پروفایل طعم", en: "Flavor profile" },
    { fa: "نت‌های طعم قهوه", en: "Coffee flavor notes" },
  ),
  stepsDef(
    "brew-guide",
    "coffee",
    { fa: "راهنمای دم", en: "Brew guide" },
    { fa: "مراحل دم کردن", en: "Brewing steps" },
  ),
  storyDef(
    "roaster-story",
    "coffee",
    { fa: "داستان رستر", en: "Roaster story" },
    { fa: "روایت رستری", en: "Roastery narrative" },
  ),
  storyDef(
    "subscription",
    "coffee",
    { fa: "اشتراک", en: "Subscription" },
    { fa: "پیشنهاد اشتراک قهوه", en: "Coffee subscription offer" },
    "conversion",
  ),
  finderDef(
    "coffee-finder",
    "coffee",
    { fa: "یابنده قهوه", en: "Coffee finder" },
    { fa: "فیلتر دانه و رست", en: "Find beans by roast and notes" },
  ),

  // Furniture
  taxonomyDef(
    "shop-by-room",
    "furniture",
    { fa: "خرید بر اساس فضا", en: "Shop by room" },
    { fa: "مسیر خرید فضامحور", en: "Room-led shopping" },
    "room",
  ),
  taxonomyDef(
    "shop-by-designer",
    "furniture",
    { fa: "خرید بر اساس طراح", en: "Shop by designer" },
    { fa: "مسیر طراحان", en: "Designer-led shopping" },
    "designer",
  ),
  storyDef(
    "materials",
    "furniture",
    { fa: "متریال‌ها", en: "Materials" },
    { fa: "معرفی متریال‌ها", en: "Material stories" },
  ),
  storyDef(
    "dimensions",
    "furniture",
    { fa: "ابعاد", en: "Dimensions" },
    { fa: "راهنمای ابعاد", en: "Sizing guidance" },
    "content",
  ),
  storyDef(
    "projects",
    "furniture",
    { fa: "پروژه‌ها", en: "Projects" },
    { fa: "نمونه‌های پروژه", en: "Project showcases" },
  ),
  storyDef(
    "room-inspiration",
    "furniture",
    { fa: "الهام فضا", en: "Room inspiration" },
    { fa: "ایده‌های چیدمان", en: "Room mood inspiration" },
    "media",
  ),
];

/** Fashion + jewelry both use collection-story — widen verticals. */
const collectionStory = VERTICAL_SECTION_DEFINITIONS.find(
  (d) => d.type === "collection-story",
);
if (collectionStory) {
  collectionStory.verticals = ["fashion", "jewelry"];
}
