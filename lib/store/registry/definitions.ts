import type {
  SectionCapabilities,
  SectionDefinition,
} from "@/lib/store/registry/types";
import { DEFAULT_CAPABILITIES } from "@/lib/store/registry/types";

function withCaps(
  partial?: Partial<SectionCapabilities>,
): SectionCapabilities {
  return { ...DEFAULT_CAPABILITIES, ...partial };
}

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
    variants: [
      { id: "fan", label: { fa: "مرکزی", en: "Centered" } },
      { id: "overlay", label: { fa: "پوششی", en: "Overlay" } },
      { id: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
      { id: "split", label: { fa: "دو ستونه", en: "Split" } },
      { id: "minimal", label: { fa: "مینیمال", en: "Minimal" } },
    ],
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
          options: [
            { value: "fan", label: { fa: "مرکزی", en: "Centered" } },
            { value: "overlay", label: { fa: "پوششی", en: "Overlay" } },
            { value: "split", label: { fa: "دو ستونه", en: "Split" } },
            { value: "minimal", label: { fa: "مینیمال", en: "Minimal" } },
            { value: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
            { value: "menu", label: { fa: "منو", en: "Menu" } },
          ],
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
      { id: "rail", label: { fa: "ریلی", en: "Rail" } },
      { id: "classic", label: { fa: "کلاسیک", en: "Classic" } },
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
    variants: [
      { id: "classic", label: { fa: "کلاسیک", en: "Classic" } },
      { id: "compact", label: { fa: "فشرده", en: "Compact" } },
      { id: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
    ],
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
          options: [
            { value: "classic", label: { fa: "کلاسیک", en: "Classic" } },
            { value: "compact", label: { fa: "فشرده", en: "Compact" } },
            { value: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
          ],
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
      { id: "compact", label: { fa: "فشرده", en: "Compact" } },
      { id: "classic", label: { fa: "کلاسیک", en: "Classic" } },
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
      { id: "story", label: { fa: "داستان", en: "Story" } },
      { id: "editorial", label: { fa: "ادیتوریال", en: "Editorial" } },
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
      { id: "lookbook", label: { fa: "لوک‌بوک", en: "Lookbook" } },
      { id: "grid", label: { fa: "شبکه", en: "Grid" } },
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
      { id: "banner", label: { fa: "بنر", en: "Banner" } },
      { id: "promo", label: { fa: "پرومو", en: "Promo" } },
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
