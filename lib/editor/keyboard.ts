export type EditorKeyCommand =
  | "undo"
  | "redo"
  | "save"
  | "preview"
  | "commandPalette"
  | "escape"
  | "deleteSection";

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

  if (!meta) return null;

  if (key.toLowerCase() === "k") return "commandPalette";
  if (key === "z" && !event.shiftKey) return "undo";
  if (key === "z" && event.shiftKey) return "redo";
  if (key.toLowerCase() === "s") return "save";
  if (key.toLowerCase() === "p") return "preview";

  return null;
}
