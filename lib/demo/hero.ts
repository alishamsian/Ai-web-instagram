import { DEMO_BEAUTY_IMAGES, DEMO_POSTS } from "@/lib/demo/store";

/**
 * Hero demo brand — NOORAN fashion (same as showcase "مد" tab).
 */
const fashionImages = [
  ...DEMO_POSTS.map((p) => p.displayUrl ?? "").filter(Boolean),
  ...DEMO_BEAUTY_IMAGES,
].slice(0, 9);

export const HERO_DEMO = {
  username: "nooran",
  name: "NOORAN",
  category: { fa: "مد و پوشاک", en: "Fashion" },
  bio: {
    fa: "پوشاک معاصر · طراحی در تهران\nارسال سراسری",
    en: "Contemporary womenswear · Tehran\nShips nationwide",
  },
  followers: "28.4K",
  following: "312",
  posts: "186",
  siteUrl: "nooran.vitrin.app",
  headline: {
    fa: "لباس آرام برای شهر شلوغ.",
    en: "Quiet clothes for a loud city.",
  },
  body: {
    fa: "همان تصاویر پیج — حالا ویترین فروش.",
    en: "Same feed images — now a storefront.",
  },
  cta: { fa: "مشاهده مجموعه", en: "Shop collection" },
  products: [
    {
      title: { fa: "کت لینن نرم", en: "Soft linen coat" },
      price: { fa: "۲٬۴۹۰٬۰۰۰", en: "$248" },
      tag: { fa: "پرفروش", en: "Bestseller" },
    },
    {
      title: { fa: "شلوار پشمی چین", en: "Wool chino" },
      price: { fa: "۱٬۶۸۰٬۰۰۰", en: "$168" },
      tag: { fa: "جدید", en: "New" },
    },
    {
      title: { fa: "پیراهن ابریشم روز", en: "Day silk shirt" },
      price: { fa: "۱٬۹۲۰٬۰۰۰", en: "$192" },
      tag: null,
    },
    {
      title: { fa: "ژاکت سبک عصر", en: "Evening jacket" },
      price: { fa: "۳٬۱۰۰٬۰۰۰", en: "$310" },
      tag: null,
    },
    {
      title: { fa: "دامن پلیسه", en: "Pleated skirt" },
      price: { fa: "۱٬۴۵۰٬۰۰۰", en: "$145" },
      tag: null,
    },
    {
      title: { fa: "تی‌شرت کتان", en: "Cotton tee" },
      price: { fa: "۸۹۰٬۰۰۰", en: "$89" },
      tag: null,
    },
  ],
  images: fashionImages,
  avatar: fashionImages[0] ?? DEMO_BEAUTY_IMAGES[0],
} as const;
