export type EditorKeyCommand =
  | "undo"
  | "redo"
  | "save"
  | "preview"
  | "commandPalette"
  | "escape"
  | "deleteSection"
  | "duplicateSection"
  | "focusMode"
  | "searchProperties"
  | "toggleLeftPanel"
  | "toggleRightPanel"
  | "zoomFit"
  | "zoom100"
  | "zoom75";

export function resolveEditorKeyCommand(
  event: Pick<
    KeyboardEvent,
    "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
  >,
  options: { typing: boolean; hasSelection: boolean },
): EditorKeyCommand | null {
  const meta = event.metaKey || event.ctrlKey;
  const key = event.key;

  if (key === "Escape") return "escape";

  if (
    !options.typing &&
    options.hasSelection &&
    (key === "Delete" || key === "Backspace")
  ) {
    return "deleteSection";
  }

  if (meta && (key === "\\" || key === "Backslash")) {
    return "focusMode";
  }

  if (!meta) return null;

  // Zoom: ⌘0 Fit · ⌘1 100% · ⌘2 75% (avoid conflicting with browser tab shortcuts when possible)
  if (!options.typing && key === "0") return "zoomFit";
  if (!options.typing && key === "1") return "zoom100";
  if (!options.typing && key === "2") return "zoom75";

  if (key === "/" || key === "?") return "searchProperties";
  if (key.toLowerCase() === "b" && !event.shiftKey) return "toggleLeftPanel";
  if (key.toLowerCase() === "b" && event.shiftKey) return "toggleRightPanel";
  if (key.toLowerCase() === "k") return "commandPalette";
  if (key === "z" && !event.shiftKey) return "undo";
  if (key === "z" && event.shiftKey) return "redo";
  if (key.toLowerCase() === "s") return "save";
  if (key.toLowerCase() === "p") return "preview";
  if (
    key.toLowerCase() === "d" &&
    !event.shiftKey &&
    !options.typing &&
    options.hasSelection
  ) {
    return "duplicateSection";
  }

  return null;
}
