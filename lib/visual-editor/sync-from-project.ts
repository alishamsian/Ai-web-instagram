/**
 * Sync GrapesJS project HTML/JSON → WebsiteConfig content fields.
 * Preserves all sections not present in the canvas (never silently drops).
 *
 * GrapesJS getProjectData() stores pages as frames[].component JSON trees
 * (not HTML strings). Extraction walks both shapes.
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import { websiteConfigSourceFingerprint } from "@/lib/visual-editor/content-fingerprint";

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

type GjsNode = {
  type?: string;
  tagName?: string;
  content?: string;
  attributes?: Record<string, string | undefined>;
  components?: GjsNode[] | string;
  style?: Record<string, string>;
};

/** Collect root component nodes from every page (legacy `component` + `frames`). */
export function collectPageRoots(
  project: ProjectData | Record<string, unknown>,
): unknown[] {
  const pages = (project as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return [];
  const roots: unknown[] = [];
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const p = page as {
      component?: unknown;
      frames?: Array<{ component?: unknown }>;
    };
    if (p.component != null) roots.push(p.component);
    if (Array.isArray(p.frames)) {
      for (const frame of p.frames) {
        if (frame?.component != null) roots.push(frame.component);
      }
    }
  }
  return roots;
}

function collectText(node: GjsNode): string {
  if (typeof node.content === "string" && node.type === "textnode") {
    return node.content;
  }
  if (typeof node.components === "string") return node.components;
  if (!Array.isArray(node.components)) {
    return typeof node.content === "string" ? node.content : "";
  }
  return node.components.map(collectText).join("");
}

function walkComponentTree(
  node: unknown,
  visit: (n: GjsNode) => void,
): void {
  if (!node) return;
  if (typeof node === "string") return;
  if (typeof node !== "object") return;
  const n = node as GjsNode;
  visit(n);
  if (Array.isArray(n.components)) {
    for (const child of n.components) walkComponentTree(child, visit);
  }
}

