import type { Product } from "@/types/ai";

export type StudioProduct = Product & { id?: string; slug?: string };

export type ProductHealth =
  | "ready"
  | "no_price"
  | "no_image"
  | "incomplete"
  | "hidden";

export type CatalogDefaults = {
  category: string;
  currency: string | null;
};

export type DuplicateGroup = {
  indices: number[];
  reason: "name" | "image" | "both";
};

export type PriceHint = {
  price: number;
  currency: string | null;
  source: "caption" | "ai";
};

export function productHealth(product: StudioProduct): ProductHealth {
  if (product.hidden) return "hidden";
  const hasImage = (product.imageIds?.length ?? 0) > 0;
  const hasPrice = product.price != null && !Number.isNaN(product.price);
  const hasName = Boolean(product.name?.trim());
  if (hasImage && hasPrice && hasName) return "ready";
  if (!hasImage && !hasPrice) return "incomplete";
  if (!hasImage) return "no_image";
  if (!hasPrice) return "no_price";
  return "incomplete";
}

export function catalogHealth(products: StudioProduct[]) {
  const visible = products.filter((p) => !p.hidden);
  const noPrice = visible.filter((p) => p.price == null).length;
  const noImage = visible.filter((p) => !(p.imageIds?.length > 0)).length;
  const ready = visible.filter((p) => productHealth(p) === "ready").length;
  const hidden = products.length - visible.length;
  return {
    total: products.length,
    visible: visible.length,
    ready,
    noPrice,
    noImage,
    hidden,
  };
}

export function healthLabel(
  health: ProductHealth,
  locale: "fa" | "en",
): string {
  const map = {
    fa: {
      ready: "آماده فروش",
      no_price: "بدون قیمت",
      no_image: "بدون عکس",
      incomplete: "ناقص",
      hidden: "مخفی",
    },
    en: {
      ready: "Ready",
      no_price: "No price",
      no_image: "No image",
      incomplete: "Incomplete",
      hidden: "Hidden",
    },
  } as const;
  return map[locale][health];
}

export function suggestCategory(name: string, description: string): string | null {
  const text = `${name} ${description}`.toLowerCase();
  const rules: [RegExp, string, string][] = [
    [/dress|لباس|پیراهن|مانتو/, "پوشاک", "Apparel"],
    [/bag|کیف/, "کیف", "Bags"],
    [/shoe|کفش/, "کفش", "Shoes"],
    [/jewel|زیور|گردنبند|گوشواره/, "زیورآلات", "Jewelry"],
    [/skin|cream|مراقبت|کرم/, "زیبایی", "Beauty"],
    [/food|غذا|کیک|نان/, "خوراکی", "Food"],
  ];
  for (const [re, fa] of rules) {
    if (re.test(text)) return fa;
  }
  return null;
}

