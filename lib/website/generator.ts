import type { Product, WebsiteAIAnalysis } from "@/types/ai";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteConfig } from "@/types/website";
import { templates } from "@/lib/website/templates";
import { slugify } from "@/lib/utils";
import { polishWebsiteConfig } from "@/lib/website/polish";

function cleanCaptionLine(caption: string | null) {
  if (!caption?.trim()) return null;
  const first = caption
    .split(/[\n.!?]/)
    .map((part) =>
      part
        .replace(/#[\w\u0600-\u06FF]+/g, " ")
        .replace(/@[\w.]+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .find((part) => part.length > 2);
  return first ?? null;
}

function titleFromCaption(caption: string | null, fallback: string) {
  const first = cleanCaptionLine(caption);
  if (!first) return fallback;
  return first.length > 36 ? `${first.slice(0, 36).trim()}…` : first;
}

function pieceLabel(locale: "fa" | "en", index: number) {
  const n = String(index + 1).padStart(2, "0");
  return locale === "fa" ? `قطعه ${n}` : `Piece ${n}`;
}

/** Always build a products block — from AI, or from Instagram posts as fallback. */
function buildProducts(input: {
  imported: InstagramImport;
  analysis: WebsiteAIAnalysis;
  locale: "fa" | "en";
  mediaIds: string[];
}): WebsiteConfig["content"]["products"] {
  const title = input.locale === "fa" ? "محصولات" : "Products";
  const media = new Set(input.mediaIds);
  const junkCategories = new Set(["image", "video", "reel", "sidecar", "carousel"]);

  if (input.analysis.products.length > 0) {
    return {
      title,
      items: input.analysis.products.map((product, index) => {
        const validIds = product.imageIds.filter((id) => media.has(id));
        const fallback = input.mediaIds[index % Math.max(input.mediaIds.length, 1)];
        const category =
          product.category && !junkCategories.has(product.category.toLowerCase())
            ? product.category
            : "";
        return {
          ...product,
          name: product.name?.trim() || pieceLabel(input.locale, index),
          category,
          imageIds: validIds.length > 0 ? validIds : fallback ? [fallback] : [],
        } satisfies Product;
      }),
    };
  }

  const posts = [...input.imported.posts, ...input.imported.reels]
    .filter((post) => media.has(post.id))
    .slice(0, 8);

  if (posts.length === 0) return undefined;

  return {
    title,
    items: posts.map((post, index) => {
      const line = cleanCaptionLine(post.caption);
      return {
        name: titleFromCaption(post.caption, pieceLabel(input.locale, index)),
        description: line && line.length <= 72 ? line : "",
        category: "",
        price: null,
        currency: null,
        imageIds: [post.id],
        confidence: 0.6,
      };
    }),
  };
}

export function generateWebsiteConfig(input: {
  imported: InstagramImport;
  analysis: WebsiteAIAnalysis;
  locale: "fa" | "en";
}): WebsiteConfig {
  const template = templates[input.analysis.template] ?? templates.store;
  const isStore = template.id === "store";
  const colors = {
    primary: input.analysis.suggestedColors[0] ?? "#141414",
    secondary: input.analysis.suggestedColors[1] ?? "#FFFFFF",
    accent: input.analysis.suggestedColors[2] ?? (isStore ? "#3F4A3C" : "#0F766E"),
    background: input.analysis.suggestedColors[1] ?? (isStore ? "#F8F7F5" : "#FAFAF8"),
    foreground: input.analysis.suggestedColors[0] ?? "#141414",
    muted: isStore ? "#EAE8E4" : "#E7E5E4",
  };

  const media: WebsiteConfig["media"] = {};
  const profileImage =
    input.imported.profile.profilePicUrlHD ?? input.imported.profile.profilePicUrl;
  if (profileImage) {
    media.logo = {
      url: profileImage,
      alt: input.analysis.businessName,
      type: "image",
    };
  }

  for (const post of [...input.imported.posts, ...input.imported.reels]) {
    const url = post.displayUrl ?? post.images[0];
    if (!url && !post.videoUrl) continue;
    const isVideo =
      post.type === "video" || post.type === "reel" || Boolean(post.videoUrl);
    media[post.id] = {
      url: url ?? post.videoUrl!,
      videoUrl: post.videoUrl,
      alt: post.alt ?? post.caption ?? input.analysis.businessName,
      type: isVideo ? "video" : "image",
    };
  }

  const galleryIds = Object.keys(media).filter((id) => id !== "logo").slice(0, 12);
  const products = buildProducts({
    imported: input.imported,
    analysis: input.analysis,
    locale: input.locale,
    mediaIds: galleryIds,
  });

  // Prefer a strong image hero (not video) for store fronts.
  const heroImageId =
    galleryIds.find((id) => media[id]?.type === "image") ?? galleryIds[0];

  let sectionTypes = [...template.sections];
  if (products?.items.length && !sectionTypes.includes("products")) {
    const heroIdx = sectionTypes.indexOf("hero");
    sectionTypes.splice(heroIdx + 1, 0, "products");
  }

  const sections = sectionTypes.map((type) => ({
    id: type,
    type,
    visible: true,
  }));

  const productImageIds = new Set(
    (products?.items ?? []).flatMap((item) => item.imageIds.slice(0, 1)),
  );
  const lookbookIds = [
    ...galleryIds.filter((id) => !productImageIds.has(id)),
    ...galleryIds.filter((id) => productImageIds.has(id)),
  ].slice(0, isStore ? 8 : 12);

  const config: WebsiteConfig = {
    template: template.id,
    brand: {
      name: input.analysis.businessName,
      logo: profileImage ?? undefined,
      tagline: input.analysis.summary,
      colors,
      typography: template.typography,
    },
    content: {
      hero: {
        style: template.heroStyle,
        headline: input.analysis.heroCopy.headline,
        subheadline: input.analysis.heroCopy.subheadline,
        cta: input.analysis.suggestedCTA,
        imageId: heroImageId,
      },
      about: {
        title: input.locale === "fa" ? "داستان برند" : "Our story",
        body: input.analysis.aboutCopy,
        imageId: galleryIds[1] ?? galleryIds[0],
      },
      products: products
        ? {
            ...products,
            title:
              input.locale === "fa"
                ? isStore
                  ? "مجموعه"
                  : "محصولات"
                : isStore
                  ? "Collection"
                  : "Products",
          }
        : undefined,
      services:
        input.analysis.services.length > 0
          ? {
              title: input.locale === "fa" ? "خدمات" : "Services",
              items: input.analysis.services,
            }
          : undefined,
      gallery: {
        title: input.locale === "fa" ? (isStore ? "لوک‌بوک" : "گالری") : isStore ? "Lookbook" : "Gallery",
        imageIds: lookbookIds,
      },
      faq: {
        title: input.locale === "fa" ? "پرسش‌ها" : "FAQ",
        items:
          input.locale === "fa"
            ? isStore
              ? [
                  {
                    question: "چطور سفارش ثبت کنم؟",
                    answer:
                      "محصول را انتخاب کنید و از دایرکت اینستاگرام یا فرم تماس سفارش بدهید. جزئیات سایز و رنگ را همان‌جا هماهنگ می‌کنیم.",
                  },
                  {
                    question: "ارسال و مرجوعی چگونه است؟",
                    answer:
                      "ارسال به سراسر کشور انجام می‌شود. شرایط مرجوعی را هنگام تأیید سفارش اعلام می‌کنیم.",
                  },
                  {
                    question: "موجودی به‌روز است؟",
                    answer:
                      "مجموعه از روی آخرین پست‌های پیج ساخته شده؛ برای موجودی لحظه‌ای پیام بگذارید.",
                  },
                ]
              : [
                  {
                    question: "چطور سفارش بدهم؟",
                    answer: "از فرم تماس یا دایرکت اینستاگرام پیام بگذارید.",
                  },
                  {
                    question: "ارسال دارید؟",
                    answer: "بله، جزئیات ارسال را در پیام تأیید سفارش می‌گوییم.",
                  },
                ]
            : isStore
              ? [
                  {
                    question: "How do I order?",
                    answer:
                      "Pick a piece and message us on Instagram or via the contact form. We’ll confirm size, color, and shipping.",
                  },
                  {
                    question: "Shipping & returns?",
                    answer:
                      "We ship nationwide. Return details are shared when your order is confirmed.",
                  },
                  {
                    question: "Is stock up to date?",
                    answer:
                      "The collection mirrors your latest posts — message us for live availability.",
                  },
                ]
              : [
                  {
                    question: "How do I order?",
                    answer: "Send a message through the contact form or Instagram.",
                  },
                  {
                    question: "Do you deliver?",
                    answer: "Yes. Delivery details are confirmed after your request.",
                  },
                ],
      },
      contact: {
        title: input.locale === "fa" ? (isStore ? "سفارش و ارتباط" : "ارتباط") : isStore ? "Order & contact" : "Contact",
        body:
          input.locale === "fa"
            ? isStore
              ? "برای سفارش، سایز و موجودی پیام بگذارید — پاسخ سریع از دایرکت یا واتساپ."
              : "برای سفارش و همکاری پیام بگذارید."
            : isStore
              ? "Message for orders, sizing, and availability — we reply on Instagram or WhatsApp."
              : "Get in touch for orders and collaborations.",
        info: input.analysis.contactInfo,
      },
    },
    sections,
    seo: input.analysis.seo,
    settings: {
      language: input.locale,
      direction: input.locale === "fa" ? "rtl" : "ltr",
      showBranding: true,
      published: false,
    },
    media,
  };

  return polishWebsiteConfig(config);
}

export function websiteSlug(name: string, username: string) {
  return slugify(username || name) || "site";
}

export { allocateUniqueSlug } from "./slug";
