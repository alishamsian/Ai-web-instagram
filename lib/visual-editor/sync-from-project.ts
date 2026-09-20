/**
 * Sync GrapesJS project HTML/JSON → WebsiteConfig content fields.
 *
 * Phase 2.1:
 * - Page-aware extraction (custom pages cannot overwrite reserved canonical content)
 * - Stable collection item identity (reorder-safe products / faq / testimonials)
 *
 * Phase 3.1.2:
 * - Page-aware section structure sync into WebsiteConfig.pages[].sections
 * - Template/multi-page sites drop canvas-missing sections (remove/reorder work)
 * - Legacy single-page sites still write top-level WebsiteConfig.sections
 *
 * GrapesJS getProjectData() stores pages as frames[].component JSON trees
 * (not HTML strings). Extraction walks both shapes.
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import { websiteConfigSourceFingerprint } from "@/lib/visual-editor/content-fingerprint";
import {
  isReservedVisualPageId,
  stableCollectionItemId,
  VISUAL_PAGE_ABOUT,
  VISUAL_PAGE_HOME,
  type VisualCollectionKey,
} from "@/lib/visual-editor/ids";
import { syncPagesMetaFromProject } from "@/lib/visual-editor/pages";
import { applyCanonicalComponentsFromProject } from "@/lib/visual-editor/canonical-components";

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

export type VisualPageRoots = {
  id: string;
  name?: string;
  roots: unknown[];
};

export type PageContentPathMap = Record<string, Record<string, string>>;

export type SectionMeta = {
  id: string;
  type?: string;
  visible: boolean;
  variant?: string;
  settings?: Record<string, unknown>;
};

/**
 * Merge canvas section meta onto an existing SectionConfig list.
 * Preserves content-bearing fields on known ids; applies order/visibility/variant/settings.
 * When dropMissing is true, sections absent from the canvas are removed (remove ops).
 */
export function mergeSectionsFromMeta(
  existing: SectionConfig[],
  meta: SectionMeta[],
  options: { dropMissing: boolean },
): SectionConfig[] {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const ordered: SectionConfig[] = [];
  const seen = new Set<string>();

  for (const m of meta) {
    if (!m.id || seen.has(m.id)) continue;
    const prev = byId.get(m.id);
    if (!prev) {
      if (!m.type) continue;
      ordered.push({
        id: m.id,
        type: m.type as SectionConfig["type"],
        visible: m.visible,
        variant: m.variant,
        settings: m.settings ? structuredClone(m.settings) : undefined,
      });
      seen.add(m.id);
      continue;
    }
    ordered.push({
      ...structuredClone(prev),
      visible: m.visible,
      variant: m.variant ?? prev.variant,
      settings:
        m.settings !== undefined
          ? structuredClone(m.settings)
          : prev.settings
            ? structuredClone(prev.settings)
            : undefined,
      // Preserve nested canonical tree until applyCanonicalComponents overwrites
      components: prev.components
        ? structuredClone(prev.components)
        : undefined,
    });
    seen.add(m.id);
  }

  if (!options.dropMissing) {
    for (const section of existing) {
      if (!seen.has(section.id)) {
        ordered.push(structuredClone(section));
      }
    }
  }

  const body = ordered.filter((s) => s.type !== "footer");
  const footers = ordered.filter((s) => s.type === "footer");
  return [...body, ...footers];
}

/**
 * Write extracted per-page section meta into pages[].sections and mirror home
 * into top-level sections for legacy + dual-write compatibility.
 */
export function applyPageSectionsFromProject(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
): void {
  const byPage = extractPageSectionMeta(project);
  const isCatalog = Boolean(config.templateCatalogId?.trim());
  const pageList = config.pages ?? [];

  for (const page of pageList) {
    const meta = byPage[page.id];
    if (!meta || meta.length === 0) continue;
    const existing =
      page.sections && page.sections.length > 0
        ? page.sections
        : page.id === VISUAL_PAGE_HOME
          ? config.sections
          : [];
    // Template / page-aware: drop missing so remove/reorder stick.
    // Legacy home-only projects also drop when meta is authoritative.
    page.sections = mergeSectionsFromMeta(existing, meta, {
      dropMissing: true,
    });
  }

  const homeMeta =
    byPage[VISUAL_PAGE_HOME] ??
    (Object.keys(byPage).length === 1
      ? byPage[Object.keys(byPage)[0]!]
      : undefined);

  if (homeMeta && homeMeta.length > 0) {
    const homePage = pageList.find((p) => p.id === VISUAL_PAGE_HOME);
    const existingTop =
      isCatalog && homePage?.sections && homePage.sections.length > 0
        ? homePage.sections
        : config.sections;
    const merged = mergeSectionsFromMeta(existingTop, homeMeta, {
      dropMissing: true,
    });
    config.sections = merged;
    if (homePage) {
      homePage.sections = structuredClone(merged);
    }
  }
}

