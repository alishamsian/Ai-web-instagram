/**
 * GrapesJS controller — owns lifecycle, pages, devices, history, serialization.
 * Keep the Editor instance out of React state.
 */

import type { Editor, EditorConfig, ProjectData } from "grapesjs";
import {
  createBlockHtml,
  registryAsGrapesBlocks,
} from "@/lib/visual-editor/registry";
import { VISUAL_DEVICES, type VisualDeviceId } from "@/lib/visual-editor/devices";
import {
  resolveVisualDesignTokens,
  visualDesignTokenStyleTag,
} from "@/lib/visual-editor/design-tokens";
import { duplicateComponentSafe } from "@/lib/visual-editor/duplicate";
import { isInLockedSubtree, toggleComponentLocked } from "@/lib/visual-editor/lock";
import type { WebsiteConfig } from "@/types/website";

export type VisualEditorPanels = {
  canvas: HTMLElement;
  blocks?: HTMLElement | null;
  sections?: HTMLElement | null;
  layers?: HTMLElement | null;
  styles?: HTMLElement | null;
  traits?: HTMLElement | null;
};

export type CreateVisualEditorOptions = {
  panels: VisualEditorPanels;
  project: ProjectData;
  locale: "fa" | "en";
  /** Optional brand config for canvas design tokens. */
  websiteConfig?: WebsiteConfig;
  /** Existing site media for AssetManager */
  mediaAssets?: Array<{
    id: string;
    src: string;
    name?: string;
    type?: "image" | "video";
  }>;
  /** Return false to abort after async import (Strict Mode / remount safety). */
  isCurrent?: () => boolean;
  onUpdate?: () => void;
  onSelection?: () => void;
  /** Hovered component (non-wrapper) — for product hover badge. */
  onHover?: (payload: { id: string; label: string } | null) => void;
};

function collectEditorScopeIds(editor: Editor): string[] {
  const ids: string[] = [];
  try {
    const wrapper = editor.getWrapper();
    const walk = (cmp: {
      getAttributes?: () => Record<string, string>;
      components?: () => { models?: unknown[] } | unknown[];
    }) => {
      const attrs = cmp.getAttributes?.() ?? {};
      if (attrs["data-section-id"]) ids.push(attrs["data-section-id"]);
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
      for (const child of list) walk(child as typeof cmp);
    };
    if (wrapper) walk(wrapper as never);
  } catch {
    // ignore
  }
  return ids;
}

function registerBlocks(editor: Editor, locale: "fa" | "en") {
  const bm = editor.BlockManager;
  for (const meta of registryAsGrapesBlocks(locale)) {
    bm.add(meta.id, {
      label: meta.label,
      category: meta.category,
      media: meta.media,
      // Fresh IDs on every drag — never reuse static preview scopes.
      content: () => {
        const pageId = editor.Pages.getSelected()?.getId() || "home";
        const { html } = createBlockHtml(meta.id, {
          locale,
          pageId,
          existingSectionIds: collectEditorScopeIds(editor),
        });
        return html;
      },
    });
  }
}

function enhanceImageComponent(editor: Editor) {
  editor.DomComponents.addType("image", {
    extend: "image",
    model: {
      defaults: {
        traits: [
          { type: "text", name: "src", label: "Source" },
          { type: "text", name: "alt", label: "Alt" },
          { type: "text", name: "title", label: "Title" },
          { type: "text", name: "width", label: "Width" },
          { type: "text", name: "height", label: "Height" },
        ],
      },
    },
  });
}

