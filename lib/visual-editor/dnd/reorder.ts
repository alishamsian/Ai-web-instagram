/**
 * Canvas / navigator reorder helpers — mutate GrapesJS component models only.
 */

import type { Component, Editor } from "grapesjs";
import {
  blockIdFromAttrs,
  canNestBlocks,
  normalizeBlockId,
  type DropPosition,
} from "@/lib/visual-editor/dnd/nesting";
import { isComponentLocked, isInLockedSubtree } from "@/lib/visual-editor/lock";

export type MoveResult =
  | { ok: true }
  | { ok: false; error: string };

function attrsOf(cmp: Component): Record<string, string> {
  return (cmp.getAttributes?.() ?? {}) as Record<string, string>;
}

export function moveComponentRelative(
  component: Component,
  direction: "up" | "down",
): MoveResult {
  if (component.is("wrapper")) {
    return { ok: false, error: "Cannot move wrapper" };
  }
  if (isInLockedSubtree(component)) {
    return { ok: false, error: "Component is locked" };
  }
  const parent = component.parent();
  if (!parent) return { ok: false, error: "No parent" };
  const index = component.index();
  const next = direction === "up" ? index - 1 : index + 1;
  const siblings = parent.components();
  const count = siblings.length;
  if (next < 0 || next >= count) {
    return { ok: false, error: "Already at edge" };
  }
  try {
    component.move(parent, { at: next });
    return { ok: true };
  } catch {
    const clone = component.clone();
    component.remove();
    parent.append(clone, { at: next });
    return { ok: true };
  }
}

export function canMoveInto(
  source: Component,
  targetParent: Component,
): MoveResult {
  if (source.is("wrapper") || targetParent === source) {
    return { ok: false, error: "Invalid target" };
  }
  if (isInLockedSubtree(source) || isComponentLocked(targetParent)) {
    return { ok: false, error: "Component is locked" };
  }
  // Prevent moving into own descendant
  let walk: Component | undefined = targetParent;
  while (walk) {
    if (walk === source) {
      return { ok: false, error: "Cannot move into own descendant" };
    }
    walk = walk.parent?.() ?? undefined;
  }

  const parentAttrs = attrsOf(targetParent);
  const childAttrs = attrsOf(source);
  const parentId =
    targetParent.is("wrapper")
      ? "wrapper"
      : normalizeBlockId(blockIdFromAttrs(parentAttrs));
  const childId =
    normalizeBlockId(blockIdFromAttrs(childAttrs)) ||
    String(source.get("tagName") || "div");

  const decision = canNestBlocks(parentId, childId);
  if (!decision.accepted) {
    return { ok: false, error: decision.reason || "Invalid nesting" };
  }
  return { ok: true };
}

export function moveComponentTo(
  source: Component,
  targetParent: Component,
  atIndex: number,
): MoveResult {
  const check = canMoveInto(source, targetParent);
  if (!check.ok) return check;
  try {
    // Adjust index if moving within same parent and source is before target
    let at = atIndex;
    const currentParent = source.parent();
    if (currentParent === targetParent) {
      const cur = source.index();
      if (cur < at) at = Math.max(0, at - 1);
    }
    source.move(targetParent, { at });
    return { ok: true };
  } catch {
    const clone = source.clone();
    const curParent = source.parent();
    let at = atIndex;
    if (curParent === targetParent) {
      const cur = source.index();
      if (cur < at) at = Math.max(0, at - 1);
    }
    source.remove();
    targetParent.append(clone, { at });
    return { ok: true };
  }
}

/**
 * Place `source` relative to `target` (before / after / inside).
 */
export function placeRelativeTo(
  source: Component,
  target: Component,
  position: DropPosition,
): MoveResult {
  if (source === target) {
    return { ok: false, error: "Same component" };
  }
  if (position === "inside") {
    const kids = target.components();
    return moveComponentTo(source, target, kids.length);
  }
  const parent = target.parent();
  if (!parent) return { ok: false, error: "No parent" };
  const idx = target.index();
  return moveComponentTo(
    source,
    parent,
    position === "before" ? idx : idx + 1,
  );
}

/**
 * Resolve drop position from a Y ratio within a target's bounding box.
 * top third → before, bottom third → after, middle → inside (if nestable).
 */
export function resolvePositionFromRatio(
  ratioY: number,
  canInside: boolean,
): DropPosition {
  if (ratioY < 0.28) return "before";
  if (ratioY > 0.72) return "after";
  return canInside ? "inside" : ratioY < 0.5 ? "before" : "after";
}