type ItemFieldHit = {
  collection: VisualCollectionKey;
  itemId: string;
  field: string;
  value: string;
};

/** Collect per-page roots (legacy `component` + `frames`) with stable page ids. */
export function collectPagesWithRoots(
  project: ProjectData | Record<string, unknown>,
): VisualPageRoots[] {
  const pages = (project as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return [];
  const result: VisualPageRoots[] = [];
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const p = page as {
      id?: unknown;
      name?: unknown;
      component?: unknown;
      frames?: Array<{ component?: unknown }>;
    };
    const id =
      typeof p.id === "string" && p.id.trim()
        ? p.id.trim()
        : typeof p.name === "string" && p.name.trim()
          ? p.name.trim().toLowerCase().replace(/\s+/g, "-")
          : "";
    if (!id) continue;
    const roots: unknown[] = [];
    if (p.component != null) roots.push(p.component);
    if (Array.isArray(p.frames)) {
      for (const frame of p.frames) {
        if (frame?.component != null) roots.push(frame.component);
      }
    }
    result.push({
      id,
      name: typeof p.name === "string" ? p.name : undefined,
      roots,
    });
  }
  return result;
}

/** Collect root component nodes from every page (legacy helper). */
export function collectPageRoots(
  project: ProjectData | Record<string, unknown>,
): unknown[] {
  return collectPagesWithRoots(project).flatMap((p) => p.roots);
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

function walkComponentTree(node: unknown, visit: (n: GjsNode) => void): void {
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

function extractHrefFromHtml(html: string, values: Record<string, string>) {
  const hrefRegex =
    /data-href-path="([^"]+)"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*data-href-path="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const path = match[1] || match[4];
    const href = match[2] || match[3];
    if (path && href) values[path] = decodeEntities(href);
  }
}

