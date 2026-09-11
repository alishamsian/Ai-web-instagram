"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
} from "motion/react";
import { BrandMark } from "@/components/landing/Brand";
import {
  ICON_SIZE,
  IconBeauty,
  IconCreator,
  IconFashion,
  IconInstagram,
  IconMobile,
  IconRestaurant,
  IconServicesCategory,
  IconWebsite,
  X,
  type AppIcon,
} from "@/components/icons";
import { BadgeCheck, Battery, Clapperboard, Grid3X3, Signal, UserSquare2, Wifi } from "lucide-react";
import {
  DEMO_BEAUTY_IMAGES,
  DEMO_CREATOR_IMAGES,
  DEMO_POSTS,
  DEMO_RESTAURANT_IMAGES,
  DEMO_SERVICES_IMAGES,
} from "@/lib/demo/store";
import { INSTAGRAM_DEMO_BRAND } from "@/lib/demo/instagram-demo";
import { usePageVisible } from "@/lib/hooks/use-page-visible";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";

type Tab = "fashion" | "restaurant" | "beauty" | "services" | "creator";
type SiteMode = "dark" | "light";
type DeviceMode = "desktop" | "mobile";

type Product = {
  id: string;
  title: string;
  price: string;
  compareAt?: string;
  badge?: string;
  description: string;
  image: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  likes: string;
};

type SiteTheme = {
  bg: string;
  fg: string;
  muted: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  accentFg: string;
  heroOverlay: string;
};

type DemoBrand = {
  username: string;
  name: string;
  url: string;
  handle: string;
  avatar: string;
  images: string[];
  stats: [string, string, string];
  bio: string;
  category: string;
  link?: string;
  verified?: boolean;
  headline: string;
  sub: string;
  cta: string;
  products: Product[];
  themes: { dark: SiteTheme; light: SiteTheme };
};

const tabIcons = {
  fashion: IconFashion,
  restaurant: IconRestaurant,
  beauty: IconBeauty,
  services: IconServicesCategory,
  creator: IconCreator,
} as const;

