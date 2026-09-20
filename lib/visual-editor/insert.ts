/**
 * Single product-owned insertion path into the active GrapesJS page.
 */

import type { Editor } from "grapesjs";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import {
  createBlockHtml,
  getVisualBlock,
} from "@/lib/visual-editor/registry";

export type InsertVisualBlockOptions = {
  blockId: string;
  locale: "fa" | "en";
  variantId?: string;
  /** Existing WebsiteConfig section ids (for deterministic next id). */
  existingSectionIds?: string[];
  colors?: WebsiteConfig["brand"]["colors"];
};

export type InsertVisualBlockResult = {
  ok: true;
  sectionId: string;
  blockId: string;
  pageId: string;
  canonical: boolean;
  sectionType?: WebsiteSectionType;
  variantId?: string;
} | {
  ok: false;
  error: string;
};

function collectExistingSectionIds(editor: Editor): string[] {
  const ids: string[] = [];
  try {
    const wrapper = editor.getWrapper();
    const walk = (cmp: { getAttributes?: () => Record<string, string>; components?: () => { models?: unknown[] } | unknown[] }) => {
      const attrs = cmp.getAttributes?.() ?? {};
      if (attrs["data-section-id"]) ids.push(attrs["data-section-id"]);
      const kids = cmp.components?.();
      const list = Array.isArray(kids)
        ? kids
        : ((kids as { models?: unknown[] } | undefined)?.models ?? []);
      for (const child of list) {
        walk(child as typeof cmp);
      }
    };
    if (wrapper) walk(wrapper as never);
  } catch {
    // ignore
  }
  return ids;
}

/**
 * Insert a registry block into the currently selected GrapesJS page.
 * Returns metadata so the shell can register SectionConfig when on home.
 */
export function insertVisualBlock(
  editor: Editor,
  options: InsertVisualBlockOptions,
): InsertVisualBlockResult {
  const def = getVisualBlock(options.blockId);
  if (!def) {
    return { ok: false, error: `Unknown block: ${options.blockId}` };
  }
  const pageId = editor.Pages.getSelected()?.getId() || "home";
  const existing = [
    ...(options.existingSectionIds ?? []),
    ...collectExistingSectionIds(editor),
  ];
  try {
    const { html, sectionId, block } = createBlockHtml(options.blockId, {
      locale: options.locale,
      pageId,
      variantId: options.variantId,
      existingSectionIds: existing,
      colors: options.colors,
    });
    const selected = editor.getSelected();
    const wrapper = editor.getWrapper();
    if (!wrapper) {
      return { ok: false, error: "No insert target" };
    }
    if (selected && !selected.is("wrapper")) {
      const parent = selected.parent() || wrapper;
      const idx = selected.index();
      parent.append(html, { at: idx + 1 });
    } else {
      wrapper.append(html);
    }
    const variant =
      options.variantId ||
      block.variants?.find((v) => v.default)?.id ||
      block.variants?.[0]?.id;
    return {
      ok: true,
      sectionId,
      blockId: block.id,
      pageId,
      canonical: Boolean(block.canonical && block.sectionType),
      sectionType: block.sectionType,
      variantId: variant,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Insert failed",
    };
  }
}

/** Apply a variant by regenerating section markup attributes (preserves content paths). */
export function applySectionVariant(
  editor: Editor,
  variantId: string,
): boolean {
  const selected = editor.getSelected();
  if (!selected) return false;
  let target = selected;
  while (target && !target.getAttributes()?.["data-section-id"]) {
    const parent = target.parent?.();
    if (!parent || parent.is("wrapper")) break;
    target = parent;
  }
  const attrs = target.getAttributes?.() ?? {};
  if (!attrs["data-section-id"]) return false;
  target.addAttributes({ "data-section-variant": variantId });
  target.addAttributes({ "data-component-variant": variantId });
  return true;
}
