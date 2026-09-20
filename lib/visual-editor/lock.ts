/**
 * Element lock helpers for the Visual Editor.
 * Locked nodes cannot be dragged, deleted, or canvas-edited until unlocked.
 */

import type { Component } from "grapesjs";

export const LOCK_ATTR = "data-locked";

export function isComponentLocked(component: Component | null | undefined): boolean {
  if (!component || typeof component.getAttributes !== "function") return false;
  const attrs = component.getAttributes() ?? {};
  return attrs[LOCK_ATTR] === "true" || attrs[LOCK_ATTR] === true;
}

/** True if this component or any ancestor is locked. */
export function isInLockedSubtree(component: Component | null | undefined): boolean {
  let walk: Component | undefined | null = component;
  while (walk) {
    if (isComponentLocked(walk)) return true;
    walk = walk.parent?.() ?? null;
  }
  return false;
}

export function setComponentLocked(
  component: Component,
  locked: boolean,
): void {
  if (locked) {
    component.addAttributes({ [LOCK_ATTR]: "true" });
    try {
      component.set({
        draggable: false,
        droppable: false,
        editable: false,
        highlightable: true,
        selectable: true,
      });
    } catch {
      /* GrapesJS version differences */
    }
  } else {
    component.removeAttributes(LOCK_ATTR);
    try {
      component.set({
        draggable: true,
        droppable: true,
        editable: true,
      });
    } catch {
      /* ignore */
    }
  }
}

export function toggleComponentLocked(component: Component): boolean {
  const next = !isComponentLocked(component);
  setComponentLocked(component, next);
  return next;
}
