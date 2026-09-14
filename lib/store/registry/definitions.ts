import type {
  SectionCapabilities,
  SectionDefinition,
  SectionVariant,
} from "@/lib/store/registry/types";
import { DEFAULT_CAPABILITIES } from "@/lib/store/registry/types";
import type {
  VariantResponsiveContract,
  VariantThemeContract,
  VariantVisualSignature,
} from "@/lib/store/registry/variant-contract";

function withCaps(
  partial?: Partial<SectionCapabilities>,
): SectionCapabilities {
  return { ...DEFAULT_CAPABILITIES, ...partial };
}

/** Derive schema select options from the same variant list (single source). */
function variantsToSelectOptions(variants: SectionVariant[]) {
  return variants.map((v) => ({ value: v.id, label: v.label }));
}

const THEME_BOTH: VariantThemeContract = {
  light: true,
  dark: true,
  semanticTokens: true,
};

function v(
  id: string,
  label: { fa: string; en: string },
  meta: {
    signature: VariantVisualSignature;
    responsive: VariantResponsiveContract;
    description?: { fa: string; en: string };
    default?: boolean;
    aliases?: string[];
    recommendedForPresets?: string[];
    capabilities?: SectionVariant["capabilities"];
    motion?: SectionVariant["motion"];
  },
): SectionVariant {
  return {
    id,
    label,
    description: meta.description,
    default: meta.default,
    aliases: meta.aliases,
    signature: meta.signature,
    responsive: meta.responsive,
    theme: THEME_BOTH,
    capabilities: {
      supportsRTL: true,
      supportsDark: true,
      ...meta.capabilities,
    },
    motion: meta.motion ?? "subtle",
    status: "stable",
    recommendedForPresets: meta.recommendedForPresets,
    rendererKey: undefined, // resolved as `${type}.${id}`
  };
}

const HERO_VARIANTS: SectionVariant[] = [
  v(
    "fan",
    { fa: "مرکزی", en: "Centered" },
    {
      default: true,
      description: {
        fa: "تیتر مرکزی با رسانهٔ مکمل",
        en: "Centered headline with supporting media",
      },
      signature: {
        composition: "centered-fan",
        alignment: "center",
        typography: "display-large",
        density: "comfortable",
        media: "multi-tile",
        cta: "primary-center",
        hierarchy: "headline-first",
      },
      responsive: {
        mobile: "stack-copy-first",
        tablet: "centered-collapse",
        desktop: "asymmetric",
      },
      capabilities: {
        supportsImage: true,
        supportsDescription: true,
        supportsPrimaryCTA: true,
      },
      recommendedForPresets: ["organic-story"],
    },
  ),
  v(
    "overlay",
    { fa: "پوششی", en: "Overlay" },
    {
      description: {
        fa: "تصویر تمام‌قد با متن روی لایه",
        en: "Full-bleed media with overlaid copy",
      },
      signature: {
        composition: "full-bleed-overlay",
        alignment: "start",
        typography: "high-contrast",
        density: "spacious",
        media: "cover-focus",
        cta: "solid-on-media",
        hierarchy: "media-first",
      },
      responsive: {
        mobile: "crop-safe-full-bleed",
        tablet: "overlay-safe",
        desktop: "overlay-safe",
      },
      capabilities: {
        supportsImage: true,
        supportsOverlay: true,
        supportsDescription: true,
        supportsPrimaryCTA: true,
      },
      recommendedForPresets: ["immersive-cinema", "mono-gallery"],
      motion: "expressive",
    },
  ),
  v(
    "editorial",
    { fa: "ادیتوریال", en: "Editorial" },
    {
      aliases: ["menu"],
      description: {
        fa: "چیدمان ادیتوریال با تایپ قوی",
        en: "Editorial composition with strong type",
      },
      signature: {
        composition: "asymmetric-editorial",
        alignment: "start",
        typography: "serif-display",
        density: "spacious",
        media: "secondary-bleed",
        cta: "quiet-outline",
        hierarchy: "type-led",
      },
      responsive: {
        mobile: "stack-copy-first",
        tablet: "asymmetric",
        desktop: "asymmetric",
      },
      capabilities: {
        supportsImage: true,
        supportsEyebrow: true,
        supportsDescription: true,
        supportsPrimaryCTA: true,
      },
      recommendedForPresets: ["minimal-editorial", "quiet-luxury"],
    },
  ),
  v(
    "split",
    { fa: "دو ستونه", en: "Split" },
    {
      description: {
        fa: "کپی و رسانه در دو ستون",
        en: "Copy and media in two columns",
      },
      signature: {
        composition: "two-column-split",
        alignment: "start",
        typography: "neutral-sans",
        density: "comfortable",
        media: "column-frame",
        cta: "inline-primary",
        hierarchy: "balanced",
      },
      responsive: {
        mobile: "split-stack",
        tablet: "split-stack",
        desktop: "asymmetric",
      },
      capabilities: {
        supportsImage: true,
        supportsDescription: true,
        supportsPrimaryCTA: true,
        supportsSecondaryCTA: true,
      },
      recommendedForPresets: ["studio-grid"],
    },
  ),
  v(
    "minimal",
    { fa: "مینیمال", en: "Minimal" },
    {
      description: {
        fa: "حداقل عناصر، تمرکز روی تیتر",
        en: "Minimal elements, headline focus",
      },
      signature: {
        composition: "minimal-stage",
        alignment: "center",
        typography: "restrained",
        density: "spacious",
        media: "optional-single",
        cta: "text-link",
        hierarchy: "headline-only",
      },
      responsive: {
        mobile: "priority-content-first",
        tablet: "centered-collapse",
        desktop: "centered-collapse",
      },
      capabilities: {
        supportsImage: true,
        supportsDescription: false,
        supportsPrimaryCTA: true,
      },
      recommendedForPresets: ["bento-creative"],
      motion: "none",
    },
  ),
];