export type CanvasDropHint = {
  targetId: string;
  position: DropPosition;
  accepted: boolean;
  label?: string;
  /** CSS top offset relative to canvas host (px), when measurable */
  indicatorTop?: number;
};

function collectDropCandidates(root: Component): Component[] {
  const out: Component[] = [];
  const walk = (cmp: Component, depth: number) => {
    if (!cmp || typeof cmp.getId !== "function") return;
    if (!cmp.is?.("wrapper")) out.push(cmp);
    const kids = cmp.components?.();
    const list = Array.isArray(kids)
      ? kids
      : ((kids as { models?: Component[] } | undefined)?.models ?? []);
    for (const child of list) walk(child, depth + 1);
  };
  walk(root, 0);
  return out;
}

function parentBlockIdOf(cmp: Component): string {
  const parent = cmp.parent?.();
  if (!parent || parent.is?.("wrapper")) return "wrapper";
  return (
    normalizeBlockId(blockIdFromAttrs(attrsOf(parent))) ||
    String(parent.get?.("tagName") || "wrapper")
  );
}

/**
 * Find the best drop target under pointer using component view rectangles.
 * Walks the full nested tree (not only top-level sections).
 * Safe no-op when canvas frame is unavailable (SSR / unit tests).
 */
export function resolveCanvasDropHint(
  editor: Editor,
  clientX: number,
  clientY: number,
  childBlockId: string,
): CanvasDropHint | null {
  const wrapper = editor.getWrapper();
  if (!wrapper) return null;

  const candidates = collectDropCandidates(wrapper);
  let best: CanvasDropHint | null = null;
  let bestScore = -Infinity;

  for (const cmp of candidates) {
    const el = cmp.getEl?.() || cmp.view?.el;
    if (!el || typeof el.getBoundingClientRect !== "function") continue;
    const rect = el.getBoundingClientRect();
    if (clientY < rect.top - 8 || clientY > rect.bottom + 8) continue;
    if (clientX < rect.left - 40 || clientX > rect.right + 40) continue;

    const mid = (rect.top + rect.bottom) / 2;
    const dist = Math.abs(clientY - mid);
    const ratio = (clientY - rect.top) / Math.max(rect.height, 1);
    const targetBlockId = normalizeBlockId(blockIdFromAttrs(attrsOf(cmp)));
    const nest = canNestBlocks(targetBlockId, childBlockId);
    const position = resolvePositionFromRatio(ratio, nest.accepted);
    const parentDecision =
      position === "inside"
        ? nest
        : canNestBlocks(parentBlockIdOf(cmp), childBlockId);

    // Prefer deepest (smallest area) hits, then closest vertical center.
    const area = Math.max(rect.width * rect.height, 1);
    const score = 1_000_000 / area - dist;

    const hint: CanvasDropHint = {
      targetId: cmp.getId(),
      position,
      accepted: parentDecision.accepted,
      label: targetBlockId,
      indicatorTop:
        position === "before"
          ? rect.top
          : position === "after"
            ? rect.bottom
            : mid,
    };
    if (score > bestScore) {
      bestScore = score;
      best = hint;
    }
  }

  if (!best && candidates.length === 0) {
    return {
      targetId: wrapper.getId(),
      position: "inside",
      accepted: true,
      label: "wrapper",
    };
  }

  // Empty space below last top-level section → append
  if (!best) {
    const kids = wrapper.components();
    const models = Array.isArray(kids)
      ? kids
      : ((kids as { models?: Component[] }).models ?? []);
    if (models.length > 0) {
      const last = models[models.length - 1];
      return {
        targetId: last.getId(),
        position: "after",
        accepted: canNestBlocks("wrapper", childBlockId).accepted,
        label: normalizeBlockId(blockIdFromAttrs(attrsOf(last))),
      };
    }
  }

  return best;
}

/**
 * Apply a product-owned relative place using GrapesJS component ids.
 * Used by canvas drop + tests; validates locking / nesting / self-drops.
 */
export function placeRelativeByIds(
  editor: Editor,
  sourceId: string,
  targetId: string,
  position: DropPosition,
): MoveResult {
  const source = editor.Components?.getById?.(sourceId) ?? null;
  const target = editor.Components?.getById?.(targetId) ?? null;
  if (!source || !target) {
    return { ok: false, error: "Component not found" };
  }
  return placeRelativeTo(source, target, position);
}
