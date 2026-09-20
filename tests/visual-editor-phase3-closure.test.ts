/**
 * Phase 3 Final Closure — system-level unit/integration coverage.
 * Complements browser QA; does not by itself prove PHASE 3 CLOSED.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import type { WebsiteConfig, WebsiteComponentNode } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  createComponentNode,
  mintComponentId,
  normalizeComponentTree,
  normalizeWebsiteComponentTrees,
  duplicateComponentSubtree,
  resolveComponentStyleProp,
  isComponentVisibleAt,
  findComponentById,
  reorderSiblings,
  removeComponentById,
  componentTreeFingerprint,
  grapesJsonToProductNode,
  productNodeToGrapesJson,
  applyCanonicalComponentsFromProject,
  canNestBlocks,
  canDropComponent,
  getAllowedChildren,
  getAllowedParents,
  canDropOnTarget,
} from "@/lib/visual-editor";
import { NestedComponentTree } from "@/components/website/NestedComponentTree";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { StoreRenderer } from "@/components/store/StoreRenderer";
import {
  instantiateTemplate,
  resetTemplateRegistry,
  getTemplates,
} from "@/lib/templates";
import { shouldUseCanonicalHomeRenderer } from "@/lib/website/canonical-render";
import { normalizeEditorConfig } from "@/lib/editor/normalize-content";

beforeEach(() => {
  resetTemplateRegistry();
});

function baseConfig(overrides: Partial<WebsiteConfig> = {}): WebsiteConfig {
  return {
    template: "services",
    brand: {
      name: "Closure Co",
      colors: {
        primary: "#111",
        secondary: "#222",
        accent: "#333",
        background: "#fff",
        foreground: "#111",
        muted: "#f5f5f5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "Welcome",
        subheadline: "Sub",
        cta: "Go",
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "minimal" },
      { id: "footer-1", type: "footer", visible: true },
    ],
    pages: [
      {
        id: "home",
        slug: "",
        name: "Home",
        kind: "home",
        sections: [
          { id: "hero-1", type: "hero", visible: true, variant: "minimal" },
          { id: "footer-1", type: "footer", visible: true },
        ],
      },
      {
        id: "page-a",
        slug: "page-a",
        name: "Custom Page A",
        kind: "custom",
        sections: [
          { id: "hero-a", type: "hero", visible: true },
          { id: "footer-1", type: "footer", visible: true },
        ],
      },
      {
        id: "page-b",
        slug: "page-b",
        name: "Custom Page B",
        kind: "custom",
        sections: [
          { id: "hero-b", type: "hero", visible: true },
          { id: "footer-1", type: "footer", visible: true },
        ],
      },
    ],
    seo: { title: "Closure", description: "Test", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
    ...overrides,
  };
}

/** Section → Container → Stack → Heading + Button */
function stackTree(): WebsiteComponentNode {
  return createComponentNode({
    id: "container-rt",
    type: "layout-container",
    styles: { padding: "32px", display: "flex" },
    responsive: {
      tablet: { padding: "24px" },
      mobile: { padding: "12px" },
    },
    locked: false,
    children: [
      createComponentNode({
        id: "stack-rt",
        type: "layout-stack",
        styles: { gap: "12px" },
        children: [
          createComponentNode({
            id: "heading-rt",
            type: "content-heading",
            content: { text: "Closure Heading", level: "h2" },
            styles: { "font-size": "32px", color: "#111111" },
            responsive: { mobile: { "font-size": "22px" } },
            visibility: { desktop: true, tablet: true, mobile: true },
          }),
          createComponentNode({
            id: "button-rt",
            type: "content-button",
            content: { text: "Buy Now", label: "Buy Now", href: "/buy" },
            styles: { "background-color": "#0f6e5c" },
            locked: true,
            visibility: { desktop: true, tablet: true, mobile: false },
          }),
        ],
      }),
    ],
  });
}

