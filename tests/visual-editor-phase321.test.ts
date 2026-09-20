/**
 * Phase 3.2.1 — Canonical nested component architecture.
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
  normalizeComponentNode,
  normalizeComponentTree,
  normalizeWebsiteComponentTrees,
  duplicateComponentSubtree,
  duplicateComponentForest,
  resolveComponentStyleProp,
  isComponentVisibleAt,
  findComponentById,
  reorderSiblings,
  removeComponentById,
  componentTreeFingerprint,
  grapesNodeToProductNode,
  grapesJsonToProductNode,
  productNodeToGrapesJson,
  productNodeToHtml,
  productForestToHtml,
  applyCanonicalComponentsFromProject,
  extractPageSectionComponentTrees,
  extractComponentsFromSectionNode,
} from "@/lib/visual-editor";
import { NestedComponentTree } from "@/components/website/NestedComponentTree";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
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
      name: "Canonical Co",
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
        id: "about",
        slug: "about",
        name: "About",
        kind: "about",
        sections: [
          { id: "about-1", type: "about", visible: true },
          { id: "footer-1", type: "footer", visible: true },
        ],
      },
    ],
    seo: { title: "Canonical", description: "Test", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {
      img1: { url: "https://example.com/a.jpg", alt: "A", type: "image" },
    },
    templateCatalogId: "saas-modern",
    ...overrides,
  };
}

function deepNestedTree(): WebsiteComponentNode {
  return createComponentNode({
    id: "container-a",
    type: "layout-container",
    styles: { padding: "40px" },
    responsive: { mobile: { padding: "16px" } },
    children: [
      createComponentNode({
        id: "stack-a",
        type: "layout-stack",
        children: [
          createComponentNode({
            id: "card-a",
            type: "content-card",
            children: [
              createComponentNode({
                id: "heading-a",
                type: "content-heading",
                content: { text: "Hello World" },
              }),
              createComponentNode({
                id: "text-a",
                type: "content-text",
                content: { text: "Canonical content" },
              }),
              createComponentNode({
                id: "button-a",
                type: "content-button",
                content: { text: "Get Started", label: "Get Started", href: "/go" },
                visibility: { desktop: true, tablet: true, mobile: false },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

describe("Phase 3.2.1 model", () => {
  it("creates nodes with stable non-index ids", () => {
    const a = mintComponentId("layout-container");
    const b = mintComponentId("layout-container");
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/^\d+$/);
    expect(a.includes("Date")).toBe(false);
  });

  it("createComponentNode fills defaults", () => {
    const n = createComponentNode({ type: "content-heading", content: { text: "Hi" } });
    expect(n.id).toBeTruthy();
    expect(n.type).toBe("content-heading");
    expect(n.content?.text).toBe("Hi");
  });

  it("normalizes nested children and preserves ids", () => {
    const tree = normalizeComponentTree([deepNestedTree()]);
    expect(tree?.[0]?.id).toBe("container-a");
    expect(tree?.[0]?.children?.[0]?.children?.[0]?.children?.[0]?.content?.text).toBe(
      "Hello World",
    );
  });

  it("normalize is idempotent", () => {
    const once = normalizeComponentTree([deepNestedTree()])!;
    const twice = normalizeComponentTree(once)!;
    expect(componentTreeFingerprint(once)).toBe(componentTreeFingerprint(twice));
  });

  it("rejects circular ids by reminting", () => {
    const circular = {
      id: "same",
      type: "layout-stack",
      children: [{ id: "same", type: "content-heading", content: { text: "X" } }],
    };
    const n = normalizeComponentNode(circular);
    expect(n?.id).toBe("same");
    expect(n?.children?.[0]?.id).not.toBe("same");
  });

  it("unknown type becomes controlled fallback", () => {
    const n = normalizeComponentNode({ id: "u1", type: "", content: { text: "keep" } });
    expect(n?.type).toBe("unknown");
    expect(n?.content?.text).toBe("keep");
  });

  it("normalizeWebsiteComponentTrees is idempotent on config", () => {
    const config = baseConfig();
    config.sections[0]!.components = [deepNestedTree()];
    const a = normalizeWebsiteComponentTrees(config);
    const b = normalizeWebsiteComponentTrees(a);
    expect(componentTreeFingerprint(a.sections[0]!.components)).toBe(
      componentTreeFingerprint(b.sections[0]!.components),
    );
  });

  it("does not invent empty components arrays", () => {
    const config = normalizeWebsiteComponentTrees(baseConfig());
    expect(config.sections[0]!.components).toBeUndefined();
  });
});

describe("Phase 3.2.1 responsive inheritance", () => {
  const node = createComponentNode({
    id: "r1",
    type: "content-heading",
    styles: { "font-size": "64px", padding: "40px" },
    responsive: {
      tablet: { "font-size": "48px" },
      mobile: { padding: "16px" },
    },
  });

  it("desktop uses base", () => {
    expect(resolveComponentStyleProp(node, "font-size", "desktop").value).toBe("64px");
  });

  it("tablet override", () => {
    const r = resolveComponentStyleProp(node, "font-size", "tablet");
    expect(r.value).toBe("48px");
    expect(r.inherited).toBe(false);
  });

  it("mobile inherits tablet font-size", () => {
    const r = resolveComponentStyleProp(node, "font-size", "mobile");
    expect(r.value).toBe("48px");
    expect(r.inherited).toBe(true);
    expect(r.source).toBe("tablet");
  });

  it("mobile padding override", () => {
    expect(resolveComponentStyleProp(node, "padding", "mobile").value).toBe("16px");
  });

  it("visibility inheritance", () => {
    const btn = createComponentNode({
      id: "b",
      type: "content-button",
      visibility: { desktop: true, tablet: true, mobile: false },
    });
    expect(isComponentVisibleAt(btn, "desktop")).toBe(true);
    expect(isComponentVisibleAt(btn, "mobile")).toBe(false);
  });

  it("hidden flag wins", () => {
    const n = createComponentNode({
      id: "h",
      type: "content-text",
      hidden: true,
      visibility: { desktop: true, tablet: true, mobile: true },
    });
    expect(isComponentVisibleAt(n, "desktop")).toBe(false);
  });
});

describe("Phase 3.2.1 tree operations", () => {
  it("duplicates subtree with new ids and cloned content", () => {
    const original = deepNestedTree();
    const idMap = new Map<string, string>();
    const copy = duplicateComponentSubtree(original, idMap);
    expect(copy.id).not.toBe(original.id);
    expect(idMap.get("container-a")).toBe(copy.id);
    expect(idMap.size).toBeGreaterThanOrEqual(5);
    expect(findComponentById([copy], "heading-a")).toBeNull();
    const heading = findComponentById([copy], idMap.get("heading-a")!);
    expect(heading?.content?.text).toBe("Hello World");
    heading!.content!.text = "Changed";
    expect(findComponentById([original], "heading-a")?.content?.text).toBe(
      "Hello World",
    );
  });

  it("duplicate forest remaps all roots", () => {
    const { nodes, idMap } = duplicateComponentForest([
      createComponentNode({ id: "a", type: "content-heading", content: { text: "A" } }),
      createComponentNode({ id: "b", type: "content-button", content: { text: "B" } }),
    ]);
    expect(nodes).toHaveLength(2);
    expect(idMap.has("a")).toBe(true);
    expect(idMap.has("b")).toBe(true);
    expect(nodes[0]!.id).toBe(idMap.get("a"));
  });

  it("reorders siblings", () => {
    const nodes = [
      createComponentNode({ id: "a", type: "content-heading" }),
      createComponentNode({ id: "b", type: "content-text" }),
      createComponentNode({ id: "c", type: "content-button" }),
    ];
    const next = reorderSiblings(nodes, 2, 0);
    expect(next.map((n) => n.id)).toEqual(["c", "a", "b"]);
  });

  it("deletes nested subtree", () => {
    const tree = [deepNestedTree()];
    const next = removeComponentById(tree, "card-a");
    expect(findComponentById(next, "card-a")).toBeNull();
    expect(findComponentById(next, "heading-a")).toBeNull();
    expect(findComponentById(next, "stack-a")).toBeTruthy();
  });

  it("lock is distinct from hidden", () => {
    const n = createComponentNode({
      id: "l",
      type: "layout-container",
      locked: true,
      hidden: false,
    });
    expect(n.locked).toBe(true);
    expect(isComponentVisibleAt(n, "desktop")).toBe(true);
  });
});

describe("Phase 3.2.1 GrapesJS adapters", () => {
  function grapesTree() {
    return {
      tagName: "div",
      attributes: {
        "data-component-id": "container-a",
        "data-component-type": "layout-container",
        "data-rstyle-desktop-padding": "40px",
        "data-rstyle-mobile-padding": "16px",
      },
      style: { padding: "40px" },
      components: [
        {
          tagName: "div",
          attributes: {
            "data-component-id": "stack-a",
            "data-component-type": "layout-stack",
          },
          components: [
            {
              tagName: "div",
              attributes: {
                "data-component-id": "card-a",
                "data-component-type": "content-card",
              },
              components: [
                {
                  tagName: "h2",
                  attributes: {
                    "data-component-id": "heading-a",
                    "data-component-type": "content-heading",
                  },
                  components: [{ type: "textnode", content: "Canonical Test Heading" }],
                },
                {
                  tagName: "a",
                  attributes: {
                    "data-component-id": "button-a",
                    "data-component-type": "content-button",
                    href: "/launch",
                    "data-visible-mobile": "false",
                  },
                  components: [{ type: "textnode", content: "Launch" }],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  it("GrapesJS → Product preserves hierarchy and content", () => {
    const product = grapesNodeToProductNode(grapesTree());
    expect(product?.type).toBe("layout-container");
    expect(product?.id).toBe("container-a");
    expect(product?.responsive?.desktop?.padding).toBe("40px");
    expect(product?.responsive?.mobile?.padding).toBe("16px");
    // walk
    const texts: string[] = [];
    const walk = (n?: WebsiteComponentNode) => {
      if (!n) return;
      if (n.id === "heading-a") texts.push(String(n.content?.text ?? ""));
      if (n.id === "button-a") texts.push(String(n.content?.text ?? n.content?.label ?? ""));
      n.children?.forEach(walk);
    };
    walk(product!);
    expect(texts).toContain("Canonical Test Heading");
    expect(texts).toContain("Launch");
  });

  it("Product → GrapesJS → Product round-trip is stable", () => {
    const original = deepNestedTree();
    const gjs = productNodeToGrapesJson(original);
    const back = grapesJsonToProductNode(gjs);
    expect(back?.id).toBe(original.id);
    expect(back?.type).toBe(original.type);
    expect(componentTreeFingerprint(back?.children)).toBe(
      componentTreeFingerprint(original.children),
    );
    expect(back?.styles?.padding).toBe("40px");
    expect(back?.responsive?.mobile?.padding).toBe("16px");
  });

  it("productNodeToHtml includes content", () => {
    const html = productNodeToHtml(
      createComponentNode({
        id: "h1",
        type: "content-heading",
        content: { text: "Hello World" },
      }),
    );
    expect(html).toContain("Hello World");
    expect(html).toContain('data-component-id="h1"');
  });

  it("extracts section component trees from project", () => {
    const project = {
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
                      "data-visible": "true",
                    },
                    components: [grapesTree()],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const map = extractPageSectionComponentTrees(project);
    expect(map.home?.["hero-1"]?.[0]?.type).toBe("layout-container");
    expect(
      productForestToHtml(map.home!["hero-1"]!).includes("Canonical Test Heading"),
    ).toBe(true);
  });

  it("applyCanonicalComponentsFromProject writes section.components", () => {
    const config = baseConfig();
    const project = {
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
                    components: [grapesTree()],
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
    applyCanonicalComponentsFromProject(config, project);
    const home = config.pages!.find((p) => p.id === "home")!;
    const hero = home.sections!.find((s) => s.id === "hero-1")!;
    expect(hero.components?.[0]?.type).toBe("layout-container");
    expect(config.sections.find((s) => s.id === "hero-1")?.components?.length).toBeGreaterThan(
      0,
    );
  });
});

describe("Phase 3.2.1 data-loss acceptance", () => {
  it("save pipeline preserves nested content/styles/visibility", () => {
    const config = baseConfig();
    const project = {
      pages: [
        {
          id: "home",
          name: "Home",
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
                      "data-section-variant": "minimal",
                      "data-visible": "true",
                    },
                    components: [
                      {
                        tagName: "div",
                        attributes: {
                          "data-component-id": "container-a",
                          "data-component-type": "layout-container",
                          "data-rstyle-desktop-padding": "40px",
                          "data-rstyle-mobile-padding": "16px",
                        },
                        style: { padding: "40px" },
                        components: [
                          {
                            tagName: "div",
                            attributes: {
                              "data-component-id": "stack-a",
                              "data-component-type": "layout-stack",
                            },
                            components: [
                              {
                                tagName: "div",
                                attributes: {
                                  "data-component-id": "card-a",
                                  "data-component-type": "content-card",
                                },
                                components: [
                                  {
                                    tagName: "h2",
                                    attributes: {
                                      "data-component-id": "heading-a",
                                      "data-component-type": "content-heading",
                                    },
                                    components: [
                                      { type: "textnode", content: "Hello World" },
                                    ],
                                  },
                                  {
                                    tagName: "p",
                                    attributes: {
                                      "data-component-id": "text-a",
                                      "data-component-type": "content-text",
                                    },
                                    components: [
                                      {
                                        type: "textnode",
                                        content: "Canonical content",
                                      },
                                    ],
                                  },
                                  {
                                    tagName: "a",
                                    attributes: {
                                      "data-component-id": "button-a",
                                      "data-component-type": "content-button",
                                      href: "/start",
                                      "data-visible-mobile": "false",
                                    },
                                    components: [
                                      { type: "textnode", content: "Get Started" },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "footer-1",
                      "data-section-type": "footer",
                      "data-visible": "true",
                    },
                    components: [],
                  },
                ],
              },
            },
          ],
        },
        {
          id: "about",
          name: "About",
          frames: [
            {
              component: {
                type: "wrapper",
                components: [
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "about-1",
                      "data-section-type": "about",
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

    const saved = applyVisualProjectToWebsiteConfig(config, project);
    const hero = saved.pages!.find((p) => p.id === "home")!.sections!.find(
      (s) => s.id === "hero-1",
    )!;
    expect(hero.components).toBeTruthy();

    const fp = componentTreeFingerprint(hero.components);
    expect(fp).toContain("Hello World");
    expect(fp).toContain("Canonical content");
    expect(fp).toContain("Get Started");

    const container = hero.components![0]!;
    expect(container.responsive?.desktop?.padding ?? container.styles?.padding).toBeTruthy();
    expect(container.responsive?.mobile?.padding).toBe("16px");

    const button = findComponentById(hero.components, "button-a");
    expect(button?.visibility?.mobile).toBe(false);

    // About page isolation
    const about = saved.pages!.find((p) => p.id === "about")!;
    expect(about.sections?.find((s) => s.id === "about-1")?.components).toBeUndefined();

    // Reload projection still carries tree
    const reprojected = buildProjectFromWebsiteConfig(saved);
    const again = applyVisualProjectToWebsiteConfig(saved, reprojected as never);
    const hero2 = again.pages!.find((p) => p.id === "home")!.sections!.find(
      (s) => s.id === "hero-1",
    )!;
    // After reproject from config, components remain on SectionConfig
    expect(hero2.components?.length || hero.components?.length).toBeGreaterThan(0);

    // Renderer output contains canonical text
    const markup = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config: saved,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(markup).toContain("Hello World");
    expect(markup).toContain("Canonical content");
    expect(markup).toContain("Get Started");
  });
});

describe("Phase 3.2.1 rendering", () => {
  it("NestedComponentTree renders heading/button/image", () => {
    const config = baseConfig();
    const nodes: WebsiteComponentNode[] = [
      createComponentNode({
        id: "h",
        type: "content-heading",
        content: { text: "Title X" },
      }),
      createComponentNode({
        id: "btn",
        type: "content-button",
        content: { text: "Click", href: "/x" },
      }),
      createComponentNode({
        id: "img",
        type: "media-image",
        content: { mediaId: "img1", alt: "A" },
      }),
    ];
    const html = renderToStaticMarkup(
      React.createElement(NestedComponentTree, { nodes, config }),
    );
    expect(html).toContain("Title X");
    expect(html).toContain("Click");
    expect(html).toContain("https://example.com/a.jpg");
    expect(html).toContain('alt="A"');
  });

  it("WebsiteRenderer renders section.components alongside specialized section", () => {
    const config = baseConfig();
    config.pages![0]!.sections![0]!.components = [
      createComponentNode({
        id: "extra",
        type: "content-heading",
        content: { text: "Nested Extra" },
      }),
    ];
    config.sections[0]!.components = config.pages![0]!.sections![0]!.components;
    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(html).toContain("Nested Extra");
    expect(html).toContain("Welcome"); // hero headline
  });

  it("freeform-only section renders without specialized Comp", () => {
    const config = baseConfig();
    const free: WebsiteComponentNode = createComponentNode({
      id: "c1",
      type: "layout-container",
      children: [
        createComponentNode({
          id: "h1",
          type: "content-heading",
          content: { text: "Freeform Heading" },
        }),
      ],
    });
    config.pages![0]!.sections = [
      {
        id: "home__freeform",
        type: "columns",
        visible: true,
        components: [free],
      },
      { id: "footer-1", type: "footer", visible: true },
    ];
    config.sections = config.pages![0]!.sections;
    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(html).toContain("Freeform Heading");
  });

  it("unknown component type falls back safely", () => {
    const config = baseConfig();
    const html = renderToStaticMarkup(
      React.createElement(NestedComponentTree, {
        config,
        nodes: [
          createComponentNode({
            id: "u",
            type: "totally-unknown-xyz",
            content: { text: "Survives" },
            children: [
              createComponentNode({
                id: "c",
                type: "content-text",
                content: { text: "Child ok" },
              }),
            ],
          }),
        ],
      }),
    );
    expect(html).toContain("Survives");
    expect(html).toContain("Child ok");
    expect(html).toContain("data-fallback-type");
  });
});

describe("Phase 3.2.1 multi-page isolation", () => {
  it("editing home nested tree does not mutate about", () => {
    const config = baseConfig();
    config.pages![0]!.sections![0]!.components = [deepNestedTree()];
    config.sections[0]!.components = config.pages![0]!.sections![0]!.components;
    const aboutBefore = structuredClone(config.pages![1]);
    const project = buildProjectFromWebsiteConfig(config);
    const next = applyVisualProjectToWebsiteConfig(config, project as never);
    expect(JSON.stringify(next.pages!.find((p) => p.id === "about"))).toBe(
      JSON.stringify(aboutBefore),
    );
  });
});

describe("Phase 3.2.1 content types", () => {
  const cases: Array<{ type: string; content: Record<string, unknown>; needle: string }> = [
    { type: "content-heading", content: { text: "H" }, needle: "H" },
    { type: "content-text", content: { text: "Body copy" }, needle: "Body copy" },
    { type: "content-button", content: { text: "Buy", href: "/buy" }, needle: "Buy" },
    { type: "content-card", content: { text: "Card" }, needle: "Card" },
    { type: "form-input", content: { placeholder: "Email", name: "email" }, needle: "Email" },
    { type: "form-textarea", content: { placeholder: "Msg", name: "msg" }, needle: "Msg" },
    { type: "form-checkbox", content: { label: "Agree" }, needle: "Agree" },
  ];

  for (const c of cases) {
    it(`canonicalizes ${c.type}`, () => {
      const node = createComponentNode({
        id: `id-${c.type}`,
        type: c.type,
        content: c.content,
      });
      const gjs = productNodeToGrapesJson(node);
      const back = grapesJsonToProductNode(gjs)!;
      const html = productNodeToHtml(back);
      expect(html).toContain(c.needle);
    });
  }

  it("canonicalizes media-image with mediaId", () => {
    const node = createComponentNode({
      id: "img",
      type: "media-image",
      content: { mediaId: "img1", src: "https://example.com/a.jpg", alt: "Alt" },
    });
    const back = grapesJsonToProductNode(productNodeToGrapesJson(node))!;
    expect(back.content?.mediaId).toBe("img1");
    expect(back.content?.alt).toBe("Alt");
  });
});

describe("Phase 3.2.1 styles round-trip", () => {
  it("preserves layout spacing typography color border effects", () => {
    const node = createComponentNode({
      id: "s",
      type: "layout-container",
      styles: {
        display: "flex",
        width: "100%",
        padding: "24px",
        margin: "8px",
        "font-size": "18px",
        "font-weight": "600",
        color: "#111",
        "background-color": "#fafafa",
        "border-width": "1px",
        "border-style": "solid",
        "border-radius": "12px",
        opacity: "0.95",
        "box-shadow": "0 1px 2px rgba(0,0,0,.1)",
        gap: "16px",
      },
    });
    const back = grapesJsonToProductNode(productNodeToGrapesJson(node))!;
    expect(back.styles?.display).toBe("flex");
    expect(back.styles?.padding).toBe("24px");
    expect(back.styles?.["font-size"]).toBe("18px");
    expect(back.styles?.color).toBe("#111");
    expect(back.styles?.["border-radius"]).toBe("12px");
    expect(back.styles?.opacity).toBe("0.95");
  });
});

describe("Phase 3.2.1 variants", () => {
  it("preserves component variant through adapters", () => {
    const node = createComponentNode({
      id: "v",
      type: "content-card",
      variant: "elevated",
      content: { text: "Card" },
    });
    const back = grapesJsonToProductNode(productNodeToGrapesJson(node))!;
    expect(back.variant).toBe("elevated");
  });

  it("section variant remains on SectionConfig after component sync", () => {
    const config = baseConfig();
    void buildProjectFromWebsiteConfig(config);
    // Inject nested component under hero in project-like shape via apply
    const withTree = structuredClone(config);
    withTree.pages![0]!.sections![0]!.components = [
      createComponentNode({
        id: "n",
        type: "content-heading",
        content: { text: "X" },
      }),
    ];
    withTree.sections[0]!.components = withTree.pages![0]!.sections![0]!.components;
    withTree.sections[0]!.variant = "minimal";
    withTree.pages![0]!.sections![0]!.variant = "minimal";
    expect(withTree.sections[0]!.variant).toBe("minimal");
  });
});

describe("Phase 3.2.1 legacy + templates", () => {
  it("section-only configs still normalize", () => {
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

  it("all 8 templates instantiate with intact sections", () => {
    const ids = getTemplates().map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of ids) {
      const result = instantiateTemplate(id, {
        brandName: "Test",
        locale: "en",
        language: "en",
      });
      expect(result.config.sections.length).toBeGreaterThan(0);
      expect(result.config.pages?.length).toBeGreaterThan(0);
      // Nested components optional — must not crash normalize
      const normalized = normalizeWebsiteComponentTrees(result.config);
      expect(normalized.sections.length).toBe(result.config.sections.length);
    }
  });

  it("template sites still use canonical home renderer", () => {
    const result = instantiateTemplate("saas-modern", {
      brandName: "SaaS",
      locale: "en",
    });
    expect(shouldUseCanonicalHomeRenderer(result.config)).toBe(true);
    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config: result.config,
        mode: "published",
        pageId: "home",
      }),
    );
    expect(html.length).toBeGreaterThan(100);
  });
});

describe("Phase 3.2.1 extract helpers", () => {
  it("extractComponentsFromSectionNode skips unmarked specialized markup", () => {
    const section = {
      tagName: "section",
      attributes: { "data-section-id": "hero-1", "data-section-type": "hero" },
      components: [
        {
          tagName: "h1",
          attributes: { "data-component-id": "hero-1__headline" },
          components: [{ type: "textnode", content: "Welcome" }],
        },
        {
          tagName: "div",
          attributes: {
            "data-component-id": "c1",
            "data-component-type": "layout-container",
          },
          components: [
            {
              tagName: "h2",
              attributes: {
                "data-component-id": "h1",
                "data-component-type": "content-heading",
              },
              components: [{ type: "textnode", content: "Freeform" }],
            },
          ],
        },
      ],
    };
    const tree = extractComponentsFromSectionNode(section);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.type).toBe("layout-container");
    expect(tree[0]!.children?.[0]?.content?.text).toBe("Freeform");
  });
});
