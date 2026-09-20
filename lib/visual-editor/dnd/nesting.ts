/**
 * Drop-target / nesting rules for the product-owned registry.
 * GrapesJS remains the editing tree; this only validates allowed moves.
 */

import { getVisualBlock } from "@/lib/visual-editor/registry";

export type DropPosition = "before" | "after" | "inside";

export type NestDecision = {
  accepted: boolean;
  reason?: string;
};

const LEAF_TYPES = new Set([
  "content-heading",
  "content-text",
  "content-button",
  "media-image",
  "media-video",
  "layout-spacer",
  "layout-divider",
]);

/** True when a registry block (or section) may contain other blocks. */
export function blockCanNest(blockId: string | undefined): boolean {
  if (!blockId) return false;
  if (blockId.startsWith("section-")) return true;
  const def = getVisualBlock(blockId);
  if (def?.canNest) return true;
  return false;
}

export function isLeafBlock(blockId: string | undefined): boolean {
  if (!blockId) return false;
  if (LEAF_TYPES.has(blockId)) return true;
  const def = getVisualBlock(blockId);
  if (!def) return false;
  return !def.canNest && def.libraryTab !== "sections";
}

export function isSectionBlock(blockId: string | undefined): boolean {
  if (!blockId) return false;
  if (blockId.startsWith("section-")) return true;
  const def = getVisualBlock(blockId);
  return Boolean(def?.libraryTab === "sections" || def?.sectionType);
}

/**
 * Can `childBlockId` be nested inside a parent with `parentBlockId`?
 * Wrapper / page root always accepts sections and top-level blocks.
 */
export function canNestBlocks(
  parentBlockId: string | undefined | null,
  childBlockId: string,
): NestDecision {
  // Page wrapper / unknown root
  if (!parentBlockId || parentBlockId === "wrapper" || parentBlockId === "body") {
    return { accepted: true };
  }

  if (isLeafBlock(parentBlockId)) {
    return {
      accepted: false,
      reason: "Leaf components cannot accept children",
    };
  }

  // Sections inside sections: only allow non-section children
  if (isSectionBlock(parentBlockId) && isSectionBlock(childBlockId)) {
    return {
      accepted: false,
      reason: "Sections cannot nest inside other sections",
    };
  }

  if (!blockCanNest(parentBlockId) && isSectionBlock(parentBlockId) === false) {
    return {
      accepted: false,
      reason: "Target cannot nest children",
    };
  }

  // Explicit leaf → anything
  if (isLeafBlock(childBlockId) || !isSectionBlock(childBlockId)) {
    if (blockCanNest(parentBlockId) || isSectionBlock(parentBlockId)) {
      return { accepted: true };
    }
  }

  if (blockCanNest(parentBlockId)) {
    return { accepted: true };
  }

  return { accepted: false, reason: "Invalid nesting" };
}

/**
 * Resolve type id from GrapesJS-like attributes.
 */
export function blockIdFromAttrs(
  attrs: Record<string, string | undefined> | undefined,
): string | undefined {
  if (!attrs) return undefined;
  return (
    attrs["data-component-type"] ||
    attrs["data-section-type"] ||
    undefined
  );
}

/**
 * Normalize section-type attribute (e.g. "hero") to registry id ("section-hero").
 */
export function normalizeBlockId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (getVisualBlock(raw)) return raw;
  const asSection = `section-${raw}`;
  if (getVisualBlock(asSection)) return asSection;
  return raw;
}

export function canDropOnTarget(options: {
  parentBlockId?: string | null;
  targetBlockId?: string | null;
  childBlockId: string;
  position: DropPosition;
}): NestDecision {
  const { parentBlockId, targetBlockId, childBlockId, position } = options;
  if (position === "inside") {
    return canNestBlocks(
      normalizeBlockId(targetBlockId ?? undefined) ?? parentBlockId,
      childBlockId,
    );
  }
  // before/after inserts as sibling under parent
  return canNestBlocks(
    normalizeBlockId(parentBlockId ?? undefined) ?? "wrapper",
    childBlockId,
  );
}
