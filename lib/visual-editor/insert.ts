/**
 * Single product-owned insertion path into the active GrapesJS page.
 */

import type { Component, Editor } from "grapesjs";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import {
  createBlockHtml,
  getVisualBlock,
} from "@/lib/visual-editor/registry";
import {
  canNestBlocks,
  normalizeBlockId,
  type DropPosition,
} from "@/lib/visual-editor/dnd/nesting";
import { switchSectionVariant } from "@/lib/visual-editor/variants/switch";

export type InsertVisualBlockOptions = {
  blockId: string;
  locale: "fa" | "en";
  variantId?: string;
  /** Existing WebsiteConfig section ids (for deterministic next id). */
  existingSectionIds?: string[];
  colors?: WebsiteConfig["brand"]["colors"];
  /** Precise drop target (GrapesJS component id). */
  targetComponentId?: string;
  position?: DropPosition;
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
    const walk = (cmp: {
      getAttributes?: () => Record<string, string>;
      components?: () => { models?: unknown[] } | unknown[];
    }) => {
      const attrs = cmp.getAttributes?.() ?? {};
      if (attrs["data-section-id"]) ids.push(attrs["data-section-id"]);
      // Freeform inserts scope ids as `${type}-N__role` — treat scopes as taken
      // so nextSectionId never reuses them (prevents duplicate component ids).
      const componentId = attrs["data-component-id"];
      if (componentId) {
        const scope = componentId.includes("__")
          ? componentId.slice(0, componentId.indexOf("__"))
          : componentId;
        if (scope) ids.push(scope);
      }
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

function findById(editor: Editor, id: string): Component | null {
  try {
    const all = editor.getWrapper()?.find?.(`*`) ?? [];
    // GrapesJS Components collection — prefer Components.get
    const byGet = editor.Components?.getById?.(id);
    if (byGet) return byGet;
    void all;
  } catch {
    // fall through
  }
  const wrapper = editor.getWrapper();
  if (!wrapper) return null;
  let found: Component | null = null;
  const walk = (cmp: Component) => {
    if (found) return;
    if (cmp.getId?.() === id) {
      found = cmp;
      return;
    }
    const kids = cmp.components?.();
    const list = Array.isArray(kids)
      ? kids
      : ((kids as { models?: Component[] } | undefined)?.models ?? []);
    for (const child of list) walk(child);
  };
  walk(wrapper);
  return found;
}

function appendAt(
  parent: Component,
  html: string,
  at?: number,
): void {
  if (typeof at === "number") {
    parent.append(html, { at });
  } else {
    parent.append(html);
  }
}

/**
 * Insert a registry block into the currently selected GrapesJS page.
 * Supports precise before/after/inside placement when targetComponentId is set.
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
    const wrapper = editor.getWrapper();
    if (!wrapper) {
      return { ok: false, error: "No insert target" };
    }

    const position = options.position ?? "after";
    const target = options.targetComponentId
      ? findById(editor, options.targetComponentId)
      : null;

    if (target && !target.is("wrapper")) {
      const targetAttrs = target.getAttributes?.() ?? {};
      const targetBlockId = normalizeBlockId(
        targetAttrs["data-component-type"] ||
          (targetAttrs["data-section-type"]
            ? `section-${targetAttrs["data-section-type"]}`
            : undefined),
      );
      const parent = target.parent() || wrapper;
      const parentAttrs = parent.getAttributes?.() ?? {};
      const parentBlockId = parent.is("wrapper")
        ? "wrapper"
        : normalizeBlockId(
            parentAttrs["data-component-type"] ||
              (parentAttrs["data-section-type"]
                ? `section-${parentAttrs["data-section-type"]}`
                : undefined),
          );

      if (position === "inside") {
        const nest = canNestBlocks(targetBlockId, options.blockId);
        if (!nest.accepted) {
          return { ok: false, error: nest.reason || "Invalid drop target" };
        }
        appendAt(target, html);
      } else {
        const nest = canNestBlocks(parentBlockId ?? "wrapper", options.blockId);
        if (!nest.accepted) {
          return { ok: false, error: nest.reason || "Invalid drop target" };
        }
        const idx = target.index();
        appendAt(parent, html, position === "before" ? idx : idx + 1);
      }
    } else {
      const selected = editor.getSelected();
      if (selected && !selected.is("wrapper")) {
        const parent = selected.parent() || wrapper;
        const parentAttrs = parent.getAttributes?.() ?? {};
        const parentBlockId = parent.is("wrapper")
          ? "wrapper"
          : normalizeBlockId(
              parentAttrs["data-component-type"] ||
                (parentAttrs["data-section-type"]
                  ? `section-${parentAttrs["data-section-type"]}`
                  : undefined),
            );
        const nest = canNestBlocks(parentBlockId ?? "wrapper", options.blockId);
        if (!nest.accepted) {
          return { ok: false, error: nest.reason || "Invalid drop target" };
        }
        const idx = selected.index();
        appendAt(parent, html, idx + 1);
      } else {
        // Page root always accepts sections and freeform blocks.
        appendAt(wrapper, html);
      }
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

/**
 * Apply a variant by rebuilding section structure (preserves ids + compatible content).
 * @deprecated Prefer switchSectionVariant — kept as stable alias.
 */
export function applySectionVariant(
  editor: Editor,
  variantId: string,
  options?: {
    locale?: "fa" | "en";
    colors?: WebsiteConfig["brand"]["colors"];
  },
): boolean {
  const result = switchSectionVariant(editor, variantId, options);
  return result.ok;
}

export { switchSectionVariant };
