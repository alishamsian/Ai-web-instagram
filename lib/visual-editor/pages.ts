/**
 * Multi-page builder model + pure operations (Phase 2.2).
 * WebsiteConfig.pages = canonical page metadata.
 * GrapesJS ProjectData.pages = visual projection trees.
 */

import type { ProjectData } from "grapesjs";
import type { WebsiteConfig, WebsitePage, WebsitePageKind } from "@/types/website";
import {
  isReservedVisualPageId,
  VISUAL_PAGE_ABOUT,
  VISUAL_PAGE_HOME,
} from "@/lib/visual-editor/ids";
import { collectPagesWithRoots } from "@/lib/visual-editor/sync-from-project";

export const RESERVED_PAGE_SLUGS = new Set(["", "home", "about", "index"]);

export type PageOpErrorCode =
  | "NAME_REQUIRED"
  | "SLUG_REQUIRED"
  | "SLUG_INVALID"
  | "SLUG_RESERVED"
  | "SLUG_DUPLICATE"
  | "ID_DUPLICATE"
  | "PAGE_NOT_FOUND"
  | "HOME_PROTECTED"
  | "LAST_PAGE_PROTECTED"
  | "INVALID_PAGE";

export class PageOpError extends Error {
  code: PageOpErrorCode;
  constructor(code: PageOpErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PageOpError";
  }
}

export function normalizePageSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function pageKindForId(id: string): WebsitePageKind {
  if (id === VISUAL_PAGE_HOME) return "home";
  if (id === VISUAL_PAGE_ABOUT) return "about";
  return "custom";
}

export function defaultSlugForPageId(id: string): string {
  if (id === VISUAL_PAGE_HOME) return "";
  if (id === VISUAL_PAGE_ABOUT) return "about";
  return normalizePageSlug(id) || id;
}

export function hrefForPageSlug(slug: string): string {
  const s = normalizePageSlug(slug);
  return s ? `/${s}` : "/";
}

/** Deterministic custom page id from slug (creation-time). Never random. */
export function pageIdFromSlug(slug: string): string {
  const normalized = normalizePageSlug(slug);
  if (!normalized || RESERVED_PAGE_SLUGS.has(normalized)) {
    throw new PageOpError("SLUG_RESERVED", "Slug is reserved");
  }
  // Prefer slug as id when safe; nested slugs become dashed ids
  return normalized.replace(/\//g, "__");
}

export function validateNewPageInput(
  name: string,
  slugRaw: string,
  existing: WebsitePage[],
): { name: string; slug: string; id: string } {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new PageOpError("NAME_REQUIRED", "Page name is required");
  }
  const slug = normalizePageSlug(slugRaw);
  if (!slug) {
    throw new PageOpError("SLUG_REQUIRED", "Page slug is required");
  }
  if (RESERVED_PAGE_SLUGS.has(slug) || slug === "about") {
    throw new PageOpError("SLUG_RESERVED", "This slug is reserved");
  }
  if (!/^[a-z0-9]+(?:[/_-][a-z0-9]+)*$/.test(slug)) {
    throw new PageOpError("SLUG_INVALID", "Slug contains invalid characters");
  }
  if (existing.some((p) => p.slug === slug)) {
    throw new PageOpError("SLUG_DUPLICATE", "Slug already exists");
  }
  const id = pageIdFromSlug(slug);
  if (existing.some((p) => p.id === id) || isReservedVisualPageId(id)) {
    throw new PageOpError("ID_DUPLICATE", "Page id already exists");
  }
  return { name: trimmedName, slug, id };
}

type ProjectPage = {
  id?: string;
  name?: string;
  slug?: string;
  component?: unknown;
  frames?: unknown;
  [key: string]: unknown;
};

function asProjectPages(
  project: ProjectData | Record<string, unknown>,
): ProjectPage[] {
  const pages = (project as { pages?: unknown }).pages;
  return Array.isArray(pages) ? (pages as ProjectPage[]) : [];
}

function slugFromProjectPage(page: ProjectPage): string {
  if (typeof page.slug === "string" && page.slug.trim()) {
    return normalizePageSlug(page.slug);
  }
  const id = String(page.id || "");
  return defaultSlugForPageId(id);
}

/**
 * Build / refresh WebsiteConfig.pages from GrapesJS project pages.
 * Preserves existing metadata (title/description) when ids match.
 */