export async function createVisualEditor(
  options: CreateVisualEditorOptions,
): Promise<Editor | null> {
  const grapesjs = (await import("grapesjs")).default;
  if (options.isCurrent && !options.isCurrent()) {
    return null;
  }

  const canvasStyles = [
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  ];
  if (options.websiteConfig) {
    const tokens = resolveVisualDesignTokens(options.websiteConfig);
    // Inline style tag via data URL keeps tokens in canvas without extra fetch
    const css = visualDesignTokenStyleTag(tokens);
    canvasStyles.push(
      `data:text/css;charset=utf-8,${encodeURIComponent(css)}`,
    );
  }

  const config: EditorConfig = {
    container: options.panels.canvas,
    height: "100%",
    width: "auto",
    fromElement: false,
    storageManager: false,
    noticeOnUnload: false,
    showOffsets: true,
    showOffsetsSelected: true,
    canvas: {
      styles: canvasStyles,
    },
    deviceManager: {
      devices: VISUAL_DEVICES.map((d) => ({
        id: d.grapesName,
        name: d.grapesName,
        width: d.width,
        widthMedia: d.widthMedia,
      })),
    },
    assetManager: {
      upload: false,
      autoAdd: true,
      assets: (options.mediaAssets ?? []).map((asset) => ({
        type: asset.type === "video" ? "video" : "image",
        src: asset.src,
        name: asset.name || asset.id,
      })),
    },
    panels: { defaults: [] },
    blockManager: options.panels.blocks
      ? { appendTo: options.panels.blocks }
      : undefined,
    layerManager: options.panels.layers
      ? { appendTo: options.panels.layers }
      : undefined,
    styleManager: options.panels.styles
      ? {
          appendTo: options.panels.styles,
          sectors: [
            {
              name: "Layout",
              open: true,
              properties: [
                "width",
                "height",
                "min-width",
                "max-width",
                "display",
                "position",
                "top",
                "right",
                "bottom",
                "left",
                "flex-direction",
                "justify-content",
                "align-items",
                "flex-wrap",
                "grid-template-columns",
                "object-fit",
                "object-position",
              ],
            },
            {
              name: "Spacing",
              open: true,
              properties: ["margin", "padding", "gap"],
            },
            {
              name: "Typography",
              open: false,
              properties: [
                "font-family",
                "font-size",
                "font-weight",
                "line-height",
                "letter-spacing",
                "text-align",
                "text-transform",
                "color",
              ],
            },
            {
              name: "Appearance",
              open: false,
              properties: [
                "background-color",
                "background",
                "border",
                "border-radius",
                "box-shadow",
                "opacity",
              ],
            },
          ],
        }
      : undefined,
    traitManager: options.panels.traits
      ? { appendTo: options.panels.traits }
      : undefined,
    selectorManager: { componentFirst: true },
  };

  const editor = grapesjs.init(config);
  if (options.isCurrent && !options.isCurrent()) {
    destroyVisualEditor(editor);
    return null;
  }

  registerBlocks(editor, options.locale);
  enhanceImageComponent(editor);

  editor.loadProjectData(options.project);

  // Re-add media assets after project load (project assets may be empty)
  for (const asset of options.mediaAssets ?? []) {
    try {
      editor.AssetManager.add({
        type: asset.type === "video" ? "video" : "image",
        src: asset.src,
        name: asset.name || asset.id,
      });
    } catch {
      // ignore duplicates
    }
  }

  const emitUpdate = () => options.onUpdate?.();
  editor.on("update", emitUpdate);
  editor.on("change:changesCount", emitUpdate);
  editor.on("component:update", emitUpdate);
  editor.on("page:select", emitUpdate);
  editor.on("component:selected", () => options.onSelection?.());
  editor.on("component:deselected", () => options.onSelection?.());

  if (options.onHover) {
    editor.on("component:hover", (component: unknown) => {
      const cmp = component as {
        is?: (t: string) => boolean;
        getId?: () => string;
        getAttributes?: () => Record<string, string>;
        get?: (k: string) => unknown;
      } | null;
      if (!cmp || cmp.is?.("wrapper")) {
        options.onHover?.(null);
        return;
      }
      const attrs = cmp.getAttributes?.() ?? {};
      const label =
        attrs["data-label"] ||
        attrs["data-section-type"] ||
        attrs["data-component-type"] ||
        String(cmp.get?.("tagName") || "Element");
      options.onHover?.({
        id: cmp.getId?.() || "",
        label: String(label),
      });
    });
    editor.on("component:unhover", () => options.onHover?.(null));
  }

  if (process.env.NODE_ENV !== "production") {
    (
      globalThis as typeof globalThis & { __veEditor?: Editor }
    ).__veEditor = editor;
  }

  return editor;
}

