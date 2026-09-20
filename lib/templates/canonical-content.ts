/**
 * Phase 3.1 — canonical starter content for full-site templates.
 * Populates WebsiteConfig.content collections with stable IDs (never array index).
 */

import type {
  CategoriesConfig,
  FAQConfig,
  GalleryConfig,
  LocationConfig,
  LookbookConfig,
  MenuConfig,
  PortfolioConfig,
  PricingConfig,
  ProductSectionConfig,
  PropertiesConfig,
  ServiceSectionConfig,
  ShopTheLookConfig,
  TestimonialConfig,
  WebsiteConfig,
  WebsiteContent,
} from "@/types/website";
import type { WebsiteTemplate } from "@/lib/templates/types";

export type TemplateMediaBag = WebsiteConfig["media"];

/** Neutral placeholder media — not copyrighted commercial photography. */
export function buildTemplateMedia(
  templateId: string,
): TemplateMediaBag {
  const seed = (key: string) =>
    `https://picsum.photos/seed/vitrin-${templateId}-${key}/1200/900`;
  const entries: TemplateMediaBag = {};
  for (const key of [
    "hero",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
  ] as const) {
    const id = `media-${templateId}-${key}`;
    entries[id] = {
      url: seed(key),
      alt: `${templateId} ${key}`,
      type: "image",
    };
  }
  return entries;
}

function mid(templateId: string, key: string) {
  return `media-${templateId}-${key}`;
}

function product(
  id: string,
  name: string,
  description: string,
  category: string,
  imageId: string,
  price: number | null = 120,
): ProductSectionConfig["items"][number] {
  return {
    id,
    slug: id,
    name,
    description,
    category,
    price,
    currency: "USD",
    imageIds: [imageId],
    confidence: 1,
  };
}

function service(
  id: string,
  name: string,
  description: string,
  imageId?: string,
): ServiceSectionConfig["items"][number] {
  return {
    id,
    name,
    description,
    imageIds: imageId ? [imageId] : [],
    confidence: 1,
  };
}

/** Build full canonical content for a template (merged onto hero/about/promo/contact). */
export function buildCanonicalTemplateContent(
  template: WebsiteTemplate,
  locale: "fa" | "en",
  brandName: string,
  base: WebsiteContent,
): { content: WebsiteContent; media: TemplateMediaBag } {
  const media = buildTemplateMedia(template.id);
  const tid = template.id;
  const content: WebsiteContent = { ...base };

  // Shared gallery + testimonials where useful
  content.gallery = galleryPreset(tid, locale);
  content.testimonials = testimonialsPreset(tid, locale);
  content.hero = {
    ...content.hero,
    imageId: content.hero.imageId || mid(tid, "hero"),
  };
  if (content.about) {
    content.about = {
      ...content.about,
      imageId: content.about.imageId || mid(tid, "a"),
    };
  }

  switch (template.id) {
    case "fashion-luxury":
      content.products = fashionProducts(tid, locale);
      content.lookbook = fashionLookbook(tid, locale);
      content.shopTheLook = fashionShopTheLook(tid, locale);
      content.categories = fashionCategories(tid, locale);
      break;
    case "restaurant-editorial":
      content.menu = restaurantMenu(tid, locale);
      content.products = menuAsProducts(content.menu);
      content.location = restaurantLocation(tid, locale, brandName);
      content.contact = {
        ...content.contact!,
        info: {
          ...content.contact!.info,
          address: content.location.address ?? null,
          phone: content.location.phone ?? null,
          location: content.location.city ?? null,
        },
      };
      break;
    case "saas-modern":
      content.services = saasFeatures(tid, locale);
      content.pricing = saasPricing(tid, locale);
      content.faq = saasFaq(tid, locale);
      break;
    case "beauty-premium":
      content.services = beautyServices(tid, locale);
      content.products = beautyProducts(tid, locale);
      content.faq = beautyFaq(tid, locale);
      break;
    case "agency-creative":
      content.services = agencyServices(tid, locale);
      content.portfolio = agencyPortfolio(tid, locale);
      break;
    case "portfolio-creator":
      content.portfolio = creatorPortfolio(tid, locale);
      content.services = creatorServices(tid, locale);
      break;
    case "real-estate":
      content.properties = realEstateProperties(tid, locale);
      content.products = propertiesAsProducts(content.properties);
      break;
    case "coffee-modern":
      content.menu = coffeeMenu(tid, locale);
      content.products = menuAsProducts(content.menu);
      content.location = coffeeLocation(tid, locale, brandName);
      break;
    default:
      break;
  }

  void locale;
  return { content, media };
}

