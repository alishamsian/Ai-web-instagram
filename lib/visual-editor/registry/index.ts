/**
 * Product-owned visual block registry.
 * GrapesJS BlockManager and the library UI both consume this module.
 */

import type {
  VisualBlockCategory,
  VisualBlockCreateContext,
  VisualBlockDefinition,
  VisualLibraryTab,
  VisualRegistrySnapshot,
} from "@/lib/visual-editor/registry/types";
import { SECTION_BLOCKS } from "@/lib/visual-editor/registry/sections";
import { COMPONENT_BLOCKS } from "@/lib/visual-editor/registry/components";
import { nextSectionId } from "@/lib/visual-editor/registry/markup";
import {
  defaultVariantId,
  resolveVariantId,
} from "@/lib/visual-editor/registry/variants";

export type {
  VisualBlockCategory,
  VisualBlockCreateContext,
  VisualBlockDefinition,
  VisualBlockVariant,
  VisualLibraryTab,
  VisualRegistrySnapshot,
} from "@/lib/visual-editor/registry/types";

export {
  HERO_VARIANTS,
  CTA_VARIANTS,
  TESTIMONIAL_VARIANTS,
  ABOUT_VARIANTS,
  GALLERY_VARIANTS,
  defaultVariantId,
  resolveVariantId,
} from "@/lib/visual-editor/registry/variants";

export { nextSectionId } from "@/lib/visual-editor/registry/markup";

const ALL_BLOCKS: VisualBlockDefinition[] = [
  ...SECTION_BLOCKS,
  ...COMPONENT_BLOCKS,
];

function assertUniqueIds(blocks: VisualBlockDefinition[]) {
  const seen = new Set<string>();
  const variantSeen = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block.id)) {
      throw new Error(`Duplicate visual block id: ${block.id}`);
    }
    seen.add(block.id);
    for (const variant of block.variants ?? []) {
      const key = `${block.id}::${variant.id}`;
      if (variantSeen.has(key)) {
        throw new Error(`Duplicate variant id: ${key}`);
      }
      variantSeen.add(key);
    }
  }
}

assertUniqueIds(ALL_BLOCKS);

const byId = new Map(ALL_BLOCKS.map((b) => [b.id, b]));

export function getVisualRegistry(): VisualRegistrySnapshot {
  return { blocks: ALL_BLOCKS, byId };
}

export function getVisualBlock(
  id: string,
): VisualBlockDefinition | undefined {
  return byId.get(id);
}

export function listVisualBlocks(options?: {
  tab?: VisualLibraryTab;
  category?: VisualBlockCategory;
  query?: string;
}): VisualBlockDefinition[] {
  const q = options?.query?.trim().toLowerCase();
  return ALL_BLOCKS.filter((block) => {
    if (options?.tab && block.libraryTab !== options.tab) return false;
    if (options?.category && block.category !== options.category) return false;
    if (!q) return true;
    const hay = [
      block.id,
      block.label.en,
      block.label.fa,
      block.description?.en,
      block.description?.fa,
      ...(block.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function createBlockHtml(
  blockId: string,
  ctx: Omit<VisualBlockCreateContext, "sectionId"> & {
    sectionId?: string;
    existingSectionIds?: string[];
  },
): { html: string; sectionId: string; block: VisualBlockDefinition } {
  const block = byId.get(blockId);
  if (!block) throw new Error(`Unknown visual block: ${blockId}`);
  const sectionId =
    ctx.sectionId ||
    nextSectionId(
      block.sectionType || block.id.replace(/^(section|layout|content|media)-/, ""),
      ctx.existingSectionIds ?? [],
    );
  const variantId = resolveVariantId(block.variants, ctx.variantId);
  const html = block.create({
    locale: ctx.locale,
    pageId: ctx.pageId,
    sectionId,
    variantId,
    colors: ctx.colors,
  });
  return { html, sectionId, block };
}

/** GrapesJS BlockManager-compatible list derived from the product registry. */
export function registryAsGrapesBlocks(locale: "fa" | "en"): Array<{
  id: string;
  label: string;
  category: string;
  content: string;
  media?: string;
}> {
  return ALL_BLOCKS.map((block) => {
    const { html } = createBlockHtml(block.id, {
      locale,
      pageId: "home",
      sectionId: `${block.sectionType || block.id}-preview`,
      variantId: defaultVariantId(block.variants),
    });
    return {
      id: block.id,
      label: locale === "fa" ? block.label.fa : block.label.en,
      category:
        block.libraryTab === "sections"
          ? locale === "fa"
            ? "سکشن‌ها"
            : "Sections"
          : block.libraryTab === "layout"
            ? locale === "fa"
              ? "چیدمان"
              : "Layout"
            : block.libraryTab === "media"
              ? locale === "fa"
                ? "رسانه"
                : "Media"
              : block.libraryTab === "forms"
                ? locale === "fa"
                  ? "فرم‌ها"
                  : "Forms"
                : locale === "fa"
                  ? "کامپوننت"
                  : "Components",
      content: html,
    };
  });
}
