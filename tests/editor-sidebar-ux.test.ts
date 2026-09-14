import { describe, expect, it } from "vitest";
import {
  matchesInspectorQuery,
  normalizeLeftNav,
  panelWidthPx,
} from "@/lib/editor/ui-state";
import { getDictionary } from "@/lib/i18n/dictionary";

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

describe("left sidebar information architecture", () => {
  it("exposes Pages / Layers / Add / Assets / Site labels (fa + en)", () => {
    const fa = getDictionary("fa");
    const en = getDictionary("en");

    expect(fa.editor.pages).toBeTruthy();
    expect(fa.editor.layers).toBeTruthy();
    expect(fa.editor.addNav).toBeTruthy();
    expect(fa.editor.assets).toBeTruthy();
    expect(fa.editor.sitePanel).toBeTruthy();

    expect(en.editor.pages.toLowerCase()).toContain("page");
    expect(en.editor.addNav.toLowerCase()).toBe("add");
    expect(en.editor.browseAllSections.toLowerCase()).toContain("browse");
    expect(en.editor.sectionAdded.toLowerCase()).toBe("added");

    // Site nav groups map to inspector destinations — not a second settings editor.
    expect(fa.editor.groupAppearance).toBeTruthy();
    expect(fa.editor.groupContentNav).toBeTruthy();
    expect(fa.editor.groupPublishing).toBeTruthy();
  });

  it("keeps leftNav ids stable (no parallel state)", () => {
    const ids = ["views", "layers", "insert", "assets", "site"] as const;
    for (const id of ids) {
      expect(normalizeLeftNav(id)).toBe(id);
    }
  });
});