function extractFromHtmlBlob(html: string, values: Record<string, string>) {
  const pathRegex = /data-content-path="([^"]+)"[^>]*>([^<]*)</gi;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(html)) !== null) {
    const path = match[1];
    const text = decodeEntities(match[2].trim());
    if (path) values[path] = text;
  }

  const imgRegex =
    /data-content-path="([^"]+)"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*data-content-path="([^"]+)"/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const path = match[1] || match[4];
    const src = match[2] || match[3];
    if (path && src) values[path] = src;
  }

  const mediaRegex =
    /data-content-path="([^"]+)"[^>]*data-media-id="([^"]+)"|data-media-id="([^"]+)"[^>]*data-content-path="([^"]+)"/gi;
  while ((match = mediaRegex.exec(html)) !== null) {
    const path = match[1] || match[4];
    const mediaId = match[2] || match[3];
    if (path && mediaId) values[path] = mediaId;
  }
}

/** Extract `data-content-path` → text/src/media-id values from serialized project. */
export function extractContentPathValues(
  project: ProjectData | Record<string, unknown>,
): Record<string, string> {
  const values: Record<string, string> = {};
  const roots = collectPageRoots(project);

  for (const root of roots) {
    if (typeof root === "string") {
      extractFromHtmlBlob(root, values);
      // href paths in HTML
      const hrefRegex =
        /data-href-path="([^"]+)"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*data-href-path="([^"]+)"/gi;
      let match: RegExpExecArray | null;
      while ((match = hrefRegex.exec(root)) !== null) {
        const path = match[1] || match[4];
        const href = match[2] || match[3];
        if (path && href) values[path] = decodeEntities(href);
      }
      continue;
    }
    walkComponentTree(root, (n) => {
      const attrs = n.attributes ?? {};

      const hrefPath = attrs["data-href-path"];
      if (hrefPath && attrs.href) {
        values[hrefPath] = attrs.href;
      }

      const path = attrs["data-content-path"];
      if (!path) return;

      // Gallery imageIds collected separately
      if (path === "content.gallery.imageIds") return;

      const mediaId = attrs["data-media-id"];
      const src = attrs.src;
      const isImagePath = path.endsWith(".imageId") || path.includes("imageId");

      if (mediaId && isImagePath) {
        values[path] = mediaId;
        return;
      }
      if (src && (n.tagName === "img" || n.type === "image" || isImagePath)) {
        values[path] = src;
        return;
      }

      const text = collectText(n).trim();
      if (text) values[path] = decodeEntities(text);
    });
  }

  return values;
}

/** Ordered gallery media ids from canvas (by data-gallery-index / document order). */
export function extractGalleryImageIds(
  project: ProjectData | Record<string, unknown>,
): string[] | null {
  const collected: Array<{ index: number; id: string }> = [];
  let order = 0;
  for (const root of collectPageRoots(project)) {
    if (typeof root === "string") {
      const imgRegex =
        /<img\b[^>]*data-content-path="content\.gallery\.imageIds"[^>]*>|<img\b[^>]*data-content-path='content\.gallery\.imageIds'[^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = imgRegex.exec(root)) !== null) {
        const tag = match[0];
        const id =
          /data-media-id="([^"]+)"/.exec(tag)?.[1] ||
          /data-media-id='([^']+)'/.exec(tag)?.[1];
        if (!id) continue;
        const indexAttr =
          /data-gallery-index="([^"]+)"/.exec(tag)?.[1] ||
          /data-gallery-index='([^']+)'/.exec(tag)?.[1];
        const index =
          indexAttr != null && Number.isFinite(Number(indexAttr))
            ? Number(indexAttr)
            : order++;
        collected.push({ index, id });
      }
      continue;
    }
    walkComponentTree(root, (n) => {
      const attrs = n.attributes ?? {};
      if (attrs["data-content-path"] !== "content.gallery.imageIds") return;
      const id = attrs["data-media-id"];
      if (!id) return;
      const index =
        attrs["data-gallery-index"] != null
          ? Number(attrs["data-gallery-index"])
          : order++;
      collected.push({
        index: Number.isFinite(index) ? index : order++,
        id,
      });
    });
  }
  if (collected.length === 0) return null;
  collected.sort((a, b) => a.index - b.index);
  return collected.map((c) => c.id);
}

export function extractSectionMeta(
  project: ProjectData | Record<string, unknown>,
): Array<{
  id: string;
  type?: string;
  visible: boolean;
  variant?: string;
  settings?: Record<string, unknown>;
}> {
  const result: Array<{
    id: string;
    type?: string;
    visible: boolean;
    variant?: string;
    settings?: Record<string, unknown>;
  }> = [];
  const seen = new Set<string>();

  const parseSettings = (
    raw: string | undefined,
  ): Record<string, unknown> | undefined => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  const push = (meta: {
    id: string;
    type?: string;
    visible: boolean;
    variant?: string;
    settings?: Record<string, unknown>;
  }) => {
    if (!meta.id || seen.has(meta.id)) return;
    seen.add(meta.id);
    result.push(meta);
  };

  for (const root of collectPageRoots(project)) {
    if (typeof root === "string") {
      const sectionRegex = /<section[^>]*data-section-id="([^"]+)"[^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = sectionRegex.exec(root)) !== null) {
        const tag = match[0];
        push({
          id: match[1],
          type: /data-section-type="([^"]+)"/.exec(tag)?.[1],
          variant: /data-section-variant="([^"]+)"/.exec(tag)?.[1],
          visible: /data-visible="([^"]+)"/.exec(tag)?.[1] !== "false",
          settings: parseSettings(
            /data-section-settings="([^"]*)"/.exec(tag)?.[1]
              ? decodeEntities(
                  /data-section-settings="([^"]*)"/.exec(tag)![1],
                )
              : undefined,
          ),
        });
      }
      continue;
    }

    walkComponentTree(root, (n) => {
      const attrs = n.attributes ?? {};
      const id = attrs["data-section-id"];
      if (!id) return;
      push({
        id,
        type: attrs["data-section-type"],
        variant: attrs["data-section-variant"] || undefined,
        visible: attrs["data-visible"] !== "false",
        settings: parseSettings(attrs["data-section-settings"]),
      });
    });
  }

  return result;
}

