import { describe, expect, it } from "vitest";
import {
  resolveCanvasDropEdge,
  resolveEditorKeyCommand,
  resolveEscapeCascade,
  sectionNeedsScrollIntoView,
  shouldShowSectionChrome,
} from "@/lib/editor";

describe("canvas drop / chrome helpers", () => {
  it("resolves drop edge from midpoint", () => {
    expect(resolveCanvasDropEdge(10, 0, 100)).toBe("before");
    expect(resolveCanvasDropEdge(80, 0, 100)).toBe("after");
  });

  it("shows chrome for selected, hovered, dragging, or drop", () => {
    expect(
      shouldShowSectionChrome({
        selected: false,
        hovered: false,
        dragging: false,
        dropEdge: null,
      }),
    ).toBe(false);
    expect(
      shouldShowSectionChrome({
        selected: true,
        hovered: false,
        dragging: false,
        dropEdge: null,
      }),
    ).toBe(true);
    expect(
      shouldShowSectionChrome({
        selected: false,
        hovered: true,
        dragging: false,
        dropEdge: null,
      }),
    ).toBe(true);
    expect(
      shouldShowSectionChrome({
        selected: false,
        hovered: false,
        dragging: false,
        dropEdge: "before",
      }),
    ).toBe(true);
  });

  it("detects when selected section needs scroll", () => {
    expect(
      sectionNeedsScrollIntoView({ top: -20, bottom: 100 }, 800),
    ).toBe(true);
    expect(
      sectionNeedsScrollIntoView({ top: 120, bottom: 400 }, 800),
    ).toBe(false);
  });
});

describe("escape cascade", () => {
  it("prioritizes editing → field → section → overlays", () => {
    expect(
      resolveEscapeCascade({
        typing: true,
        hasField: true,
        hasSection: true,
        hasOverlay: true,
      }),
    ).toBe("blur-editing");
    expect(
      resolveEscapeCascade({
        typing: false,
        hasField: true,
        hasSection: true,
        hasOverlay: false,
      }),
    ).toBe("clear-field");
    expect(
      resolveEscapeCascade({
        typing: false,
        hasField: false,
        hasSection: true,
        hasOverlay: false,
      }),
    ).toBe("clear-section");
    expect(
      resolveEscapeCascade({
        typing: false,
        hasField: false,
        hasSection: false,
        hasOverlay: true,
      }),
    ).toBe("dismiss-overlays");
    expect(
      resolveEscapeCascade({
        typing: false,
        hasField: false,
        hasSection: false,
        hasOverlay: false,
      }),
    ).toBe("none");
  });
});

describe("zoom keyboard shortcuts", () => {
  it("maps ⌘0 / ⌘1 / ⌘2 to zoom modes", () => {
    expect(
      resolveEditorKeyCommand(
        {
          key: "0",
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        },
        { typing: false, hasSelection: false },
      ),
    ).toBe("zoomFit");
    expect(
      resolveEditorKeyCommand(
        {
          key: "1",
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        },
        { typing: false, hasSelection: false },
      ),
    ).toBe("zoom100");
    expect(
      resolveEditorKeyCommand(
        {
          key: "2",
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        },
        { typing: false, hasSelection: false },
      ),
    ).toBe("zoom75");
  });

  it("does not steal zoom shortcuts while typing", () => {
    expect(
      resolveEditorKeyCommand(
        {
          key: "0",
          metaKey: true,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
        },
        { typing: true, hasSelection: false },
      ),
    ).toBeNull();
  });
});
