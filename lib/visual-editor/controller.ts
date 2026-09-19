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

export async function createVisualEditor(
  options: CreateVisualEditorOptions,
): Promise<Editor> {
  const grapesjs = (await import("grapesjs")).default;

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
              ],
            },
            {
              name: "Spacing",
              open: true,
              properties: [
                "margin",
                "padding",
                "gap",
              ],
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
  registerBlocks(editor, options.locale);

  // Append sections blocks into a second container if provided
  if (options.panels.sections) {
    // Blocks already registered; GrapesJS BlockManager renders all into appendTo.
    // Phase 1: sections share the Blocks panel categories — sections panel mirrors via filter UI.
  }

  editor.loadProjectData(options.project);

  const emitUpdate = () => options.onUpdate?.();
  editor.on("update", emitUpdate);
  editor.on("change:changesCount", emitUpdate);
  editor.on("component:update", emitUpdate);
  editor.on("page:select", emitUpdate);
  editor.on("component:selected", () => options.onSelection?.());
  editor.on("component:deselected", () => options.onSelection?.());

  return editor;
}

export function destroyVisualEditor(editor: Editor | null | undefined) {
  if (!editor) return;
  try {
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
