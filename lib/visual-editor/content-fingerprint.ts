/**
 * Fingerprint of WebsiteConfig fields that drive visual projection.
 * Used to detect Classic/API edits since the last Visual Editor save.
 */

import type { WebsiteConfig } from "@/types/website";

/** Stable JSON for fingerprinting (sorted object keys recursively). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

/**
 * Hash-like fingerprint of content + sections + media URLs/alts.
 * Brand/seo/settings changes that don't affect canvas projection are excluded
 * so Visual layout isn't needlessly rebuilt.
 *
 * Note: serializes a relatively large structure via stableStringify.
 * Correctness > micro-optimization; a future pass may hash this payload
 * without changing the comparison contract.
 */
function sectionFingerprintSlice(
  sections: WebsiteConfig["sections"] | undefined,
) {
  return (sections ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    visible: s.visible !== false,
    variant: s.variant ?? null,
    settings: s.settings ?? null,
    components: s.components ?? null,
  }));
}

export function websiteConfigSourceFingerprint(config: WebsiteConfig): string {
  const payload = {
    sections: sectionFingerprintSlice(config.sections),
    pages: (config.pages ?? []).map((p) => ({
      id: p.id,
      sections: sectionFingerprintSlice(p.sections),
    })),
    content: config.content,
    media: Object.fromEntries(
      Object.entries(config.media).map(([id, m]) => [
        id,
        { url: m.url, alt: m.alt, type: m.type, videoUrl: m.videoUrl ?? null },
      ]),
    ),
    direction: config.settings.direction,
    language: config.settings.language,
    brandName: config.brand.name,
    colors: config.brand.colors,
  };
  return stableStringify(payload);
}