export function syncPagesMetaFromProject(
  config: WebsiteConfig,
  project: ProjectData | Record<string, unknown>,
): WebsitePage[] {
  const previous = new Map((config.pages ?? []).map((p) => [p.id, p]));
  const projectPages = asProjectPages(project);
  if (projectPages.length === 0) {
    return ensureDefaultPages(config.pages);
  }

  const next: WebsitePage[] = [];
  const seen = new Set<string>();
  for (const page of projectPages) {
    const id =
      typeof page.id === "string" && page.id.trim()
        ? page.id.trim()
        : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const prev = previous.get(id);
    const kind = pageKindForId(id);
    const fromProject = slugFromProjectPage(page);
    const slug =
      kind === "home"
        ? ""
        : kind === "about"
          ? "about"
          : fromProject || prev?.slug || defaultSlugForPageId(id);
    const fromName =
      typeof page.name === "string" && page.name.trim() ? page.name.trim() : "";
    next.push({
      id,
      slug,
      name:
        fromName ||
        prev?.name ||
        (kind === "home" ? "Home" : kind === "about" ? "About" : id),
      title: prev?.title,
      description: prev?.description,
      kind,
      // Preserve canonical page.sections until applyPageSectionsFromProject runs.
      sections: prev?.sections ? structuredClone(prev.sections) : prev?.sections,
    });
  }
  return next.length > 0 ? next : ensureDefaultPages(config.pages);
}

export function ensureDefaultPages(
  pages: WebsitePage[] | undefined,
): WebsitePage[] {
  const list = [...(pages ?? [])];
  const byId = new Map(list.map((p) => [p.id, p]));
  if (!byId.has(VISUAL_PAGE_HOME)) {
    list.unshift({
      id: VISUAL_PAGE_HOME,
      slug: "",
      name: "Home",
      kind: "home",
    });
  } else {
    const home = byId.get(VISUAL_PAGE_HOME)!;
    home.kind = "home";
    home.slug = "";
  }
  return list.map((p) => ({
    ...p,
    kind: pageKindForId(p.id),
    slug:
      p.id === VISUAL_PAGE_HOME
        ? ""
        : p.id === VISUAL_PAGE_ABOUT
          ? "about"
          : normalizePageSlug(p.slug || p.id),
    sections: p.sections,
  }));
}

/** Ensure config.pages exists and matches project when present. */
export function ensureWebsitePages(config: WebsiteConfig): WebsitePage[] {
  const project = config.visualEditor?.project;
  if (project && !isProjectPagesEmpty(project)) {
    return syncPagesMetaFromProject(config, project);
  }
  return ensureDefaultPages(config.pages);
}

function isProjectPagesEmpty(project: Record<string, unknown>): boolean {
  const pages = asProjectPages(project);
  return pages.length === 0;
}

export function uniqueCopySlug(
  baseSlug: string,
  existing: WebsitePage[],
): string {
  const root = normalizePageSlug(baseSlug) || "page";
  let candidate = `${root}-copy`;
  let n = 2;
  const taken = new Set(existing.map((p) => p.slug));
  while (taken.has(candidate) || RESERVED_PAGE_SLUGS.has(candidate)) {
    candidate = `${root}-copy-${n}`;
    n += 1;
  }
  return candidate;
}

