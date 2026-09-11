import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toLocaleDigits(value: string | number, locale: "fa" | "en") {
  const text = String(value);
  if (locale !== "fa") return text;
  return text.replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

export function formatNumber(value: number, locale: "fa" | "en") {
  const formatted = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(
    value,
  );
  return formatted;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function createId(prefix = "id") {
  void prefix;
  return crypto.randomUUID();
}

export function isBrowser() {
  return typeof window !== "undefined";
}
