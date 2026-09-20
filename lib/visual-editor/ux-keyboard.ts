/**
 * Keyboard shortcut helpers for the Visual Builder.
 * Pure — does not mutate GrapesJS; Shell/controller apply actions.
 */

export type BuilderShortcutAction =
  | "delete"
  | "duplicate"
  | "undo"
  | "redo"
  | "escape"
  | "select-parent"
  | "hide"
  | "lock"
  | "toggle-left"
  | "toggle-right"
  | "toggle-focus";

export type ShortcutContext = {
  /** True when focus is inside an editable field / contenteditable. */
  typingTarget: boolean;
  /** True when a non-wrapper component is selected. */
  hasSelection: boolean;
  /** True when the selection (or ancestor) is locked. */
  locked: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
};

/** Detect typing targets so we do not hijack text editing. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };
  if (typeof el.tagName !== "string") return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  try {
    if (el.closest?.("[contenteditable='true']")) return true;
    if (el.closest?.("input, textarea, select, [role='textbox']")) return true;
  } catch {
    // Node / non-DOM mocks may not implement closest
  }
  return false;
}

/**
 * Resolve a keyboard event into a builder action, or null if ignored.
 */
export function resolveBuilderShortcut(
  ctx: ShortcutContext,
): BuilderShortcutAction | null {
  const key = ctx.key.length === 1 ? ctx.key.toLowerCase() : ctx.key;
  const mod = ctx.metaKey || ctx.ctrlKey;

  if (ctx.typingTarget) {
    // Allow Escape to exit text editing
    if (key === "Escape") return "escape";
    return null;
  }

  if (key === "Escape") return "escape";

  if (mod && !ctx.altKey && key === "z") {
    return ctx.shiftKey ? "redo" : "undo";
  }
  if (mod && !ctx.altKey && (key === "y" || key === "Y")) {
    return "redo";
  }
  if (mod && !ctx.shiftKey && (key === "d" || key === "D")) {
    if (!ctx.hasSelection || ctx.locked) return null;
    return "duplicate";
  }
  if (mod && key === "ArrowUp") {
    if (!ctx.hasSelection) return null;
    return "select-parent";
  }

  if (key === "Delete" || key === "Backspace") {
    if (!ctx.hasSelection || ctx.locked) return null;
    return "delete";
  }

  if (!mod && (key === "h" || key === "H")) {
    if (!ctx.hasSelection || ctx.locked) return null;
    return "hide";
  }

  if (!mod && (key === "l" || key === "L")) {
    if (!ctx.hasSelection) return null;
    return "lock";
  }

  if (!mod && !ctx.altKey && key === "[") return "toggle-left";
  if (!mod && !ctx.altKey && key === "]") return "toggle-right";
  if (!mod && !ctx.altKey && key === "\\") return "toggle-focus";

  return null;
}

/** Whether a shortcut action is allowed given lock/selection. */
export function canApplyShortcutAction(
  action: BuilderShortcutAction,
  options: { hasSelection: boolean; locked: boolean },
): boolean {
  switch (action) {
    case "undo":
    case "redo":
    case "escape":
    case "toggle-left":
    case "toggle-right":
    case "toggle-focus":
      return true;
    case "select-parent":
    case "lock":
      return options.hasSelection;
    case "delete":
    case "duplicate":
    case "hide":
      return options.hasSelection && !options.locked;
    default:
      return false;
  }
}