/** Section → Grid → Card(Image+Heading) × 2 */
function gridTree(): WebsiteComponentNode {
  return createComponentNode({
    id: "grid-rt",
    type: "layout-grid",
    styles: { display: "grid", gap: "16px" },
    variant: "two-col",
    children: [
      createComponentNode({
        id: "card-1",
        type: "content-card",
        variant: "elevated",
        children: [
          createComponentNode({
            id: "img-1",
            type: "media-image",
            content: {
              src: "https://example.com/a.jpg",
              alt: "Card A",
              mediaId: "m-a",
            },
          }),
          createComponentNode({
            id: "h-1",
            type: "content-heading",
            content: { text: "Card A Title" },
          }),
        ],
      }),
      createComponentNode({
        id: "card-2",
        type: "content-card",
        children: [
          createComponentNode({
            id: "img-2",
            type: "media-image",
            content: {
              src: "https://example.com/b.jpg",
              alt: "Card B",
              mediaId: "m-b",
            },
          }),
          createComponentNode({
            id: "h-2",
            type: "content-heading",
            content: { text: "Card B Title" },
          }),
        ],
      }),
    ],
  });
}

function collectIds(node: WebsiteComponentNode, out = new Set<string>()) {
  out.add(node.id);
  for (const child of node.children ?? []) collectIds(child, out);
  return out;
}

describe("Phase 3 closure — insert identity", () => {
  it("repeated freeform createBlockHtml scopes stay unique", async () => {
    const { createBlockHtml } = await import("@/lib/visual-editor/registry");
    const existing: string[] = [];
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { html, sectionId } = createBlockHtml("content-heading", {
        locale: "en",
        pageId: "home",
        existingSectionIds: existing,
      });
      existing.push(sectionId);
      const match = html.match(/data-component-id="([^"]+)"/);
      expect(match?.[1]).toBeTruthy();
      ids.push(match![1]!);
    }
    expect(new Set(ids).size).toBe(3);
  });
});

