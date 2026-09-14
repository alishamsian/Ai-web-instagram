import { describe, expect, it } from "vitest";
import {
  buildLayerTreeItems,
  inferSectionTabFromField,
  resolveEditorKeyCommand,
  resolveLayerTreeKeyCommand,
  schemaGroupPriority,
} from "@/lib/editor";

describe("layer tree keyboard navigation", () => {
  it("moves, expands, activates, and escapes", () => {
    expect(
      resolveLayerTreeKeyCommand("ArrowDown", {
        index: 0,
        itemCount: 4,
        expandable: true,
        expanded: false,
      }),
    ).toEqual({ type: "move", index: 1 });

    expect(
      resolveLayerTreeKeyCommand("ArrowUp", {
        index: 2,
        itemCount: 4,
        expandable: false,
        expanded: false,
      }),
    ).toEqual({ type: "move", index: 1 });

    expect(
      resolveLayerTreeKeyCommand("ArrowRight", {
        index: 0,
        itemCount: 4,
        expandable: true,
        expanded: false,
      }),
    ).toEqual({ type: "expand" });

    expect(
      resolveLayerTreeKeyCommand("ArrowLeft", {
        index: 0,
        itemCount: 4,
        expandable: true,
        expanded: true,
      }),
    ).toEqual({ type: "collapse" });

    expect(
      resolveLayerTreeKeyCommand("Enter", {
        index: 1,
        itemCount: 4,
        expandable: false,
        expanded: false,
      }),
    ).toEqual({ type: "activate" });

    expect(
      resolveLayerTreeKeyCommand("Escape", {
        index: 1,
        itemCount: 4,
        expandable: false,
        expanded: false,
      }),
    ).toEqual({ type: "escape" });

    expect(
      resolveLayerTreeKeyCommand("Home", {
        index: 3,
        itemCount: 4,
        expandable: false,
        expanded: false,
      }),
    ).toEqual({ type: "move", index: 0 });

    expect(
      resolveLayerTreeKeyCommand("End", {
        index: 0,
        itemCount: 4,
        expandable: false,
        expanded: false,
      }),
    ).toEqual({ type: "move", index: 3 });
  });

  it("builds visible section/block tree from expansion state", () => {
    const items = buildLayerTreeItems({
      sections: [
        { id: "s1", type: "hero", visible: true },
        { id: "s2", type: "footer", visible: true },
      ],
      expanded: { s1: true },
      selectedSectionId: "s1",
    });
    expect(items[0]).toMatchObject({ kind: "section", sectionId: "s1" });
    expect(items.some((item) => item.kind === "block")).toBe(true);
    expect(items.some((item) => item.kind === "section" && item.sectionId === "s2")).toBe(
      true,
    );
  });
});

describe("selection → inspector context", () => {
  it("infers useful section tab from selected field", () => {
    expect(inferSectionTabFromField("hero.headline")).toBe("content");
    expect(inferSectionTabFromField("settings.padding")).toBe("layout");
    expect(inferSectionTabFromField("style.fontSize")).toBe("style");
  });

  it("orders schema groups for progressive disclosure", () => {
    expect(schemaGroupPriority("content")).toBeLessThan(
      schemaGroupPriority("visibility"),
    );
    expect(schemaGroupPriority("layout")).toBeLessThan(
      schemaGroupPriority("data"),
    );
  });
});

describe("editor keyboard polish commands", () => {
  it("resolves search and panel toggle shortcuts", () => {
    expect(
      resolveEditorKeyCommand(
        { key: "/", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: false, hasSelection: true },
      ),
    ).toBe("searchProperties");

    expect(
      resolveEditorKeyCommand(
        { key: "b", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: false, hasSelection: false },
      ),
    ).toBe("toggleLeftPanel");

    expect(
      resolveEditorKeyCommand(
        { key: "b", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false },
        { typing: false, hasSelection: false },
      ),
    ).toBe("toggleRightPanel");
  });
});