function galleryPreset(tid: string, locale: "fa" | "en"): GalleryConfig {
  return {
    title: locale === "fa" ? "گالری" : "Gallery",
    imageIds: [mid(tid, "b"), mid(tid, "c"), mid(tid, "d"), mid(tid, "e")],
  };
}

function testimonialsPreset(
  tid: string,
  locale: "fa" | "en",
): TestimonialConfig {
  void tid;
  return {
    title: locale === "fa" ? "نظرات" : "Testimonials",
    items: [
      {
        id: "t-1",
        quote:
          locale === "fa"
            ? "تجربه‌ای دقیق و حرفه‌ای."
            : "A precise, professional experience.",
        author: locale === "fa" ? "مینا" : "Mina",
      },
      {
        id: "t-2",
        quote:
          locale === "fa"
            ? "جزئیات و کیفیت عالی بود."
            : "Details and quality were excellent.",
        author: locale === "fa" ? "آرمین" : "Armin",
      },
    ],
  };
}

function fashionProducts(tid: string, locale: "fa" | "en"): ProductSectionConfig {
  return {
    title: locale === "fa" ? "قطعات منتخب" : "Selected pieces",
    items: [
      product("prod-coat", locale === "fa" ? "کُت پشمی" : "Wool coat", "Soft structure, quiet luxury.", "Outerwear", mid(tid, "a"), 280),
      product("prod-dress", locale === "fa" ? "پیراهن ابریشمی" : "Silk dress", "Fluid evening silhouette.", "Dresses", mid(tid, "b"), 220),
      product("prod-trouser", locale === "fa" ? "شلوار تیلور" : "Tailored trouser", "Clean line, easy move.", "Bottoms", mid(tid, "c"), 160),
      product("prod-bag", locale === "fa" ? "کیف چرمی" : "Leather tote", "Everyday capacity.", "Accessories", mid(tid, "d"), 190),
    ],
  };
}

function fashionLookbook(tid: string, locale: "fa" | "en"): LookbookConfig {
  return {
    title: locale === "fa" ? "لوک‌بوک" : "Lookbook",
    description:
      locale === "fa"
        ? "استایل فصل بدون شلوغی."
        : "Season looks without the noise.",
    items: [
      { id: "lb-1", imageId: mid(tid, "a"), caption: "Look 01", href: "/shop" },
      { id: "lb-2", imageId: mid(tid, "b"), caption: "Look 02", href: "/shop" },
      { id: "lb-3", imageId: mid(tid, "c"), caption: "Look 03", href: "/shop" },
      { id: "lb-4", imageId: mid(tid, "d"), caption: "Look 04", href: "/shop" },
    ],
  };
}

function fashionShopTheLook(
  tid: string,
  locale: "fa" | "en",
): ShopTheLookConfig {
  return {
    title: locale === "fa" ? "خرید این لوک" : "Shop the look",
    description:
      locale === "fa"
        ? "قطعات هماهنگ از همین فصل."
        : "Curated pieces from this season.",
    items: [
      {
        id: "stl-1",
        title: locale === "fa" ? "لوک روز" : "Day look",
        imageId: mid(tid, "e"),
        productIds: ["prod-coat", "prod-trouser"],
        href: "/shop",
      },
      {
        id: "stl-2",
        title: locale === "fa" ? "لوک عصر" : "Evening look",
        imageId: mid(tid, "f"),
        productIds: ["prod-dress", "prod-bag"],
        href: "/shop",
      },
    ],
  };
}

function fashionCategories(
  tid: string,
  locale: "fa" | "en",
): CategoriesConfig {
  return {
    title: locale === "fa" ? "دسته‌ها" : "Shop by category",
    items: [
      { id: "cat-outerwear", title: locale === "fa" ? "اُوترویر" : "Outerwear", slug: "outerwear", imageId: mid(tid, "a"), href: "/shop" },
      { id: "cat-dresses", title: locale === "fa" ? "پیراهن" : "Dresses", slug: "dresses", imageId: mid(tid, "b"), href: "/shop" },
      { id: "cat-bottoms", title: locale === "fa" ? "شلوار" : "Bottoms", slug: "bottoms", imageId: mid(tid, "c"), href: "/shop" },
      { id: "cat-accessories", title: locale === "fa" ? "اکسسوری" : "Accessories", slug: "accessories", imageId: mid(tid, "d"), href: "/shop" },
    ],
  };
}