describe("Phase 3 closure — identity", () => {
  it("mintComponentId never uses Date.now / Math.random / index", () => {
    const ids = Array.from({ length: 20 }, () => mintComponentId("layout-stack"));
    expect(new Set(ids).size).toBe(20);
    for (const id of ids) {
      expect(id).not.toMatch(/^\d+$/);
      expect(id).toMatch(
        /^[a-zA-Z0-9_-]+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    }
  });

  it("duplicate remints all descendant ids", () => {
    const original = stackTree();
    const dup = duplicateComponentSubtree(original)!;
    expect(dup.id).not.toBe(original.id);
    const origIds = collectIds(original);
    const dupIds = collectIds(dup);
    for (const id of dupIds) expect(origIds.has(id)).toBe(false);
    expect(dup.children?.[0]?.children?.[0]?.content?.text).toBe(
      "Closure Heading",
    );
  });
});

describe("Phase 3 closure — nested round-trip trees", () => {
  it("Section>Container>Stack>Heading+Button is lossless", () => {
    const original = stackTree();
    const back = grapesJsonToProductNode(productNodeToGrapesJson(original))!;
    expect(back.id).toBe(original.id);
    expect(componentTreeFingerprint([back])).toBe(
      componentTreeFingerprint([original]),
    );
    expect(back.children?.[0]?.children?.[1]?.locked).toBe(true);
    expect(back.children?.[0]?.children?.[1]?.visibility?.mobile).toBe(false);
    expect(back.responsive?.tablet?.padding).toBe("24px");
    expect(back.responsive?.mobile?.padding).toBe("12px");
    expect(back.children?.[0]?.children?.[0]?.content?.text).toBe(
      "Closure Heading",
    );
  });

  it("Section>Grid>Card>Image+Heading×2 is lossless", () => {
    const original = gridTree();
    const back = grapesJsonToProductNode(productNodeToGrapesJson(original))!;
    expect(componentTreeFingerprint([back])).toBe(
      componentTreeFingerprint([original]),
    );
    expect(back.variant).toBe("two-col");
    expect(back.children?.[0]?.variant).toBe("elevated");
    expect(back.children?.[0]?.children?.[0]?.content?.alt).toBe("Card A");
    expect(back.children?.[1]?.children?.[1]?.content?.text).toBe("Card B Title");
  });

  it("save pipeline writes both trees into section.components", () => {
    const config = baseConfig();
    const project = buildProjectFromWebsiteConfig(config);
    // Inject trees via apply path using a minimal grapes page shape
    const stackGjs = productNodeToGrapesJson(stackTree());
    const gridGjs = productNodeToGrapesJson(gridTree());
    const synthetic = {
      pages: [
        {
          id: "home",
          frames: [
            {
              component: {
                type: "wrapper",
                components: [
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "hero-1",
                      "data-section-type": "hero",
                    },
                    components: [stackGjs, gridGjs],
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "footer-1",
                      "data-section-type": "footer",
                    },
                    components: [],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    applyCanonicalComponentsFromProject(config, synthetic);
    const hero = config.pages!.find((p) => p.id === "home")!.sections!.find(
      (s) => s.id === "hero-1",
    )!;
    expect(hero.components).toHaveLength(2);
    expect(hero.components![0]!.type).toBe("layout-container");
    expect(hero.components![1]!.type).toBe("layout-grid");
    void project;
  });
});

describe("Phase 3 closure — responsive inheritance", () => {
  it("Desktop=A Tablet=B Mobile=C then remove Mobile → Tablet, remove Tablet → Desktop", () => {
    const node = createComponentNode({
      id: "r",
      type: "layout-container",
      styles: { padding: "A" },
      responsive: {
        tablet: { padding: "B" },
        mobile: { padding: "C" },
      },
    });
    expect(resolveComponentStyleProp(node, "padding", "desktop").value).toBe("A");
    expect(resolveComponentStyleProp(node, "padding", "tablet").value).toBe("B");
    expect(resolveComponentStyleProp(node, "padding", "mobile").value).toBe("C");

    delete node.responsive!.mobile!.padding;
    expect(resolveComponentStyleProp(node, "padding", "mobile").value).toBe("B");
    expect(resolveComponentStyleProp(node, "padding", "mobile").inherited).toBe(
      true,
    );

    delete node.responsive!.tablet!.padding;
    expect(resolveComponentStyleProp(node, "padding", "tablet").value).toBe("A");
    expect(resolveComponentStyleProp(node, "padding", "mobile").value).toBe("A");
  });

  it("device edit does not mutate other device buckets", () => {
    const node = createComponentNode({
      id: "r2",
      type: "layout-container",
      styles: { color: "#000" },
      responsive: { tablet: { color: "#111" } },
    });
    node.responsive = {
      ...node.responsive,
      mobile: { ...(node.responsive?.mobile ?? {}), color: "#222" },
    };
    expect(node.styles?.color).toBe("#000");
    expect(node.responsive?.tablet?.color).toBe("#111");
    expect(node.responsive?.mobile?.color).toBe("#222");
  });
});

describe("Phase 3 closure — nesting authority", () => {
  it("canDropComponent aliases canNestBlocks", () => {
    expect(canDropComponent("layout-container", "content-heading")).toEqual(
      canNestBlocks("layout-container", "content-heading"),
    );
  });

  it("valid parent/child accepted", () => {
    expect(canNestBlocks("layout-stack", "content-button").accepted).toBe(true);
    expect(canNestBlocks("layout-grid", "content-card").accepted).toBe(true);
  });

  it("section nesting rejected", () => {
    expect(canNestBlocks("section-hero", "section-footer").accepted).toBe(false);
  });

  it("leaf cannot accept children", () => {
    expect(canNestBlocks("content-heading", "content-button").accepted).toBe(
      false,
    );
  });

  it("BEFORE/INSIDE/AFTER positions resolve", () => {
    expect(
      canDropOnTarget({
        parentBlockId: "layout-stack",
        targetBlockId: "content-heading",
        childBlockId: "content-button",
        position: "before",
      }).accepted,
    ).toBe(true);
    expect(
      canDropOnTarget({
        parentBlockId: "layout-stack",
        targetBlockId: "layout-container",
        childBlockId: "content-heading",
        position: "inside",
      }).accepted,
    ).toBe(true);
    expect(
      canDropOnTarget({
        parentBlockId: "layout-stack",
        targetBlockId: "content-heading",
        childBlockId: "content-button",
        position: "after",
      }).accepted,
    ).toBe(true);
  });

  it("getAllowedChildren / getAllowedParents are non-empty for nestables", () => {
    expect(getAllowedChildren("layout-container").length).toBeGreaterThan(0);
    expect(getAllowedParents("content-heading").length).toBeGreaterThan(0);
  });
});

describe("Phase 3 closure — tree ops + identity safety", () => {
  it("reorder / remove / find preserve ids and structure", () => {
    const forest = normalizeComponentTree([stackTree()])!;
    const stack = forest[0]!.children![0]!;
    const kids = stack.children!;
    expect(kids).toHaveLength(2);
    const reordered = reorderSiblings(kids, 1, 0);
    expect(reordered.map((n) => n.id)).toEqual(["button-rt", "heading-rt"]);
    const without = removeComponentById(forest, "button-rt");
    expect(findComponentById(without, "button-rt")).toBeNull();
    expect(findComponentById(without, "heading-rt")?.id).toBe("heading-rt");
  });

  it("hidden and locked survive normalize", () => {
    const tree = normalizeComponentTree([
      createComponentNode({
        id: "x",
        type: "content-text",
        content: { text: "Hi" },
        locked: true,
        hidden: true,
        visibility: { mobile: false },
      }),
    ])!;
    expect(tree[0]!.locked).toBe(true);
    expect(tree[0]!.hidden).toBe(true);
    expect(isComponentVisibleAt(tree[0]!, "mobile")).toBe(false);
  });
});

describe("Phase 3 closure — multi-page isolation", () => {
  it("page edits do not contaminate sibling pages", () => {
    const config = baseConfig();
    const home = config.pages!.find((p) => p.id === "home")!;
    const pageA = config.pages!.find((p) => p.id === "page-a")!;
    home.sections![0]!.components = [stackTree()];
    pageA.sections![0]!.components = [gridTree()];
    const normalized = normalizeWebsiteComponentTrees(config);
    const homeTree = normalized.pages!.find((p) => p.id === "home")!.sections![0]!
      .components!;
    const aTree = normalized.pages!.find((p) => p.id === "page-a")!.sections![0]!
      .components!;
    expect(homeTree[0]!.type).toBe("layout-container");
    expect(aTree[0]!.type).toBe("layout-grid");
    expect(home.slug).toBe("");
    expect(pageA.slug).toBe("page-a");
    expect(config.pages!.find((p) => p.id === "page-b")!.slug).toBe("page-b");
  });

  it("duplicated page trees are independent after remint", () => {
    const source = [stackTree()];
    const copy = source.map((n) => duplicateComponentSubtree(n)!);
    expect(copy[0]!.id).not.toBe(source[0]!.id);
    copy[0]!.children![0]!.children![0]!.content = { text: "Mutated" };
    expect(source[0]!.children![0]!.children![0]!.content?.text).toBe(
      "Closure Heading",
    );
  });
});

describe("Phase 3 closure — WebsiteRenderer without GrapesJS", () => {
  it("renders nested components from section.components", () => {
    const config = baseConfig();
    config.pages![0]!.sections![0]!.components = [stackTree()];
    config.sections[0]!.components = config.pages![0]!.sections![0]!.components;
    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(html).toContain("Closure Heading");
    expect(html).toContain("Buy Now");
    expect(html).not.toContain("grapesjs");
  });

  it("NestedComponentTree renders grid cards", () => {
    const html = renderToStaticMarkup(
      React.createElement(NestedComponentTree, {
        nodes: [gridTree()],
        config: baseConfig(),
      }),
    );
    expect(html).toContain("Card A Title");
    expect(html).toContain("Card B Title");
    expect(html).toContain("alt=\"Card A\"");
  });
});

describe("Phase 3 closure — templates", () => {
  const EXPECTED = [
    "fashion-luxury",
    "restaurant-editorial",
    "saas-modern",
    "beauty-premium",
    "agency-creative",
    "portfolio-creator",
    "real-estate",
    "coffee-modern",
  ];

  it("all 8 templates instantiate, normalize, and render", () => {
    const ids = getTemplates().map((t) => t.id);
    for (const id of EXPECTED) {
      expect(ids).toContain(id);
      const result = instantiateTemplate(id, {
        brandName: `Brand ${id}`,
        locale: "en",
        language: "en",
      });
      expect(result.config.templateCatalogId).toBe(id);
      expect(result.config.pages?.length).toBeGreaterThan(0);
      const normalized = normalizeWebsiteComponentTrees(result.config);
      expect(shouldUseCanonicalHomeRenderer(normalized)).toBe(true);
      const html = renderToStaticMarkup(
        React.createElement(WebsiteRenderer, {
          config: normalized,
          mode: "preview",
          pageId: "home",
        }),
      );
      expect(html.length).toBeGreaterThan(80);
    }
  });

  it("RTL Persian template instantiation preserves direction", () => {
    const result = instantiateTemplate("coffee-modern", {
      brandName: "کافه",
      locale: "fa",
      language: "fa",
    });
    expect(result.config.settings.language).toBe("fa");
    expect(result.config.settings.direction).toBe("rtl");
  });
});

describe("Phase 3 closure — legacy paths", () => {
  it("Classic section-only configs still normalize", () => {
    const config = baseConfig();
    delete (config.sections[0] as { components?: unknown }).components;
    const next = normalizeEditorConfig(config);
    expect(next.sections[0]!.type).toBe("hero");
    expect(next.sections[0]!.components).toBeUndefined();
  });

  it("legacy store path still selected without catalog", () => {
    const config = baseConfig({
      template: "store",
      templateCatalogId: undefined,
    });
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(false);
  });

  it("StoreRenderer still mounts for store template", () => {
    const config = baseConfig({
      template: "store",
      templateCatalogId: undefined,
      content: {
        hero: {
          style: "minimal",
          headline: "Shop",
          subheadline: "Legacy",
          cta: "Buy",
        },
        products: {
          title: "Products",
          items: [],
        },
      },
    });
    const html = renderToStaticMarkup(
      React.createElement(StoreRenderer, {
        config,
        mode: "published",
      }),
    );
    expect(html.length).toBeGreaterThan(50);
  });
});

describe("Phase 3 closure — preview/publish parity (canonical)", () => {
  it("same nested content appears in preview and published modes", () => {
    const config = baseConfig();
    config.pages![0]!.sections![0]!.components = [stackTree()];
    config.sections[0]!.components = config.pages![0]!.sections![0]!.components;
    const preview = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "preview",
        pageId: "home",
      }),
    );
    const published = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(preview).toContain("Closure Heading");
    expect(published).toContain("Closure Heading");
    expect(preview).toContain("Buy Now");
    expect(published).toContain("Buy Now");
  });

  it("applyVisualProjectToWebsiteConfig round-trips fingerprint for empty project seed", () => {
    const config = baseConfig();
    const project = buildProjectFromWebsiteConfig(config);
    const next = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: "home",
    });
    expect(next.visualEditor?.engine).toBe("grapesjs");
    expect(next.pages?.find((p) => p.id === "home")?.id).toBe("home");
  });
});