export function destroyVisualEditor(editor: Editor | null | undefined) {
  if (!editor) return;
  try {
    const g = globalThis as typeof globalThis & { __veEditor?: Editor };
    if (g.__veEditor === editor) {
      delete g.__veEditor;
    }
    editor.destroy();
  } catch {
    // ignore double-destroy
  }
}

export function setVisualDevice(editor: Editor, device: VisualDeviceId) {
  const match = VISUAL_DEVICES.find((d) => d.id === device);
  if (!match) return;
  editor.setDevice(match.grapesName);
}

export function getVisualPages(editor: Editor): {
  id: string;
  name: string;
  slug?: string;
}[] {
  return editor.Pages.getAll().map((page) => {
    const id = page.getId();
    const attrs = (page as unknown as { get?: (k: string) => unknown }).get?.(
      "slug",
    );
    return {
      id,
      name: String(page.getName() || id),
      slug: typeof attrs === "string" ? attrs : undefined,
    };
  });
}

export function selectVisualPage(editor: Editor, pageId: string) {
  const page = editor.Pages.get(pageId);
  if (page) editor.Pages.select(page);
}

/** Clear undo stack at page boundaries (page-safe history). */
export function clearVisualUndoHistory(editor: Editor) {
  try {
    editor.UndoManager.clear();
  } catch {
    // older grapes builds
  }
}

export function getActiveVisualPageId(editor: Editor): string | undefined {
  return editor.Pages.getSelected()?.getId();
}

export function createVisualPage(
  editor: Editor,
  page: { id: string; name: string; slug: string; componentHtml: string },
) {
  if (editor.Pages.get(page.id)) {
    throw new Error("Page id already exists");
  }
  const added = editor.Pages.add({
    id: page.id,
    name: page.name,
    component: page.componentHtml,
  });
  const created = Array.isArray(added) ? added[0] : added;
  if (!created) throw new Error("Failed to create page");
  try {
    (created as unknown as { set: (k: string, v: unknown) => void }).set(
      "slug",
      page.slug,
    );
  } catch {
    // ignore
  }
  editor.Pages.select(created);
  return created.getId();
}

export function renameVisualPage(
  editor: Editor,
  pageId: string,
  patch: { name?: string; slug?: string },
) {
  const page = editor.Pages.get(pageId);
  if (!page) throw new Error("Page not found");
  if (patch.name !== undefined) page.setName(patch.name);
  if (patch.slug !== undefined) {
    try {
      (page as unknown as { set: (k: string, v: unknown) => void }).set(
        "slug",
        patch.slug,
      );
    } catch {
      // ignore
    }
  }
}

export function deleteVisualPage(editor: Editor, pageId: string) {
  if (pageId === "home") throw new Error("Home page cannot be deleted");
  const all = editor.Pages.getAll();
  if (all.length <= 1) throw new Error("Cannot delete the last remaining page");
  const page = editor.Pages.get(pageId);
  if (!page) throw new Error("Page not found");
  const wasSelected = editor.Pages.getSelected()?.getId() === pageId;
  editor.Pages.remove(page);
  if (wasSelected) {
    const next = editor.Pages.getAll()[0];
    if (next) editor.Pages.select(next);
  }
}

