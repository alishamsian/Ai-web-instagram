import type { Product } from "@/types/ai";
import type { WebsiteConfig } from "@/types/website";
import { slugify } from "@/lib/utils";

export type CatalogProduct = Product & { id: string; slug: string };

export function productSlug(name: string, index: number, id?: string) {
  const base = slugify(name) || slugify(id ?? "") || `piece-${index + 1}`;
  return `${base}-${index + 1}`;
}

export function ensureCatalogProduct(
  item: Product,
  index: number,
  locale: "fa" | "en",
): CatalogProduct {
  const id = item.id?.trim() || `product-${index + 1}`;
  const slug = item.slug?.trim() || productSlug(item.name, index, id);
  const fallbackName =
    locale === "fa"
      ? `محصول ${String(index + 1).padStart(2, "0")}`
      : `Product ${String(index + 1).padStart(2, "0")}`;
  const rawName = item.name?.trim() || "";
  const name =
    rawName && !/^قطعه\s*\d+/i.test(rawName) && !/^piece\s*\d+/i.test(rawName)
      ? rawName
      : fallbackName;

  return {
    ...item,
    id,
    slug,
    name,
    description:
      item.description?.trim() ||
      (locale === "fa"
        ? "برای جزئیات، سایز و موجودی پیام بدهید."
        : "Message us for details, size, and stock."),
  };
}

/**
 * Normalize catalog items. Does not invent duplicate products —
 * thin catalogs stay thin so the storefront stays honest.
 */
export function expandStoreCatalog(
  items: Product[],
  locale: "fa" | "en",
  _target?: number,
): CatalogProduct[] {
  if (!items.length) return [];
  return items.map((item, index) => ensureCatalogProduct(item, index, locale));
}

export function findCatalogProduct(
  config: WebsiteConfig,
  productSlugParam: string,
): CatalogProduct | undefined {
  const items = config.content.products?.items ?? [];
  const locale = config.settings.language;
  const catalog = items.map((item, index) =>
    ensureCatalogProduct(item, index, locale),
  );

  return catalog.find(
    (item) => item.slug === productSlugParam || item.id === productSlugParam,
  );
}

export function productHref(basePath: string, slug: string) {
  const root = basePath.replace(/\/$/, "");
  return `${root}/p/${slug}`;
}

export function buildOrderMessage(
  config: WebsiteConfig,
  lines: { name: string; qty: number }[],
) {
  const isFa = config.settings.language === "fa";
  if (!lines.length) {
    return isFa ? "سلام، می‌خواستم سفارش بدم." : "Hi — I'd like to place an order.";
  }
  if (lines.length === 1 && lines[0].qty === 1) {
    return isFa
      ? `سلام، درباره «${lines[0].name}» می‌خواستم سفارش بدم.`
      : `Hi — I'd like to order “${lines[0].name}”.`;
  }
  const body = lines
    .map((line) =>
      isFa
        ? `• ${line.name} × ${line.qty}`
        : `• ${line.name} × ${line.qty}`,
    )
    .join("\n");
  return isFa
    ? `سلام، این سفارش را می‌خواستم:\n${body}`
    : `Hi — I'd like to order:\n${body}`;
}

/** Prefer channels that can carry the order text (WhatsApp), then phone, then Instagram. */
export function orderHref(
  config: WebsiteConfig,
  productNameOrMessage: string,
  options?: { isFullMessage?: boolean },
) {
  const info = config.content.contact?.info;
  const text = options?.isFullMessage
    ? productNameOrMessage
    : buildOrderMessage(config, [{ name: productNameOrMessage, qty: 1 }]);
  const encoded = encodeURIComponent(text);

  if (info?.whatsapp) {
    return `https://wa.me/${info.whatsapp.replace(/\D/g, "")}?text=${encoded}`;
  }
  if (info?.phone) {
    return `sms:${info.phone}?body=${encoded}`;
  }
  if (info?.instagram) {
    // Instagram web has no official prefilled DM — open profile; message is in clipboard hint via UI.
    return `https://instagram.com/${info.instagram.replace(/^@/, "")}`;
  }
  if (info?.email) {
    const subject =
      config.settings.language === "fa" ? "سفارش از فروشگاه" : "Shop order";
    return `mailto:${info.email}?subject=${encodeURIComponent(subject)}&body=${encoded}`;
  }
  return "#contact";
}

export function cartOrderHref(
  config: WebsiteConfig,
  lines: { name: string; qty: number }[],
) {
  return orderHref(config, buildOrderMessage(config, lines), {
    isFullMessage: true,
  });
}