function restaurantMenu(tid: string, locale: "fa" | "en"): MenuConfig {
  void tid;
  return {
    title: locale === "fa" ? "منو" : "Menu",
    description:
      locale === "fa"
        ? "فصلی، کوتاه، شفاف."
        : "Seasonal, short, and clear.",
    categories: [
      { id: "menu-starters", title: locale === "fa" ? "پیش‌غذا" : "Starters" },
      { id: "menu-mains", title: locale === "fa" ? "غذای اصلی" : "Mains" },
      { id: "menu-desserts", title: locale === "fa" ? "دسر" : "Desserts" },
    ],
    items: [
      { id: "mi-1", categoryId: "menu-starters", title: locale === "fa" ? "سالاد فصل" : "Season salad", description: "Herbs, citrus, olive oil.", price: "18", imageId: mid(tid, "b") },
      { id: "mi-2", categoryId: "menu-mains", title: locale === "fa" ? "ماهی روز" : "Catch of the day", description: "Market fish, lemon butter.", price: "42", imageId: mid(tid, "c") },
      { id: "mi-3", categoryId: "menu-mains", title: locale === "fa" ? "پاستای خانگی" : "House pasta", description: "Slow sauce, fresh herbs.", price: "28", imageId: mid(tid, "d") },
      { id: "mi-4", categoryId: "menu-desserts", title: locale === "fa" ? "دسر شکلاتی" : "Chocolate dessert", description: "Bitter chocolate, cream.", price: "14", imageId: mid(tid, "e") },
    ],
  };
}

function restaurantLocation(
  tid: string,
  locale: "fa" | "en",
  _brandName: string,
): LocationConfig {
  void tid;
  void _brandName;
  return {
    title: locale === "fa" ? "رزرو و مکان" : "Reservations & location",
    address: "12 Market Street",
    city: locale === "fa" ? "تهران" : "City Center",
    hours: locale === "fa" ? "۱۸:۰۰ – ۲۳:۰۰" : "6:00pm – 11:00pm",
    phone: "+1 555 0100",
    mapUrl: "https://maps.google.com/?q=Market+Street",
    ctaLabel: locale === "fa" ? "رزرو میز" : "Reserve a table",
    ctaHref: "/reservations",
  };
}

function saasFeatures(tid: string, locale: "fa" | "en"): ServiceSectionConfig {
  return {
    title: locale === "fa" ? "قابلیت‌ها" : "Features",
    items: [
      service("feat-1", locale === "fa" ? "اتوماسیون" : "Automation", "Route work without busywork.", mid(tid, "b")),
      service("feat-2", locale === "fa" ? "همکاری" : "Collaboration", "Shared context for every team.", mid(tid, "c")),
      service("feat-3", locale === "fa" ? "گزارش‌ها" : "Insights", "Clear metrics, less noise.", mid(tid, "d")),
    ],
  };
}

function saasPricing(tid: string, locale: "fa" | "en"): PricingConfig {
  void tid;
  return {
    title: locale === "fa" ? "قیمت‌گذاری" : "Pricing",
    description:
      locale === "fa"
        ? "ساده شروع کنید، وقتی آماده شدید رشد کنید."
        : "Start simple. Scale when you're ready.",
    plans: [
      {
        id: "plan-starter",
        name: "Starter",
        description: locale === "fa" ? "برای تیم‌های کوچک" : "For small teams",
        price: "0",
        period: locale === "fa" ? "ماهانه" : "mo",
        features: ["3 seats", "Core workflows", "Email support"],
        ctaLabel: locale === "fa" ? "شروع رایگان" : "Start free",
        ctaHref: "/contact",
      },
      {
        id: "plan-pro",
        name: "Pro",
        description: locale === "fa" ? "برای رشد" : "For growing teams",
        price: "29",
        period: locale === "fa" ? "ماهانه" : "mo",
        features: ["Unlimited seats", "Advanced automation", "Priority support"],
        highlighted: true,
        ctaLabel: locale === "fa" ? "شروع پرو" : "Go Pro",
        ctaHref: "/contact",
      },
      {
        id: "plan-enterprise",
        name: "Enterprise",
        description: locale === "fa" ? "برای سازمان‌ها" : "For organizations",
        price: "Custom",
        features: ["SSO", "Dedicated success", "Custom limits"],
        ctaLabel: locale === "fa" ? "تماس با فروش" : "Talk to sales",
        ctaHref: "/contact",
      },
    ],
  };
}

