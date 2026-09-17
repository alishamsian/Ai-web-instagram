/**
 * Editor-safe href normalization for CTAs and contact links.
 * Allows http(s), relative paths, hash anchors, tel:, mailto:.
 * Rejects javascript:/data:/file: and other unsafe schemes.
 */

const UNSAFE = /^(javascript|data|file|vbscript|blob):/i;

export type NormalizeHrefResult =
  | { ok: true; href: string }
  | { ok: false; reason: "empty" | "unsafe" | "invalid" };

export function normalizeEditorHref(value: unknown): NormalizeHrefResult {
  if (typeof value !== "string") return { ok: false, reason: "invalid" };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (UNSAFE.test(trimmed)) return { ok: false, reason: "unsafe" };

  // Relative / in-page
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return { ok: true, href: trimmed };
  }

  // tel: / mailto: (keep as-is after basic shape check)
  if (/^tel:/i.test(trimmed)) {
    const rest = trimmed.slice(4).trim();
    if (!rest) return { ok: false, reason: "invalid" };
    return { ok: true, href: `tel:${rest.replace(/\s+/g, "")}` };
  }
  if (/^mailto:/i.test(trimmed)) {
    const rest = trimmed.slice(7).trim();
    if (!rest.includes("@")) return { ok: false, reason: "invalid" };
    return { ok: true, href: `mailto:${rest}` };
  }

  // Bare social / domain without scheme → https
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return { ok: true, href: parsed.toString() };
    } catch {
      return { ok: false, reason: "invalid" };
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, reason: "unsafe" };
    }
    return { ok: true, href: parsed.toString() };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Returns a usable href or a safe fallback (never throws). */
export function resolveEditorHref(
  value: unknown,
  fallback = "#",
): string {
  const result = normalizeEditorHref(value);
  return result.ok ? result.href : fallback;
}

/** Map canvas EditableText paths to WebsiteConfig content paths. */
export const EDITOR_FIELD_CONTENT_PATH: Record<string, string> = {
  "hero.headline": "content.hero.headline",
  "hero.subheadline": "content.hero.subheadline",
  "hero.cta": "content.hero.cta",
  "hero.eyebrow": "content.hero.eyebrow",
  "about.title": "content.about.title",
  "about.body": "content.about.body",
  "products.title": "content.products.title",
  "products.description": "content.products.description",
  "services.title": "content.services.title",
  "gallery.title": "content.gallery.title",
  "faq.title": "content.faq.title",
  "contact.title": "content.contact.title",
  "contact.body": "content.contact.body",
  "testimonials.title": "content.testimonials.title",
  "promo.kicker": "content.promo.kicker",
  "promo.title": "content.promo.title",
  "promo.cta": "content.promo.cta",
  "trust.title": "content.trust.title",
};
