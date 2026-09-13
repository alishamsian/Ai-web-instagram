import type { BusinessProfile } from "@/lib/business/types";

export type SignalCorpus = {
  text: string;
  tokens: string[];
  categories: string[];
  attributes: string[];
  productSignals: string[];
  contentSignals: string[];
  brandSignals: string[];
};

function pushText(parts: string[], value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) parts.push(trimmed);
}

export function buildSignalCorpus(profile: BusinessProfile): SignalCorpus {
  const parts: string[] = [];
  pushText(parts, profile.displayName);
  pushText(parts, profile.username);
  pushText(parts, profile.bio);
  pushText(parts, profile.category);
  pushText(parts, profile.subCategory);
  pushText(parts, profile.brand?.name);
  pushText(parts, profile.brand?.tagline);

  for (const product of profile.products ?? []) {
    pushText(parts, product.name);
    pushText(parts, product.description);
    if (product.attributes) {
      for (const [key, value] of Object.entries(product.attributes)) {
        parts.push(key);
        if (typeof value === "string") parts.push(value);
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === "string") parts.push(item);
          }
        }
      }
    }
  }

  const productSignals = profile.signals?.productSignals ?? [];
  const contentSignals = profile.signals?.contentSignals ?? [];
  const brandSignals = profile.signals?.brandSignals ?? [];
  parts.push(...productSignals, ...contentSignals, ...brandSignals);

  const text = parts.join(" \n ").toLowerCase();
  const tokens = text
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  const categories = [profile.category, profile.subCategory]
    .map((c) => c?.trim().toLowerCase())
    .filter((c): c is string => Boolean(c));

  const attributes = new Set<string>();
  for (const product of profile.products ?? []) {
    for (const key of Object.keys(product.attributes ?? {})) {
      attributes.add(key);
    }
  }

  return {
    text,
    tokens,
    categories,
    attributes: [...attributes],
    productSignals,
    contentSignals,
    brandSignals,
  };
}

export function keywordHits(corpus: SignalCorpus, keywords: string[]): number {
  let hits = 0;
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase().trim();
    if (!needle) continue;
    if (needle.includes(" ")) {
      if (corpus.text.includes(needle)) hits += 1;
      continue;
    }
    if (corpus.tokens.includes(needle) || corpus.text.includes(needle)) {
      hits += 1;
    }
  }
  return hits;
}
