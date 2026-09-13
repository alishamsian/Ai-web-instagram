import type { ContentLocale } from "@/lib/business/content/schema";

type CopyBlock = {
  tagline: string;
  heroHeadline: (name: string) => string;
  heroSub: string;
  cta: string;
  aboutTitle: string;
  aboutBody: (name: string) => string;
  productsTitle: string;
  newsletter: string;
};

const GENERIC: Record<ContentLocale, CopyBlock> = {
  en: {
    tagline: "Curated pieces for everyday living",
    heroHeadline: (name) => name,
    heroSub: "A focused shop built around what you actually sell.",
    cta: "Shop the collection",
    aboutTitle: "Our story",
    aboutBody: (name) =>
      `${name} brings a clear selection to the storefront — honest, calm, and ready to browse.`,
    productsTitle: "Products",
    newsletter: "New arrivals and quiet updates.",
  },
  fa: {
    tagline: "انتخاب‌هایی برای زندگی روزمره",
    heroHeadline: (name) => name,
    heroSub: "فروشگاهی متمرکز روی آنچه واقعاً می‌فروشید.",
    cta: "مشاهده مجموعه",
    aboutTitle: "داستان ما",
    aboutBody: (name) =>
      `${name} ویترینی شفاف و آرام برای مرور و انتخاب می‌سازد.`,
    productsTitle: "محصولات",
    newsletter: "تازه‌ها و به‌روزرسانی‌های کوتاه.",
  },
};

const BY_VERTICAL: Record<
  string,
  Partial<Record<ContentLocale, Partial<CopyBlock>>>
> = {
  beauty: {
    en: {
      tagline: "Care routines, thoughtfully presented",
      heroSub: "Skincare and beauty essentials — clear paths, calm browsing.",
      cta: "Explore care",
      aboutTitle: "Our approach",
      productsTitle: "Care collection",
    },
    fa: {
      tagline: "روتین مراقبت، با روایت روشن",
      heroSub: "مراقبت پوست و زیبایی — مسیرهای واضح، مرور آرام.",
      cta: "کاوش مراقبت",
      aboutTitle: "رویکرد ما",
      productsTitle: "مجموعه مراقبت",
    },
  },
  fashion: {
    en: {
      tagline: "Looks with intention",
      heroSub: "Apparel and style — lookbook-led, not cluttered.",
      cta: "Shop the look",
      productsTitle: "Collection",
    },
    fa: {
      tagline: "استایل با قصد",
      heroSub: "پوشاک و استایل — لوک‌بوک‌محور، بدون شلوغی.",
      cta: "خرید این لوک",
      productsTitle: "کالکشن",
    },
  },
  jewelry: {
    en: {
      tagline: "Pieces meant to last",
      heroSub: "Jewelry with material and occasion clarity.",
      cta: "View pieces",
      productsTitle: "Jewelry",
    },
    fa: {
      tagline: "قطعات ماندگار",
      heroSub: "جواهرات با وضوح متریال و مناسبت.",
      cta: "مشاهده قطعات",
      productsTitle: "جواهرات",
    },
  },
  coffee: {
    en: {
      tagline: "Origin, roast, and brew",
      heroSub: "Coffee with a clear story — beans, roast, and ritual.",
      cta: "Find your coffee",
      productsTitle: "Coffees",
      aboutTitle: "The roast",
    },
    fa: {
      tagline: "خاستگاه، رست، دم",
      heroSub: "قهوه با روایت روشن — دانه، رست و آیین دم.",
      cta: "قهوه مناسب شما",
      productsTitle: "قهوه‌ها",
      aboutTitle: "رست",
    },
  },
  furniture: {
    en: {
      tagline: "Spaces, materials, measure",
      heroSub: "Furniture for rooms that need clarity — not catalogs of noise.",
      cta: "Shop by room",
      productsTitle: "Furniture",
    },
    fa: {
      tagline: "فضا، متریال، اندازه",
      heroSub: "مبلمان برای فضاهایی که وضوح می‌خواهند.",
      cta: "خرید بر اساس فضا",
      productsTitle: "مبلمان",
    },
  },
};

export function resolveCopyBlock(
  vertical: string,
  locale: ContentLocale,
): CopyBlock {
  const base = GENERIC[locale];
  const overlay = BY_VERTICAL[vertical]?.[locale] ?? {};
  return { ...base, ...overlay };
}

export const SECTION_COPY: Record<
  string,
  Record<ContentLocale, { kicker: string; title: string; description: string }>
> = {
  "shop-by-concern": {
    en: {
      kicker: "Concern",
      title: "Shop by concern",
      description: "Paths shaped by what your skin needs.",
    },
    fa: {
      kicker: "نگرانی",
      title: "خرید بر اساس نگرانی",
      description: "مسیرهایی متناسب با نیاز پوست.",
    },
  },
  routine: {
    en: {
      kicker: "Routine",
      title: "A simple routine",
      description: "Clear steps — nothing noisy.",
    },
    fa: {
      kicker: "روتین",
      title: "روتین ساده",
      description: "مراحل واضح، بدون شلوغی.",
    },
  },
  lookbook: {
    en: {
      kicker: "Lookbook",
      title: "Season looks",
      description: "Atmosphere and style — no extra frames.",
    },
    fa: {
      kicker: "لوک‌بوک",
      title: "استایل فصل",
      description: "فضا و استایل، بدون قاب‌های اضافه.",
    },
  },
  "origin-explorer": {
    en: {
      kicker: "Origin",
      title: "Origin explorer",
      description: "Trace the beans back to place.",
    },
    fa: {
      kicker: "خاستگاه",
      title: "کاشف خاستگاه",
      description: "دانه را تا مکان دنبال کنید.",
    },
  },
  "brew-guide": {
    en: {
      kicker: "Brew",
      title: "Brew guide",
      description: "Practical steps for a better cup.",
    },
    fa: {
      kicker: "دم",
      title: "راهنمای دم",
      description: "مراحل کاربردی برای فنجانی بهتر.",
    },
  },
  "shop-by-room": {
    en: {
      kicker: "Room",
      title: "Shop by room",
      description: "Start with the space you are furnishing.",
    },
    fa: {
      kicker: "فضا",
      title: "خرید بر اساس فضا",
      description: "از فضایی که می‌چینید شروع کنید.",
    },
  },
};
