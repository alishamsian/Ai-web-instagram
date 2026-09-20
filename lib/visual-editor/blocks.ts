/**
 * Legacy GrapesJS block list — now derived from the product-owned registry.
 * Prefer `@/lib/visual-editor/registry` for new code.
 */

import {
  createBlockHtml,
  getVisualRegistry,
} from "@/lib/visual-editor/registry";

export type VisualBlockDef = {
  id: string;
  label: { fa: string; en: string };
  category: "blocks" | "sections";
  media?: string;
  content: string;
};

function toLegacy(category: "blocks" | "sections"): VisualBlockDef[] {
  return getVisualRegistry()
    .blocks.filter((b) =>
      category === "sections"
        ? b.libraryTab === "sections"
        : b.libraryTab !== "sections",
    )
    .map((b) => {
      const { html } = createBlockHtml(b.id, {
        locale: "en",
        pageId: "home",
        sectionId: `${b.id}-legacy`,
      });
      return {
        id: b.id,
        label: b.label,
        category,
        content: html,
      };
    });
}

export const VISUAL_BLOCKS: VisualBlockDef[] = toLegacy("blocks");
export const VISUAL_SECTIONS: VisualBlockDef[] = toLegacy("sections");
