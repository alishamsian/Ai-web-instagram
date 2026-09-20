/**
 * GrapesJS ↔ Product Component Tree adapters (Phase 3.2.1).
 *
 * Canonical product model lives on SectionConfig.components.
 * visualEditor.project remains an editing projection/cache.
 */

import type { ProjectData } from "grapesjs";
import type {
  SectionConfig,
  WebsiteComponentNode,
  WebsiteComponentResponsiveStyles,
  WebsiteComponentVisibility,
  WebsiteConfig,
} from "@/types/website";
import { VISUAL_PAGE_HOME } from "@/lib/visual-editor/ids";
import {
  createComponentNode,
  mintComponentId,
  normalizeComponentTree,
} from "@/lib/website/component-tree";
import { LOCK_ATTR } from "@/lib/visual-editor/lock";

/** Local page-root collector (avoids circular import with sync-from-project). */
function collectPagesWithRoots(
  project: ProjectData | Record<string, unknown>,
): Array<{ id: string; roots: unknown[] }> {
  const pages = (project as { pages?: unknown }).pages;
  if (!Array.isArray(pages)) return [];
  const result: Array<{ id: string; roots: unknown[] }> = [];
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
    result.push({ id, roots });
  }
  return result;
}

type GjsNode = {
  type?: string;
  tagName?: string;
  content?: string;
  attributes?: Record<string, string | boolean | number | undefined>;
  components?: GjsNode[] | string;
  style?: Record<string, string>;
};

const RSTYLE_PREFIX = "data-rstyle-";
const FREEFORM_SECTION_TYPE = "columns" as const;

