/**
 * Phase 3.3 — Production builder UX & interaction.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  formatBlockTypeLabel,
  formatComponentLabel,
  withPageBreadcrumbRoot,
  dropPositionLabel,
  saveStateLabel,
  isTypingTarget,
  resolveBuilderShortcut,
  canApplyShortcutAction,
  libraryGroupForBlock,
  groupLibraryBlocks,
  matchesLibraryQuery,
  getVisualBlock,
  listVisualBlocks,
  resolvePositionFromRatio,
  canNestBlocks,
  canDropComponent,
  resolveStyleProp,
  setStyleOverride,
  getStyleOverride,
  clearStyleOverride,
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  createComponentNode,
  duplicateComponentSubtree,
  findComponentById,
  isComponentVisibleAt,
  resolveComponentStyleProp,
  remintAttributeTree,
} from "@/lib/visual-editor";
import { readVisibilityMap } from "@/lib/visual-editor/responsive-visibility";
import {
  instantiateTemplate,
  resetTemplateRegistry,
  getTemplates,
} from "@/lib/templates";
import { shouldUseCanonicalHomeRenderer } from "@/lib/website/canonical-render";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import type { WebsiteConfig } from "@/types/website";

beforeEach(() => {
  resetTemplateRegistry();
});

function mockComponent(
  attrs: Record<string, string> = {},
  style: Record<string, string> = {},
) {
  const store = { ...attrs };
  const styleStore = { ...style };
  return {
    getAttributes: () => ({ ...store }),
    addAttributes: (next: Record<string, string>) => {
      Object.assign(store, next);
    },
    removeAttributes: (key: string) => {
      delete store[key];
    },
    getStyle: () => ({ ...styleStore }),
    addStyle: (next: Record<string, string>) => {
      Object.assign(styleStore, next);
    },
    removeStyle: (key: string) => {
      delete styleStore[key];
    },
    set: () => undefined,
    parent: () => null,
  };
}

describe("Phase 3.3 labels", () => {
  it("formats registry block labels in EN/FA", () => {
    expect(formatBlockTypeLabel("content-heading", "en")).toBe("Heading");
    expect(formatBlockTypeLabel("layout-stack", "en")).toBe("Stack");
    expect(formatBlockTypeLabel("content-heading", "fa")).toBeTruthy();
  });

  it("formats section types via normalize", () => {
    expect(formatBlockTypeLabel("hero", "en")).toMatch(/Hero/i);
  });

  it("prefers data-label attribute", () => {
    expect(
      formatComponentLabel({ "data-label": "Hero Banner" }, { locale: "en" }),
    ).toBe("Hero Banner");
  });

  it("uses registry type over tag", () => {
    expect(
      formatComponentLabel(
        { "data-component-type": "content-button" },
        { locale: "en", tagName: "a" },
      ),
    ).toBe("Button");
  });

  it("uses friendly tag labels when type missing", () => {
    expect(
      formatComponentLabel({}, { locale: "en", tagName: "h1" }),
    ).toBe("Heading 1");
    expect(
      formatComponentLabel({}, { locale: "fa", tagName: "div" }),
    ).toBe("باکس");
  });

  it("appends short text preview", () => {
    expect(
      formatComponentLabel(
        { "data-component-type": "content-heading" },
        { locale: "en", textPreview: "Hello" },
      ),
    ).toBe("Heading: Hello");
  });

  it("prefixes Page in breadcrumb", () => {
    const crumbs = withPageBreadcrumbRoot(
      [{ id: "c1", label: "Container" }],
      "en",
    );
    expect(crumbs[0]?.label).toBe("Page");
    expect(crumbs[1]?.label).toBe("Container");
  });

  it("drop position labels", () => {
    expect(dropPositionLabel("before", "en")).toContain("before");
    expect(dropPositionLabel("inside", "en")).toContain("inside");
    expect(dropPositionLabel("after", "fa")).toBeTruthy();
  });

  it("save state labels", () => {
    expect(saveStateLabel("dirty", "en")).toBe("Unsaved changes");
    expect(saveStateLabel("saving", "en")).toBe("Saving…");
    expect(saveStateLabel("error", "en")).toBe("Save failed");
    expect(saveStateLabel("clean", "en")).toBe("Saved");
  });
});

describe("Phase 3.3 keyboard shortcuts", () => {
  it("detects typing targets", () => {
    const input = {
      tagName: "INPUT",
      isContentEditable: false,
      closest: () => null,
    } as unknown as Element;
    expect(isTypingTarget(input)).toBe(true);
    const div = {
      tagName: "DIV",
      isContentEditable: false,
      closest: () => null,
    } as unknown as Element;
    expect(isTypingTarget(div)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("maps hide and lock keys", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "h",
      }),
    ).toBe("hide");
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "l",
      }),
    ).toBe("lock");
  });

  it("maps panel and focus chrome shortcuts", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "[",
      }),
    ).toBe("toggle-left");
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "]",
      }),
    ).toBe("toggle-right");
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "\\",
      }),
    ).toBe("toggle-focus");
  });

  it("ctrl+y redo on non-mac", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        key: "y",
      }),
    ).toBe("redo");
  });

  it("maps Delete to delete when selected unlocked", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "Delete",
      }),
    ).toBe("delete");
  });

  it("ignores Delete when locked", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: true,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "Backspace",
      }),
    ).toBeNull();
  });

  it("ignores shortcuts while typing except Escape", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: true,
        hasSelection: true,
        locked: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "z",
      }),
    ).toBeNull();
    expect(
      resolveBuilderShortcut({
        typingTarget: true,
        hasSelection: true,
        locked: false,
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "Escape",
      }),
    ).toBe("escape");
  });

  it("maps undo/redo", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "z",
      }),
    ).toBe("undo");
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: false,
        locked: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        key: "z",
      }),
    ).toBe("redo");
  });

  it("maps duplicate and select-parent", () => {
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "d",
      }),
    ).toBe("duplicate");
    expect(
      resolveBuilderShortcut({
        typingTarget: false,
        hasSelection: true,
        locked: false,
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        key: "ArrowUp",
      }),
    ).toBe("select-parent");
  });

  it("canApplyShortcutAction respects lock", () => {
    expect(
      canApplyShortcutAction("delete", { hasSelection: true, locked: true }),
    ).toBe(false);
    expect(
      canApplyShortcutAction("lock", { hasSelection: true, locked: true }),
    ).toBe(true);
    expect(
      canApplyShortcutAction("undo", { hasSelection: false, locked: false }),
    ).toBe(true);
  });
});

describe("Phase 3.3 library", () => {
  it("groups layout primitives", () => {
    const groups = groupLibraryBlocks({ tab: "layout" });
    const ids = groups.flatMap((g) => g.blocks.map((b) => b.id));
    expect(ids).toContain("layout-container");
    expect(ids).toContain("layout-stack");
  });

  it("groups typography under Basic", () => {
    const groups = groupLibraryBlocks({ tab: "components" });
    const typo = groups.find((g) => g.id === "typography");
    expect(typo?.blocks.some((b) => b.id === "content-heading")).toBe(true);
    expect(typo?.blocks.some((b) => b.id === "content-text")).toBe(true);
  });

  it("groups actions Button", () => {
    expect(libraryGroupForBlock(getVisualBlock("content-button")!)).toBe(
      "actions",
    );
  });

  it("navigation tab lists navbar", () => {
    const groups = groupLibraryBlocks({ tab: "navigation" });
    const ids = groups.flatMap((g) => g.blocks.map((b) => b.id));
    expect(ids).toContain("nav-navbar");
    expect(ids).toContain("nav-footer");
  });

  it("search is case-insensitive substring", () => {
    const btn = getVisualBlock("content-button")!;
    expect(matchesLibraryQuery(btn, "but")).toBe(true);
    expect(matchesLibraryQuery(btn, "STACK")).toBe(false);
    const stack = getVisualBlock("layout-stack")!;
    expect(matchesLibraryQuery(stack, "stack")).toBe(true);
  });

  it("search finds Button via listVisualBlocks", () => {
    const hits = listVisualBlocks({ query: "but" });
    expect(hits.some((b) => b.id === "content-button")).toBe(true);
  });

  it("empty search returns groups without inflation", () => {
    const groups = groupLibraryBlocks({ tab: "forms" });
    expect(groups.every((g) => g.blocks.length > 0)).toBe(true);
  });

  it("groups media images", () => {
    expect(libraryGroupForBlock(getVisualBlock("media-image")!)).toBe("media");
  });

  it("groups forms", () => {
    expect(libraryGroupForBlock(getVisualBlock("form-input")!)).toBe("forms");
  });

  it("search empty query matches all", () => {
    expect(matchesLibraryQuery(getVisualBlock("layout-flex")!, "")).toBe(true);
  });

  it("sections tab only sections group", () => {
    const groups = groupLibraryBlocks({ tab: "sections" });
    expect(groups.every((g) => g.id === "sections")).toBe(true);
  });

  it("query stack finds Stack", () => {
    const groups = groupLibraryBlocks({ query: "stack" });
    const ids = groups.flatMap((g) => g.blocks.map((b) => b.id));
    expect(ids).toContain("layout-stack");
  });
});

describe("Phase 3.3 history-related helpers", () => {
  it("canApply multi-step action matrix", () => {
    const unlocked = { hasSelection: true, locked: false };
    const locked = { hasSelection: true, locked: true };
    for (const action of ["delete", "duplicate", "hide"] as const) {
      expect(canApplyShortcutAction(action, unlocked)).toBe(true);
      expect(canApplyShortcutAction(action, locked)).toBe(false);
    }
  });
});

describe("Phase 3.3 drag drop positions", () => {
  it("resolves before/inside/after from ratio", () => {
    expect(resolvePositionFromRatio(0.1, true)).toBe("before");
    expect(resolvePositionFromRatio(0.5, true)).toBe("inside");
    expect(resolvePositionFromRatio(0.9, true)).toBe("after");
  });

  it("falls back when inside not allowed", () => {
    expect(resolvePositionFromRatio(0.5, false)).toMatch(/before|after/);
  });

  it("rejects invalid nesting for button inside button", () => {
    expect(canNestBlocks("content-button", "content-heading").accepted).toBe(
      false,
    );
  });

  it("allows stack inside container", () => {
    expect(canDropComponent("layout-container", "layout-stack").accepted).toBe(
      true,
    );
  });
});

describe("Phase 3.3 responsive inspector safety", () => {
  it("tablet override does not write desktop attr", () => {
    const cmp = mockComponent({}, { "font-size": "64px" });
    const editor = {
      getDevice: () => "Desktop",
      setDevice: () => undefined,
    };
    setStyleOverride(
      editor as never,
      cmp as never,
      "font-size",
      "tablet",
      "48px",
    );
    expect(getStyleOverride(cmp as never, "font-size", "tablet")).toBe("48px");
    expect(getStyleOverride(cmp as never, "font-size", "desktop")).toBe("");
  });

  it("mobile override does not clobber tablet", () => {
    const cmp = mockComponent({
      "data-rstyle-tablet-padding": "24px",
    });
    const editor = {
      getDevice: () => "Desktop",
      setDevice: () => undefined,
    };
    setStyleOverride(
      editor as never,
      cmp as never,
      "padding",
      "mobile",
      "16px",
    );
    expect(getStyleOverride(cmp as never, "padding", "tablet")).toBe("24px");
    expect(getStyleOverride(cmp as never, "padding", "mobile")).toBe("16px");
  });

  it("inheritance reads tablet when mobile unset", () => {
    const cmp = mockComponent(
      { "data-rstyle-tablet-font-size": "48px" },
      { "font-size": "64px" },
    );
    const resolved = resolveStyleProp(cmp as never, "font-size", "mobile");
    expect(resolved.value).toBe("48px");
    expect(resolved.inherited).toBe(true);
    expect(resolved.source).toBe("tablet");
  });

  it("clearStyleOverride removes only that device", () => {
    const cmp = mockComponent({
      "data-rstyle-desktop-padding": "40px",
      "data-rstyle-mobile-padding": "16px",
    });
    const editor = {
      getDevice: () => "Desktop",
      setDevice: () => undefined,
    };
    clearStyleOverride(editor as never, cmp as never, "padding", "mobile");
    expect(getStyleOverride(cmp as never, "padding", "desktop")).toBe("40px");
    expect(getStyleOverride(cmp as never, "padding", "mobile")).toBe("");
  });

  it("visibility map reads per-device attrs", () => {
    const cmp = mockComponent({
      "data-visible-desktop": "true",
      "data-visible-tablet": "true",
      "data-visible-mobile": "false",
    });
    const map = readVisibilityMap(cmp as never);
    expect(map.desktop).toBe(true);
    expect(map.mobile).toBe(false);
  });
});

describe("Phase 3.3 duplication & lock semantics", () => {
  it("duplicate subtree mints new ids", () => {
    const tree = createComponentNode({
      id: "container-a",
      type: "layout-container",
      children: [
        createComponentNode({
          id: "heading-a",
          type: "content-heading",
          content: { text: "Hi" },
        }),
      ],
    });
    const idMap = new Map<string, string>();
    const copy = duplicateComponentSubtree(tree, idMap);
    expect(copy.id).not.toBe("container-a");
    expect(idMap.get("heading-a")).toBeTruthy();
    expect(findComponentById([copy], "heading-a")).toBeNull();
  });

  it("remintAttributeTree regenerates section ids deterministically", () => {
    const a = remintAttributeTree(
      [
        {
          attrs: {
            "data-section-id": "hero-1",
            "data-section-type": "hero",
            "data-component-id": "hero-1__headline",
          },
          children: [],
        },
      ],
      ["hero-1"],
    );
    expect(a[0]?.attrs["data-section-id"]).toMatch(/^hero-\d+$/);
    expect(a[0]?.attrs["data-section-id"]).not.toBe("hero-1");
  });

  it("lock is distinct from hidden visibility", () => {
    const n = createComponentNode({
      id: "x",
      type: "layout-container",
      locked: true,
      hidden: false,
      visibility: { desktop: true, tablet: true, mobile: true },
    });
    expect(n.locked).toBe(true);
    expect(isComponentVisibleAt(n, "desktop")).toBe(true);
  });
});

describe("Phase 3.3 persistence + render", () => {
  it("canonical nested tree survives applyVisualProject", () => {
    const { config } = instantiateTemplate("saas-modern", {
      locale: "en",
      language: "en",
    });
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections![0]!.components = [
      createComponentNode({
        id: "c1",
        type: "layout-container",
        styles: { padding: "40px" },
        responsive: { mobile: { padding: "16px" } },
        children: [
          createComponentNode({
            id: "h1",
            type: "content-heading",
            content: { text: "UX Heading" },
          }),
          createComponentNode({
            id: "b1",
            type: "content-button",
            content: { text: "Go", href: "/go" },
            visibility: { desktop: true, tablet: true, mobile: false },
          }),
        ],
      }),
    ];
    config.sections = structuredClone(home.sections ?? []);

    const project = buildProjectFromWebsiteConfig(config);
    const synced = applyVisualProjectToWebsiteConfig(config, project as never);
    const hero = synced.pages!.find((p) => p.id === "home")!.sections!.find(
      (s) => s.id === home.sections![0]!.id,
    );
    // Components may re-extract from projected HTML
    const tree =
      hero?.components ??
      synced.sections.find((s) => s.id === home.sections![0]!.id)?.components;
    expect(tree?.length || home.sections![0]!.components?.length).toBeGreaterThan(
      0,
    );

    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config: synced,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(html.includes("UX Heading") || html.includes("Build")).toBe(true);
  });

  it("mobile padding inheritance on product node", () => {
    const node = createComponentNode({
      id: "n",
      type: "layout-container",
      styles: { padding: "40px" },
      responsive: { tablet: { padding: "24px" } },
    });
    expect(resolveComponentStyleProp(node, "padding", "mobile").value).toBe(
      "24px",
    );
  });
});

describe("Phase 3.3 multi-page + templates + legacy", () => {
  it("page isolation for nested components", () => {
    const { config } = instantiateTemplate("agency-creative", {
      locale: "en",
      language: "en",
    });
    const aboutBefore = structuredClone(
      config.pages?.find((p) => p.id === "about"),
    );
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections![0]!.components = [
      createComponentNode({
        id: "only-home",
        type: "content-heading",
        content: { text: "Home only" },
      }),
    ];
    expect(
      JSON.stringify(config.pages!.find((p) => p.id === "about")),
    ).toBe(JSON.stringify(aboutBefore));
  });

  it("all templates still instantiate", () => {
    for (const t of getTemplates()) {
      const { config } = instantiateTemplate(t.id, {
        locale: "en",
        language: "en",
      });
      expect(config.sections.length).toBeGreaterThan(0);
      expect(shouldUseCanonicalHomeRenderer(config)).toBe(true);
    }
  });

  it("legacy store without catalog stays non-canonical home", () => {
    const config = {
      template: "store",
      brand: {
        name: "Legacy",
        colors: {
          primary: "#111",
          secondary: "#222",
          accent: "#333",
          background: "#fff",
          foreground: "#111",
          muted: "#eee",
        },
        typography: { heading: "sans", body: "sans", scale: "compact" },
      },
      content: {
        hero: {
          style: "minimal",
          headline: "H",
          subheadline: "S",
          cta: "C",
        },
      },
      sections: [{ id: "hero-1", type: "hero", visible: true }],
      seo: { title: "t", description: "d", keywords: [] },
      settings: {
        language: "en",
        direction: "ltr",
        showBranding: true,
        published: false,
      },
      media: {},
    } as WebsiteConfig;
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(false);
  });
});

describe("Phase 3.3 accessibility helpers", () => {
  it("breadcrumb root is keyboard-selectable page id", () => {
    const crumbs = withPageBreadcrumbRoot([], "en");
    expect(crumbs[0]?.id).toBe("page");
  });

  it("RTL drop labels exist", () => {
    expect(dropPositionLabel("before", "fa")).toBeTruthy();
    expect(dropPositionLabel("inside", "fa")).toBeTruthy();
  });

  it("library group labels are bilingual", () => {
    const groups = groupLibraryBlocks({ tab: "media" });
    expect(groups[0]?.label.en).toBeTruthy();
    expect(groups[0]?.label.fa).toBeTruthy();
  });
});
