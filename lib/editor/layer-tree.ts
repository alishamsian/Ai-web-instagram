import type { EditorFieldPath } from "@/components/editor/EditContext";
import type { WebsiteSectionType } from "@/types/website";
import { SECTION_LAYER_BLOCKS } from "@/components/editor/editor-selection";
import type { EditorSectionTab } from "@/lib/editor/ui-state";

export type LayerTreeItem =
  | {
      kind: "section";
      id: string;
      sectionId: string;
      type: WebsiteSectionType;
      visible: boolean;
      expandable: boolean;
    }
  | {
      kind: "block";
      id: string;
      sectionId: string;
      blockId: string;
      field?: EditorFieldPath;
      label: { fa: string; en: string };
    };

export function buildLayerTreeItems(input: {
  sections: Array<{
    id: string;
    type: WebsiteSectionType;
    visible: boolean;
  }>;
  expanded: Record<string, boolean>;
  selectedSectionId?: string;
}): LayerTreeItem[] {
  const items: LayerTreeItem[] = [];
  for (const section of input.sections) {
    const blocks = SECTION_LAYER_BLOCKS[section.type] ?? [];
    items.push({
      kind: "section",
      id: `section:${section.id}`,
      sectionId: section.id,
      type: section.type,
      visible: section.visible,
      expandable: blocks.length > 0,
    });
    const open =
      input.expanded[section.id] ?? input.selectedSectionId === section.id;
    if (!open || !blocks.length) continue;
    for (const block of blocks) {
      items.push({
        kind: "block",
        id: `block:${section.id}:${block.id}`,
        sectionId: section.id,
        blockId: block.id,
        field: block.field,
        label: block.label,
      });
    }
  }
  return items;
}

export function resolveLayerTreeKeyCommand(
  key: string,
  options: {
    index: number;
    itemCount: number;
    expandable: boolean;
    expanded: boolean;
  },
):
  | { type: "move"; index: number }
  | { type: "expand" }
  | { type: "collapse" }
  | { type: "activate" }
  | { type: "escape" }
  | null {
  if (key === "Escape") return { type: "escape" };
  if (key === "Enter" || key === " ") return { type: "activate" };
  if (key === "Home") return { type: "move", index: 0 };
  if (key === "End") {
    return {
      type: "move",
      index: Math.max(0, options.itemCount - 1),
    };
  }
  if (key === "ArrowDown") {
    return {
      type: "move",
      index: Math.min(options.itemCount - 1, options.index + 1),
    };
  }
  if (key === "ArrowUp") {
    return {
      type: "move",
      index: Math.max(0, options.index - 1),
    };
  }
  if (key === "ArrowRight") {
    if (options.expandable && !options.expanded) return { type: "expand" };
    return {
      type: "move",
      index: Math.min(options.itemCount - 1, options.index + 1),
    };
  }
  if (key === "ArrowLeft") {
    if (options.expandable && options.expanded) return { type: "collapse" };
    return {
      type: "move",
      index: Math.max(0, options.index - 1),
    };
  }
  return null;
}

/** Pick the most useful inspector tab for a selected canvas field. */
export function inferSectionTabFromField(
  path?: string,
): EditorSectionTab {
  if (!path) return "content";
  const lower = path.toLowerCase();
  if (
    lower.includes("color") ||
    lower.includes("style") ||
    lower.includes("radius") ||
    lower.includes("shadow") ||
    lower.includes("font") ||
    lower.includes("weight") ||
    lower.includes("typography")
  ) {
    return "style";
  }
  if (
    lower.includes("padding") ||
    lower.includes("spacing") ||
    lower.includes("width") ||
    lower.includes("align") ||
    lower.includes("layout") ||
    lower.includes("gap") ||
    lower.includes("columns")
  ) {
    return "layout";
  }
  return "content";
}

export function schemaGroupPriority(group: string): number {
  const order = [
    "content",
    "typography",
    "layout",
    "media",
    "actions",
    "style",
    "visibility",
    "responsive",
    "data",
  ];
  const index = order.indexOf(group);
  return index === -1 ? 99 : index;
}
