/**
 * Resolve bilingual template copy.
 * Plain strings are treated as English-only legacy content.
 */

export type LocalizedText = string | { fa: string; en: string };

export function pickLocalized(
  value: LocalizedText | undefined | null,
  locale: "fa" | "en",
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Legacy English-only: do not force EN copy onto FA sites.
    return locale === "en" ? trimmed : undefined;
  }
  const preferred = value[locale]?.trim();
  if (preferred) return preferred;
  const fallback = (locale === "fa" ? value.en : value.fa)?.trim();
  return fallback || undefined;
}