function attrString(
  attrs: Record<string, string | boolean | number | undefined> | undefined,
  key: string,
): string | undefined {
  if (!attrs) return undefined;
  const v = attrs[key];
  if (v == null || v === false) return undefined;
  return String(v);
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

function childNodes(node: GjsNode): GjsNode[] {
  if (!Array.isArray(node.components)) return [];
  return node.components.filter(
    (c): c is GjsNode => Boolean(c) && typeof c === "object",
  );
}

function parseResponsiveFromAttrs(
  attrs: Record<string, string | boolean | number | undefined> | undefined,
): WebsiteComponentResponsiveStyles | undefined {
  if (!attrs) return undefined;
  const responsive: WebsiteComponentResponsiveStyles = {
    desktop: {},
    tablet: {},
    mobile: {},
  };
  for (const [key, raw] of Object.entries(attrs)) {
    if (!key.startsWith(RSTYLE_PREFIX)) continue;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const rest = key.slice(RSTYLE_PREFIX.length);
    const dash = rest.indexOf("-");
    if (dash < 0) continue;
    const device = rest.slice(0, dash) as keyof WebsiteComponentResponsiveStyles;
    const prop = rest.slice(dash + 1);
    if (device !== "desktop" && device !== "tablet" && device !== "mobile") {
      continue;
    }
    if (!prop) continue;
    responsive[device] = { ...responsive[device], [prop]: raw };
  }
  const has =
    Object.keys(responsive.desktop ?? {}).length > 0 ||
    Object.keys(responsive.tablet ?? {}).length > 0 ||
    Object.keys(responsive.mobile ?? {}).length > 0;
  if (!has) return undefined;
  return {
    desktop: Object.keys(responsive.desktop ?? {}).length
      ? responsive.desktop
      : undefined,
    tablet: Object.keys(responsive.tablet ?? {}).length
      ? responsive.tablet
      : undefined,
    mobile: Object.keys(responsive.mobile ?? {}).length
      ? responsive.mobile
      : undefined,
  };
}

function parseVisibilityFromAttrs(
  attrs: Record<string, string | boolean | number | undefined> | undefined,
): WebsiteComponentVisibility | undefined {
  if (!attrs) return undefined;
  const fallback = attrString(attrs, "data-visible") !== "false";
  const read = (device: string): boolean | undefined => {
    const raw = attrString(attrs, `data-visible-${device}`);
    if (raw == null) return undefined;
    return raw !== "false";
  };
  const desktop = read("desktop");
  const tablet = read("tablet");
  const mobile = read("mobile");
  if (desktop == null && tablet == null && mobile == null) {
    if (!fallback) return { desktop: false, tablet: false, mobile: false };
    return undefined;
  }
  return {
    desktop: desktop ?? fallback,
    tablet: tablet ?? fallback,
    mobile: mobile ?? fallback,
  };
}

function styleFromNode(node: GjsNode): Record<string, string> | undefined {
  if (!node.style || typeof node.style !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.style)) {
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function contentFromNode(
  node: GjsNode,
  type: string,
): Record<string, unknown> | undefined {
  const attrs = node.attributes ?? {};
  const hasComponentChildren = childNodes(node).some(
    (c) =>
      c.type !== "textnode" &&
      (isProductComponentNode(c) || Boolean(attrString(c.attributes, "data-component-type"))),
  );
  const text = hasComponentChildren ? "" : collectText(node).trim();
  const content: Record<string, unknown> = {};

  if (
    type === "content-heading" ||
    type === "content-text" ||
    type === "content-button" ||
    type === "content-icon" ||
    type.startsWith("content-")
  ) {
    if (text) content.text = text;
  }
  if (type === "content-heading") {
    const tag = (node.tagName || "").toLowerCase();
    const fromAttr = attrString(attrs, "data-heading-level");
    if (fromAttr && /^h[1-6]$/.test(fromAttr)) {
      content.level = fromAttr;
    } else if (/^h[1-6]$/.test(tag) && tag !== "h2") {
      // Non-default heading tags imply an explicit level even without attr.
      content.level = tag;
    }
  }
  if (type === "content-button" || type === "nav-navbar") {
    const href = attrString(attrs, "href");
    if (href) content.href = href;
    const target = attrString(attrs, "target");
    if (target) content.target = target;
    if (text) content.label = text;
  }
  if (type === "media-image") {
    const src = attrString(attrs, "src");
    const alt = attrString(attrs, "alt");
    const mediaId = attrString(attrs, "data-media-id");
    if (src) content.src = src;
    if (alt != null) content.alt = alt;
    if (mediaId) content.mediaId = mediaId;
  }
  if (type === "media-video") {
    const src = attrString(attrs, "src") || attrString(attrs, "data-video-src");
    const poster = attrString(attrs, "poster");
    if (src) content.src = src;
    if (poster) content.poster = poster;
    if (text) content.text = text;
  }
  if (
    type === "form-input" ||
    type === "form-textarea" ||
    type === "form-select"
  ) {
    const name = attrString(attrs, "name");
    const placeholder = attrString(attrs, "placeholder");
    const required = attrs.required === true || attrs.required === "true";
    if (name) content.name = name;
    if (placeholder) content.placeholder = placeholder;
    if (required) content.required = true;
    if (text) content.label = text;
  }
  if (type === "form-checkbox") {
    if (text) content.label = text;
  }
  if (type === "content-card" || type === "form-form") {
    if (text) content.text = text;
  }

  return Object.keys(content).length ? content : undefined;
}

function propsFromNode(
  node: GjsNode,
  type: string,
): Record<string, unknown> | undefined {
  const attrs = node.attributes ?? {};
  const props: Record<string, unknown> = {};
  // Only persist tagName when it differs from the type default
  const tag = (node.tagName || "").toLowerCase();
  const defaultTag = tagForType(type, undefined, undefined);
  if (tag && tag !== defaultTag && tag !== "div") {
    props.tagName = tag;
  }
  if (type === "media-image") {
    const objectFit = attrString(attrs, "data-object-fit");
    if (objectFit) props.objectFit = objectFit;
  }
  const aria = attrString(attrs, "aria-label");
  if (aria) props.ariaLabel = aria;
  return Object.keys(props).length ? props : undefined;
}

function isSectionNode(node: GjsNode): boolean {
  return Boolean(attrString(node.attributes, "data-section-id"));
}

function isProductComponentNode(node: GjsNode): boolean {
  const type = attrString(node.attributes, "data-component-type");
  if (!type) return false;
  if (type.startsWith("section-")) return false;
  if (isSectionNode(node)) return false;
  // Skip internal slots that are part of specialized section markup
  if (type === "media-slot") return false;
  if (type === "template-nav" || type.startsWith("template-")) return false;
  return true;
}

/**
 * Convert a GrapesJS JSON node → WebsiteComponentNode (recursive).
 * IDs are preserved when present.
 */
export function grapesNodeToProductNode(
  node: GjsNode,
  options?: { forceType?: string },
): WebsiteComponentNode | null {
  if (!node || typeof node !== "object") return null;
  if (node.type === "textnode") return null;

  const attrs = node.attributes ?? {};
  const type =
    options?.forceType ||
    attrString(attrs, "data-component-type") ||
    FALLBACK_FROM_TAG(node) ||
    "unknown";

  const id =
    attrString(attrs, "data-component-id")?.trim() || mintComponentId(type);

  const kids = childNodes(node)
    .map((c) => {
      if (c.type === "textnode") return null;
      if (isSectionNode(c)) return null;
      if (isProductComponentNode(c) || hasMeaningfulProductChild(c)) {
        return grapesNodeToProductNode(c);
      }
      // Anonymous wrapper with product descendants — flatten children
      if (hasProductDescendant(c)) {
        return grapesNodeToProductNode(c, {
          forceType: attrString(c.attributes, "data-component-type") || "layout-container",
        });
      }
      return null;
    })
    .filter((c): c is WebsiteComponentNode => Boolean(c));

  // Skip empty anonymous wrappers that aren't typed components
  if (
    !attrString(attrs, "data-component-type") &&
    !options?.forceType &&
    kids.length === 0
  ) {
    return null;
  }

  const locked = attrString(attrs, LOCK_ATTR) === "true";
  const hidden = attrString(attrs, "data-visible") === "false";
  const variant = attrString(attrs, "data-component-variant");

  return createComponentNode({
    id,
    type,
    children: kids.length ? kids : undefined,
    content: contentFromNode(node, type),
    props: propsFromNode(node, type),
    styles: styleFromNode(node),
    responsive: parseResponsiveFromAttrs(attrs),
    visibility: parseVisibilityFromAttrs(attrs),
    variant,
    locked: locked || undefined,
    hidden: hidden || undefined,
  });
}

function FALLBACK_FROM_TAG(node: GjsNode): string | undefined {
  const tag = (node.tagName || "").toLowerCase();
  if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
    return "content-heading";
  }
  if (tag === "p" || tag === "span") return "content-text";
  if (tag === "a" || tag === "button") return "content-button";
  if (tag === "img") return "media-image";
  if (tag === "hr") return "layout-divider";
  if (tag === "input") return "form-input";
  if (tag === "textarea") return "form-textarea";
  if (tag === "select") return "form-select";
  if (tag === "form") return "form-form";
  if (tag === "nav") return "nav-navbar";
  if (tag === "footer") return "nav-footer";
  return undefined;
}

function hasProductDescendant(node: GjsNode): boolean {
  if (isProductComponentNode(node)) return true;
  return childNodes(node).some(hasProductDescendant);
}

function hasMeaningfulProductChild(node: GjsNode): boolean {
  return isProductComponentNode(node) || hasProductDescendant(node);
}

/** Extract direct product component children of a section GrapesJS node. */
export function extractComponentsFromSectionNode(
  sectionNode: GjsNode,
): WebsiteComponentNode[] {
  const out: WebsiteComponentNode[] = [];
  for (const child of childNodes(sectionNode)) {
    if (isSectionNode(child)) continue;
    if (isProductComponentNode(child)) {
      const product = grapesNodeToProductNode(child);
      if (product) out.push(product);
      continue;
    }
    // Specialized section inner content often lacks data-component-type on wrappers
    // but freeform nested inserts always set data-component-type — skip unmarked
    // markup that is part of the specialized section template.
    if (hasProductDescendant(child)) {
      // Pull typed descendants without inventing wrappers for unmarked parents
      collectTypedDescendants(child, out);
    }
  }
  return normalizeComponentTree(out) ?? [];
}

function collectTypedDescendants(
  node: GjsNode,
  out: WebsiteComponentNode[],
): void {
  if (isProductComponentNode(node)) {
    const product = grapesNodeToProductNode(node);
    if (product) out.push(product);
    return;
  }
  for (const child of childNodes(node)) {
    collectTypedDescendants(child, out);
  }
}

export type PageSectionComponentMap = Record<
  string,
  Record<string, WebsiteComponentNode[]>
>;

/**
 * Walk project pages → sections → nested product trees.
 * Also collects page-root freeform components (orphans) under `__freeform__`.
 */
export function extractPageSectionComponentTrees(
  project: ProjectData | Record<string, unknown>,
): PageSectionComponentMap {
  const byPage: PageSectionComponentMap = {};

  for (const page of collectPagesWithRoots(project)) {
    const sectionMap: Record<string, WebsiteComponentNode[]> = {};
    const orphans: WebsiteComponentNode[] = [];

    const visitRoot = (root: unknown) => {
      if (typeof root === "string") {
        // HTML blob — parse lightly via regex for freeform typed nodes is lossy;
        // string roots are uncommon after GrapesJS save. Skip nested extract.
        return;
      }
      if (!root || typeof root !== "object") return;
      walkForSectionsAndOrphans(root as GjsNode, sectionMap, orphans);
    };

    for (const root of page.roots) visitRoot(root);

    if (orphans.length) {
      sectionMap.__freeform__ = normalizeComponentTree(orphans) ?? orphans;
    }
    byPage[page.id] = sectionMap;
  }

  return byPage;
}

function walkForSectionsAndOrphans(
  node: GjsNode,
  sectionMap: Record<string, WebsiteComponentNode[]>,
  orphans: WebsiteComponentNode[],
  insideSection = false,
): void {
  if (isSectionNode(node)) {
    const sectionId = attrString(node.attributes, "data-section-id");
    if (sectionId) {
      sectionMap[sectionId] = extractComponentsFromSectionNode(node);
    }
    // Do not treat section internals as orphans
    for (const child of childNodes(node)) {
      if (isSectionNode(child)) {
        walkForSectionsAndOrphans(child, sectionMap, orphans, true);
      }
    }
    return;
  }

  if (!insideSection && isProductComponentNode(node)) {
    // Only count as orphan if we're at page-root walk — parent handles recursion
    const product = grapesNodeToProductNode(node);
    if (product) orphans.push(product);
    return;
  }

  for (const child of childNodes(node)) {
    walkForSectionsAndOrphans(child, sectionMap, orphans, insideSection);
  }
}

/**
 * Write extracted component trees onto pages[].sections[].components
 * (and home top-level sections). Preserves specialized section fields.
 */
export function applyCanonicalComponentsFromProject(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
): void {
  const byPage = extractPageSectionComponentTrees(project);
  const pageList = config.pages ?? [];

  for (const page of pageList) {
    const map = byPage[page.id];
    if (!map) continue;

    const existing =
      page.sections && page.sections.length > 0
        ? page.sections
        : page.id === VISUAL_PAGE_HOME
          ? config.sections
          : [];

    const nextSections = applyComponentMapToSections(existing, map, page.id);
    page.sections = nextSections;
  }

  // Mirror home
  const homePage = pageList.find((p) => p.id === VISUAL_PAGE_HOME);
  if (homePage?.sections) {
    config.sections = structuredClone(homePage.sections);
  } else if (byPage[VISUAL_PAGE_HOME]) {
    config.sections = applyComponentMapToSections(
      config.sections,
      byPage[VISUAL_PAGE_HOME],
      VISUAL_PAGE_HOME,
    );
  }
}

function applyComponentMapToSections(
  sections: SectionConfig[],
  map: Record<string, WebsiteComponentNode[]>,
  pageId: string,
): SectionConfig[] {
  const usedFreeform = new Set<string>();
  const next: SectionConfig[] = sections.map((section) => {
    const tree = map[section.id];
    if (tree === undefined) {
      return section;
    }
    usedFreeform.add(section.id);
    if (tree.length === 0) {
      if (!section.components?.length) return section;
      return { ...section, components: undefined };
    }
    return { ...section, components: tree };
  });

  // Ensure every extracted section id is represented
  for (const [sectionId, tree] of Object.entries(map)) {
    if (sectionId === "__freeform__") continue;
    if (next.some((s) => s.id === sectionId)) continue;
    if (!tree.length) continue;
    // Orphaned section extract without matching SectionConfig — skip
    // (section meta sync should have created it)
  }

  const freeform = map.__freeform__;
  if (freeform?.length) {
    const freeId = `${pageId}__freeform`;
    const existingIdx = next.findIndex((s) => s.id === freeId);
    const freeSection: SectionConfig = {
      id: freeId,
      type: FREEFORM_SECTION_TYPE,
      visible: true,
      components: freeform,
    };
    if (existingIdx >= 0) {
      next[existingIdx] = {
        ...next[existingIdx]!,
        components: freeform,
        visible: next[existingIdx]!.visible !== false,
      };
    } else {
      // Insert before footer
      const footerIdx = next.findIndex((s) => s.type === "footer");
      if (footerIdx >= 0) next.splice(footerIdx, 0, freeSection);
      else next.push(freeSection);
    }
    void usedFreeform;
  }

  return next;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function styleObjectToCss(styles: Record<string, string> | undefined): string {
  if (!styles) return "";
  return Object.entries(styles)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function responsiveAttrs(
  responsive: WebsiteComponentResponsiveStyles | undefined,
): string {
  if (!responsive) return "";
  const parts: string[] = [];
  for (const device of ["desktop", "tablet", "mobile"] as const) {
    const bucket = responsive[device];
    if (!bucket) continue;
    for (const [prop, value] of Object.entries(bucket)) {
      parts.push(
        ` data-rstyle-${device}-${escapeHtml(prop)}="${escapeHtml(value)}"`,
      );
    }
  }
  return parts.join("");
}

function visibilityAttrs(
  visibility: WebsiteComponentVisibility | undefined,
  hidden?: boolean,
): string {
  const parts: string[] = [];
  if (hidden) parts.push(` data-visible="false"`);
  if (!visibility) return parts.join("");
  for (const device of ["desktop", "tablet", "mobile"] as const) {
    const v = visibility[device];
    if (v == null) continue;
    parts.push(` data-visible-${device}="${v ? "true" : "false"}"`);
  }
  return parts.join("");
}

function headingTagFromNode(
  props?: Record<string, unknown>,
  content?: Record<string, unknown>,
): string | undefined {
  const fromProps =
    typeof props?.tagName === "string" ? String(props.tagName).toLowerCase() : "";
  if (/^h[1-6]$/.test(fromProps)) return fromProps;
  const fromLevel =
    typeof content?.level === "string" ? String(content.level).toLowerCase() : "";
  if (/^h[1-6]$/.test(fromLevel)) return fromLevel;
  return undefined;
}

function tagForType(
  type: string,
  props?: Record<string, unknown>,
  content?: Record<string, unknown>,
): string {
  if (type === "content-heading") {
    return headingTagFromNode(props, content) || "h2";
  }
  if (typeof props?.tagName === "string") return String(props.tagName);
  switch (type) {
    case "content-text":
      return "p";
    case "content-button":
      return "a";
    case "media-image":
      return "img";
    case "layout-divider":
      return "hr";
    case "form-input":
      return "input";
    case "form-textarea":
      return "textarea";
    case "form-select":
      return "select";
    case "form-form":
      return "form";
    case "form-checkbox":
      return "label";
    case "nav-navbar":
      return "nav";
    case "nav-footer":
      return "footer";
    default:
      return "div";
  }
}

/**
 * Product node → HTML (for GrapesJS projection + preview fallback).
 * Preserves stable ids and product metadata attributes.
 */
export function productNodeToHtml(node: WebsiteComponentNode): string {
  const type = node.type || "unknown";
  const tag = tagForType(type, node.props, node.content);
  const style = styleObjectToCss(node.styles);
  const text =
    (typeof node.content?.text === "string" && node.content.text) ||
    (typeof node.content?.label === "string" && node.content.label) ||
    "";

  const attrs = [
    ` data-component-id="${escapeHtml(node.id)}"`,
    ` data-component-type="${escapeHtml(type)}"`,
    node.variant
      ? ` data-component-variant="${escapeHtml(node.variant)}"`
      : "",
    node.locked ? ` ${LOCK_ATTR}="true"` : "",
    type === "content-heading" && typeof node.content?.level === "string"
      ? ` data-heading-level="${escapeHtml(String(node.content.level))}"`
      : "",
    responsiveAttrs(node.responsive),
    visibilityAttrs(node.visibility, node.hidden),
    style ? ` style="${escapeHtml(style)}"` : "",
  ];

  if (type === "media-image") {
    const src =
      typeof node.content?.src === "string" ? node.content.src : "";
    const alt =
      typeof node.content?.alt === "string" ? node.content.alt : "";
    const mediaId =
      typeof node.content?.mediaId === "string" ? node.content.mediaId : "";
    if (src) attrs.push(` src="${escapeHtml(src)}"`);
    attrs.push(` alt="${escapeHtml(alt)}"`);
    if (mediaId) attrs.push(` data-media-id="${escapeHtml(mediaId)}"`);
    if (typeof node.props?.objectFit === "string") {
      attrs.push(` data-object-fit="${escapeHtml(String(node.props.objectFit))}"`);
    }
    return `<img${attrs.join("")} />`;
  }

  if (type === "layout-divider" || tag === "hr") {
    return `<hr${attrs.join("")} />`;
  }

  if (type === "form-input" || tag === "input") {
    const name =
      typeof node.content?.name === "string" ? node.content.name : "";
    const placeholder =
      typeof node.content?.placeholder === "string"
        ? node.content.placeholder
        : "";
    if (name) attrs.push(` name="${escapeHtml(name)}"`);
    if (placeholder) attrs.push(` placeholder="${escapeHtml(placeholder)}"`);
    if (node.content?.required) attrs.push(` required`);
    attrs.push(` type="text"`);
    return `<input${attrs.join("")} />`;
  }

  if (type === "form-textarea" || tag === "textarea") {
    const name =
      typeof node.content?.name === "string" ? node.content.name : "";
    const placeholder =
      typeof node.content?.placeholder === "string"
        ? node.content.placeholder
        : "";
    if (name) attrs.push(` name="${escapeHtml(name)}"`);
    if (placeholder) attrs.push(` placeholder="${escapeHtml(placeholder)}"`);
    if (node.content?.required) attrs.push(` required`);
    return `<textarea${attrs.join("")}></textarea>`;
  }

  if (type === "content-button") {
    const href =
      typeof node.content?.href === "string" ? node.content.href : "#";
    const target =
      typeof node.content?.target === "string" ? node.content.target : "";
    attrs.push(` href="${escapeHtml(href)}"`);
    if (target) attrs.push(` target="${escapeHtml(target)}"`);
  }

  const childrenHtml = (node.children ?? []).map(productNodeToHtml).join("");
  const inner = childrenHtml || escapeHtml(text);
  return `<${tag}${attrs.join("")}>${inner}</${tag}>`;
}

export function productForestToHtml(nodes: WebsiteComponentNode[]): string {
  return nodes.map(productNodeToHtml).join("");
}

/**
 * Product node → GrapesJS-like JSON component (stable round-trip shape).
 */
export function productNodeToGrapesJson(node: WebsiteComponentNode): GjsNode {
  const type = node.type || "unknown";
  const tag = tagForType(type, node.props, node.content);
  const attributes: Record<string, string> = {
    "data-component-id": node.id,
    "data-component-type": type,
  };
  if (node.variant) attributes["data-component-variant"] = node.variant;
  if (node.locked) attributes[LOCK_ATTR] = "true";
  if (node.hidden) attributes["data-visible"] = "false";
  if (type === "content-heading") {
    const level =
      (typeof node.content?.level === "string" && node.content.level) ||
      headingTagFromNode(node.props, node.content);
    if (level) attributes["data-heading-level"] = level;
  }
  if (node.visibility) {
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      const v = node.visibility[device];
      if (v != null) attributes[`data-visible-${device}`] = v ? "true" : "false";
    }
  }
  if (node.responsive) {
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      const bucket = node.responsive[device];
      if (!bucket) continue;
      for (const [prop, value] of Object.entries(bucket)) {
        attributes[`data-rstyle-${device}-${prop}`] = value;
      }
    }
  }

  const text =
    (typeof node.content?.text === "string" && node.content.text) ||
    (typeof node.content?.label === "string" && node.content.label) ||
    "";

  if (type === "media-image") {
    if (typeof node.content?.src === "string") {
      attributes.src = node.content.src;
    }
    attributes.alt =
      typeof node.content?.alt === "string" ? node.content.alt : "";
    if (typeof node.content?.mediaId === "string") {
      attributes["data-media-id"] = node.content.mediaId;
    }
  }
  if (type === "content-button" && typeof node.content?.href === "string") {
    attributes.href = node.content.href;
  }
  if (
    type === "form-input" ||
    type === "form-textarea" ||
    type === "form-select"
  ) {
    if (typeof node.content?.name === "string") {
      attributes.name = node.content.name;
    }
    if (typeof node.content?.placeholder === "string") {
      attributes.placeholder = node.content.placeholder;
    }
    if (node.content?.required) attributes.required = "true";
  }

  const children: GjsNode[] = [];
  if (node.children?.length) {
    for (const child of node.children) {
      children.push(productNodeToGrapesJson(child));
    }
  } else if (text && tag !== "img" && tag !== "hr" && tag !== "input") {
    children.push({ type: "textnode", content: text });
  }

  return {
    tagName: tag,
    type: tag === "img" || tag === "hr" || tag === "input" ? tag : undefined,
    attributes,
    style: node.styles ? { ...node.styles } : undefined,
    components: children.length ? children : undefined,
  };
}

/** Round-trip helper: Product → Grapes → Product structural compare inputs. */
export function grapesJsonToProductNode(json: GjsNode): WebsiteComponentNode | null {
  return grapesNodeToProductNode(json);
}

/**
 * Append canonical component HTML into a projected section shell.
 */
export function appendComponentsToSectionHtml(
  sectionHtml: string,
  components: WebsiteComponentNode[] | undefined,
): string {
  if (!components?.length) return sectionHtml;
  const injection = productForestToHtml(components);
  const close = sectionHtml.lastIndexOf("</section>");
  if (close >= 0) {
    return (
      sectionHtml.slice(0, close) +
      `<div data-canonical-components="true">${injection}</div>` +
      sectionHtml.slice(close)
    );
  }
  const closeFooter = sectionHtml.lastIndexOf("</footer>");
  if (closeFooter >= 0) {
    return (
      sectionHtml.slice(0, closeFooter) +
      `<div data-canonical-components="true">${injection}</div>` +
      sectionHtml.slice(closeFooter)
    );
  }
  return `${sectionHtml}${injection}`;
}