function extractValuesFromRoot(
  root: unknown,
  values: Record<string, string>,
): void {
  if (typeof root === "string") {
    extractFromHtmlBlob(root, values);
    extractHrefFromHtml(root, values);
    return;
  }
  walkComponentTree(root, (n) => {
    const attrs = n.attributes ?? {};

    const hrefPath = attrs["data-href-path"];
    if (hrefPath && attrs.href) {
      values[hrefPath] = attrs.href;
    }

    const path = attrs["data-content-path"];
    if (!path) return;

    // Collection fields / gallery handled separately
    if (path === "content.gallery.imageIds") return;
    if (attrs["data-item-id"] && isCollectionItemFieldPath(path)) return;

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

function isCollectionItemFieldPath(path: string): boolean {
  return (
    path.startsWith("content.products.items.") ||
    path.startsWith("content.faq.items.") ||
    path.startsWith("content.testimonials.items.") ||
    path.startsWith("content.services.items.")
  );
}

/** Page-scoped content path extraction. */
export function extractPageContentPathValues(
  project: ProjectData | Record<string, unknown>,
): PageContentPathMap {
  const byPage: PageContentPathMap = {};
  for (const page of collectPagesWithRoots(project)) {
    const values: Record<string, string> = {};
    for (const root of page.roots) {
      extractValuesFromRoot(root, values);
    }
    byPage[page.id] = values;
  }
  return byPage;
}

/**
 * Flat merge for backward compatibility.
 * Reserved pages win over custom pages; within reserved, home fills first then about.
 */
export function extractContentPathValues(
  project: ProjectData | Record<string, unknown>,
): Record<string, string> {
  const byPage = extractPageContentPathValues(project);
  const merged: Record<string, string> = {};
  const order = [
    ...Object.keys(byPage).filter((id) => id === VISUAL_PAGE_HOME),
    ...Object.keys(byPage).filter((id) => id === VISUAL_PAGE_ABOUT),
    ...Object.keys(byPage).filter((id) => !isReservedVisualPageId(id)),
  ];
  // Apply custom first, then about, then home last so reserved wins on collisions
  for (const id of [...order].reverse()) {
    Object.assign(merged, byPage[id]);
  }
  // Re-apply reserved on top to guarantee protection
  if (byPage[VISUAL_PAGE_ABOUT]) Object.assign(merged, byPage[VISUAL_PAGE_ABOUT]);
  if (byPage[VISUAL_PAGE_HOME]) Object.assign(merged, byPage[VISUAL_PAGE_HOME]);
  return merged;
}

/**
 * Canonical WebsiteConfig content comes only from reserved pages.
 * - home: all site content (except about fields when about page also contributes)
 * - about: content.about.*
 * - custom pages: never mutate WebsiteConfig content paths
 */
export function extractCanonicalContentPathValues(
  project: ProjectData | Record<string, unknown>,
): Record<string, string> {
  const byPage = extractPageContentPathValues(project);
  const home = { ...(byPage[VISUAL_PAGE_HOME] ?? {}) };
  const about = byPage[VISUAL_PAGE_ABOUT] ?? {};

  // About page owns content.about.*; strip those from home if about page present
  if (Object.keys(about).length > 0) {
    for (const key of Object.keys(home)) {
      if (key.startsWith("content.about.")) delete home[key];
    }
    for (const [key, value] of Object.entries(about)) {
      if (key.startsWith("content.about.")) home[key] = value;
    }
  }

  return home;
}

function galleryIdsFromRoot(root: unknown, orderRef: { n: number }): Array<{
  index: number;
  id: string;
}> {
  const collected: Array<{ index: number; id: string }> = [];
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
          : orderRef.n++;
      collected.push({ index, id });
    }
    return collected;
  }
  walkComponentTree(root, (n) => {
    const attrs = n.attributes ?? {};
    if (attrs["data-content-path"] !== "content.gallery.imageIds") return;
    const id = attrs["data-media-id"];
    if (!id) return;
    const index =
      attrs["data-gallery-index"] != null
        ? Number(attrs["data-gallery-index"])
        : orderRef.n++;
    collected.push({
      index: Number.isFinite(index) ? index : orderRef.n++,
      id,
    });
  });
  return collected;
}

/** Gallery ids from a single page (prefer home). */
export function extractGalleryImageIdsFromPage(
  project: ProjectData | Record<string, unknown>,
  pageId: string = VISUAL_PAGE_HOME,
): string[] | null {
  const page = collectPagesWithRoots(project).find((p) => p.id === pageId);
  if (!page) return null;
  const collected: Array<{ index: number; id: string }> = [];
  const orderRef = { n: 0 };
  for (const root of page.roots) {
    collected.push(...galleryIdsFromRoot(root, orderRef));
  }
  if (collected.length === 0) return null;
  collected.sort((a, b) => a.index - b.index);
  return collected.map((c) => c.id);
}

/** @deprecated Prefer page-scoped extractGalleryImageIdsFromPage; home-first. */
export function extractGalleryImageIds(
  project: ProjectData | Record<string, unknown>,
): string[] | null {
  const fromHome = extractGalleryImageIdsFromPage(project, VISUAL_PAGE_HOME);
  if (fromHome) return fromHome;
  // Fallback: first page that has gallery markers (legacy single-page projects)
  for (const page of collectPagesWithRoots(project)) {
    const ids = extractGalleryImageIdsFromPage(project, page.id);
    if (ids) return ids;
  }
  return null;
}

function parseSettings(
  raw: string | undefined,
): Record<string, unknown> | undefined {
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
}

function sectionMetaFromRoot(root: unknown, push: (meta: SectionMeta) => void) {
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
            ? decodeEntities(/data-section-settings="([^"]*)"/.exec(tag)![1])
            : undefined,
        ),
      });
    }
    return;
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

/** Page-scoped section metadata. */
export function extractPageSectionMeta(
  project: ProjectData | Record<string, unknown>,
): Record<string, SectionMeta[]> {
  const byPage: Record<string, SectionMeta[]> = {};
  for (const page of collectPagesWithRoots(project)) {
    const result: SectionMeta[] = [];
    const seen = new Set<string>();
    const push = (meta: SectionMeta) => {
      if (!meta.id || seen.has(meta.id)) return;
      seen.add(meta.id);
      result.push(meta);
    };
    for (const root of page.roots) sectionMetaFromRoot(root, push);
    byPage[page.id] = result;
  }
  return byPage;
}