export function uniqueCopyName(baseName: string, existing: WebsitePage[]): string {
  const root = baseName.trim() || "Page";
  let candidate = `${root} (copy)`;
  let n = 2;
  const taken = new Set(existing.map((p) => p.name.trim().toLowerCase()));
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${root} (copy ${n})`;
    n += 1;
  }
  return candidate;
}

/** Pure: add page metadata entry. */
export function addPageMeta(
  pages: WebsitePage[],
  page: WebsitePage,
): WebsitePage[] {
  if (pages.some((p) => p.id === page.id)) {
    throw new PageOpError("ID_DUPLICATE", "Page id already exists");
  }
  if (pages.some((p) => p.slug === page.slug && page.slug !== "")) {
    throw new PageOpError("SLUG_DUPLICATE", "Slug already exists");
  }
  return [...pages, page];
}

export function renamePageMeta(
  pages: WebsitePage[],
  pageId: string,
  patch: { name?: string; slug?: string; title?: string; description?: string },
): WebsitePage[] {
  const index = pages.findIndex((p) => p.id === pageId);
  if (index < 0) throw new PageOpError("PAGE_NOT_FOUND", "Page not found");
  const current = pages[index];
  const name =
    patch.name !== undefined ? patch.name.trim() : current.name;
  if (!name) throw new PageOpError("NAME_REQUIRED", "Page name is required");

  let slug = current.slug;
  if (patch.slug !== undefined && current.kind === "custom") {
    slug = normalizePageSlug(patch.slug);
    if (!slug) throw new PageOpError("SLUG_REQUIRED", "Page slug is required");
    if (RESERVED_PAGE_SLUGS.has(slug) || slug === "about") {
      throw new PageOpError("SLUG_RESERVED", "This slug is reserved");
    }
    if (pages.some((p) => p.id !== pageId && p.slug === slug)) {
      throw new PageOpError("SLUG_DUPLICATE", "Slug already exists");
    }
  }
  if (current.kind === "home") slug = "";
  if (current.kind === "about") slug = "about";

  const next = [...pages];
  next[index] = {
    ...current,
    name,
    slug,
    title: patch.title !== undefined ? patch.title : current.title,
    description:
      patch.description !== undefined ? patch.description : current.description,
  };
  return next;
}

export function removePageMeta(
  pages: WebsitePage[],
  pageId: string,
): WebsitePage[] {
  if (pageId === VISUAL_PAGE_HOME) {
    throw new PageOpError("HOME_PROTECTED", "Home page cannot be deleted");
  }
  if (pages.length <= 1) {
    throw new PageOpError(
      "LAST_PAGE_PROTECTED",
      "Cannot delete the last remaining page",
    );
  }
  if (!pages.some((p) => p.id === pageId)) {
    throw new PageOpError("PAGE_NOT_FOUND", "Page not found");
  }
  return pages.filter((p) => p.id !== pageId);
}

export function reorderPageMeta(
  pages: WebsitePage[],
  orderedIds: string[],
): WebsitePage[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const next: WebsitePage[] = [];
  const seen = new Set<string>();
  for (const id of orderedIds) {
    const page = byId.get(id);
    if (!page || seen.has(id)) continue;
    seen.add(id);
    next.push(page);
  }
  for (const page of pages) {
    if (!seen.has(page.id)) next.push(page);
  }
  // Keep home first when present
  const homeIdx = next.findIndex((p) => p.id === VISUAL_PAGE_HOME);
  if (homeIdx > 0) {
    const [home] = next.splice(homeIdx, 1);
    next.unshift(home);
  }
  return next;
}

/** Reorder GrapesJS project pages by id list (identity preserved). */
export function reorderProjectPages(
  project: ProjectData | Record<string, unknown>,
  orderedIds: string[],
): ProjectData {
  const pages = asProjectPages(project);
  const byId = new Map(
    pages.map((p) => [String(p.id || ""), p] as const).filter(([id]) => id),
  );
  const next: ProjectPage[] = [];
  const seen = new Set<string>();
  for (const id of orderedIds) {
    const page = byId.get(id);
    if (!page || seen.has(id)) continue;
    seen.add(id);
    next.push(page);
  }
  for (const page of pages) {
    const id = String(page.id || "");
    if (!id || seen.has(id)) continue;
    next.push(page);
  }
  return { ...(project as object), pages: next } as ProjectData;
}

export function removeProjectPage(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
): ProjectData {
  if (pageId === VISUAL_PAGE_HOME) {
    throw new PageOpError("HOME_PROTECTED", "Home page cannot be deleted");
  }
  const pages = asProjectPages(project);
  if (pages.length <= 1) {
    throw new PageOpError(
      "LAST_PAGE_PROTECTED",
      "Cannot delete the last remaining page",
    );
  }
  const next = pages.filter((p) => String(p.id || "") !== pageId);
  if (next.length === pages.length) {
    throw new PageOpError("PAGE_NOT_FOUND", "Page not found");
  }
  return { ...(project as object), pages: next } as ProjectData;
}

export function renameProjectPage(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  patch: { name?: string; slug?: string },
): ProjectData {
  const pages = asProjectPages(project);
  const next = pages.map((p) => {
    if (String(p.id || "") !== pageId) return p;
    return {
      ...p,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    };
  });
  return { ...(project as object), pages: next } as ProjectData;
}

/**
 * Deep-clone a GrapesJS page entry with a new id/name/slug.
 * Does not touch assets/media bag.
 */
export function duplicateProjectPage(
  project: ProjectData | Record<string, unknown>,
  sourcePageId: string,
  nextMeta: { id: string; name: string; slug: string },
): ProjectData {
  const pages = asProjectPages(project);
  const source = pages.find((p) => String(p.id || "") === sourcePageId);
  if (!source) throw new PageOpError("PAGE_NOT_FOUND", "Page not found");
  if (pages.some((p) => String(p.id || "") === nextMeta.id)) {
    throw new PageOpError("ID_DUPLICATE", "Page id already exists");
  }
  const clone = structuredClone(source) as ProjectPage;
  clone.id = nextMeta.id;
  clone.name = nextMeta.name;
  clone.slug = nextMeta.slug;
  // Rewrite page markers inside HTML component blobs when present
  if (typeof clone.component === "string") {
    clone.component = clone.component
      .replace(
        new RegExp(`data-website-page="${sourcePageId}"`, "g"),
        `data-website-page="${nextMeta.id}"`,
      )
      .replace(
        /data-page-slug="[^"]*"/g,
        `data-page-slug="${nextMeta.slug}"`,
      );
  }
  return {
    ...(project as object),
    pages: [...pages, clone],
  } as ProjectData;
}

export function blankPageComponent(page: {
  id: string;
  slug: string;
  name: string;
  dir?: string;
  lang?: string;
}): string {
  const dir = page.dir || "ltr";
  const lang = page.lang || "en";
  return `<body data-website-page="${page.id}" data-page-slug="${page.slug}" data-ve-source="user-page" data-ve-adapter="2" dir="${dir}" lang="${lang}" style="margin:0;font-family:system-ui,-apple-system,sans-serif;padding:64px 24px;text-align:center;">
  <h1 data-page-title="true" style="font-size:2rem;margin:0 0 12px;">${escapeHtml(page.name)}</h1>
  <p style="color:#666;margin:0;">Start building this page — drop sections from the library.</p>
</body>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function addBlankProjectPage(
  project: ProjectData | Record<string, unknown>,
  page: { id: string; name: string; slug: string; dir?: string; lang?: string },
): ProjectData {
  const pages = asProjectPages(project);
  if (pages.some((p) => String(p.id || "") === page.id)) {
    throw new PageOpError("ID_DUPLICATE", "Page id already exists");
  }
  return {
    ...(project as object),
    pages: [
      ...pages,
      {
        id: page.id,
        name: page.name,
        slug: page.slug,
        component: blankPageComponent(page),
      },
    ],
  } as ProjectData;
}

/** Resolve internal page href from stable page id. */
export function resolvePageHref(
  pages: WebsitePage[] | undefined,
  pageId: string,
): string {
  const page = (pages ?? []).find((p) => p.id === pageId);
  if (!page) return "#";
  return hrefForPageSlug(page.slug);
}

/**
 * Serialize a GrapesJS component JSON tree to HTML for preview.
 * GrapesJS persists pages as frames[].component objects after load/save —
 * string HTML blobs only exist on freshly projected / blank pages.
 */
export function grapesComponentToHtml(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";
  const n = node as {
    type?: string;
    tagName?: string;
    content?: string;
    components?: unknown;
    attributes?: Record<string, string | boolean | number | undefined>;
    void?: boolean;
  };

  if (n.type === "textnode" || (typeof n.content === "string" && !n.tagName && n.type !== "text")) {
    return typeof n.content === "string" ? n.content : "";
  }

  const children = (() => {
    if (typeof n.components === "string") return n.components;
    if (Array.isArray(n.components)) {
      return n.components.map(grapesComponentToHtml).join("");
    }
    if (typeof n.content === "string") return n.content;
    return "";
  })();

  // Wrapper / body root
  if (n.type === "wrapper" || n.tagName === "body" || (!n.tagName && n.type === "wrapper")) {
    const attrs = attrsToString(n.attributes);
    return `<body${attrs}>${children}</body>`;
  }

  const tag = (n.tagName || (n.type === "text" ? "div" : n.type) || "div").toLowerCase();
  if (tag === "textnode") return children;

  const attrs = attrsToString(n.attributes);
  const voidTags = new Set([
    "img",
    "br",
    "hr",
    "input",
    "meta",
    "link",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ]);
  if (n.void || voidTags.has(tag)) {
    return `<${tag}${attrs} />`;
  }
  return `<${tag}${attrs}>${children}</${tag}>`;
}

function attrsToString(
  attributes?: Record<string, string | boolean | number | undefined>,
): string {
  if (!attributes) return "";
  let out = "";
  for (const [key, value] of Object.entries(attributes)) {
    if (value === false || value === undefined || value === null) continue;
    if (value === true) {
      out += ` ${key}`;
      continue;
    }
    out += ` ${key}="${escapeHtml(String(value))}"`;
  }
  return out;
}

/** Extract HTML body for a GrapesJS page (preview helper). */
export function extractProjectPageHtml(
  project: ProjectData | Record<string, unknown> | undefined,
  pageId: string,
): string | null {
  if (!project) return null;
  for (const page of collectPagesWithRoots(project)) {
    if (page.id !== pageId) continue;
    for (const root of page.roots) {
      if (typeof root === "string" && root.trim()) return root;
      if (root && typeof root === "object") {
        const html = grapesComponentToHtml(root);
        if (html.trim()) return html;
      }
    }
  }
  const pages = asProjectPages(project);
  const match = pages.find((p) => String(p.id || "") === pageId);
  if (!match) return null;
  if (typeof match.component === "string" && match.component.trim()) {
    return match.component;
  }
  return null;
}

export function findPageByIdOrSlug(
  pages: WebsitePage[] | undefined,
  ref: string,
): WebsitePage | undefined {
  const list = pages ?? [];
  return (
    list.find((p) => p.id === ref) ||
    list.find((p) => p.slug === normalizePageSlug(ref)) ||
    (ref === "home" || ref === ""
      ? list.find((p) => p.id === VISUAL_PAGE_HOME)
      : undefined)
  );
}
