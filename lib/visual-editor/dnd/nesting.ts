/**
 * Drop-target / nesting rules for the product-owned registry.
 * GrapesJS remains the editing tree; this only validates allowed moves.
 */

import { getVisualBlock, getVisualRegistry } from "@/lib/visual-editor/registry";

export type DropPosition = "before" | "after" | "inside";

export type NestDecision = {
  accepted: boolean;
  reason?: string;
};

const ROOT_PARENTS = new Set(["wrapper", "body", ""]);

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
  const def = getVisualBlock(blockId);
  if (def) {
    if (def.libraryTab === "sections" || def.sectionType) return false;
    return def.canNest !== true;
  }
  // Unknown non-section ids treated as leaves (safe default)
  return !blockId.startsWith("section-");
}

export function isSectionBlock(blockId: string | undefined): boolean {
  if (!blockId) return false;
  if (blockId.startsWith("section-")) return true;
  const normalized = normalizeBlockId(blockId);
  if (normalized && normalized !== blockId && normalized.startsWith("section-")) {
    return true;
  }
  const def = getVisualBlock(blockId) ?? getVisualBlock(normalized ?? "");
  return Boolean(def?.libraryTab === "sections" || def?.sectionType);
}

/** Block ids that may be placed as children of `parentBlockId`. */
export function getAllowedChildren(
  parentBlockId: string | undefined | null,
): string[] {
  const parent = normalizeBlockId(parentBlockId ?? undefined);
  if (!parent || ROOT_PARENTS.has(parent)) {
    return getVisualRegistry().blocks.map((b) => b.id);
  }
  const def = getVisualBlock(parent);
  if (!def || !blockCanNest(parent)) return [];
  const explicit = def.nesting?.allowedChildren;
  const denied = new Set(def.nesting?.deniedChildren ?? []);
  const pool = explicit?.length
    ? explicit
    : getVisualRegistry()
        .blocks.filter((b) => !isSectionBlock(b.id) || !isSectionBlock(parent))
        .map((b) => b.id);
  return pool.filter(
    (id) =>
      !denied.has(id) &&
      !(isSectionBlock(parent) && isSectionBlock(id)),
  );
}

/** Parent block ids that may contain `childBlockId`. */
export function getAllowedParents(childBlockId: string): string[] {
  const child = normalizeBlockId(childBlockId);
  if (!child) return ["wrapper"];
  const def = getVisualBlock(child);
  if (def?.nesting?.allowedParents?.length) {
    return def.nesting.allowedParents;
  }
  if (isSectionBlock(child)) {
    return ["wrapper", "body"];
  }
  // Non-sections: any nestable parent + wrapper
  const parents = getVisualRegistry()
    .blocks.filter((b) => blockCanNest(b.id))
    .map((b) => b.id);
  return ["wrapper", "body", ...parents];
}

/**
 * Can `childBlockId` be nested inside a parent with `parentBlockId`?
 * Wrapper / page root always accepts sections and top-level blocks.
 */
export function canNestBlocks(
  parentBlockId: string | undefined | null,
  childBlockId: string,
): NestDecision {
  const parent = normalizeBlockId(parentBlockId ?? undefined) ?? "";
  const child = normalizeBlockId(childBlockId) || childBlockId;

  if (!parent || ROOT_PARENTS.has(parent)) {
    return { accepted: true };
  }

  if (isLeafBlock(parent)) {
    return {
      accepted: false,
      reason: "Leaf components cannot accept children",
    };
  }

  if (isSectionBlock(parent) && isSectionBlock(child)) {
    return {
      accepted: false,
      reason: "Sections cannot nest inside other sections",
    };
  }

  const parentDef = getVisualBlock(parent);
  const childDef = getVisualBlock(child);

  if (childDef?.nesting?.allowedParents?.length) {
    if (!childDef.nesting.allowedParents.includes(parent)) {
      return {
        accepted: false,
        reason: `${child} cannot nest under ${parent}`,
      };
    }
  }

  if (parentDef?.nesting?.deniedChildren?.includes(child)) {
    return {
      accepted: false,
      reason: `${parent} does not accept ${child}`,
    };
  }

  if (parentDef?.nesting?.allowedChildren?.length) {
    if (!parentDef.nesting.allowedChildren.includes(child)) {
      return {
        accepted: false,
        reason: `${parent} only accepts specific children`,
      };
    }
    return { accepted: true };
  }

  if (!blockCanNest(parent) && !isSectionBlock(parent)) {
    return {
      accepted: false,
      reason: "Target cannot nest children",
    };
  }

  if (isLeafBlock(child) || !isSectionBlock(child)) {
    if (blockCanNest(parent) || isSectionBlock(parent)) {
      return { accepted: true };
    }
  }

  if (blockCanNest(parent)) {
    return { accepted: true };
  }

  return { accepted: false, reason: "Invalid nesting" };
}

/** Alias matching Phase 3.2 naming. */
export function canDropComponent(
  parentBlockId: string | undefined | null,
  childBlockId: string,
): NestDecision {
  return canNestBlocks(parentBlockId, childBlockId);
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
  return canNestBlocks(
    normalizeBlockId(parentBlockId ?? undefined) ?? "wrapper",
    childBlockId,
  );
}