export function duplicateVisualPage(
  editor: Editor,
  sourcePageId: string,
  next: { id: string; name: string; slug: string },
) {
  if (editor.Pages.get(next.id)) throw new Error("Page id already exists");
  const source = editor.Pages.get(sourcePageId);
  if (!source) throw new Error("Page not found");
  // Prefer component HTML export for a genuine independent tree
  const componentHtml =
    typeof (source as unknown as { getMainComponent?: () => { toHTML?: () => string } }).getMainComponent ===
    "function"
      ? (source as unknown as { getMainComponent: () => { toHTML: () => string } })
          .getMainComponent()
          .toHTML()
      : `<body data-website-page="${next.id}" data-page-slug="${next.slug}"><h1>${next.name}</h1></body>`;

  let html = componentHtml;
  html = html
    .replace(
      new RegExp(`data-website-page="${sourcePageId}"`, "g"),
      `data-website-page="${next.id}"`,
    )
    .replace(/data-page-slug="[^"]*"/g, `data-page-slug="${next.slug}"`);

  return createVisualPage(editor, {
    id: next.id,
    name: next.name,
    slug: next.slug,
    componentHtml: html,
  });
}

export function reorderVisualPages(editor: Editor, orderedIds: string[]) {
  const pages = editor.Pages.getAll();
  const byId = new Map(pages.map((p) => [p.getId(), p]));
  // GrapesJS Pages order: remove+re-add is heavy; set order via move when available
  const manager = editor.Pages as unknown as {
    getAll: () => typeof pages;
    move?: (page: unknown, opts: { at: number }) => void;
  };
  let at = 0;
  for (const id of orderedIds) {
    const page = byId.get(id);
    if (!page) continue;
    if (typeof manager.move === "function") {
      manager.move(page, { at });
    }
    at += 1;
  }
}

export function serializeVisualProject(editor: Editor): ProjectData {
  return editor.getProjectData();
}

export function visualUndo(editor: Editor) {
  editor.UndoManager.undo();
}

export function visualRedo(editor: Editor) {
  editor.UndoManager.redo();
}

export function canVisualUndo(editor: Editor): boolean {
  return editor.UndoManager.hasUndo();
}

export function canVisualRedo(editor: Editor): boolean {
  return editor.UndoManager.hasRedo();
}

export function duplicateSelected(editor: Editor) {
  const selected = editor.getSelected();
  if (isInLockedSubtree(selected)) return;
  duplicateComponentSafe(editor);
}

export function deleteSelected(editor: Editor) {
  const selected = editor.getSelected();
  if (!selected || selected.is("wrapper")) return;
  if (isInLockedSubtree(selected)) return;
  selected.remove();
}

export function toggleSelectedVisibility(editor: Editor) {
  const selected = editor.getSelected();
  if (!selected || selected.is("wrapper")) return;
  if (isInLockedSubtree(selected)) return;
  const style = selected.getStyle();
  const hidden = style.display === "none";
  selected.addStyle({ display: hidden ? "" : "none" });
}

export function toggleSelectedLock(editor: Editor): boolean | null {
  const selected = editor.getSelected();
  if (!selected || selected.is("wrapper")) return null;
  return toggleComponentLocked(selected);
}

/** Editor-only zoom via GrapesJS Canvas API (never serialized). */
export function setVisualZoom(editor: Editor, zoom: number | "fit") {
  if (zoom === "fit") {
    editor.Canvas.setZoom(100);
    return;
  }
  editor.Canvas.setZoom(zoom);
}

export function applyMediaToSelectedImage(
  editor: Editor,
  media: { id: string; url: string; alt?: string },
) {
  const selected = editor.getSelected();
  if (!selected) return false;
  const isImage =
    selected.is("image") ||
    selected.get("tagName") === "img" ||
    selected.get("type") === "image";
  if (!isImage) return false;
  selected.addAttributes({
    src: media.url,
    alt: media.alt || selected.getAttributes().alt || "",
    "data-media-id": media.id,
  });
  selected.set("src", media.url);
  return true;
}

export function openAssetManager(editor: Editor) {
  editor.AssetManager.open({
    types: ["image"],
    select(asset, complete) {
      const selected = editor.getSelected();
      if (selected && (selected.is("image") || selected.get("tagName") === "img")) {
        const src = asset.getSrc();
        selected.addAttributes({ src });
        selected.set("src", src);
      }
      if (complete) editor.AssetManager.close();
    },
  });
}
