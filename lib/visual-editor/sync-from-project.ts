/**
 * Sync GrapesJS project HTML/JSON → WebsiteConfig content fields.
 * Preserves all sections not present in the canvas (never silently drops).
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, SectionConfig } from "@/types/website";

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function collectPageHtml(project: ProjectData | Record<string, unknown>): string {
  const pages = (project as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return "";
  return pages
    .map((page) => {
      if (!page || typeof page !== "object") return "";
      const component = (page as { component?: unknown }).component;
      if (typeof component === "string") return component;
      if (component && typeof component === "object") {
        try {
          return JSON.stringify(component);
        } catch {
          return "";
        }
      }
      return "";
    })
    .join("\n");
}

/** Extract `data-content-path` → text/html/src values from serialized project. */
export function extractContentPathValues(
  project: ProjectData | Record<string, unknown>,
): Record<string, string> {
  const html = collectPageHtml(project);
  const values: Record<string, string> = {};

  // Prefer attribute-based matches in HTML strings
  const pathRegex =
    /data-content-path="([^"]+)"[^>]*>([^<]*)</gi;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(html)) !== null) {
    const path = match[1];
    const text = decodeEntities(match[2].trim());
    if (path) values[path] = text;
  }

  // Images / media with content path + src
  const imgRegex =
    /data-content-path="([^"]+)"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*data-content-path="([^"]+)"/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const path = match[1] || match[4];
    const src = match[2] || match[3];
    if (path && src) values[path] = src;
  }

  // media-id on images tied to content paths
  const mediaRegex =
    /data-content-path="([^"]+)"[^>]*data-media-id="([^"]+)"|data-media-id="([^"]+)"[^>]*data-content-path="([^"]+)"/gi;
  while ((match = mediaRegex.exec(html)) !== null) {
    const path = match[1] || match[4];
    const mediaId = match[2] || match[3];
    if (path && mediaId) values[path] = mediaId;
  }

  return values;
}

export function extractSectionMeta(
  project: ProjectData | Record<string, unknown>,
): Array<{ id: string; type?: string; visible: boolean; variant?: string }> {
  const html = collectPageHtml(project);
  const result: Array<{
    id: string;
    type?: string;
    visible: boolean;
    variant?: string;
  }> = [];
  const sectionRegex =
    /<section[^>]*data-section-id="([^"]+)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(html)) !== null) {
    const tag = match[0];
    const id = match[1];
    const type = /data-section-type="([^"]+)"/.exec(tag)?.[1];
    const variant = /data-section-variant="([^"]+)"/.exec(tag)?.[1];
    const visibleRaw = /data-visible="([^"]+)"/.exec(tag)?.[1];
    result.push({
      id,
      type,
      variant: variant || undefined,
      visible: visibleRaw !== "false",
    });
  }
  return result;
}

function setByPath(
  config: WebsiteConfig,
  path: string,
  value: string,
): void {
  if (path === "content.hero.headline") config.content.hero.headline = value;
  else if (path === "content.hero.subheadline")
    config.content.hero.subheadline = value;
  else if (path === "content.hero.cta") config.content.hero.cta = value;
  else if (path === "content.hero.imageId") {
    // Prefer media id; if value looks like URL, resolve against media bag
    if (config.media[value]) {
      config.content.hero.imageId = value;
    } else {
      const found = Object.entries(config.media).find(([, m]) => m.url === value);
      if (found) config.content.hero.imageId = found[0];
    }
  } else if (path === "content.about.title" && config.content.about) {
    config.content.about.title = value;
  } else if (path === "content.about.body" && config.content.about) {
    config.content.about.body = value;
  } else if (path === "content.about.imageId" && config.content.about) {
    if (config.media[value]) config.content.about.imageId = value;
    else {
      const found = Object.entries(config.media).find(([, m]) => m.url === value);
      if (found) config.content.about.imageId = found[0];
    }
  } else if (path === "content.products.title" && config.content.products) {
    config.content.products.title = value;
  } else if (path === "content.gallery.title" && config.content.gallery) {
    config.content.gallery.title = value;
  } else if (
    path === "content.testimonials.title" &&
    config.content.testimonials
  ) {
    config.content.testimonials.title = value;
  } else if (path === "content.faq.title" && config.content.faq) {
    config.content.faq.title = value;
  } else if (path === "content.contact.title" && config.content.contact) {
    config.content.contact.title = value;
  } else if (path === "content.contact.body" && config.content.contact) {
    config.content.contact.body = value;
  } else if (path === "content.promo.kicker" && config.content.promo) {
    config.content.promo.kicker = value;
  } else if (path === "content.promo.title" && config.content.promo) {
    config.content.promo.title = value;
  } else if (path === "content.promo.cta" && config.content.promo) {
    config.content.promo.cta = value;
  } else if (path === "content.services.title" && config.content.services) {
    config.content.services.title = value;
  }
}

/**
 * Apply visual project onto WebsiteConfig:
 * - stores project under visualEditor
 * - syncs known content paths
 * - updates section visibility/order when section nodes exist
 * - NEVER drops sections missing from canvas (orphans preserved)
 */
export function syncWebsiteConfigFromVisualProject(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
  options?: { activePageId?: string },
): WebsiteConfig {
  const next = structuredClone(config);
  const pathValues = extractContentPathValues(project);
  for (const [path, value] of Object.entries(pathValues)) {
    setByPath(next, path, value);
  }

  const sectionMeta = extractSectionMeta(project);
  if (sectionMeta.length > 0) {
    const byId = new Map(next.sections.map((s) => [s.id, s]));
    const ordered: SectionConfig[] = [];
    const seen = new Set<string>();
    for (const meta of sectionMeta) {
      const existing = byId.get(meta.id);
      if (!existing) continue;
      ordered.push({
        ...existing,
        visible: meta.visible,
        variant: meta.variant ?? existing.variant,
      });
      seen.add(meta.id);
    }
    // Preserve orphan sections (not rendered / not in canvas) — append after
    for (const section of next.sections) {
      if (!seen.has(section.id)) ordered.push(section);
    }
    // Keep footer last
    const body = ordered.filter((s) => s.type !== "footer");
    const footers = ordered.filter((s) => s.type === "footer");
    next.sections = [...body, ...footers];
  }

  next.visualEditor = {
    engine: "grapesjs",
    version: 1,
    project: { ...(project as Record<string, unknown>) },
    activePageId:
      options?.activePageId ?? config.visualEditor?.activePageId ?? "home",
  };

  return next;
}

/** Stable fingerprint for dirty detection (excludes zoom/device UI). */
export function visualProjectFingerprint(
  project: ProjectData | Record<string, unknown>,
): string {
  try {
    return JSON.stringify(project);
  } catch {
    return String(Date.now());
  }
}