export function mediaUrl(
  media: Record<string, { url: string; type?: string }>,
  imageId?: string | null,
) {
  if (!imageId) return null;
  return media[imageId]?.url ?? null;
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toAsciiDigits(input: string) {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

function parseLooseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  // 1.200.000 style
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Extract an explicit price from caption/description — never invents. */
export function extractPriceFromText(
  text: string,
  locale: "fa" | "en" = "fa",
): PriceHint | null {
  if (!text?.trim()) return null;
  const t = toAsciiDigits(text);

  const hezar = t.match(
    /(\d+(?:[.,]\d+)?)\s*(?:هزار|هزار\s*تومان|هزارتومان)/i,
  );
  if (hezar?.[1]) {
    const base = parseLooseNumber(hezar[1]);
    if (base != null && base > 0) {
      return { price: Math.round(base * 1000), currency: "IRT", source: "caption" };
    }
  }

  const million = t.match(
    /(\d+(?:[.,]\d+)?)\s*(?:میلیون|میلیون\s*تومان)/i,
  );
  if (million?.[1]) {
    const base = parseLooseNumber(million[1]);
    if (base != null && base > 0) {
      return {
        price: Math.round(base * 1_000_000),
        currency: "IRT",
        source: "caption",
      };
    }
  }

  const toman = t.match(
    /(?:قیمت|price|💵|💰)?\s*[:：]?\s*([\d.,]+)\s*(?:تومان|تومن|tomans?|irt)\b/i,
  );
  if (toman?.[1]) {
    const n = parseLooseNumber(toman[1]);
    if (n != null && n > 0) {
      return { price: Math.round(n), currency: "IRT", source: "caption" };
    }
  }

  const usd = t.match(
    /(?:\$|usd)\s*([\d.,]+)|([\d.,]+)\s*(?:\$|usd|dollars?)\b/i,
  );
  if (usd) {
    const n = parseLooseNumber(usd[1] || usd[2] || "");
    if (n != null && n > 0) {
      return { price: n, currency: "USD", source: "caption" };
    }
  }

  const eur = t.match(
    /(?:€|eur)\s*([\d.,]+)|([\d.,]+)\s*(?:€|eur|euros?)\b/i,
  );
  if (eur) {
    const n = parseLooseNumber(eur[1] || eur[2] || "");
    if (n != null && n > 0) {
      return { price: n, currency: "EUR", source: "caption" };
    }
  }

  // Labeled bare number: قیمت 450000 / Price: 45
  const labeled = t.match(
    /(?:قیمت|price)\s*[:：]?\s*([\d.,]{2,})/i,
  );
  if (labeled?.[1]) {
    const n = parseLooseNumber(labeled[1]);
    if (n != null && n > 0) {
      return {
        price: Math.round(n),
        currency: locale === "fa" ? "IRT" : "USD",
        source: "caption",
      };
    }
  }

  return null;
}

export function normalizeProductName(name: string) {
  return toAsciiDigits(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur =
        a[i] === b[j]
          ? row[j]!
          : 1 + Math.min(row[j]!, row[j + 1]!, prev);
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}

export function namesAreSimilar(a: string, b: string) {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen < 4) return false;
  const dist = levenshtein(na, nb);
  return dist / maxLen <= 0.22;
}

function shareImage(a: StudioProduct, b: StudioProduct) {
  const set = new Set(a.imageIds ?? []);
  return (b.imageIds ?? []).some((id) => set.has(id));
}

/** Union-find groups for near-duplicate products. */
export function findDuplicateGroups(products: StudioProduct[]): DuplicateGroup[] {
  const n = products.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const reason = new Map<string, "name" | "image" | "both">();

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]!);
    return parent[i]!;
  }
  function unite(i: number, j: number, why: "name" | "image") {
    const a = find(i);
    const b = find(j);
    if (a === b) {
      const key = `${Math.min(a, b)}`;
      const prev = reason.get(key);
      if (prev && prev !== why) reason.set(key, "both");
      return;
    }
    parent[b] = a;
    const key = `${a}`;
    const prev = reason.get(key);
    if (!prev) reason.set(key, why);
    else if (prev !== why) reason.set(key, "both");
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pa = products[i]!;
      const pb = products[j]!;
      if (pa.hidden || pb.hidden) continue;
      const byImage = shareImage(pa, pb);
      const byName = namesAreSimilar(pa.name, pb.name);
      if (byImage) unite(i, j, "image");
      if (byName) unite(i, j, "name");
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (products[i]?.hidden) continue;
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(i);
    buckets.set(root, list);
  }

  return [...buckets.values()]
    .filter((indices) => indices.length > 1)
    .map((indices) => {
      const root = find(indices[0]!);
      return {
        indices: indices.sort((a, b) => a - b),
        reason: reason.get(`${root}`) ?? "name",
      };
    });
}

export function mergeProductData(
  keep: StudioProduct,
  others: StudioProduct[],
): StudioProduct {
  const imageIds = [
    ...new Set([
      ...(keep.imageIds ?? []),
      ...others.flatMap((p) => p.imageIds ?? []),
    ]),
  ].slice(0, 12);

  const priced = [keep, ...others].find((p) => p.price != null);
  const withCat = [keep, ...others].find((p) => p.category?.trim());
  const withCur = [keep, ...others].find((p) => p.currency);
  const descriptions = [keep, ...others]
    .map((p) => p.description?.trim() ?? "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return {
    ...keep,
    imageIds,
    price: keep.price ?? priced?.price ?? null,
    currency: keep.currency ?? withCur?.currency ?? null,
    category: keep.category?.trim() ? keep.category : (withCat?.category ?? ""),
    description: keep.description?.trim()
      ? keep.description
      : (descriptions[0] ?? ""),
  };
}
