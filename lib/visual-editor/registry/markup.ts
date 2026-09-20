/**
 * Markup helpers for registry create() functions.
 * Stable IDs via visualComponentId — never regenerated on projection.
 */

import { visualComponentId } from "@/lib/visual-editor/ids";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function attr(name: string, value: string | boolean | undefined): string {
  if (value === undefined || value === false) return "";
  if (value === true) return ` ${name}`;
  return ` ${name}="${escapeHtml(String(value))}"`;
}

export function componentAttrs(
  sectionId: string,
  role: string,
  extra: Record<string, string | undefined> = {},
): string {
  return [
    attr("data-component-id", visualComponentId(sectionId, role)),
    attr("data-component-type", role),
    ...Object.entries(extra).map(([k, v]) => attr(k, v)),
  ].join("");
}

export function sectionOpen(opts: {
  sectionId: string;
  sectionType: string;
  variant?: string;
  pageId: string;
  blockId: string;
  style?: string;
  tag?: "section" | "footer" | "div";
}): string {
  const tag = opts.tag ?? "section";
  return `<${tag}${attr("data-section-id", opts.sectionId)}${attr(
    "data-section-type",
    opts.sectionType,
  )}${attr("data-section-variant", opts.variant)}${attr(
    "data-component-type",
    opts.blockId,
  )}${attr("data-page-id", opts.pageId)}${attr(
    "data-visible",
    "true",
  )} style="${opts.style ?? "padding:64px 24px;"}">`;
}

export function sectionClose(tag: "section" | "footer" | "div" = "section") {
  return `</${tag}>`;
}

/** Deterministic next section id given existing ids of the same type prefix. */
export function nextSectionId(type: string, existingIds: string[]): string {
  const prefix = `${type}-`;
  let max = 0;
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${type}-${max + 1}`;
}
