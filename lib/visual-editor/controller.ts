/**
 * GrapesJS controller — owns lifecycle, pages, devices, history, serialization.
 * Keep the Editor instance out of React state.
 */

import type { Editor, EditorConfig, ProjectData } from "grapesjs";
import { VISUAL_BLOCKS, VISUAL_SECTIONS } from "@/lib/visual-editor/blocks";
import { VISUAL_DEVICES, type VisualDeviceId } from "@/lib/visual-editor/devices";

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
};

function registerBlocks(editor: Editor, locale: "fa" | "en") {
  const bm = editor.BlockManager;
  for (const block of [...VISUAL_BLOCKS, ...VISUAL_SECTIONS]) {
    bm.add(block.id, {
      label: locale === "fa" ? block.label.fa : block.label.en,
      category:
        block.category === "sections"
          ? locale === "fa"
            ? "سکشن‌ها"
            : "Sections"
          : locale === "fa"
            ? "بلوک‌ها"
            : "Blocks",
      content: block.content,
      media: block.media,
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
      styles: [
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      ],
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

export function getVisualPages(editor: Editor): { id: string; name: string }[] {
  return editor.Pages.getAll().map((page) => ({
    id: page.getId(),
    name: String(page.getName() || page.getId()),
  }));
}

export function selectVisualPage(editor: Editor, pageId: string) {
  const page = editor.Pages.get(pageId);
  if (page) editor.Pages.select(page);
}

export function getActiveVisualPageId(editor: Editor): string | undefined {
  return editor.Pages.getSelected()?.getId();
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
  if (!selected || selected.is("wrapper")) return;
  const parent = selected.parent();
  if (!parent) return;
  const clone = selected.clone();
  const index = selected.index();
  parent.append(clone, { at: index + 1 });
  editor.select(clone);
}

export function deleteSelected(editor: Editor) {
  const selected = editor.getSelected();
  if (!selected || selected.is("wrapper")) return;
  selected.remove();
}

export function toggleSelectedVisibility(editor: Editor) {
  const selected = editor.getSelected();
  if (!selected || selected.is("wrapper")) return;
  const style = selected.getStyle();
  const hidden = style.display === "none";
  selected.addStyle({ display: hidden ? "" : "none" });
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
