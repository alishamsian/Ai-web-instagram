import type { WebsiteConfig } from "@/types/website";
import { ensureCatalogProduct } from "@/lib/website/product";

const JUNK_CATEGORIES = new Set([
  "image",
  "video",
  "reel",
  "sidecar",
  "carousel",
  "general",
]);

function stripNoise(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/#[\w\u0600-\u06FF]+/g, " ")
    .replace(/@[\w.]+/g, " ")
    .replace(/[●•📌🎁❤️🖤👀🥹😍🥰🥲💥❤️‍🔥]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Instagram bios often dump categories into the name: "Brand / a / b / c". */
export function shortBrandName(name: string) {
  const first = name.split(/[/|·•\n]/)[0]?.trim() || name;
  const cleaned = stripNoise(first);
  if (cleaned.length <= 28) return cleaned || name.trim();
  return `${cleaned.slice(0, 28).trim()}…`;
}

export function cleanProductName(name: string, index: number, locale: "fa" | "en") {
  void index;
  void locale;
  const line =
    stripNoise(name)
      .split(/[\n.!?]/)
      .map((part) => part.trim())
      .find((part) => part.length > 2) ?? "";

  // Never invent "Piece N" / "محصول N" — keep cleaned source or empty.
  if (!line) return name.trim();

  const fluff =
    /(روز پسر|کادو|پارتنر|در جریانید|بهترین و مناسب|یونیسکس|هدیه خاص|خوشحالش)/i.test(
      line,
    );
  if (fluff) return name.trim();
  if (line.length > 42) return `${line.slice(0, 42).trim()}…`;

  return line.length > 36 ? `${line.slice(0, 36).trim()}…` : line;
}

export function cleanProductDescription(description: string) {
  const cleaned = stripNoise(description);
  if (!cleaned) return "";
  return cleaned.length > 140 ? `${cleaned.slice(0, 140).trim()}…` : cleaned;
}

function looksLikeGenericStoreColors(colors: WebsiteConfig["brand"]["colors"]) {
  const fg = colors.foreground.toLowerCase();
  const bg = colors.background.toLowerCase();
  const accent = colors.accent.toLowerCase();
  return (
    (fg === "#111111" || fg === "#1c1917") &&
    (bg === "#ffffff" || bg === "#fafafa" || bg === "#f7f3ee") &&
    (accent === "#0f766e" || accent === "#a67c52")
  );
}

/** Prefer a still image for storefront heroes — never a video player. */
export function preferHeroImageId(config: WebsiteConfig) {
  const current = config.content.hero.imageId;
  const currentMedia = current ? config.media[current] : undefined;
  if (currentMedia?.type === "image") return current;

  const imageId = Object.entries(config.media).find(
    ([id, media]) => id !== "logo" && media.type === "image",
  )?.[0];

  return imageId ?? current;
}

/**
 * Soft-upgrade generated storefront configs so the editor preview
 * looks like a real boutique, not a raw Instagram dump.
 * Recipe-driven (P4/P5) configs keep composition and skip fabricated trust/shipping claims.
 */
export function polishWebsiteConfig(config: WebsiteConfig): WebsiteConfig {
  const locale = config.settings.language;
  const isStore = config.template === "store";
  const recipeDriven = Boolean(config.settings.recipeId);
  const brandName = shortBrandName(config.brand.name);
  const heroImageId = preferHeroImageId(config);

  let headline = config.content.hero.headline.trim();
  if (
    !recipeDriven &&
    (headline.includes(config.brand.name) ||
      headline.length > 64 ||
      /حالا با یک سایت/i.test(headline) ||
      /ویترین آنلاین برای هر روز/i.test(headline) ||
      /online boutique for every day/i.test(headline))
  ) {
    headline =
      locale === "fa"
        ? isStore
          ? config.brand.tagline?.trim() ||
            "انتخاب کنید و مستقیم سفارش دهید."
          : "حضور حرفه‌ای، به زبان برند شما."
        : isStore
          ? config.brand.tagline?.trim() ||
            "Browse, pick, and order directly."
          : "A sharper presence for your brand.";
  }

  let subheadline = stripNoise(config.content.hero.subheadline);
  if (!recipeDriven && (!subheadline || subheadline.length < 8)) {
    subheadline =
      locale === "fa"
        ? "انتخاب کنید، صفحه محصول را ببینید، مستقیم سفارش دهید."
        : "Browse pieces, open a product page, order directly.";
  }

  const cleanedItems = (config.content.products?.items ?? []).map((item, index) => ({
    ...item,
    name: cleanProductName(item.name, index, locale),
    description: cleanProductDescription(item.description),
    category: JUNK_CATEGORIES.has((item.category || "").toLowerCase())
      ? ""
      : item.category,
  }));

  const products = config.content.products
    ? {
        ...config.content.products,
        title: recipeDriven
          ? config.content.products.title
          : isStore
            ? locale === "fa"
              ? "فروشگاه"
              : "Shop"
            : config.content.products.title,
        items: cleanedItems.map((item, index) =>
          ensureCatalogProduct(item, index, locale),
        ),
      }
    : undefined;

  const colors =
    isStore && looksLikeGenericStoreColors(config.brand.colors)
      ? {
          primary: "#141414",
          secondary: "#FFFFFF",
          accent: "#2F5D50",
          background: "#F4F4F2",
          foreground: "#141414",
          muted: "#E4E4E0",
        }
      : config.brand.colors;

  return {
    ...config,
    brand: {
      ...config.brand,
      name: brandName,
      tagline:
        stripNoise(config.brand.tagline ?? "").slice(0, 120) || config.brand.tagline,
      colors,
    },
    content: {
      ...config.content,
      hero: {
        ...config.content.hero,
        style: isStore && !recipeDriven ? "fan" : config.content.hero.style,
        imageId: heroImageId ?? config.content.hero.imageId,
        headline,
        subheadline,
        cta: recipeDriven
          ? config.content.hero.cta
          : isStore
            ? locale === "fa"
              ? "ورود به فروشگاه"
              : "Enter the shop"
            : config.content.hero.cta,
      },
      products,
      about: config.content.about
        ? {
            ...config.content.about,
            body: stripNoise(config.content.about.body).slice(0, 420),
          }
        : config.content.about,
      // Do not invent shipping / nationwide claims on recipe-driven configs
      promo: recipeDriven
        ? config.content.promo
        : config.content.promo ??
          (isStore
            ? {
                kicker: locale === "fa" ? "سفارش" : "Order",
                title:
                  locale === "fa"
                    ? "برای سفارش، مستقیم پیام بدهید."
                    : "Message us to place your order.",
                cta: locale === "fa" ? "ارتباط با فروشگاه" : "Contact the shop",
              }
            : undefined),
      trust: recipeDriven
        ? config.content.trust
        : config.content.trust ??
          (isStore
            ? {
                items:
                  locale === "fa"
                    ? ["هماهنگی قبل از خرید", "پاسخ سریع در دایرکت"]
                    : ["Confirm before purchase", "Fast reply on Instagram"],
              }
            : undefined),
    },
  };
}
