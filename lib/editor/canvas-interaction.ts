/** Pure helpers for canvas selection / drag / escape — no React. */

export type CanvasDropEdge = "before" | "after";

export function resolveCanvasDropEdge(
  clientY: number,
  rectTop: number,
  rectHeight: number,
): CanvasDropEdge {
  const mid = rectTop + rectHeight / 2;
  return clientY < mid ? "before" : "after";
}

export function shouldShowSectionChrome(input: {
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
  dropEdge: CanvasDropEdge | null;
}): boolean {
  return (
    input.selected ||
    input.hovered ||
    input.dragging ||
    Boolean(input.dropEdge)
  );
}

/** Progressive Escape: field → section → dismiss overlays. */
export type EscapeCascadeStep =
  | "blur-editing"
  | "clear-field"
  | "clear-section"
  | "dismiss-overlays"
  | "none";

export function resolveEscapeCascade(input: {
  typing: boolean;
  hasField: boolean;
  hasSection: boolean;
  hasOverlay: boolean;
}): EscapeCascadeStep {
  if (input.typing) return "blur-editing";
  if (input.hasField) return "clear-field";
  if (input.hasSection) return "clear-section";
  if (input.hasOverlay) return "dismiss-overlays";
  return "none";
}

export function sectionNeedsScrollIntoView(
  rect: { top: number; bottom: number },
  viewportHeight: number,
  margin = 72,
): boolean {
  return rect.top < margin || rect.bottom > viewportHeight - margin;
}