const PRODUCT_CARD_VARIANTS: SectionVariant[] = [
  v(
    "classic",
    { fa: "کلاسیک", en: "Classic" },
    {
      default: true,
      signature: {
        composition: "product-grid",
        alignment: "start",
        typography: "product-title",
        density: "comfortable",
        media: "portrait-cover",
        cta: "card-action",
        hierarchy: "image-title-price",
      },
      responsive: {
        mobile: "grid-2",
        tablet: "grid-3",
        desktop: "grid-4",
      },
      capabilities: {
        supportsImage: true,
        supportsPrice: true,
        supportsMultipleItems: true,
        supportsBadge: true,
      },
      recommendedForPresets: ["studio-grid", "organic-story"],
    },
  ),
  v(
    "compact",
    { fa: "فشرده", en: "Compact" },
    {
      signature: {
        composition: "dense-commerce-grid",
        alignment: "start",
        typography: "compact-meta",
        density: "compact",
        media: "square-cover",
        cta: "high-contrast",
        hierarchy: "scan-first",
      },
      responsive: {
        mobile: "grid-2",
        tablet: "grid-3",
        desktop: "grid-4",
      },
      capabilities: {
        supportsImage: true,
        supportsPrice: true,
        supportsMultipleItems: true,
        supportsBadge: true,
      },
      recommendedForPresets: ["bold-commerce"],
    },
  ),
  v(
    "editorial",
    { fa: "ادیتوریال", en: "Editorial" },
    {
      signature: {
        composition: "editorial-product-stage",
        alignment: "start",
        typography: "editorial-serif",
        density: "spacious",
        media: "large-product",
        cta: "understated",
        hierarchy: "story-product",
      },
      responsive: {
        mobile: "media-first",
        tablet: "editorial-stack",
        desktop: "asymmetric",
      },
      capabilities: {
        supportsImage: true,
        supportsPrice: true,
        supportsMultipleItems: true,
        supportsDescription: true,
      },
      recommendedForPresets: ["quiet-luxury", "minimal-editorial"],
    },
  ),
  v(
    "rail",
    { fa: "ریلی افقی", en: "Horizontal rail" },
    {
      signature: {
        composition: "horizontal-product-rail",
        alignment: "start",
        typography: "compact-meta",
        density: "comfortable",
        media: "portrait-rail",
        cta: "card-action",
        hierarchy: "scroll-browse",
      },
      responsive: {
        mobile: "rail-scroll",
        tablet: "rail-scroll",
        desktop: "rail-scroll",
      },
      capabilities: {
        supportsImage: true,
        supportsPrice: true,
        supportsMultipleItems: true,
      },
      recommendedForPresets: ["immersive-cinema", "bold-commerce"],
    },
  ),
];

/**
 * Core Store section definitions (metadata).
 * Renderers bind separately via `registerSectionRenderer` (client).
 */
