"use client";

/**
 * Keyboard shortcuts for Puck editor.
 * Skips when focus is in text inputs / contenteditable.
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

export function PuckKeyboardShortcuts() {
  const { history, dispatch, selectedItem, getSelectorForId } = usePuck();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        if (history.hasPast) history.back();
        return;
      }
      if (mod && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        if (history.hasFuture) history.forward();
        return;
      }

      if (key === "escape") {
        event.preventDefault();
        dispatch({
          type: "setUi",
          ui: { itemSelector: null },
        });
        return;
      }

      if ((key === "delete" || key === "backspace") && selectedItem) {
        // Let Puck handle delete when an item is selected (native behavior).
        // We only clear selection on Escape above.
        return;
      }

      if (mod && key === "d" && selectedItem?.props?.id) {
        // Duplicate is handled by Puck's own shortcuts when available;
        // avoid conflicting custom implementations.
        return;
      }

      void getSelectorForId;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history, dispatch, selectedItem, getSelectorForId]);

  return null;
}