function resolveMediaId(config: WebsiteConfig, value: string): string | undefined {
  if (config.media[value]) return value;
  const found = Object.entries(config.media).find(([, m]) => m.url === value);
  return found?.[0];
}

function setNestedString(
  root: Record<string, unknown>,
  parts: string[],
  value: string,
): boolean {
  if (parts.length === 0) return false;
  let cursor: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    const isIndex = /^\d+$/.test(nextKey);
    if (cursor == null || typeof cursor !== "object") return false;
    const obj = cursor as Record<string, unknown>;
    if (obj[key] == null) {
      obj[key] = isIndex ? [] : {};
    }
    cursor = obj[key];
  }
  if (cursor == null || typeof cursor !== "object") return false;
  const last = parts[parts.length - 1];
  (cursor as Record<string, unknown>)[last] = value;
  return true;
}

function setByPath(config: WebsiteConfig, path: string, value: string): void {
  if (path === "content.hero.headline") config.content.hero.headline = value;
  else if (path === "content.hero.subheadline")
    config.content.hero.subheadline = value;
  else if (path === "content.hero.cta") config.content.hero.cta = value;
  else if (path === "content.hero.ctaHref") config.content.hero.ctaHref = value;
  else if (path === "content.hero.imageId") {
    const id = resolveMediaId(config, value);
    if (id) config.content.hero.imageId = id;
  } else if (path === "content.about.title" && config.content.about) {
    config.content.about.title = value;
  } else if (path === "content.about.body" && config.content.about) {
    config.content.about.body = value;
  } else if (path === "content.about.imageId" && config.content.about) {
    const id = resolveMediaId(config, value);
    if (id) config.content.about.imageId = id;
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
  } else if (path === "content.promo.ctaHref" && config.content.promo) {
    config.content.promo.ctaHref = value;
  } else if (path === "content.services.title" && config.content.services) {
    config.content.services.title = value;
  } else if (path.startsWith("content.")) {
    // Nested item fields: content.products.items.0.name, faq, testimonials, …
    const parts = path.split(".");
    let finalValue = value;
    if (path.includes("imageId")) {
      const id = resolveMediaId(config, value);
      if (id) finalValue = id;
      else if (/^https?:\/\//i.test(value)) {
        // Unresolved URL — do not overwrite a media id with a raw URL
        return;
      }
    }
    setNestedString(
      config as unknown as Record<string, unknown>,
      parts,
      finalValue,
    );
  }
}

/**
 * Apply visual project onto WebsiteConfig:
 * - stores project under visualEditor (adapter v2)
 * - syncs known content paths + hrefs + gallery order
 * - updates section visibility/order/settings when section nodes exist
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

  const galleryIds = extractGalleryImageIds(project);
  if (galleryIds && next.content.gallery) {
    next.content.gallery.imageIds = galleryIds;
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
        settings: meta.settings ?? existing.settings,
      });
      seen.add(meta.id);
    }
    for (const section of next.sections) {
      if (!seen.has(section.id)) ordered.push(section);
    }
    const body = ordered.filter((s) => s.type !== "footer");
    const footers = ordered.filter((s) => s.type === "footer");
    next.sections = [...body, ...footers];
  }

  next.visualEditor = {
    engine: "grapesjs",
    version: 2,
    project: { ...(project as Record<string, unknown>) },
    activePageId:
      options?.activePageId ?? config.visualEditor?.activePageId ?? "home",
    sourceFingerprint: websiteConfigSourceFingerprint(next),
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