/**
 * Flat section meta for WebsiteConfig: home page only.
 * Custom / about pages cannot reorder or hide site sections.
 */
export function extractSectionMeta(
  project: ProjectData | Record<string, unknown>,
): SectionMeta[] {
  const byPage = extractPageSectionMeta(project);
  if (byPage[VISUAL_PAGE_HOME]?.length) return byPage[VISUAL_PAGE_HOME];
  // Legacy: single unnamed / only-page projects
  const pages = collectPagesWithRoots(project);
  if (pages.length === 1) return byPage[pages[0].id] ?? [];
  return [];
}

function resolveMediaId(
  config: WebsiteConfig,
  value: string,
): string | undefined {
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
  } else if (path.startsWith("content.") && !isCollectionItemFieldPath(path)) {
    const parts = path.split(".");
    let finalValue = value;
    if (path.includes("imageId")) {
      const id = resolveMediaId(config, value);
      if (id) finalValue = id;
      else if (/^https?:\/\//i.test(value)) return;
    }
    setNestedString(
      config as unknown as Record<string, unknown>,
      parts,
      finalValue,
    );
  } else if (isCollectionItemFieldPath(path)) {
    // Legacy index paths: content.products.items.0.name
    const parts = path.split(".");
    let finalValue = value;
    if (path.includes("imageId")) {
      const id = resolveMediaId(config, value);
      if (id) finalValue = id;
      else if (/^https?:\/\//i.test(value)) return;
    }
    setNestedString(
      config as unknown as Record<string, unknown>,
      parts,
      finalValue,
    );
  }
}

const COLLECTION_ATTR: Record<VisualCollectionKey, string> = {
  products: "data-product-id",
  faq: "data-faq-id",
  testimonials: "data-testimonial-id",
  services: "data-service-id",
};

function parseCollectionKey(raw: string | undefined): VisualCollectionKey | null {
  if (
    raw === "products" ||
    raw === "faq" ||
    raw === "testimonials" ||
    raw === "services"
  ) {
    return raw;
  }
  return null;
}

function fieldFromItemContentPath(path: string): string | null {
  // New: content.products.items.name  OR legacy: content.products.items.0.name
  const parts = path.split(".");
  // content.<collection>.items.<field...>
  if (parts.length < 4 || parts[0] !== "content" || parts[2] !== "items") {
    return null;
  }
  if (/^\d+$/.test(parts[3])) {
    return parts.slice(4).join(".") || null;
  }
  return parts.slice(3).join(".") || null;
}

function collectionFromItemContentPath(
  path: string,
): VisualCollectionKey | null {
  const parts = path.split(".");
  if (parts.length < 4 || parts[0] !== "content" || parts[2] !== "items") {
    return null;
  }
  return parseCollectionKey(parts[1]);
}

function extractItemFieldsFromRoot(root: unknown, hits: ItemFieldHit[]): void {
  if (typeof root === "string") {
    // Match tags that carry data-item-id + data-content-path
    const tagRegex = /<[^>]+data-item-id="([^"]+)"[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(root)) !== null) {
      const tag = match[0];
      const itemId = match[1];
      const path =
        /data-content-path="([^"]+)"/.exec(tag)?.[1] ||
        /data-content-path='([^']+)'/.exec(tag)?.[1];
      if (!path || !isCollectionItemFieldPath(path)) continue;
      const collection =
        parseCollectionKey(
          /data-collection="([^"]+)"/.exec(tag)?.[1] ||
            /data-collection='([^']+)'/.exec(tag)?.[1],
        ) || collectionFromItemContentPath(path);
      if (!collection) continue;
      const field = fieldFromItemContentPath(path);
      if (!field) continue;

      let value =
        /data-media-id="([^"]+)"/.exec(tag)?.[1] ||
        /data-media-id='([^']+)'/.exec(tag)?.[1] ||
        "";
      if (!value) {
        const after = root.slice(match.index + tag.length);
        const textMatch = /^([^<]*)</.exec(after);
        value = textMatch ? decodeEntities(textMatch[1].trim()) : "";
      }
      if (!value) continue;
      hits.push({ collection, itemId, field, value });
    }
    return;
  }

  walkComponentTree(root, (n) => {
    const attrs = n.attributes ?? {};
    const itemId = attrs["data-item-id"];
    const path = attrs["data-content-path"];
    if (!itemId || !path || !isCollectionItemFieldPath(path)) return;
    const collection =
      parseCollectionKey(attrs["data-collection"]) ||
      collectionFromItemContentPath(path);
    if (!collection) return;
    const field = fieldFromItemContentPath(path);
    if (!field) return;

    let value = "";
    if (field.includes("imageId") || field.startsWith("imageIds")) {
      value = attrs["data-media-id"] || attrs.src || "";
    } else {
      value = collectText(n).trim();
    }
    if (!value) return;
    hits.push({
      collection,
      itemId,
      field,
      value: decodeEntities(value),
    });
  });
}

