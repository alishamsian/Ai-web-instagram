import { describe, expect, it } from "vitest";
import {
  matchesInspectorQuery,
  normalizeLeftNav,
  panelWidthPx,
} from "@/lib/editor/ui-state";

describe("editor sidebar ui-state", () => {
  it("normalizes legacy left nav aliases", () => {
    expect(normalizeLeftNav("pages")).toBe("views");
    expect(normalizeLeftNav("sections")).toBe("layers");
    expect(normalizeLeftNav("layers")).toBe("layers");
    expect(normalizeLeftNav("insert")).toBe("insert");
    expect(normalizeLeftNav("assets")).toBe("assets");
    expect(normalizeLeftNav("site")).toBe("site");
    expect(normalizeLeftNav("nope")).toBe("layers");
  });

  it("sizes left panel to fit icon rail", () => {
    expect(panelWidthPx("left", "narrow")).toBeGreaterThanOrEqual(260);
    expect(panelWidthPx("left", "wide")).toBeGreaterThan(
      panelWidthPx("left", "normal"),
    );
  });

  it("filters inspector properties by label or key", () => {
    expect(
      matchesInspectorQuery("pad", ["Padding", "layout", "content.padding"]),
    ).toBe(true);
    expect(matchesInspectorQuery("font", ["Color", "style"])).toBe(false);
    expect(matchesInspectorQuery("", ["anything"])).toBe(true);
  });
});