export const CORE_SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    type: "hero",
    category: "featured",
    label: { fa: "هیرو", en: "Hero" },
    description: {
      fa: "تیتر اصلی و تصویر برند",
      en: "Primary headline and brand image",
    },
    variants: HERO_VARIANTS,
    verticals: ["*"],
    capabilities: withCaps(),
    schema: {
      content: {
        eyebrow: {
          key: "eyebrow",
          kind: "text",
          label: { fa: "ابرو", en: "Eyebrow" },
          path: "settings.eyebrow",
          token: "typography.eyebrow",
        },
        title: {
          key: "title",
          kind: "text",
          label: { fa: "عنوان", en: "Title" },
          path: "content.hero.headline",
          required: true,
          token: "typography.h1",
        },
        description: {
          key: "description",
          kind: "textarea",
          label: { fa: "توضیح", en: "Description" },
          path: "content.hero.subheadline",
          token: "typography.body",
        },
      },
      actions: {
        primary: {
          key: "primary",
          kind: "text",
          label: { fa: "متن دکمه", en: "CTA label" },
          path: "content.hero.cta",
        },
        primaryHref: {
          key: "primaryHref",
          kind: "link",
          label: { fa: "لینک دکمه", en: "CTA link" },
          path: "content.hero.ctaHref",
        },
        secondary: {
          key: "secondary",
          kind: "link",
          label: { fa: "دکمه ثانویه", en: "Secondary CTA" },
          path: "settings.secondaryCta",
          hidden: true,
        },
      },
      media: {
        image: {
          key: "image",
          kind: "media",
          label: { fa: "تصویر", en: "Image" },
          path: "content.hero.imageId",
        },
      },
      layout: {
        heroStyle: {
          key: "heroStyle",
          kind: "select",
          label: { fa: "استایل هیرو", en: "Hero style" },
          path: "content.hero.style",
          options: variantsToSelectOptions(HERO_VARIANTS),
          defaultValue: "fan",
        },
        alignment: {
          key: "alignment",
          kind: "alignment",
          label: { fa: "تراز", en: "Alignment" },
          path: "settings.alignment",
          options: [
            { value: "start", label: { fa: "شروع", en: "Start" } },
            { value: "center", label: { fa: "وسط", en: "Center" } },
            { value: "end", label: { fa: "پایان", en: "End" } },
          ],
          defaultValue: "start",
        },
        maxWidth: {
          key: "maxWidth",
          kind: "select",
          label: { fa: "عرض محتوا", en: "Content width" },
          path: "settings.maxWidth",
          token: "spacing.section",
          options: [
            { value: "narrow", label: { fa: "باریک", en: "Narrow" } },
            { value: "default", label: { fa: "پیش‌فرض", en: "Default" } },
            { value: "wide", label: { fa: "عریض", en: "Wide" } },
          ],
          defaultValue: "default",
        },
      },
      typography: {
        title: {
          key: "titleTypography",
          kind: "typography",
          label: { fa: "تایپ عنوان", en: "Title type" },
          path: "settings.titleTypography",
          token: "typography.h1",
        },
        description: {
          key: "descriptionTypography",
          kind: "typography",
          label: { fa: "تایپ توضیح", en: "Description type" },
          path: "settings.descriptionTypography",
          token: "typography.body",
        },
      },
      style: {
        surface: {
          key: "surface",
          kind: "color",
          label: { fa: "سطح", en: "Surface" },
          path: "settings.surface",
          token: "color.surface",
        },
        overlay: {
          key: "overlay",
          kind: "boolean",
          label: { fa: "اورلی", en: "Overlay" },
          path: "settings.overlay",
          defaultValue: true,
        },
      },
      visibility: {
        visible: {
          key: "visible",
          kind: "boolean",
          path: "visible",
          defaultValue: true,
        },
      },
    },
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  },
  {
    type: "categories",
    category: "commerce",
    label: { fa: "دسته‌ها", en: "Categories" },
    description: {
      fa: "ناوبری دسته‌بندی محصولات",
      en: "Shop-by-category navigation",
    },
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    preview: { thumbnailTone: "neutral", aspect: "16/9" },
  },
  {
    type: "featured-products",
    category: "commerce",
    label: { fa: "محصولات ویژه", en: "Featured products" },
    description: {
      fa: "ریل تازه‌ها / منتخب",
      en: "New arrivals or featured product rail",
    },
    variants: [
      v(
        "rail",
        { fa: "ریلی", en: "Rail" },
        {
          default: true,
          signature: {
            composition: "horizontal-rail",
            alignment: "start",
            typography: "section-heading",
            density: "comfortable",
            media: "portrait-rail",
            cta: "card-action",
            hierarchy: "kicker-title-rail",
          },
          responsive: {
            mobile: "rail-scroll",
            tablet: "rail-scroll",
            desktop: "rail-scroll",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
          },
        },
      ),
      v(
        "classic",
        { fa: "کلاسیک", en: "Classic" },
        {
          signature: {
            composition: "featured-grid",
            alignment: "start",
            typography: "section-heading",
            density: "comfortable",
            media: "portrait-cover",
            cta: "card-action",
            hierarchy: "title-grid",
          },
          responsive: {
            mobile: "grid-2",
            tablet: "grid-3",
            desktop: "grid-4",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
          },
        },
      ),
      v(
        "spotlight",
        { fa: "اسپات‌لایت", en: "Spotlight" },
        {
          signature: {
            composition: "hero-product-plus-support",
            alignment: "start",
            typography: "feature-display",
            density: "spacious",
            media: "hero-portrait",
            cta: "primary-inline",
            hierarchy: "lead-then-grid",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "asymmetric",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
            supportsDescription: true,
          },
        },
      ),
      v(
        "editorial",
        { fa: "ادیتوریال", en: "Editorial" },
        {
          signature: {
            composition: "featured-editorial-stage",
            alignment: "start",
            typography: "editorial-serif",
            density: "spacious",
            media: "large-product",
            cta: "understated",
            hierarchy: "story-product",
          },
          responsive: {
            mobile: "media-first",
            tablet: "editorial-stack",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
            supportsDescription: true,
          },
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    schema: {
      actions: [
        {
          key: "productSource",
          kind: "select",
          path: "settings.productSource",
          options: [
            { value: "featured", label: { fa: "منتخب", en: "Featured" } },
            { value: "new", label: { fa: "تازه", en: "New arrivals" } },
            { value: "all", label: { fa: "همه", en: "All" } },
          ],
        },
      ],
    },
    preview: { thumbnailTone: "warm", aspect: "4/3" },
  },
  {
    type: "product-spotlight",
    category: "commerce",
    label: { fa: "اسپات‌لایت محصول", en: "Product spotlight" },
    description: {
      fa: "هایلایت یک محصول منتخب",
      en: "Highlight a single featured product",
    },
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  },
  {
    type: "products",
    category: "commerce",
    label: { fa: "محصولات", en: "Products" },
    description: {
      fa: "شبکه محصولات فروشگاه",
      en: "Product grid for the shop",
    },
    variants: PRODUCT_CARD_VARIANTS,
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    schema: {
      content: {
        title: {
          key: "title",
          kind: "text",
          label: { fa: "عنوان", en: "Title" },
          path: "content.products.title",
        },
        description: {
          key: "description",
          kind: "textarea",
          label: { fa: "توضیح", en: "Description" },
          path: "settings.description",
        },
      },
      layout: {
        columns: {
          key: "columns",
          kind: "number",
          label: { fa: "ستون‌ها", en: "Columns" },
          path: "settings.columns",
          responsive: true,
          min: 2,
          max: 5,
          step: 1,
          defaultValue: { mobile: 2, tablet: 3, desktop: 4 },
        },
        gap: {
          key: "gap",
          kind: "spacing",
          label: { fa: "فاصله", en: "Gap" },
          path: "settings.gap",
          token: "spacing.card",
          defaultValue: "spacing.card",
          options: [
            { value: "spacing.tight", label: { fa: "فشرده", en: "Tight" } },
            { value: "spacing.card", label: { fa: "کارت", en: "Card" } },
            {
              value: "spacing.comfortable",
              label: { fa: "راحت", en: "Comfortable" },
            },
          ],
        },
      },
      data: {
        source: {
          key: "source",
          kind: "dataSource",
          label: { fa: "منبع داده", en: "Data source" },
          path: "settings.productSource",
          options: [
            { value: "all", label: { fa: "همه", en: "All" } },
            { value: "category", label: { fa: "دسته", en: "Category" } },
            { value: "manual", label: { fa: "دستی", en: "Manual" } },
            { value: "featured", label: { fa: "منتخب", en: "Featured" } },
          ],
          defaultValue: "all",
        },
      },
      style: {
        cardVariant: {
          key: "cardVariant",
          kind: "select",
          label: { fa: "استایل کارت", en: "Card variant" },
          path: "variant",
          options: variantsToSelectOptions(PRODUCT_CARD_VARIANTS),
          defaultValue: "classic",
        },
      },
    },
    preview: { thumbnailTone: "neutral", aspect: "4/3" },
  },
  {
    type: "bestsellers",
    category: "commerce",
    label: { fa: "پرفروش‌ها", en: "Bestsellers" },
    description: {
      fa: "محبوب‌ترین محصولات",
      en: "Most-loved products rail",
    },
    variants: [
      v(
        "compact",
        { fa: "فشرده", en: "Compact" },
        {
          default: true,
          signature: {
            composition: "bestseller-dense",
            alignment: "start",
            typography: "compact-meta",
            density: "compact",
            media: "square-cover",
            cta: "card-action",
            hierarchy: "rank-scan",
          },
          responsive: {
            mobile: "grid-2",
            tablet: "grid-3",
            desktop: "grid-4",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
            supportsBadge: true,
          },
        },
      ),
      v(
        "classic",
        { fa: "کلاسیک", en: "Classic" },
        {
          signature: {
            composition: "bestseller-classic",
            alignment: "start",
            typography: "product-title",
            density: "comfortable",
            media: "portrait-cover",
            cta: "card-action",
            hierarchy: "title-grid",
          },
          responsive: {
            mobile: "grid-2",
            tablet: "grid-3",
            desktop: "grid-4",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
          },
        },
      ),
      v(
        "rail",
        { fa: "ریلی", en: "Rail" },
        {
          signature: {
            composition: "bestseller-horizontal-rail",
            alignment: "start",
            typography: "compact-meta",
            density: "compact",
            media: "portrait-rail",
            cta: "card-action",
            hierarchy: "scroll-browse",
          },
          responsive: {
            mobile: "rail-scroll",
            tablet: "rail-scroll",
            desktop: "rail-scroll",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsPrice: true,
            supportsBadge: true,
          },
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    preview: { thumbnailTone: "cool", aspect: "4/3" },
  },
  {
    type: "about",
    category: "content",
    label: { fa: "درباره / داستان برند", en: "About / Brand story" },
    description: { fa: "روایت کوتاه برند", en: "Short brand narrative" },
    variants: [
      v(
        "story",
        { fa: "داستان", en: "Story" },
        {
          default: true,
          signature: {
            composition: "story-split",
            alignment: "start",
            typography: "body-led",
            density: "comfortable",
            media: "side-portrait",
            cta: "none",
            hierarchy: "title-body-media",
          },
          responsive: {
            mobile: "story-stack",
            tablet: "story-stack",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsDescription: true,
            supportsRichText: true,
          },
        },
      ),
      v(
        "editorial",
        { fa: "ادیتوریال", en: "Editorial" },
        {
          signature: {
            composition: "about-editorial",
            alignment: "start",
            typography: "serif-editorial",
            density: "spacious",
            media: "bleed-secondary",
            cta: "none",
            hierarchy: "type-led-story",
          },
          responsive: {
            mobile: "editorial-stack",
            tablet: "editorial-stack",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsDescription: true,
            supportsRichText: true,
          },
        },
      ),
      v(
        "image-led",
        { fa: "تصویرمحور", en: "Image-led" },
        {
          signature: {
            composition: "about-image-dominant",
            alignment: "start",
            typography: "compact-caption",
            density: "comfortable",
            media: "dominant-cover",
            cta: "none",
            hierarchy: "media-then-copy",
          },
          responsive: {
            mobile: "media-first",
            tablet: "media-first",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsDescription: true,
          },
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps(),
    schema: {
      content: {
        title: { key: "title", kind: "text", path: "content.about.title" },
        description: {
          key: "description",
          kind: "textarea",
          path: "content.about.body",
        },
      },
      media: {
        image: {
          key: "image",
          kind: "media",
          label: { fa: "تصویر", en: "Image" },
          path: "content.about.imageId",
        },
      },
    },
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  },
  {
    type: "gallery",
    category: "media",
    label: { fa: "گالری", en: "Gallery" },
    description: {
      fa: "نمایش تصاویر و لوک‌بوک",
      en: "Lookbook and image showcase",
    },
    variants: [
      v(
        "lookbook",
        { fa: "لوک‌بوک", en: "Lookbook" },
        {
          default: true,
          signature: {
            composition: "lookbook-stage",
            alignment: "center",
            typography: "quiet-caption",
            density: "spacious",
            media: "editorial-frame",
            cta: "none",
            hierarchy: "media-led",
          },
          responsive: {
            mobile: "media-first",
            tablet: "masonry-2",
            desktop: "bento-priority-stack",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
          },
          recommendedForPresets: ["quiet-luxury"],
        },
      ),
      v(
        "grid",
        { fa: "شبکه", en: "Grid" },
        {
          signature: {
            composition: "gallery-grid",
            alignment: "start",
            typography: "meta-quiet",
            density: "comfortable",
            media: "uniform-tiles",
            cta: "none",
            hierarchy: "equal-tiles",
          },
          responsive: {
            mobile: "grid-2",
            tablet: "grid-3",
            desktop: "grid-4",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
            supportsReorder: true,
          },
        },
      ),
      v(
        "masonry",
        { fa: "میسونری", en: "Masonry" },
        {
          signature: {
            composition: "variable-masonry",
            alignment: "start",
            typography: "meta-quiet",
            density: "comfortable",
            media: "variable-ratio",
            cta: "none",
            hierarchy: "rhythm-tiles",
          },
          responsive: {
            mobile: "grid-2",
            tablet: "masonry-2",
            desktop: "bento-priority-stack",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
          },
          recommendedForPresets: ["mono-gallery", "bento-creative"],
        },
      ),
      v(
        "collage",
        { fa: "کلاژ", en: "Collage" },
        {
          signature: {
            composition: "offset-collage",
            alignment: "center",
            typography: "quiet-caption",
            density: "spacious",
            media: "overlapping-frames",
            cta: "none",
            hierarchy: "asymmetric-stage",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "centered-collapse",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsImage: true,
            supportsMultipleItems: true,
          },
          recommendedForPresets: ["bento-creative"],
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    schema: {
      layout: {
        columns: {
          key: "columns",
          kind: "number",
          label: { fa: "ستون‌ها", en: "Columns" },
          path: "settings.columns",
          responsive: true,
          min: 2,
          max: 6,
          defaultValue: { mobile: 2, tablet: 3, desktop: 4 },
        },
        gap: {
          key: "gap",
          kind: "spacing",
          label: { fa: "فاصله", en: "Gap" },
          path: "settings.gap",
          token: "spacing.card",
          options: [
            { value: "spacing.tight", label: { fa: "فشرده", en: "Tight" } },
            { value: "spacing.card", label: { fa: "کارت", en: "Card" } },
            {
              value: "spacing.comfortable",
              label: { fa: "راحت", en: "Comfortable" },
            },
          ],
          defaultValue: "spacing.card",
        },
      },
      media: {
        aspectRatio: {
          key: "aspectRatio",
          kind: "select",
          label: { fa: "نسبت تصویر", en: "Aspect ratio" },
          path: "settings.aspectRatio",
          token: "imageAspect.portrait",
          options: [
            { value: "square", label: { fa: "مربع", en: "Square" } },
            { value: "portrait", label: { fa: "پرتره", en: "Portrait" } },
            { value: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
            { value: "wide", label: { fa: "عریض", en: "Wide" } },
          ],
          defaultValue: "portrait",
        },
      },
      style: {
        radius: {
          key: "radius",
          kind: "radius",
          label: { fa: "گردی", en: "Radius" },
          path: "settings.radius",
          token: "radius.md",
          options: [
            { value: "none", label: { fa: "صفر", en: "None" } },
            { value: "sm", label: { fa: "کم", en: "Small" } },
            { value: "md", label: { fa: "متوسط", en: "Medium" } },
            { value: "lg", label: { fa: "زیاد", en: "Large" } },
          ],
          defaultValue: "sm",
        },
      },
    },
    preview: { thumbnailTone: "cool", aspect: "1/1" },
  },
  {
    type: "instagram-feed",
    category: "media",
    label: { fa: "فید اینستاگرام", en: "Instagram feed" },
    description: { fa: "نمایش پست‌های اینستا", en: "Surface Instagram posts" },
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    preview: { thumbnailTone: "cool", aspect: "1/1" },
  },
  {
    type: "featured-posts",
    category: "editorial",
    label: { fa: "پست‌های ویژه", en: "Featured posts" },
    description: {
      fa: "هایلایت ادیتوریال (سازگاری)",
      en: "Editorial highlight (compat alias)",
    },
    verticals: ["*"],
    capabilities: withCaps({ dataSource: true }),
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  },
  {
    type: "testimonials",
    category: "social",
    label: { fa: "نظرات", en: "Testimonials" },
    description: { fa: "گواهی مشتریان", en: "Customer social proof" },
    variants: [
      v(
        "quotes",
        { fa: "نقل‌قول", en: "Quotes" },
        {
          default: true,
          signature: {
            composition: "testimonial-quote-cards",
            alignment: "start",
            typography: "quote-serif",
            density: "comfortable",
            media: "none",
            cta: "none",
            hierarchy: "quote-author",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "grid-2",
            desktop: "grid-3",
          },
          capabilities: {
            supportsMultipleItems: true,
            supportsRichText: true,
          },
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps(),
    preview: { thumbnailTone: "neutral", aspect: "16/9" },
  },
  {
    type: "trust",
    category: "social",
    label: { fa: "اعتماد", en: "Trust" },
    description: {
      fa: "اثبات اجتماعی و نشانه‌های اعتماد",
      en: "Social proof and trust signals",
    },
    variants: [
      v(
        "metrics",
        { fa: "شاخص‌ها", en: "Metrics" },
        {
          default: true,
          signature: {
            composition: "trust-metric-row",
            alignment: "center",
            typography: "stat-display",
            density: "comfortable",
            media: "none",
            cta: "none",
            hierarchy: "equal-stats",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "grid-3",
            desktop: "grid-4",
          },
          capabilities: {
            supportsMultipleItems: true,
          },
        },
      ),
      v(
        "inline",
        { fa: "ردیفی", en: "Inline" },
        {
          signature: {
            composition: "trust-inline-strip",
            alignment: "center",
            typography: "meta-quiet",
            density: "compact",
            media: "none",
            cta: "none",
            hierarchy: "reassurance-row",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "centered-collapse",
            desktop: "centered-collapse",
          },
          capabilities: {
            supportsMultipleItems: true,
          },
        },
      ),
      v(
        "quotes",
        { fa: "نقل‌قول", en: "Quotes" },
        {
          signature: {
            composition: "trust-quote-proof",
            alignment: "start",
            typography: "quote-serif",
            density: "spacious",
            media: "none",
            cta: "none",
            hierarchy: "quote-author",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "grid-2",
            desktop: "grid-3",
          },
          capabilities: {
            supportsMultipleItems: true,
            supportsRichText: true,
          },
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps(),
    preview: { thumbnailTone: "neutral", aspect: "16/9" },
  },
  {
    type: "faq",
    category: "content",
    label: { fa: "پرسش‌ها", en: "FAQ" },
    description: { fa: "سوالات پرتکرار", en: "Common questions" },
    verticals: ["*"],
    capabilities: withCaps(),
    preview: { thumbnailTone: "neutral", aspect: "4/3" },
  },
  {
    type: "contact",
    category: "conversion",
    label: { fa: "تماس", en: "Contact" },
    description: { fa: "راه‌های ارتباط", en: "Ways to reach you" },
    verticals: ["*"],
    capabilities: withCaps(),
    schema: {
      content: {
        title: {
          key: "title",
          kind: "text",
          label: { fa: "عنوان", en: "Title" },
          path: "content.contact.title",
        },
        body: {
          key: "body",
          kind: "textarea",
          label: { fa: "توضیح", en: "Description" },
          path: "content.contact.body",
        },
        phone: {
          key: "phone",
          kind: "text",
          label: { fa: "تلفن", en: "Phone" },
          path: "content.contact.info.phone",
        },
        email: {
          key: "email",
          kind: "text",
          label: { fa: "ایمیل", en: "Email" },
          path: "content.contact.info.email",
        },
        website: {
          key: "website",
          kind: "link",
          label: { fa: "وب‌سایت", en: "Website" },
          path: "content.contact.info.website",
        },
        instagram: {
          key: "instagram",
          kind: "text",
          label: { fa: "اینستاگرام", en: "Instagram" },
          path: "content.contact.info.instagram",
        },
        whatsapp: {
          key: "whatsapp",
          kind: "text",
          label: { fa: "واتساپ", en: "WhatsApp" },
          path: "content.contact.info.whatsapp",
        },
        address: {
          key: "address",
          kind: "textarea",
          label: { fa: "آدرس", en: "Address" },
          path: "content.contact.info.address",
        },
      },
    },
    preview: { thumbnailTone: "warm", aspect: "16/9" },
  },
  {
    type: "cta",
    category: "conversion",
    label: { fa: "فراخوان", en: "CTA" },
    description: { fa: "بنر دعوت به اقدام", en: "Call-to-action banner" },
    variants: [
      v(
        "banner",
        { fa: "بنر", en: "Banner" },
        {
          default: true,
          signature: {
            composition: "cta-banner",
            alignment: "center",
            typography: "cta-display",
            density: "comfortable",
            media: "none-or-soft",
            cta: "primary-center",
            hierarchy: "title-cta",
          },
          responsive: {
            mobile: "centered-collapse",
            tablet: "centered-collapse",
            desktop: "centered-collapse",
          },
          capabilities: {
            supportsEyebrow: true,
            supportsPrimaryCTA: true,
            supportsDescription: true,
          },
        },
      ),
      v(
        "promo",
        { fa: "پرومو", en: "Promo" },
        {
          signature: {
            composition: "cta-promo-split",
            alignment: "start",
            typography: "promo-strong",
            density: "compact",
            media: "accent-panel",
            cta: "solid-emphasis",
            hierarchy: "offer-cta",
          },
          responsive: {
            mobile: "priority-content-first",
            tablet: "asymmetric",
            desktop: "asymmetric",
          },
          capabilities: {
            supportsEyebrow: true,
            supportsPrimaryCTA: true,
            supportsBadge: true,
          },
        },
      ),
      v(
        "minimal",
        { fa: "مینیمال", en: "Minimal" },
        {
          signature: {
            composition: "cta-type-led",
            alignment: "start",
            typography: "restrained-heading",
            density: "spacious",
            media: "none",
            cta: "quiet-outline",
            hierarchy: "title-only-cta",
          },
          responsive: {
            mobile: "centered-collapse",
            tablet: "centered-collapse",
            desktop: "centered-collapse",
          },
          capabilities: {
            supportsPrimaryCTA: true,
          },
          motion: "none",
        },
      ),
    ],
    verticals: ["*"],
    capabilities: withCaps(),
    schema: {
      content: {
        kicker: {
          key: "kicker",
          kind: "text",
          label: { fa: "ابرو", en: "Kicker" },
          path: "content.promo.kicker",
        },
        title: {
          key: "title",
          kind: "text",
          label: { fa: "عنوان", en: "Title" },
          path: "content.promo.title",
        },
        cta: {
          key: "cta",
          kind: "text",
          label: { fa: "متن دکمه", en: "CTA label" },
          path: "content.promo.cta",
        },
        ctaHref: {
          key: "ctaHref",
          kind: "link",
          label: { fa: "لینک دکمه", en: "CTA link" },
          path: "content.promo.ctaHref",
        },
      },
    },
    preview: { thumbnailTone: "dark", aspect: "16/9" },
  },
  {
    type: "promo",
    category: "conversion",
    label: { fa: "پرومو", en: "Promo" },
    description: {
      fa: "بنر پروموشن فروشگاه",
      en: "Store promotional banner",
    },
    verticals: ["*"],
    capabilities: withCaps(),
    preview: { thumbnailTone: "dark", aspect: "16/9" },
  },
  {
    type: "services",
    category: "commerce",
    label: { fa: "خدمات", en: "Services" },
    description: { fa: "لیست خدمات", en: "Service offerings" },
    verticals: ["*"],
    capabilities: withCaps(),
    preview: { thumbnailTone: "neutral", aspect: "4/3" },
  },
  {
    type: "location",
    category: "content",
    label: { fa: "موقعیت", en: "Location" },
    description: { fa: "آدرس و نقشه", en: "Address and map" },
    verticals: ["*"],
    capabilities: withCaps(),
    library: false,
  },
  {
    type: "social",
    category: "social",
    label: { fa: "شبکه‌ها", en: "Social" },
    description: { fa: "لینک شبکه‌های اجتماعی", en: "Social network links" },
    verticals: ["*"],
    capabilities: withCaps(),
    library: false,
  },
  {
    type: "footer",
    category: "navigation",
    label: { fa: "فوتر", en: "Footer" },
    description: { fa: "پایان صفحه و لینک‌ها", en: "Page footer and links" },
    chrome: "footer",
    verticals: ["*"],
    capabilities: withCaps({
      reorder: false,
      duplicate: false,
      hide: true,
    }),
    preview: { thumbnailTone: "dark", aspect: "16/9" },
  },
];
