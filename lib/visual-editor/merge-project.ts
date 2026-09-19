/**
 * Merge a fresh WebsiteConfig projection with a previously saved GrapesJS project.
 *
 * Rules:
 * - Home/About reserved pages refresh from projection when source fingerprint drifts
 * - Extra user pages (not home/about) are preserved from the saved project
 * - Assets are unioned (saved + projected), keyed by id/src
 * - Never invent demo content
 */

import type { ProjectData } from "grapesjs";
import {
  isReservedVisualPageId,
  VISUAL_PAGE_ABOUT,
  VISUAL_PAGE_HOME,
} from "@/lib/visual-editor/ids";

type PageLike = {
  id?: string;
  name?: string;
  component?: unknown;
  frames?: unknown;
  [key: string]: unknown;
};

function pageId(page: PageLike): string {
  return String(page.id || "");
}

function asPages(project: ProjectData | Record<string, unknown>): PageLike[] {
  const pages = (project as { pages?: unknown }).pages;
  return Array.isArray(pages) ? (pages as PageLike[]) : [];
}

function asAssets(
  project: ProjectData | Record<string, unknown>,
): Array<Record<string, unknown>> {
  const assets = (project as { assets?: unknown }).assets;
  return Array.isArray(assets) ? (assets as Array<Record<string, unknown>>) : [];
}

function assetKey(asset: Record<string, unknown>): string {
  if (typeof asset.id === "string" && asset.id) return `id:${asset.id}`;
  if (typeof asset.src === "string" && asset.src) return `src:${asset.src}`;
  return JSON.stringify(asset);
}

/**
 * When Classic/API changed WebsiteConfig, rebuild reserved pages from projection
 * while keeping any additional GrapesJS pages the user created.
 */
export function mergeProjectedWithSavedProject(
  projected: ProjectData,
  saved: ProjectData | Record<string, unknown>,
): ProjectData {
  const projectedPages = asPages(projected);
  const savedPages = asPages(saved);

  const byId = new Map<string, PageLike>();
  for (const page of projectedPages) {
    const id = pageId(page) || VISUAL_PAGE_HOME;
    byId.set(id, { ...page, id });
  }

  // Preserve extra pages from the saved visual project
  for (const page of savedPages) {
    const id = pageId(page);
    if (!id || isReservedVisualPageId(id)) continue;
    if (!byId.has(id)) {
      byId.set(id, page);
    }
  }

  // Prefer projected home/about; if projection omitted about but saved had it, drop reserved about
  // unless projection includes it (handled by projectedPages).

  const ordered: PageLike[] = [];
  const home = byId.get(VISUAL_PAGE_HOME);
  if (home) {
    ordered.push(home);
    byId.delete(VISUAL_PAGE_HOME);
  }
  const about = byId.get(VISUAL_PAGE_ABOUT);
  if (about) {
    ordered.push(about);
    byId.delete(VISUAL_PAGE_ABOUT);
  }
  for (const page of byId.values()) {
    ordered.push(page);
  }

  const assetMap = new Map<string, Record<string, unknown>>();
  for (const asset of [...asAssets(projected), ...asAssets(saved)]) {
    assetMap.set(assetKey(asset), asset);
  }

  const stylesProjected = (projected as { styles?: unknown }).styles;
  const stylesSaved = (saved as { styles?: unknown }).styles;

  return {
    ...projected,
    pages: ordered,
    assets: Array.from(assetMap.values()),
    // Prefer projected styles when rebuilding; keep saved styles if projected empty
    styles:
      Array.isArray(stylesProjected) && stylesProjected.length > 0
        ? stylesProjected
        : Array.isArray(stylesSaved)
          ? stylesSaved
          : [],
  } as ProjectData;
}
