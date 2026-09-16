"use client";

/**
 * Keyboard shortcuts for Puck editor.
 * Undo/Redo use application WebsiteConfig history (Phase 3).
 * Skips when focus is in text inputs / contenteditable — except ⌘K handled in AI bar.
 */

import { useEffect } from "react";
import { usePuck } from "@puckeditor/core";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function PuckKeyboardShortcuts({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const { dispatch } = usePuck();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      // Undo/redo even from inputs? Prefer not — avoid fighting text undo.
      if (mod && key === "z" && !event.shiftKey) {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        if (canUndo) onUndo();
        return;
      }
      if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        if (isTypingTarget(event.target)) return;
        event.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (key === "escape") {
        event.preventDefault();
        dispatch({
          type: "setUi",
          ui: { itemSelector: null },
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, onUndo, onRedo, canUndo, canRedo]);

  return null;
}