function saasFaq(tid: string, locale: "fa" | "en"): FAQConfig {
  void tid;
  return {
    title: "FAQ",
    items: [
      {
        id: "faq-1",
        question: locale === "fa" ? "آزمایشی دارید؟" : "Is there a free trial?",
        answer:
          locale === "fa"
            ? "بله — پلن Starter رایگان است."
            : "Yes — the Starter plan is free forever.",
      },
      {
        id: "faq-2",
        question: locale === "fa" ? "می‌توانم ارتقا دهم؟" : "Can I upgrade later?",
        answer:
          locale === "fa"
            ? "هر زمان بدون از دست دادن داده."
            : "Anytime, without losing data.",
      },
    ],
  };
}

function beautyServices(tid: string, locale: "fa" | "en"): ServiceSectionConfig {
  return {
    title: locale === "fa" ? "خدمات" : "Services",
    items: [
      service("svc-facial", locale === "fa" ? "فیشیال" : "Facial", "Calm, skin-first ritual.", mid(tid, "b")),
      service("svc-color", locale === "fa" ? "رنگ" : "Color", "Soft dimension, lasting finish.", mid(tid, "c")),
      service("svc-care", locale === "fa" ? "مراقبت" : "Care", "At-home guidance.", mid(tid, "d")),
    ],
  };
}

function beautyProducts(tid: string, locale: "fa" | "en"): ProductSectionConfig {
  return {
    title: locale === "fa" ? "محصولات" : "Care collection",
    items: [
      product("bp-1", locale === "fa" ? "سرم" : "Serum", "Daily glow.", "Skincare", mid(tid, "e"), 48),
      product("bp-2", locale === "fa" ? "بالم" : "Balm", "Quiet moisture.", "Skincare", mid(tid, "f"), 32),
      product("bp-3", locale === "fa" ? "اسپری" : "Mist", "Refresh between appointments.", "Skincare", mid(tid, "g"), 24),
    ],
  };
}

function beautyFaq(tid: string, locale: "fa" | "en"): FAQConfig {
  void tid;
  return {
    title: locale === "fa" ? "قبل از مراجعه" : "Before you visit",
    items: [
      {
        id: "bf-1",
        question: locale === "fa" ? "رزرو چطور است؟" : "How do I book?",
        answer:
          locale === "fa"
            ? "از صفحه تماس زمان بخواهید."
            : "Request a time from the contact page.",
      },
    ],
  };
}

function agencyServices(tid: string, locale: "fa" | "en"): ServiceSectionConfig {
  return {
    title: locale === "fa" ? "خدمات" : "Services",
    items: [
      service("as-1", locale === "fa" ? "برندینگ" : "Branding", "Identity systems that hold.", mid(tid, "b")),
      service("as-2", locale === "fa" ? "محصول دیجیتال" : "Product design", "Interfaces with intent.", mid(tid, "c")),
      service("as-3", locale === "fa" ? "کمپین" : "Campaigns", "Launch moments that land.", mid(tid, "d")),
    ],
  };
}

function agencyPortfolio(tid: string, locale: "fa" | "en"): PortfolioConfig {
  return {
    title: locale === "fa" ? "نمونه کار" : "Selected work",
    description:
      locale === "fa"
        ? "پروژه‌های اخیر آژانس."
        : "Recent studio projects.",
    items: [
      { id: "work-1", title: "Northline", description: "Brand system", tag: "Brand", imageId: mid(tid, "b"), href: "/work" },
      { id: "work-2", title: "Pulse", description: "Product UI", tag: "Product", imageId: mid(tid, "c"), href: "/work" },
      { id: "work-3", title: "Harbor", description: "Campaign", tag: "Campaign", imageId: mid(tid, "d"), href: "/work" },
    ],
  };
}

