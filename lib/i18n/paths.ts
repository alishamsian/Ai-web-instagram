import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/config/env";

export function localePath(locale: Locale, path = "") {
  const suffix = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${locale}${suffix}`;
}

export function withLocale(path: string, locale: Locale) {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

export function parseLocale(value: string | undefined): Locale {
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}