const TAB_KEYS = [
  "fashion",
  "restaurant",
  "beauty",
  "services",
  "creator",
] as const satisfies readonly Tab[];

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function demos(locale: Locale): Record<Tab, DemoBrand> {
  const fa = locale === "fa";
  const fashionImgs = [
    ...DEMO_POSTS.map((p) => p.displayUrl ?? "").filter(Boolean),
    ...DEMO_BEAUTY_IMAGES,
  ].slice(0, 9);

  const mkProducts = (
    prefix: string,
    images: string[],
    titles: string[],
    prices: string[],
    descs: string[],
    sizes: string[],
    colors: { name: string; hex: string }[],
  ): Product[] =>
    titles.map((title, i) => ({
      id: `${prefix}-${i}`,
      title,
      price: prices[i] ?? prices[0],
      compareAt: i === 0 ? (fa ? undefined : undefined) : undefined,
      badge: i === 0 ? (fa ? "پرفروش" : "Bestseller") : i === 2 ? (fa ? "جدید" : "New") : undefined,
      description: descs[i] ?? descs[0],
      image: images[i % images.length],
      sizes,
      colors,
      likes: ["2,418", "1,902", "3,110", "874", "1,245", "2,033"][i] ?? "1,024",
    }));

  return {
    fashion: {
      username: "nooran",
      name: "NOORAN",
      url: "nooran.vitrin.app",
      handle: "@nooran",
      avatar: fashionImgs[0],
      images: fashionImgs,
      stats: ["186", "28.4K", "312"],
      bio: fa ? "پوشاک معاصر · طراحی در تهران\nارسال سراسری" : "Contemporary womenswear · Tehran",
      category: fa ? "مد و پوشاک" : "Fashion",
      headline: fa ? "لباس آرام برای شهر شلوغ." : "Quiet clothes for a loud city.",
      sub: fa ? "همان تصاویر پیج — حالا ویترین فروش." : "Same feed images — now a storefront.",
      cta: fa ? "مشاهده مجموعه" : "Shop collection",
      products: mkProducts(
        "fashion",
        fashionImgs,
        fa
          ? ["کت لینن نرم", "شلوار پشمی چین", "پیراهن ابریشم روز", "ژاکت سبک عصر", "دامن پلیسه", "تی‌شرت کتان"]
          : ["Soft linen coat", "Wool chino", "Day silk shirt", "Evening jacket", "Pleated skirt", "Cotton tee"],
        fa
          ? ["۲٬۴۹۰٬۰۰۰", "۱٬۶۸۰٬۰۰۰", "۱٬۹۲۰٬۰۰۰", "۳٬۱۰۰٬۰۰۰", "۱٬۴۵۰٬۰۰۰", "۸۹۰٬۰۰۰"]
          : ["$248", "$168", "$192", "$310", "$145", "$89"],
        fa
          ? [
              "برش آزاد، پارچه تنفس‌پذیر، مناسب چهارفصل.",
              "پارچه ایتالیایی با افت طبیعی.",
              "ابریشم سبک با یقه تمیز.",
              "لایه میانی برای شب‌های خنک.",
              "افت نرم و کمر قابل تنظیم.",
              "پنبه ارگانیک، دوخت مینیمال.",
            ]
          : [
              "Relaxed cut, breathable cloth, year-round.",
              "Italian wool with a natural drape.",
              "Light silk with a clean collar.",
              "Mid-layer for cool evenings.",
              "Soft fall with adjustable waist.",
              "Organic cotton, minimal stitch.",
            ],
        fa ? ["۳۶", "۳۸", "۴۰", "۴۲"] : ["XS", "S", "M", "L"],
        [
          { name: fa ? "شنی" : "Sand", hex: "#C4B09A" },
          { name: fa ? "زغالی" : "Charcoal", hex: "#2C2C2C" },
          { name: fa ? "خامه" : "Ivory", hex: "#F3EDE4" },
        ],
      ),
      themes: {
        dark: {
          bg: "#0E0D0C",
          fg: "#F6F1EA",
          muted: "#A59B90",
          surface: "#181614",
          card: "#1C1A17",
          border: "rgba(255,255,255,0.08)",
          accent: "#E8C9A8",
          accentFg: "#14110F",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.78))",
        },
        light: {
          bg: "#F4EFE7",
          fg: "#1A1612",
          muted: "#7A7168",
          surface: "#EBE4DA",
          card: "#FFFFFF",
          border: "rgba(26,22,18,0.08)",
          accent: "#1A1612",
          accentFg: "#F6F1EA",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.62))",
        },
      },
    },
    restaurant: {
      username: "naranj",
      name: "NARANJ",
      url: "naranj.vitrin.app",
      handle: "@naranj",
      avatar: DEMO_RESTAURANT_IMAGES[0],
      images: [...DEMO_RESTAURANT_IMAGES, ...DEMO_RESTAURANT_IMAGES].slice(0, 8),
      stats: ["94", "11.2K", "208"],
      bio: fa ? "آشپزخانه فصلی · رزرو آنلاین" : "Seasonal kitchen · Reservations",
      category: fa ? "رستوران" : "Restaurant",
      headline: fa ? "شام آرام، طعم دقیق." : "A quieter table. A precise kitchen.",
      sub: fa ? "پست‌ها تبدیل به منوی قابل سفارش می‌شوند." : "Posts become an orderable menu.",
      cta: fa ? "رزرو میز" : "Reserve a table",
      products: mkProducts(
        "food",
        DEMO_RESTAURANT_IMAGES,
        fa
          ? ["استارتر مرکبات", "ماهی زعفرانی", "بره کندپز", "دسر هل"]
          : ["Citrus starter", "Saffron fish", "Slow lamb", "Cardamom dessert"],
        fa ? ["۴۸۰٬۰۰۰", "۹۲۰٬۰۰۰", "۱٬۱۰۰٬۰۰۰", "۳۶۰٬۰۰۰"] : ["$18", "$42", "$48", "$14"],
        fa
          ? [
              "پرتقال خونی، رازیانه، روغن زیتون.",
              "ماهی روز با کره زعفران.",
              "۱۲ ساعت پخت آرام.",
              "بستنی هل و پسته.",
            ]
          : [
              "Blood orange, fennel, olive oil.",
              "Catch of the day, saffron butter.",
              "Twelve-hour slow cook.",
              "Cardamom ice cream, pistachio.",
            ],
        fa ? ["۱ نفر", "۲ نفر"] : ["1 serve", "2 serve"],
        [
          { name: fa ? "تند" : "Spicy", hex: "#C45C26" },
          { name: fa ? "ملایم" : "Mild", hex: "#D4A574" },
        ],
      ),
      themes: {
        dark: {
          bg: "#100E0C",
          fg: "#F5EFE6",
          muted: "#A89F93",
          surface: "#1A1612",
          card: "#201B16",
          border: "rgba(255,255,255,0.08)",
          accent: "#D4A574",
          accentFg: "#140F0C",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.8))",
        },
        light: {
          bg: "#F7F2EA",
          fg: "#1A1410",
          muted: "#7D746A",
          surface: "#EFE7DC",
          card: "#FFFFFF",
          border: "rgba(26,20,16,0.08)",
          accent: "#8B5A2B",
          accentFg: "#FFF8F0",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.65))",
        },
      },
    },
    beauty: (() => {
      const luna = INSTAGRAM_DEMO_BRAND;
      const lunaColors = [
        { name: fa ? "عاجی" : "Ivory", hex: luna.colors.ivory },
        { name: fa ? "خنثی" : "Neutral", hex: luna.colors.softNeutral },
        { name: fa ? "زغالی" : "Charcoal", hex: luna.colors.charcoal },
      ];
      const lunaDescs = fa
        ? [
            "فرمول تمیز برای درخشش روزانه.",
            "آبرسان سبک برای پوست آرام.",
            "تونر ملایم با pH متعادل.",
          ]
        : [
            "Clean formula for everyday glow.",
            "Light hydration for calm skin.",
            "Gentle toner with balanced pH.",
          ];
      const lunaTitles = fa
        ? ["سرم ویتامین C", "مرطوب‌کننده ابریشم", "تونر ملایم"]
        : luna.products.map((p) => p.name);
      const lunaProducts: Product[] = luna.products.map((p, i) => ({
        id: p.id,
        title: lunaTitles[i] ?? p.name,
        price: p.price,
        badge: i === 0 ? (fa ? "پرفروش" : "Bestseller") : i === 2 ? (fa ? "جدید" : "New") : undefined,
        description: lunaDescs[i] ?? luna.about,
        image: p.image,
        sizes: fa ? ["۳۰ میل", "۵۰ میل"] : ["30ml", "50ml"],
        colors: lunaColors,
        likes: ["2,418", "1,902", "3,110"][i] ?? "1,024",
      }));

      return {
        username: luna.username,
        name: luna.name,
        url: luna.siteUrl,
        handle: luna.handle,
        avatar: luna.avatar,
        images: luna.images.slice(0, 12),
        stats: [luna.posts, luna.followers, luna.following] as [string, string, string],
        bio: fa ? "زیبایی تمیز برای روتین روزانه." : luna.bio,
        category: fa ? "زیبایی و مراقبت پوست" : luna.category,
        link: luna.link,
        verified: true,
        headline: fa ? "زیبایی، ساده‌شده." : luna.headline,
        sub: fa
          ? "ضروری‌های زیبایی برای روتین هرروز."
          : luna.subheadline,
        cta: fa ? "مشاهده مجموعه" : luna.cta,
        products: lunaProducts,
        themes: {
          dark: {
            bg: luna.colors.charcoal,
            fg: luna.colors.ivory,
            muted: "#A89892",
            surface: "#241F1B",
            card: "#2C2621",
            border: "rgba(255,255,255,0.08)",
            accent: luna.colors.mutedAccent,
            accentFg: luna.colors.charcoal,
            heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.78))",
          },
          light: {
            bg: luna.colors.ivory,
            fg: luna.colors.foreground,
            muted: "#8F817A",
            surface: luna.colors.softNeutral,
            card: "#FFFFFF",
            border: "rgba(42,34,30,0.08)",
            accent: luna.colors.mutedAccent,
            accentFg: "#FFF9F6",
            heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.58))",
          },
        },
      };
    })(),
    services: {
      username: "studiom",
      name: "STUDIO M",
      url: "studiom.vitrin.app",
      handle: "@studiom",
      avatar: DEMO_SERVICES_IMAGES[0],
      images: [...DEMO_SERVICES_IMAGES, ...DEMO_SERVICES_IMAGES].slice(0, 8),
      stats: ["120", "8.9K", "154"],
      bio: fa ? "طراحی فضا · پروژه برند" : "Space design · Brand projects",
      category: fa ? "خدمات" : "Services",
      headline: fa ? "فضاهایی که کار می‌کنند." : "Spaces that simply work.",
      sub: fa ? "نمای پروژه‌ها از همان پست‌ها." : "Project shots from the same posts.",
      cta: fa ? "مشاوره" : "Book consult",
      products: mkProducts(
        "service",
        DEMO_SERVICES_IMAGES,
        fa
          ? ["طراحی دفتر", "هویت فضا", "فروشگاه پرچم", "مشاوره یک‌روزه"]
          : ["Office design", "Spatial identity", "Flagship store", "One-day consult"],
        fa ? ["از ۴۵۰ میلیون", "از ۲۸۰ میلیون", "از ۶۲۰ میلیون", "۱۸ میلیون"] : ["From $12k", "From $7.5k", "From $18k", "$480"],
        fa
          ? [
              "برنامه‌ریزی تا اجرا برای تیم‌های در حال رشد.",
              "زبان بصری منسجم برای برند.",
              "تجربه خرید فیزیکی دقیق.",
              "یک روز فشرده برای تصمیم‌های کلیدی.",
            ]
          : [
              "Plan-to-build for growing teams.",
              "Cohesive visual language for brands.",
              "Precise physical retail experience.",
              "One focused day for key decisions.",
            ],
        fa ? ["پایه", "حرفه‌ای", "کامل"] : ["Starter", "Pro", "Full"],
        [
          { name: fa ? "خنثی" : "Neutral", hex: "#D8D4CF" },
          { name: fa ? "مشکی" : "Black", hex: "#111111" },
        ],
      ),
      themes: {
        dark: {
          bg: "#0B0B0C",
          fg: "#F4F4F5",
          muted: "#A1A1AA",
          surface: "#141416",
          card: "#1A1A1D",
          border: "rgba(255,255,255,0.08)",
          accent: "#F4F4F5",
          accentFg: "#0B0B0C",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.8))",
        },
        light: {
          bg: "#FFFFFF",
          fg: "#111111",
          muted: "#71717A",
          surface: "#F4F4F5",
          card: "#FFFFFF",
          border: "rgba(17,17,17,0.08)",
          accent: "#111111",
          accentFg: "#FFFFFF",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.55))",
        },
      },
    },
    creator: {
      username: "laya.frames",
      name: "LAYA",
      url: "laya.vitrin.app",
      handle: "@laya.frames",
      avatar: DEMO_CREATOR_IMAGES[0],
      images: [...DEMO_CREATOR_IMAGES, ...DEMO_CREATOR_IMAGES].slice(0, 8),
      stats: ["312", "41K", "420"],
      bio: fa ? "عکاسی مستند و پرتره" : "Documentary & portrait",
      category: fa ? "کرییتور" : "Creator",
      headline: fa ? "نور، مکان، آدم‌ها." : "Light, place, people.",
      sub: fa ? "گالری سایت همان فریم‌هاست." : "The gallery is the same frames.",
      cta: fa ? "رزرو جلسه" : "Book session",
      products: mkProducts(
        "creator",
        DEMO_CREATOR_IMAGES,
        fa
          ? ["پرتره استودیو", "مجموعه شهری", "کمپین برند", "پرینت محدود"]
          : ["Studio portrait", "City series", "Brand campaign", "Limited print"],
        fa ? ["۱۲ میلیون", "۱۸ میلیون", "از ۳۵ میلیون", "۴٫۵ میلیون"] : ["$320", "$480", "From $1.2k", "$120"],
        fa
          ? [
              "۱ ساعت، ۲۰ ادیت نهایی.",
              "نیم‌روز عکاسی در شهر.",
              "داستان بصری برای لانچ.",
              "چاپ آرشیوی امضاشده.",
            ]
          : [
              "1 hour, 20 final edits.",
              "Half-day city shoot.",
              "Visual story for a launch.",
              "Signed archival print.",
            ],
        fa ? ["رقمی", "چاپی"] : ["Digital", "Print"],
        [
          { name: fa ? "رنگی" : "Color", hex: "#E8DCC8" },
          { name: fa ? "سیاه‌سفید" : "B&W", hex: "#8A8A8A" },
        ],
      ),
      themes: {
        dark: {
          bg: "#090909",
          fg: "#F4F4F5",
          muted: "#A1A1AA",
          surface: "#141414",
          card: "#1A1A1A",
          border: "rgba(255,255,255,0.08)",
          accent: "#F4F4F5",
          accentFg: "#090909",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.82))",
        },
        light: {
          bg: "#F7F7F5",
          fg: "#111111",
          muted: "#71717A",
          surface: "#ECECE8",
          card: "#FFFFFF",
          border: "rgba(17,17,17,0.08)",
          accent: "#111111",
          accentFg: "#FFFFFF",
          heroOverlay: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.55))",
        },
      },
    },
  };
}