function creatorPortfolio(tid: string, locale: "fa" | "en"): PortfolioConfig {
  return {
    title: locale === "fa" ? "کارها" : "Work",
    items: [
      { id: "pf-1", title: "Editorial series", tag: "Photo", imageId: mid(tid, "b") },
      { id: "pf-2", title: "Brand film", tag: "Motion", imageId: mid(tid, "c") },
      { id: "pf-3", title: "Studio stills", tag: "Photo", imageId: mid(tid, "d") },
      { id: "pf-4", title: "Campaign cut", tag: "Edit", imageId: mid(tid, "e") },
    ],
  };
}

function creatorServices(tid: string, locale: "fa" | "en"): ServiceSectionConfig {
  return {
    title: locale === "fa" ? "همکاری" : "Collaborations",
    items: [
      service("cs-1", locale === "fa" ? "عکاسی" : "Photography", "Still and editorial.", mid(tid, "f")),
      service("cs-2", locale === "fa" ? "تولید" : "Production", "Directed shoots.", mid(tid, "g")),
    ],
  };
}

function realEstateProperties(
  tid: string,
  locale: "fa" | "en",
): PropertiesConfig {
  return {
    title: locale === "fa" ? "املاک" : "Properties",
    description:
      locale === "fa"
        ? "خانه‌ها و فضاهای منتخب."
        : "Selected homes and spaces.",
    items: [
      { id: "prop-1", title: "Harbor Loft", location: "Waterfront", price: "$820,000", description: "Light-filled open plan.", imageId: mid(tid, "b"), href: "/properties" },
      { id: "prop-2", title: "Garden Villa", location: "Hills", price: "$1.2M", description: "Private courtyard.", imageId: mid(tid, "c"), href: "/properties" },
      { id: "prop-3", title: "City Flat", location: "Downtown", price: "$540,000", description: "Walkable core.", imageId: mid(tid, "d"), href: "/properties" },
    ],
  };
}

function coffeeMenu(tid: string, locale: "fa" | "en"): MenuConfig {
  return {
    title: locale === "fa" ? "منو" : "Menu",
    categories: [
      { id: "drink", title: locale === "fa" ? "نوشیدنی" : "Drinks" },
      { id: "food", title: locale === "fa" ? "غذا" : "Food" },
    ],
    items: [
      { id: "cm-1", categoryId: "drink", title: "Espresso", price: "4", imageId: mid(tid, "b") },
      { id: "cm-2", categoryId: "drink", title: "Flat white", price: "5", imageId: mid(tid, "c") },
      { id: "cm-3", categoryId: "food", title: locale === "fa" ? "کرواسان" : "Croissant", price: "4.5", imageId: mid(tid, "d") },
      { id: "cm-4", categoryId: "food", title: locale === "fa" ? "ساندویچ" : "Sandwich", price: "9", imageId: mid(tid, "e") },
    ],
  };
}

function coffeeLocation(
  tid: string,
  locale: "fa" | "en",
  brandName: string,
): LocationConfig {
  void tid;
  void brandName;
  return {
    title: locale === "fa" ? "مکان" : "Location",
    address: "88 Bean Lane",
    city: locale === "fa" ? "تهران" : "Downtown",
    hours: locale === "fa" ? "۰۸:۰۰ – ۲۰:۰۰" : "8:00am – 8:00pm",
    phone: "+1 555 0200",
    mapUrl: "https://maps.google.com/?q=Bean+Lane",
    ctaLabel: locale === "fa" ? "مسیریابی" : "Get directions",
    ctaHref: "https://maps.google.com/?q=Bean+Lane",
  };
}

function menuAsProducts(menu: MenuConfig): ProductSectionConfig {
  return {
    title: menu.title,
    items: menu.items.map((item) =>
      product(
        item.id,
        item.title,
        item.description || "",
        menu.categories.find((c) => c.id === item.categoryId)?.title || "Menu",
        item.imageId || "",
        item.price ? Number.parseFloat(item.price) || null : null,
      ),
    ),
  };
}

function propertiesAsProducts(
  properties: PropertiesConfig,
): ProductSectionConfig {
  return {
    title: properties.title,
    items: properties.items.map((p) =>
      product(
        p.id,
        p.title,
        p.description || p.location || "",
        "Property",
        p.imageId || "",
        null,
      ),
    ),
  };
}

/** Sanitize map/external URLs — https only, no javascript: or raw HTML. */
export function sanitizeExternalUrl(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