function extractCollectionOrderFromRoot(
  root: unknown,
  collection: VisualCollectionKey,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const attrName = COLLECTION_ATTR[collection];

  const push = (id: string | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  if (typeof root === "string") {
    const re = new RegExp(
      `${attrName}="([^"]+)"|data-item-id="([^"]+)"[^>]*data-collection="${collection}"|data-collection="${collection}"[^>]*data-item-id="([^"]+)"`,
      "gi",
    );
    let match: RegExpExecArray | null;
    while ((match = re.exec(root)) !== null) {
      push(match[1] || match[2] || match[3]);
    }
    return ids;
  }

  walkComponentTree(root, (n) => {
    const attrs = n.attributes ?? {};
    if (attrs["data-collection"] === collection && attrs["data-item-id"]) {
      push(attrs["data-item-id"]);
      return;
    }
    if (attrs[attrName]) push(attrs[attrName]);
  });
  return ids;
}

export function extractCollectionOrder(
  project: ProjectData | Record<string, unknown>,
  collection: VisualCollectionKey,
  pageId: string = VISUAL_PAGE_HOME,
): string[] | null {
  const page = collectPagesWithRoots(project).find((p) => p.id === pageId);
  if (!page) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const root of page.roots) {
    for (const id of extractCollectionOrderFromRoot(root, collection)) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids.length > 0 ? ids : null;
}

function ensureItemIdsOnConfig(config: WebsiteConfig): void {
  if (config.content.products?.items) {
    config.content.products.items = config.content.products.items.map(
      (item, index) => ({
        ...item,
        id: stableCollectionItemId("products", item, index),
      }),
    );
  }
  if (config.content.faq?.items) {
    config.content.faq.items = config.content.faq.items.map((item, index) => ({
      ...item,
      id: stableCollectionItemId("faq", item, index),
    }));
  }
  if (config.content.testimonials?.items) {
    config.content.testimonials.items = config.content.testimonials.items.map(
      (item, index) => ({
        ...item,
        id: stableCollectionItemId("testimonials", item, index),
      }),
    );
  }
  if (config.content.services?.items) {
    config.content.services.items = config.content.services.items.map(
      (item, index) => ({
        ...item,
        id: stableCollectionItemId("services", item, index),
      }),
    );
  }
}

function reorderCollectionByIds<T extends { id?: string }>(
  items: T[],
  orderedIds: string[],
  collection: VisualCollectionKey,
): T[] {
  const withIds = items.map((item, index) => ({
    item: {
      ...item,
      id: stableCollectionItemId(collection, item, index),
    } as T,
    id: stableCollectionItemId(collection, item, index),
  }));
  const byId = new Map(withIds.map((entry) => [entry.id, entry.item]));
  const next: T[] = [];
  const seen = new Set<string>();
  for (const id of orderedIds) {
    const item = byId.get(id);
    if (!item || seen.has(id)) continue;
    seen.add(id);
    next.push(item);
  }
  // Preserve orphans not present on canvas
  for (const entry of withIds) {
    if (!seen.has(entry.id)) next.push(entry.item);
  }
  return next;
}

function setItemField(
  config: WebsiteConfig,
  collection: VisualCollectionKey,
  itemId: string,
  field: string,
  value: string,
): void {
  const items =
    collection === "products"
      ? config.content.products?.items
      : collection === "faq"
        ? config.content.faq?.items
        : collection === "testimonials"
          ? config.content.testimonials?.items
          : config.content.services?.items;
  if (!items) return;

  const index = items.findIndex(
    (item, i) => stableCollectionItemId(collection, item, i) === itemId,
  );
  if (index < 0) return;

  let finalValue: unknown = value;
  if (field.includes("imageId") || field.startsWith("imageIds")) {
    const mediaId = resolveMediaId(config, value);
    if (!mediaId) {
      if (/^https?:\/\//i.test(value)) return;
      finalValue = value;
    } else {
      finalValue = mediaId;
    }
  }

  const target = items[index] as unknown as Record<string, unknown>;
  const parts = field.split(".");
  if (parts.length === 1) {
    if (parts[0] === "imageIds" && typeof finalValue === "string") {
      // imageIds.0 style may arrive as field "imageIds.0"
      target.imageIds = Array.isArray(target.imageIds)
        ? [...(target.imageIds as string[])]
        : [];
      (target.imageIds as string[])[0] = finalValue;
      return;
    }
    target[parts[0]] = finalValue;
    return;
  }

  // Nested: imageIds.0
  if (parts[0] === "imageIds" && /^\d+$/.test(parts[1])) {
    const arr = Array.isArray(target.imageIds)
      ? [...(target.imageIds as string[])]
      : [];
    arr[Number(parts[1])] = String(finalValue);
    target.imageIds = arr;
    return;
  }

  setNestedString(target, parts, String(finalValue));
}

function applyItemFieldHits(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
): void {
  const page = collectPagesWithRoots(project).find(
    (p) => p.id === VISUAL_PAGE_HOME,
  );
  if (!page) return;
  const hits: ItemFieldHit[] = [];
  for (const root of page.roots) extractItemFieldsFromRoot(root, hits);
  for (const hit of hits) {
    setItemField(config, hit.collection, hit.itemId, hit.field, hit.value);
  }
}

function applyCollectionOrders(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
): void {
  const productsOrder = extractCollectionOrder(project, "products");
  if (productsOrder && config.content.products?.items) {
    config.content.products.items = reorderCollectionByIds(
      config.content.products.items,
      productsOrder,
      "products",
    );
  }
  const faqOrder = extractCollectionOrder(project, "faq");
  if (faqOrder && config.content.faq?.items) {
    config.content.faq.items = reorderCollectionByIds(
      config.content.faq.items,
      faqOrder,
      "faq",
    );
  }
  const testimonialsOrder = extractCollectionOrder(project, "testimonials");
  if (testimonialsOrder && config.content.testimonials?.items) {
    config.content.testimonials.items = reorderCollectionByIds(
      config.content.testimonials.items,
      testimonialsOrder,
      "testimonials",
    );
  }
}

/**
 * Apply visual project onto WebsiteConfig:
 * - stores project under visualEditor (adapter v2)
 * - syncs canonical content only from reserved pages
 * - syncs collection fields/order by stable item id
 * - syncs section order/visibility/variant/settings into pages[].sections
 *   (and mirrors home into top-level sections for legacy compatibility)
 * - Phase 3.2.1: syncs nested product component trees into section.components
 */
export function syncWebsiteConfigFromVisualProject(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
  options?: { activePageId?: string },
): WebsiteConfig {
  const next = structuredClone(config);
  ensureItemIdsOnConfig(next);

  // 1) Persist stable ids on collections (legacy arrays without ids)
  ensureItemIdsOnConfig(next);

  // 2) Canonical scalar + legacy index paths from reserved pages only
  const pathValues = extractCanonicalContentPathValues(project);
  for (const [path, value] of Object.entries(pathValues)) {
    if (isCollectionItemFieldPath(path)) {
      // Legacy index paths only (content.products.items.0.name)
      const parts = path.split(".");
      if (parts[3] && /^\d+$/.test(parts[3])) {
        setByPath(next, path, value);
      }
      continue;
    }
    setByPath(next, path, value);
  }

  // 3) Item-id field edits from home (wins over legacy index when both present)
  applyItemFieldHits(next, project);

  // 4) Reorder collections from home canvas (identity-preserving)
  applyCollectionOrders(next, project);

  const galleryIds = extractGalleryImageIdsFromPage(project, VISUAL_PAGE_HOME);
  if (galleryIds && next.content.gallery) {
    next.content.gallery.imageIds = galleryIds;
  }

  // 5) Align page metadata first, then sync per-page section structure
  next.pages = syncPagesMetaFromProject(next, project);
  applyPageSectionsFromProject(next, project);

  // 6) Canonical nested component trees (Phase 3.2.1) — product SoT
  applyCanonicalComponentsFromProject(next, project);

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