export function WebsiteShowcase({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const [tab, setTab] = useState<Tab>("fashion");
  const [siteMode, setSiteMode] = useState<SiteMode>("dark");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [compact, setCompact] = useState<boolean | null>(null);
  const brand = demos(locale)[tab];
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.2 });
  const pageVisible = usePageVisible();
  const demoActive = inView && pageVisible;
  const show = reduce || inView;
  const fa = locale === "fa";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => {
      setCompact(mq.matches);
      if (mq.matches) setDeviceMode("mobile");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <section
      id="examples"
      ref={sectionRef}
      className="relative hidden scroll-mt-24 overflow-hidden bg-background transition-colors duration-500 lg:block"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
        aria-hidden
      />

      <div className="container-marketing relative py-16 md:py-24 lg:py-32">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="type-label text-foreground-muted">
            {fa ? "تبدیل زنده" : "Live transform"}
          </p>
          <h2 className="type-display-m mt-3 text-balance text-foreground md:mt-4">
            {dict.showcase.title}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-[14px] leading-6 text-foreground-secondary md:mt-5 md:text-[15px] md:leading-7 lg:text-base lg:leading-8">
            <span className="lg:hidden">
              {fa
                ? "پست اینستاگرام، همان لحظه به محصول آمادهٔ فروش در سایت تبدیل می‌شود."
                : "An Instagram post becomes a ready-to-sell product on your site — live."}
            </span>
            <span className="hidden lg:inline">
              {fa
                ? "موس خودش روی پست می‌زند، جزئیات اینستا باز می‌شود؛ همان محصول در سایت با کارت حرفه‌ای و پاپ‌آپ کامل ظاهر می‌شود."
                : "The cursor taps a post, Instagram opens details; the same product appears on the site with a full product popup."}
            </span>
          </p>
        </motion.div>

        {/* Theme + device toggles */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: reduce ? 0 : 0.06, duration: 0.4 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:mt-10 md:gap-3"
        >
          <div
            className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--mkt-panel)] p-1"
            role="group"
            aria-label={fa ? "حالت نمایش سایت" : "Website theme"}
          >
            {(
              [
                { id: "dark" as const, label: fa ? "دارک" : "Dark" },
                { id: "light" as const, label: fa ? "لایت" : "Light" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSiteMode(option.id)}
                className={cn(
                  "relative min-h-11 rounded-full px-4 py-2 text-[12px] font-medium transition-colors md:text-xs",
                  siteMode === option.id
                    ? "text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground",
                )}
              >
                {siteMode === option.id ? (
                  <motion.span
                    layoutId="site-mode-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-[1]">{option.label}</span>
              </button>
            ))}
          </div>

          <div
            className="hidden min-h-11 items-center gap-1 rounded-full border border-border bg-[var(--mkt-panel)] p-1 lg:inline-flex"
            role="group"
            aria-label={fa ? "قالب نمایش" : "Device frame"}
          >
            {(
              [
                {
                  id: "desktop" as const,
                  label: fa ? "دسکتاپ" : "Desktop",
                  Icon: IconWebsite,
                },
                {
                  id: "mobile" as const,
                  label: fa ? "موبایل" : "Mobile",
                  Icon: IconMobile,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDeviceMode(option.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  deviceMode === option.id
                    ? "text-accent-foreground"
                    : "text-foreground-muted hover:text-foreground",
                )}
              >
                {deviceMode === option.id ? (
                  <motion.span
                    layoutId="device-mode-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
                <option.Icon size={13} className="relative z-[1]" aria-hidden />
                <span className="relative z-[1]">{option.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: reduce ? 0 : 0.1, duration: 0.45 }}
          className="relative mt-6 md:mt-10"
          role="tablist"
          aria-label={dict.showcase.title}
        >
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-7 bg-gradient-to-r from-background to-transparent md:hidden"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-7 bg-gradient-to-l from-background to-transparent md:hidden"
              aria-hidden
            />
            <div className="flex justify-center overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex min-w-min items-end gap-0.5 border-b border-border-subtle px-1">
                {TAB_KEYS.map((key) => {
                  const Icon = tabIcons[key];
                  const selected = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setTab(key)}
                      className={cn(
                        "relative inline-flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 text-[12px] font-medium transition-colors duration-150 md:gap-2 md:px-4 md:py-3 md:text-sm",
                        selected
                          ? "text-foreground"
                          : "text-foreground-muted hover:text-foreground-secondary",
                      )}
                    >
                      <Icon size={ICON_SIZE.sm} aria-hidden />
                      <span className="max-md:sr-only">{dict.showcase.tabs[key]}</span>
                      {selected ? (
                        <motion.span
                          layoutId={reduce ? undefined : "showcase-tab-underline"}
                          className="absolute inset-x-1 -bottom-px h-px bg-accent md:inset-x-2"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
          transition={{ delay: reduce ? 0 : 0.16, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 md:mt-12 lg:mt-16"
        >
          {compact === null ? (
            <>
              <div className="phone-frame mx-auto animate-pulse rounded-[3rem] bg-muted/40 lg:hidden" />
              <div className="mx-auto mt-0 hidden h-[32rem] max-w-5xl animate-pulse rounded-xl bg-muted/40 ring-1 ring-border lg:block" />
            </>
          ) : compact ? (
            <CompactLiveMorph
              key={`${tab}-${siteMode}`}
              brand={brand}
              locale={locale}
              siteMode={siteMode}
              reduce={!!reduce}
              active={demoActive}
            />
          ) : (
            <TransformStage
              key={`${tab}-${siteMode}-${deviceMode}`}
              brand={brand}
              locale={locale}
              brandName={dict.brand}
              siteMode={siteMode}
              deviceMode={deviceMode}
              reduce={!!reduce}
              active={demoActive}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}

type MorphPhase = "ig" | "scan" | "web";

/** Phone-framed story: full Instagram page → analysis → full website. */
function CompactLiveMorph({
  brand,
  locale,
  siteMode,
  reduce,
  active,
}: {
  brand: DemoBrand;
  locale: Locale;
  siteMode: SiteMode;
  reduce: boolean;
  active: boolean;
}) {
  const fa = locale === "fa";
  const theme = brand.themes[siteMode];
  const [phase, setPhase] = useState<MorphPhase>("ig");
  const [scanStep, setScanStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const igCellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const webCardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const steps = useMemo(
    () =>
      [
        { id: "ig" as const, label: "Instagram" },
        { id: "scan" as const, label: fa ? "آنالیز" : "Analyze" },
        { id: "web" as const, label: "Website" },
      ] as const,
    [fa],
  );

  const scanChips = useMemo(
    () =>
      fa
        ? ["پروفایل", "محصولات", "استایل", "ساختار سایت"]
        : ["Profile", "Products", "Style", "Site structure"],
    [fa],
  );

  useEffect(() => {
    if (!active || reduce) {
      setPhase("web");
      return;
    }

    let cancelled = false;

    const loop = async () => {
      while (!cancelled) {
        setPhase("ig");
        setScanStep(0);
        await wait(4200);
        if (cancelled) return;

        setPhase("scan");
        for (let i = 0; i < scanChips.length; i++) {
          if (cancelled) return;
          setScanStep(i);
          await wait(900);
        }
        await wait(700);
        if (cancelled) return;

        setPhase("web");
        await wait(5200);
        if (cancelled) return;
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [active, reduce, brand.url, siteMode, scanChips.length]);

  // Slow auto-scroll while viewing IG / website pages
  useEffect(() => {
    if (!active || reduce || phase === "scan") return;
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = 0;
    let cancelled = false;
    let frame = 0;

    const tick = () => {
      if (cancelled || !scrollRef.current) return;
      const node = scrollRef.current;
      const max = Math.max(0, node.scrollHeight - node.clientHeight);
      if (max > 0) {
        node.scrollTop = Math.min(max, node.scrollTop + (phase === "ig" ? 0.55 : 0.7));
        if (node.scrollTop >= max - 1) {
          // ease back up a bit so the loop feels alive
          node.scrollTop = max * 0.15;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [active, reduce, phase, brand.url, siteMode]);

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div
        className="mb-5 flex items-center justify-center gap-1"
        role="tablist"
        aria-label={fa ? "مراحل تبدیل" : "Transform steps"}
      >
        {steps.map((step, i) => {
          const on = phase === step.id;
          return (
            <div key={step.id} className="contents">
              {i > 0 ? (
                <span
                  className={cn(
                    "mx-0.5 h-px w-4 transition-colors",
                    steps.findIndex((s) => s.id === phase) >= i
                      ? "bg-accent/70"
                      : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPhase(step.id)}
                className={cn(
                  "min-h-11 rounded-full px-3 py-2 text-[11px] font-medium transition-colors",
                  on
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground-muted",
                )}
              >
                {step.label}
              </button>
            </div>
          );
        })}
      </div>

      <PhoneShell
        tone={siteMode}
        statusTone={siteMode === "dark" ? "light" : "dark"}
        url={phase === "web" ? brand.url : undefined}
      >
        <div className="relative h-full">
          <div
            ref={scrollRef}
            className="absolute inset-0 overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
          <AnimatePresence mode="wait">
            {phase === "ig" ? (
              <motion.div
                key={`ig-${brand.username}`}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <InstagramScroll
                  brand={brand}
                  locale={locale}
                  products={brand.products}
                  highlightIndex={null}
                  cellRefs={igCellRefs}
                  mode={siteMode}
                  showChrome={false}
                />
              </motion.div>
            ) : null}

            {phase === "scan" ? (
              <motion.div
                key={`scan-${brand.username}`}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 overflow-hidden"
                style={{ background: siteMode === "dark" ? "#0a0a0a" : "#111111" }}
              >
                <div className="absolute inset-0 opacity-35">
                  <InstagramScroll
                    brand={brand}
                    locale={locale}
                    products={brand.products}
                    highlightIndex={null}
                    cellRefs={igCellRefs}
                    mode="dark"
                    showChrome={false}
                  />
                </div>
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
                {!reduce ? (
                  <motion.div
                    className="absolute inset-x-0 z-[1] h-20 bg-gradient-to-b from-transparent via-accent/50 to-transparent"
                    animate={{ top: ["-15%", "105%"] }}
                    transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-[2] flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
                  <BrandMark className="size-10 text-accent" />
                  <div>
                    <p className="text-[13px] font-semibold text-white">
                      {fa ? "در حال آنالیز پیج…" : "Analyzing the page…"}
                    </p>
                    <p className="mt-1 text-[11px] text-white/55">
                      @{brand.username}
                    </p>
                  </div>
                  <div className="flex w-full max-w-[14rem] flex-col gap-1.5">
                    {scanChips.map((chip, i) => {
                      const done = i < scanStep;
                      const current = i === scanStep;
                      return (
                        <div
                          key={chip}
                          className={cn(
                            "flex items-center justify-between rounded-full px-3 py-1.5 text-[11px] ring-1 transition-colors",
                            current
                              ? "bg-accent/20 text-accent ring-accent/40"
                              : done
                                ? "bg-white/10 text-white/85 ring-white/15"
                                : "bg-white/5 text-white/40 ring-white/8",
                          )}
                        >
                          <span>{chip}</span>
                          <span className="text-[10px]">
                            {done ? "✓" : current ? "…" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}

            {phase === "web" ? (
              <motion.div
                key={`web-${brand.username}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <WebsiteScroll
                  brand={brand}
                  locale={locale}
                  theme={theme}
                  products={brand.products}
                  highlightIndex={null}
                  cardRefs={webCardRefs}
                  layout="mobile"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
          </div>

          {phase === "web" ? (
            <WebsiteMobileDock theme={theme} locale={locale} />
          ) : null}
        </div>
      </PhoneShell>

      <p className="mt-3 text-center text-[11px] text-foreground-faint">
        {fa
          ? "پیج اینستاگرام → آنالیز → وب‌سایت کامل"
          : "Instagram page → analysis → full website"}
      </p>
    </div>
  );
}

function TransformStage({
  brand,
  locale,
  brandName,
  siteMode,
  deviceMode,
  reduce,
  active,
}: {
  brand: DemoBrand;
  locale: Locale;
  brandName: string;
  siteMode: SiteMode;
  deviceMode: DeviceMode;
  reduce: boolean;
  active: boolean;
}) {
  const mobile = deviceMode === "mobile";
  const stageRef = useRef<HTMLDivElement>(null);
  const igRef = useRef<HTMLDivElement>(null);
  const webRef = useRef<HTMLDivElement>(null);
  const igCellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const webCardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [igOpen, setIgOpen] = useState<number | null>(null);
  const [webOpen, setWebOpen] = useState<number | null>(null);
  const [igCursor, setIgCursor] = useState({
    x: 40,
    y: 120,
    visible: false,
    pressing: false,
  });
  const [webCursor, setWebCursor] = useState({
    x: 40,
    y: 120,
    visible: false,
    pressing: false,
  });
  const [demoPaused, setDemoPaused] = useState(false);
  const [focusPane, setFocusPane] = useState<"ig" | "convert" | "web">("ig");

  const progress = useMotionValue(0);
  const theme = brand.themes[siteMode];
  const products = brand.products;

  useMotionValueEvent(progress, "change", (value) => {
    if (igOpen !== null || webOpen !== null) return;
    const ig = igRef.current;
    const web = webRef.current;
    if (!ig || !web) return;
    ig.scrollTop = value * Math.max(0, ig.scrollHeight - ig.clientHeight);
    web.scrollTop = value * Math.max(0, web.scrollHeight - web.clientHeight);
  });

  useEffect(() => {
    if (reduce || !active || demoPaused || igOpen !== null || webOpen !== null) return;
    const controls = animate(progress, [0.05, 0.22], {
      duration: 4.5,
      ease: [0.42, 0, 0.2, 1],
      repeat: Infinity,
      repeatType: "mirror",
      repeatDelay: 0.8,
    });
    return () => controls.stop();
  }, [active, demoPaused, igOpen, progress, reduce, webOpen]);

  const pointOf = useCallback((el: HTMLElement | null) => {
    const stage = stageRef.current;
    if (!stage || !el) return null;
    const stageBox = stage.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return {
      x: box.left - stageBox.left + box.width * 0.55,
      y: box.top - stageBox.top + box.height * 0.55,
    };
  }, []);

  useEffect(() => {
    if (!active || reduce) {
      setIgCursor((c) => ({ ...c, visible: false }));
      setWebCursor((c) => ({ ...c, visible: false }));
      setIgOpen(null);
      setWebOpen(null);
      return;
    }

    let cancelled = false;

    const moveBoth = async (
      igEl: HTMLElement | null,
      webEl: HTMLElement | null,
    ) => {
      const igPoint = pointOf(igEl);
      const webPoint = pointOf(webEl);
      if (igPoint) {
        setIgCursor((c) => ({ ...c, visible: true, pressing: false, ...igPoint }));
      }
      if (webPoint) {
        setWebCursor((c) => ({ ...c, visible: true, pressing: false, ...webPoint }));
      }
      await wait(700);
    };

    const clickBoth = async () => {
      setIgCursor((c) => ({ ...c, pressing: true }));
      setWebCursor((c) => ({ ...c, pressing: true }));
      await wait(170);
      setIgCursor((c) => ({ ...c, pressing: false }));
      setWebCursor((c) => ({ ...c, pressing: false }));
      await wait(120);
    };

    const loop = async () => {
      await wait(800);
      while (!cancelled) {
        if (demoPaused) {
          await wait(280);
          continue;
        }

        for (let i = 0; i < Math.min(products.length, 4); i++) {
          if (cancelled) return;

          progress.set(0.1);
          const igCell = igCellRefs.current[i];
          const webCard = webCardRefs.current[i];

          if (igCell && igRef.current) {
            igRef.current.scrollTop = Math.max(0, igCell.offsetTop - 120);
          }
          if (webCard && webRef.current) {
            webRef.current.scrollTop = Math.max(0, webCard.offsetTop - 80);
          }

          await wait(280);
          if (cancelled) return;

          await moveBoth(igCell, webCard);
          if (cancelled) return;

          await clickBoth();
          if (cancelled) return;

          setIgOpen(i);
          setWebOpen(i);
          await wait(3000);
          if (cancelled) return;

          setIgOpen(null);
          setWebOpen(null);
          await wait(650);
        }
      }
    };

    void loop();
    return () => {
      cancelled = true;
    };
  }, [active, demoPaused, pointOf, products.length, progress, reduce, brand.url, siteMode, deviceMode]);

  const scrollHeight = mobile
    ? "absolute inset-0 overflow-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : "relative h-[340px] overflow-hidden sm:h-[380px] md:h-[440px] lg:h-[540px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div
      ref={stageRef}
      className="relative"
      onMouseEnter={() => setDemoPaused(true)}
      onMouseLeave={() => setDemoPaused(false)}
    >
      <TransformAtmosphere
        images={brand.images}
        reduce={reduce}
        active={active && !demoPaused}
        rtl={locale === "fa"}
      />

      {!reduce ? (
        <>
          <DemoCursor cursor={igCursor} tone="ig" />
          <DemoCursor cursor={webCursor} tone="web" />
        </>
      ) : null}

      <div
        className="mb-4 flex justify-center lg:hidden"
        role="tablist"
        aria-label={locale === "fa" ? "نمای تبدیل" : "Transform view"}
      >
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--mkt-panel)] p-1">
          {(
            [
              { id: "ig" as const, label: "Instagram" },
              { id: "convert" as const, label: locale === "fa" ? "تبدیل" : "Convert" },
              { id: "web" as const, label: "Website" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={focusPane === option.id}
              onClick={() => setFocusPane(option.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                focusPane === option.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] grid items-stretch",
          mobile
            ? "justify-items-center gap-3 lg:grid-cols-[minmax(0,360px)_auto_minmax(0,360px)] lg:gap-3 xl:gap-4"
            : "gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 xl:gap-6",
        )}
      >
        {/* Website pane */}
        <div
          className={cn(
            "relative w-full order-3 lg:order-1",
            mobile ? "max-w-[360px]" : "mx-auto max-w-[560px] lg:mx-0 lg:max-w-none",
            focusPane !== "web" && "hidden lg:block",
            !mobile && focusPane === "web" && "md:col-span-2 lg:col-span-1",
          )}
        >
          <PaneLabel icon={IconWebsite} tone="web">
            Website
          </PaneLabel>
          {mobile ? (
            <PhoneShell
              className="mt-2"
              tone={siteMode}
              statusTone={siteMode === "dark" ? "light" : "dark"}
              url={brand.url}
            >
              <div className="relative h-full">
                <div ref={webRef} className={scrollHeight}>
                  <WebsiteScroll
                    brand={brand}
                    locale={locale}
                    theme={theme}
                    products={products}
                    highlightIndex={webOpen}
                    cardRefs={webCardRefs}
                    layout="mobile"
                  />
                  <AnimatePresence>
                    {webOpen !== null ? (
                      <WebsiteProductPopup
                        brand={brand}
                        product={products[webOpen]}
                        locale={locale}
                        theme={theme}
                        onClose={() => setWebOpen(null)}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
                <WebsiteMobileDock theme={theme} locale={locale} />
              </div>
            </PhoneShell>
          ) : (
            <div className="relative mt-3 overflow-hidden rounded-[1.15rem] bg-[var(--mkt-chrome)] shadow-[var(--elevated-lg)] ring-1 ring-border">
              <div className="flex items-center gap-3 border-b border-border bg-[var(--mkt-chrome-bar)] px-3 py-2.5">
                <div className="flex gap-1.5 ps-1" aria-hidden>
                  <span className="size-2 rounded-full bg-[#FF5F57]" />
                  <span className="size-2 rounded-full bg-[#FEBC2E]" />
                  <span className="size-2 rounded-full bg-[#28C840]" />
                </div>
                <div className="min-w-0 flex-1 truncate rounded-md bg-background/55 px-2.5 py-1 text-center font-mono text-[10px] text-foreground-muted md:text-[11px]">
                  https://{brand.url}
                </div>
                <span className="hidden rounded-md bg-[var(--mkt-panel)] px-2 py-1 text-[9px] uppercase tracking-wider text-foreground-faint sm:inline">
                  {siteMode}
                </span>
              </div>
              <div ref={webRef} className={scrollHeight}>
                <WebsiteScroll
                  brand={brand}
                  locale={locale}
                  theme={theme}
                  products={products}
                  highlightIndex={webOpen}
                  cardRefs={webCardRefs}
                  layout="desktop"
                />
                <AnimatePresence>
                  {webOpen !== null ? (
                    <WebsiteProductPopup
                      brand={brand}
                      product={products[webOpen]}
                      locale={locale}
                      theme={theme}
                      onClose={() => setWebOpen(null)}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <div
          className={cn(
            "relative z-[2] order-2 flex items-center justify-center",
            mobile
              ? "w-full max-w-[360px] py-1 lg:min-w-[120px] lg:max-w-none lg:px-0"
              : "py-3 md:col-span-2 lg:col-span-1 lg:min-w-[168px] lg:px-2",
            focusPane !== "convert" && "hidden lg:flex",
          )}
        >
          <ConverterCore
            brandName={brandName}
            locale={locale}
            reduce={reduce}
            active={active}
            compact={mobile}
          />
        </div>

        {/* Instagram pane */}
        <div
          className={cn(
            "relative w-full order-1 lg:order-3",
            mobile ? "max-w-[360px]" : "mx-auto max-w-[340px] lg:mx-0 lg:max-w-none",
            focusPane !== "ig" && "hidden lg:block",
            !mobile && focusPane === "ig" && "md:col-span-2 lg:col-span-1",
          )}
        >
          <PaneLabel icon={IconInstagram} tone="ig">
            Instagram
          </PaneLabel>
          {mobile ? (
            <PhoneShell
              className="mt-2"
              tone={siteMode}
              statusTone={siteMode === "dark" ? "light" : "dark"}
            >
              <div className="relative h-full">
                <div ref={igRef} className={scrollHeight}>
                  <InstagramScroll
                    brand={brand}
                    locale={locale}
                    products={products}
                    highlightIndex={igOpen}
                    cellRefs={igCellRefs}
                    mode={siteMode}
                    showChrome={false}
                  />
                  <AnimatePresence>
                    {igOpen !== null ? (
                      <InstagramProductPopup
                        brand={brand}
                        product={products[igOpen]}
                        locale={locale}
                        mode={siteMode}
                        onClose={() => setIgOpen(null)}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </PhoneShell>
          ) : (
            <div className="relative mt-3 overflow-hidden rounded-[1.75rem] bg-[var(--mkt-chrome)] p-[3px] shadow-[var(--elevated-lg)] ring-1 ring-border">
              <div
                className={cn(
                  "relative overflow-hidden rounded-[1.55rem] transition-colors duration-300",
                  siteMode === "dark" ? "bg-black" : "bg-white",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-between border-b px-4 py-2.5 transition-colors duration-300",
                    siteMode === "dark"
                      ? "border-white/10 text-white"
                      : "border-[#efefef] text-black",
                  )}
                >
                  <p className="text-[13px] font-semibold">{brand.username}</p>
                  <IconInstagram
                    size={16}
                    className={siteMode === "dark" ? "text-white" : "text-black"}
                    aria-hidden
                  />
                </div>
                <div ref={igRef} className={scrollHeight}>
                  <InstagramScroll
                    brand={brand}
                    locale={locale}
                    products={products}
                    highlightIndex={igOpen}
                    cellRefs={igCellRefs}
                    mode={siteMode}
                  />
                  <AnimatePresence>
                    {igOpen !== null ? (
                      <InstagramProductPopup
                        brand={brand}
                        product={products[igOpen]}
                        locale={locale}
                        mode={siteMode}
                        onClose={() => setIgOpen(null)}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="relative z-[1] mt-6 text-center text-[11px] text-foreground-faint md:text-[12px]">
        {locale === "fa"
          ? demoPaused
            ? "دمو متوقف — ماوس را بردار تا کلیک‌های خودکار ادامه یابد"
            : mobile
              ? "نمای موبایل — کلیک هم‌زمان روی پست اینستا و کارت محصول"
              : "کلیک هم‌زمان روی پست اینستا و کارت محصول سایت"
          : demoPaused
            ? "Demo paused — move away to resume auto clicks"
            : mobile
              ? "Mobile frames — simultaneous taps on Instagram and product cards"
              : "Simultaneous clicks on Instagram posts and website cards"}
      </p>
    </div>
  );
}

function PhoneShell({
  children,
  className,
  tone,
  statusTone,
  url,
}: {
  children: React.ReactNode;
  className?: string;
  tone: SiteMode;
  statusTone: "light" | "dark";
  url?: string;
}) {
  const lightStatus = statusTone === "light";
  const lightFrame = tone === "light";

  return (
    <div
      className={cn("phone-frame relative", className)}
      dir="ltr"
      style={{ direction: "ltr" }}
    >
      {/* Hardware silhouette — iPhone-ish ~390×844 */}
      <div
        className="relative h-full w-full"
        style={{
          filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.28))",
        }}
      >
        {/* Side buttons */}
        <span
          className="absolute -start-[2px] top-[14%] h-[18px] w-[2px] rounded-s-sm"
          style={{ background: lightFrame ? "#c5c5c7" : "#2c2c2e" }}
          aria-hidden
        />
        <span
          className="absolute -start-[2px] top-[22%] h-[36px] w-[2px] rounded-s-sm"
          style={{ background: lightFrame ? "#c5c5c7" : "#2c2c2e" }}
          aria-hidden
        />
        <span
          className="absolute -start-[2px] top-[30%] h-[36px] w-[2px] rounded-s-sm"
          style={{ background: lightFrame ? "#c5c5c7" : "#2c2c2e" }}
          aria-hidden
        />
        <span
          className="absolute -end-[2px] top-[24%] h-[52px] w-[2px] rounded-e-sm"
          style={{ background: lightFrame ? "#c5c5c7" : "#2c2c2e" }}
          aria-hidden
        />

        <div
          className="absolute inset-0 rounded-[3rem] p-[7px]"
          style={{
            background: lightFrame
              ? "linear-gradient(160deg, #ececee 0%, #d0d0d4 42%, #b8b8bc 100%)"
              : "linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 45%, #0c0c0d 100%)",
            boxShadow: lightFrame
              ? "inset 0 0 0 1px rgba(255,255,255,0.65), inset 0 0 0 1.5px rgba(0,0,0,0.08)"
              : "inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 0 0 1.5px rgba(0,0,0,0.55)",
          }}
        >
          <div
            className={cn(
              "relative flex h-full flex-col overflow-hidden rounded-[2.55rem]",
              tone === "dark" ? "bg-black" : "bg-white",
            )}
          >
            {/* Status bar + Dynamic Island */}
            <div
              className={cn(
                "relative z-30 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-5 pt-3 pb-1 text-[12px] font-semibold tracking-tight",
                lightStatus ? "text-white" : "text-black",
              )}
            >
              <span className="justify-self-start ps-1 tabular-nums">9:41</span>
              <div
                className="relative h-[22px] w-[78px] rounded-full bg-black"
                aria-hidden
              >
                <span
                  className="absolute top-1/2 size-[7px] -translate-y-1/2 rounded-full"
                  style={{
                    right: 11,
                    background:
                      "radial-gradient(circle at 30% 30%, #4a4a4c, #1a1a1c 70%)",
                    boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
                  }}
                />
              </div>
              <span
                className="inline-flex items-center justify-self-end gap-[3px] pe-0.5 opacity-90"
                aria-hidden
              >
                <Signal size={12} strokeWidth={2.4} />
                <Wifi size={12} strokeWidth={2.4} />
                <Battery size={16} strokeWidth={1.9} />
              </span>
            </div>

            {url ? (
              <div
                className={cn(
                  "relative z-20 mx-3 mb-1 shrink-0 truncate rounded-full px-2.5 py-1 text-center text-[10px]",
                  tone === "dark"
                    ? "bg-white/8 text-white/55"
                    : "bg-black/[0.05] text-black/50",
                )}
              >
                {url}
              </div>
            ) : null}

            <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>

            {/* Home indicator */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-center"
              aria-hidden
            >
              <span
                className={cn(
                  "h-[3.5px] w-[108px] rounded-full",
                  tone === "dark" ? "bg-white/40" : "bg-black/30",
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteMobileDock({
  theme: t,
  locale,
}: {
  theme: SiteTheme;
  locale: Locale;
}) {
  const fa = locale === "fa";
  const items = fa
    ? ["خانه", "فروشگاه", "سبد"]
    : ["Home", "Shop", "Bag"];

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 border-t px-2 pb-5 pt-1.5 backdrop-blur-xl"
      style={{
        background: `${t.card}ee`,
        borderColor: t.border,
        color: t.fg,
      }}
    >
      <div className="grid grid-cols-3 gap-1">
        {items.map((label, i) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[9px] font-medium"
            style={{ color: i === 1 ? t.accent : t.muted }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: i === 1 ? t.accent : "transparent" }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoCursor({
  cursor,
  tone,
}: {
  cursor: { x: number; y: number; visible: boolean; pressing: boolean };
  tone: "ig" | "web";
}) {
  if (!cursor.visible) return null;

  return (
    <motion.div
      className="pointer-events-none absolute z-30"
      animate={{
        left: cursor.x,
        top: cursor.y,
        scale: cursor.pressing ? 0.82 : 1,
      }}
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.55 }}
      style={{ x: "-30%", y: "-20%" }}
      aria-hidden
    >
      <div className="relative">
        <span
          className={cn(
            "absolute -inset-3 rounded-full blur-md",
            tone === "ig" ? "bg-[#dd2a7b]/30" : "bg-accent/30",
          )}
        />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 3.5l14.5 8.2-6.4 1.5-3.2 6.6L5 3.5z"
            fill="white"
            stroke={tone === "ig" ? "rgba(221,42,123,0.55)" : "rgba(255,107,87,0.55)"}
            strokeWidth="1"
          />
        </svg>
      </div>
    </motion.div>
  );
}

function PaneLabel({
  children,
  icon: Icon,
  tone,
}: {
  children: string;
  icon: AppIcon;
  tone: "ig" | "web";
}) {
  return (
    <div className="flex items-center justify-center gap-2 lg:justify-start">
      <span
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full ring-1",
          tone === "ig"
            ? "bg-gradient-to-br from-[#f58529]/20 via-[#dd2a7b]/20 to-[#515bd4]/20 text-white ring-white/15"
            : "bg-accent/15 text-accent ring-accent/25",
        )}
      >
        <Icon size={14} aria-hidden />
      </span>
      <span className="type-label text-foreground-muted">{children}</span>
    </div>
  );
}

function ConverterCore({
  brandName,
  locale,
  reduce,
  active,
  compact = false,
}: {
  brandName: string;
  locale: Locale;
  reduce: boolean;
  active: boolean;
  compact?: boolean;
}) {
  const fa = locale === "fa";

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center",
        compact ? "gap-1" : "gap-3",
      )}
    >
      {/* Flow line — Instagram → product → Website */}
      <div
        className={cn(
          "pointer-events-none absolute z-0 hidden items-center lg:flex",
          compact ? "inset-x-[-18%] top-1/2" : "inset-x-[-36%] top-[42%]",
        )}
        aria-hidden
      >
        <div className="relative h-px w-full overflow-hidden rounded-full bg-gradient-to-r from-accent/0 via-accent/45 to-[#dd2a7b]/0">
          {!reduce && active ? (
            <motion.span
              className="absolute top-1/2 h-[3px] w-10 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgba(255,107,87,0.8)]"
              animate={{ left: fa ? ["5%", "85%"] : ["85%", "5%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </div>
      </div>

      {/* Mobile: horizontal connector between stacked panes */}
      <div
        className="relative mb-1 flex w-full max-w-[220px] items-center gap-2 lg:hidden"
        aria-hidden
      >
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#dd2a7b]/50 to-accent/60" />
        {!reduce && active ? (
          <motion.span
            className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(255,107,87,0.9)]"
            animate={{ scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        ) : (
          <span className="size-1.5 rounded-full bg-accent/70" />
        )}
        <span className="h-px flex-1 bg-gradient-to-r from-accent/60 via-accent/40 to-transparent" />
      </div>

      <div className="relative z-[1] flex flex-col items-center">
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={cn(
                "pointer-events-none absolute rounded-full border border-accent/25",
                compact ? "size-20" : "size-24 md:size-[7.25rem]",
              )}
              animate={
                active
                  ? { scale: [0.72, 1.5], opacity: [0.4, 0] }
                  : { scale: 0.72, opacity: 0 }
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
              aria-hidden
            />
          ))}

        <motion.div
          className={cn(
            "relative flex flex-col items-center justify-center rounded-[1.35rem] border border-accent/35 bg-[#111113]/95 shadow-[0_0_50px_rgba(255,107,87,0.28)] backdrop-blur-xl",
            compact ? "min-w-[118px] px-3 py-3" : "min-w-[148px] px-4 py-4 md:min-w-[160px]",
          )}
          animate={
            reduce || !active
              ? undefined
              : {
                  boxShadow: [
                    "0 0 36px rgba(255,107,87,0.22)",
                    "0 0 64px rgba(255,107,87,0.48)",
                    "0 0 36px rgba(255,107,87,0.22)",
                  ],
                }
          }
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/35 md:size-10">
              <BrandMark className="size-5 text-accent md:size-6" />
            </span>
            <div className="text-start">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-foreground md:text-[12px]">
                {brandName}
              </p>
              <p className="mt-0.5 text-[9px] text-foreground-faint">
                {fa ? "موتور تبدیل" : "Transform engine"}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "mt-3 flex w-full items-center justify-between gap-1 rounded-full bg-white/[0.04] px-2.5 py-1.5 ring-1 ring-white/[0.06]",
              !fa && "flex-row-reverse",
            )}
          >
            <span className="text-[9px] font-medium text-[#dd2a7b]">IG</span>
            <motion.span
              className="h-px flex-1 bg-gradient-to-r from-[#dd2a7b]/60 via-accent to-accent/60"
              animate={
                reduce || !active
                  ? undefined
                  : { opacity: [0.45, 1, 0.45] }
              }
              transition={{ duration: 1.6, repeat: Infinity }}
              aria-hidden
            />
            <span className="text-[9px] font-medium text-accent">Web</span>
          </div>
        </motion.div>

        <p
          className={cn(
            "text-center leading-snug text-foreground-secondary",
            compact ? "mt-2 max-w-[10rem] text-[10px]" : "mt-3 max-w-[12.5rem] text-[12px]",
          )}
        >
          {fa
            ? "همین‌جا پیج اینستاگرام تبدیل به وب‌سایت می‌شود."
            : "This is where Instagram becomes a website."}
        </p>
        <p className="mt-1 text-center text-[10px] text-foreground-faint">
          {fa ? `تغییرات از طریق ${brandName}` : `Powered by ${brandName}`}
        </p>
      </div>
    </div>
  );
}

function TransformAtmosphere({
  images,
  reduce,
  active,
  rtl,
}: {
  images: string[];
  reduce: boolean;
  active: boolean;
  rtl: boolean;
}) {
  const shards = useMemo(
    () =>
      images.slice(0, 5).map((src, index) => ({
        src,
        delay: index * 1.1,
        top: 12 + index * 16,
        size: 44 + (index % 3) * 10,
        duration: 7 + index * 0.8,
      })),
    [images],
  );

  if (reduce) {
    return (
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,107,87,0.1),transparent_60%)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,107,87,0.14),transparent_62%)]" />
      <motion.div
        className="absolute start-[18%] end-[18%] top-1/2 h-[2px] -translate-y-1/2 overflow-hidden rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,107,87,0.15), rgba(255,107,87,0.55), rgba(255,107,87,0.15), transparent)",
        }}
      >
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-white to-transparent opacity-80"
          animate={
            active
              ? { x: rtl ? ["120%", "-220%"] : ["-120%", "320%"] }
              : { x: rtl ? "120%" : "-120%" }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
      {shards.map((shard) => (
        <motion.div
          key={`${shard.src}-${shard.delay}`}
          className="absolute start-[10%] overflow-hidden rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/20"
          style={{ top: `${shard.top}%`, width: shard.size, height: shard.size * 1.15 }}
          animate={
            active
              ? {
                  opacity: [0, 1, 1, 0],
                  x: rtl ? ["0%", "-38%", "-78%", "-110%"] : ["0%", "38%", "78%", "110%"],
                  y: [0, -18, 12, 0],
                  rotate: [-10, 4, -2, 8],
                  scale: [0.65, 1, 1, 0.75],
                }
              : { opacity: 0 }
          }
          transition={{
            duration: shard.duration,
            delay: shard.delay,
            repeat: Infinity,
            ease: [0.22, 1, 0.36, 1],
            repeatDelay: 0.6,
          }}
        >
          <Image src={shard.src} alt="" fill className="object-cover" sizes="80px" />
        </motion.div>
      ))}
    </div>
  );
}

function InstagramScroll({
  brand,
  locale,
  products,
  highlightIndex,
  cellRefs,
  mode,
  showChrome = true,
}: {
  brand: DemoBrand;
  locale: Locale;
  products: Product[];
  highlightIndex: number | null;
  cellRefs: RefObject<Array<HTMLButtonElement | null>>;
  mode: SiteMode;
  showChrome?: boolean;
}) {
  const dark = mode === "dark";
  const muted = dark ? "text-[#a8a8a8]" : "text-[#737373]";
  const link = brand.link ?? brand.url;

  return (
    <div
      className={cn(
        "transition-colors duration-300",
        dark ? "bg-black text-white" : "bg-white text-black",
      )}
      dir="ltr"
    >
      {!showChrome ? (
        <div
          className={cn(
            "flex items-center justify-between border-b px-4 py-2.5",
            dark ? "border-white/10" : "border-[#efefef]",
          )}
        >
          <p className="text-[13px] font-semibold tracking-tight">{brand.username}</p>
          <IconInstagram size={16} className={dark ? "text-white" : "text-black"} aria-hidden />
        </div>
      ) : null}

      <div className="flex items-center gap-5 px-4 pb-3 pt-4">
        <div
          className="shrink-0 rounded-full p-[2px]"
          style={{
            background:
              "conic-gradient(from 210deg, #f58529, #dd2a7b, #8134af, #515bd4, #f58529)",
          }}
        >
          <div
            className={cn(
              "rounded-full p-[2px]",
              dark ? "bg-black" : "bg-white",
            )}
          >
            <Image
              src={brand.avatar}
              alt=""
              width={78}
              height={78}
              className="size-[70px] rounded-full object-cover"
            />
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-3 text-center">
          {brand.stats.map((value, i) => (
            <div key={value + i}>
              <p className="text-[14px] font-semibold tabular-nums leading-none">{value}</p>
              <p className={cn("mt-1.5 text-[10px]", muted)}>
                {locale === "fa"
                  ? ["پست", "دنبال‌کننده", "دنبال‌شونده"][i]
                  : ["posts", "followers", "following"][i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-0.5 px-4 text-start">
        <div className="flex items-center gap-1">
          <p className="text-[13px] font-semibold">{brand.name}</p>
          {brand.verified ? (
            <BadgeCheck size={14} className="text-[#3897f0]" aria-hidden />
          ) : null}
        </div>
        <p className={cn("text-[12px]", muted)}>{brand.category}</p>
        <p className="whitespace-pre-line pt-0.5 text-[12px] leading-5">{brand.bio}</p>
        {link ? (
          <p className={cn("text-[12px] font-medium", dark ? "text-[#e0f1ff]" : "text-[#00376b]")}>
            {link}
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 px-4">
        <span className="flex h-8 items-center justify-center rounded-lg bg-[#0095f6] text-[12px] font-semibold text-white">
          {locale === "fa" ? "فالو" : "Follow"}
        </span>
        <span
          className={cn(
            "flex h-8 items-center justify-center rounded-lg text-[12px] font-semibold",
            dark ? "bg-white/10 text-white" : "bg-[#efefef] text-black",
          )}
        >
          {locale === "fa" ? "پیام" : "Message"}
        </span>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center justify-around border-y py-2.5",
          dark ? "border-white/[0.08] text-white/45" : "border-[#efefef] text-[#8e8e8e]",
        )}
        aria-hidden
      >
        <Grid3X3 size={18} className={dark ? "text-white" : "text-black"} />
        <Clapperboard size={18} />
        <UserSquare2 size={18} />
      </div>

      <div
        className={cn(
          "grid grid-cols-3 gap-px",
          dark ? "bg-[#262626]" : "bg-[#dbdbdb]",
        )}
      >
        {products.slice(0, 9).map((product, index) => (
          <button
            key={product.id}
            type="button"
            ref={(node) => {
              cellRefs.current[index] = node;
            }}
            className={cn(
              "relative aspect-square transition-[box-shadow,transform]",
              dark ? "bg-[#121212]" : "bg-[#f0f0f0]",
              highlightIndex === index && "z-[1] ring-2 ring-[#0095f6] ring-inset",
            )}
          >
            <Image src={product.image} alt="" fill className="object-cover" sizes="120px" />
            {product.badge ? (
              <span className="absolute start-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[8px] font-medium text-white">
                {product.badge}
              </span>
            ) : null}
          </button>
        ))}
        {brand.images
          .filter((src) => !products.some((p) => p.image === src))
          .slice(0, Math.max(0, 9 - Math.min(products.length, 9)))
          .map((src) => (
            <div
              key={src}
              className={cn(
                "relative aspect-square",
                dark ? "bg-[#121212]" : "bg-[#f0f0f0]",
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="120px" />
            </div>
          ))}
      </div>

      <div className="h-28" />
    </div>
  );
}

function WebsiteScroll({
  brand,
  locale,
  theme: t,
  products,
  highlightIndex,
  cardRefs,
  layout = "desktop",
}: {
  brand: DemoBrand;
  locale: Locale;
  theme: SiteTheme;
  products: Product[];
  highlightIndex: number | null;
  cardRefs: RefObject<Array<HTMLButtonElement | null>>;
  layout?: "desktop" | "mobile";
}) {
  const mobile = layout === "mobile";
  const fa = locale === "fa";

  return (
    <div
      style={{ background: t.bg, color: t.fg }}
      dir={fa ? "rtl" : "ltr"}
      className={mobile ? "pb-16" : undefined}
    >
      <header
        className={cn(
          "flex items-center justify-between",
          mobile ? "px-4 py-3" : "px-5 py-4",
        )}
        style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}
      >
        <p
          className={cn(
            "font-semibold tracking-[0.16em]",
            mobile ? "text-[11px]" : "text-[12px]",
          )}
        >
          {brand.name}
        </p>
        {mobile ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: t.muted }}>
              {fa ? "منو" : "Menu"}
            </span>
            <span
              className="rounded-md px-2.5 py-1 text-[9px] font-semibold"
              style={{ background: t.accent, color: t.accentFg }}
            >
              {brand.cta}
            </span>
          </div>
        ) : (
          <span
            className="rounded-md px-3 py-1.5 text-[10px] font-semibold"
            style={{ background: t.accent, color: t.accentFg }}
          >
            {brand.cta}
          </span>
        )}
      </header>

      <section
        className={cn(
          "relative overflow-hidden",
          mobile ? "min-h-[240px]" : "min-h-[280px] md:min-h-[320px]",
        )}
      >
        <Image
          src={brand.images[0]}
          alt=""
          fill
          className="object-cover"
          sizes={mobile ? "320px" : "560px"}
          priority
        />
        <div className="absolute inset-0" style={{ background: t.heroOverlay }} />
        <div className={cn("absolute inset-x-0 bottom-0", mobile ? "p-5" : "p-6 md:p-8")}>
          <p className="text-[10px] tracking-[0.2em] text-white/70">{brand.handle}</p>
          <h3
            className={cn(
              "mt-2 max-w-[14ch] font-display leading-[1.05] text-white",
              mobile ? "text-[1.55rem]" : "text-[1.85rem] md:text-[2.2rem]",
            )}
          >
            {brand.headline}
          </h3>
          <p className="mt-3 max-w-sm text-[12px] leading-5 text-white/75">{brand.sub}</p>
        </div>
      </section>

      <section className={cn(mobile ? "px-4 py-6" : "px-5 py-8 md:px-7")}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: t.muted }}>
              {fa ? "فروشگاه" : "Shop"}
            </p>
            <h4
              className={cn(
                "mt-1 font-display tracking-tight",
                mobile ? "text-lg" : "text-xl md:text-2xl",
              )}
            >
              {fa ? "محصولات منتخب" : "Featured products"}
            </h4>
          </div>
          <span className="text-[11px]" style={{ color: t.muted }}>
            {products.length} {fa ? "آیتم" : "items"}
          </span>
        </div>

        <div className={cn("mt-5 grid grid-cols-2", mobile ? "gap-2.5" : "mt-6 gap-3 md:gap-4")}>
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className={cn(
                "group overflow-hidden text-start transition-transform duration-300",
                mobile ? "rounded-xl" : "rounded-2xl",
                highlightIndex === index && "scale-[1.02]",
              )}
              style={{
                background: t.card,
                boxShadow:
                  highlightIndex === index
                    ? `0 0 0 2px ${t.accent}, 0 18px 40px rgba(0,0,0,0.25)`
                    : `0 0 0 1px ${t.border}`,
              }}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={product.image}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="220px"
                />
                {product.badge ? (
                  <span
                    className="absolute start-2 top-2 rounded-md px-1.5 py-0.5 text-[8px] font-semibold"
                    style={{ background: t.accent, color: t.accentFg }}
                  >
                    {product.badge}
                  </span>
                ) : null}
              </div>
              <div className={cn("space-y-1", mobile ? "p-2.5" : "p-3 md:p-3.5")}>
                <p className="line-clamp-1 text-[12px] font-semibold md:text-[13px]">
                  {product.title}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium tabular-nums">{product.price}</p>
                  <div className="flex -space-x-1 rtl:space-x-reverse">
                    {product.colors.slice(0, 3).map((color) => (
                      <span
                        key={color.hex}
                        className="size-3 rounded-full ring-1 ring-black/10"
                        style={{ background: color.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {!mobile ? (
        <footer
          className="flex items-center justify-between px-5 py-8 md:px-7"
          style={{ borderTop: `1px solid ${t.border}` }}
        >
          <p className="text-[12px] font-semibold tracking-[0.12em]">{brand.name}</p>
          <p className="text-[11px]" style={{ color: t.muted }}>
            {brand.url}
          </p>
        </footer>
      ) : (
        <div className="h-10" />
      )}
    </div>
  );
}

function InstagramProductPopup({
  brand,
  product,
  locale,
  mode,
  onClose,
}: {
  brand: DemoBrand;
  product: Product;
  locale: Locale;
  mode: SiteMode;
  onClose: () => void;
}) {
  const dark = mode === "dark";

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0.8, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={cn(
          "max-h-[92%] w-full overflow-hidden rounded-t-2xl shadow-2xl sm:max-w-[300px] sm:rounded-2xl",
          dark ? "bg-[#000000] text-white" : "bg-white text-black",
        )}
        onClick={(event) => event.stopPropagation()}
        dir="ltr"
      >
        <div
          className={cn(
            "flex items-center justify-between border-b px-3 py-2.5",
            dark ? "border-[#262626]" : "border-[#efefef]",
          )}
        >
          <div className="flex items-center gap-2">
            <Image
              src={brand.avatar}
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full object-cover"
            />
            <p className="text-[12px] font-semibold">{brand.username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-full p-1", dark ? "text-white" : "text-[#262626]")}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className={cn("relative aspect-square", dark ? "bg-[#121212]" : "bg-[#f0f0f0]")}>
          <Image src={product.image} alt="" fill className="object-cover" sizes="300px" />
        </div>

        <div className="space-y-2 px-3 py-3">
          <div className={cn("flex items-center gap-4 px-0.5", dark ? "text-white" : "text-[#262626]")}>
            <IgActionIcon kind="like" />
            <IgActionIcon kind="comment" />
            <IgActionIcon kind="share" />
            <span className="ms-auto">
              <IgActionIcon kind="save" />
            </span>
          </div>
          <p className="text-[12px] font-semibold">
            {product.likes} {locale === "fa" ? "لایک" : "likes"}
          </p>
          <p className="text-[12px] leading-5">
            <span className="font-semibold">{brand.username}</span> {product.title}.{" "}
            <span className={dark ? "text-[#a8a8a8]" : "text-[#737373]"}>
              {product.description}
            </span>
          </p>
          <p className="text-[12px] font-semibold text-[#0095f6]">
            {locale === "fa" ? "مشاهده محصول در سایت" : "View product on website"} · {product.price}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WebsiteProductPopup({
  brand,
  product,
  locale,
  theme: t,
  onClose,
}: {
  brand: DemoBrand;
  product: Product;
  locale: Locale;
  theme: SiteTheme;
  onClose: () => void;
}) {
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]?.hex);
  const [qty, setQty] = useState(1);

  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 48, opacity: 0.85, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 28, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="max-h-[94%] w-full overflow-y-auto rounded-t-2xl shadow-2xl sm:max-w-[420px] sm:rounded-2xl"
        style={{ background: t.card, color: t.fg, border: `1px solid ${t.border}` }}
        onClick={(event) => event.stopPropagation()}
        dir={locale === "fa" ? "rtl" : "ltr"}
      >
        <div className="relative aspect-[5/4]">
          <Image src={product.image} alt="" fill className="object-cover" sizes="420px" />
          <button
            type="button"
            onClick={onClose}
            className="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
            aria-label="Close"
          >
            <X size={15} />
          </button>
          {product.badge ? (
            <span
              className="absolute start-3 top-3 rounded-md px-2 py-1 text-[10px] font-semibold"
              style={{ background: t.accent, color: t.accentFg }}
            >
              {product.badge}
            </span>
          ) : null}
        </div>

        <div className="space-y-4 p-4 md:p-5">
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase" style={{ color: t.muted }}>
              {brand.name}
            </p>
            <h4 className="mt-1 font-display text-xl leading-tight">{product.title}</h4>
            <p className="mt-2 text-[15px] font-semibold tabular-nums">{product.price}</p>
            <p className="mt-2 text-[12px] leading-5" style={{ color: t.muted }}>
              {product.description}
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium" style={{ color: t.muted }}>
              {locale === "fa" ? "رنگ" : "Color"}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((item) => (
                <button
                  key={item.hex}
                  type="button"
                  onClick={() => setColor(item.hex)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] ring-1",
                    color === item.hex ? "ring-current" : "ring-transparent",
                  )}
                  style={{ background: t.surface }}
                >
                  <span className="size-3.5 rounded-full" style={{ background: item.hex }} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium" style={{ color: t.muted }}>
              {locale === "fa" ? "سایز / گزینه" : "Size / option"}
            </p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSize(item)}
                  className="min-w-10 rounded-md px-3 py-2 text-[11px] font-medium"
                  style={{
                    background: size === item ? t.accent : t.surface,
                    color: size === item ? t.accentFg : t.fg,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center overflow-hidden rounded-md" style={{ background: t.surface }}>
              <button
                type="button"
                className="px-3 py-2 text-sm"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="min-w-8 text-center text-[12px] tabular-nums">{qty}</span>
              <button
                type="button"
                className="px-3 py-2 text-sm"
                onClick={() => setQty((q) => Math.min(9, q + 1))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="flex-1 rounded-md px-4 py-2.5 text-[12px] font-semibold"
              style={{ background: t.accent, color: t.accentFg }}
            >
              {locale === "fa" ? "افزودن به سبد" : "Add to cart"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function IgActionIcon({ kind }: { kind: "like" | "comment" | "share" | "save" }) {
  if (kind === "like") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20s-7-4.4-9.2-8.2C1.2 9.1 2.6 6 5.6 6c1.7 0 3.1 1 3.9 2.2C10.3 7 11.7 6 13.4 6c3 0 4.4 3.1 2.8 5.8C19 15.6 12 20 12 20z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "comment") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 18.5 4 21V7.8A3.8 3.8 0 0 1 7.8 4h8.4A3.8 3.8 0 0 1 20 7.8v6.4A3.8 3.8 0 0 1 16.2 18H7z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "share") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="m21 3-9.5 18-1.6-7.9L21 3z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="m9.9 13.1 11-10" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.5L6 21V5a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
