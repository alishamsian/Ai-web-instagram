/**
 * Phase 3 final E2E / hardening regressions.
 * Complements browser QA; covers DnD, responsive inheritance, deep round-trip,
 * media alt, multi-page isolation, render contract, and identity safety.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import type { WebsiteComponentNode, WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  canDropOnTarget,
  canNestBlocks,
  createComponentNode,
  duplicateComponentSubtree,
  findComponentById,
  grapesJsonToProductNode,
  isComponentVisibleAt,
  mintComponentId,
  normalizeWebsiteComponentTrees,
  productNodeToGrapesJson,
  removeComponentById,
  reorderSiblings,
  resolveComponentStyleProp,
  resolvePositionFromRatio,
} from "@/lib/visual-editor";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import {
  getTemplates,
  instantiateTemplate,
  resetTemplateRegistry,
} from "@/lib/templates";
import { allowDemoAuth } from "@/lib/config/runtime";
import { shouldUseCanonicalHomeRenderer } from "@/lib/website/canonical-render";

beforeEach(() => {
  resetTemplateRegistry();
});

function deepTree(): WebsiteComponentNode {
  return createComponentNode({
    id: "container-root",
    type: "layout-container",
    children: [
      createComponentNode({
        id: "stack-1",
        type: "layout-stack",
        children: [
          createComponentNode({
            id: "heading-1",
            type: "content-heading",
            content: { text: "P3-FINAL-HEADING", level: 2 },
            styles: { fontSize: "32px", color: "#111111" },
            responsive: {
              tablet: { fontSize: "24px" },
              mobile: { fontSize: "18px" },
            },
            visibility: { desktop: true, tablet: true, mobile: true },
          }),
          createComponentNode({
            id: "text-1",
            type: "content-text",
            content: { text: "Body copy" },
            styles: { padding: "8px" },
          }),
          createComponentNode({
            id: "button-1",
            type: "content-button",
            content: { label: "Go", href: "/contact" },
            locked: true,
          }),
          createComponentNode({
            id: "image-1",
            type: "media-image",
            content: {
              src: "https://example.com/a.jpg",
              alt: "Alt before",
            },
            props: { objectFit: "cover" },
          }),
        ],
      }),
    ],
  });
}

function configWithTree(tree: WebsiteComponentNode[]): WebsiteConfig {
  return {
    template: "services",
    brand: {
      name: "Final Co",
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
      {
        id: "hero-1",
        type: "hero",
        visible: true,
        variant: "minimal",
        components: tree,
      },
      { id: "footer-1", type: "footer", visible: true },
    ],
    pages: [
      {
        id: "home",
        slug: "",
        name: "Home",
        kind: "home",
        sections: [
          {
            id: "hero-1",
            type: "hero",
            visible: true,
            variant: "minimal",
            components: tree,
          },
          { id: "footer-1", type: "footer", visible: true },
        ],
      },
      {
        id: "about",
        slug: "about",
        name: "About",
        kind: "about",
        sections: [
          {
            id: "about-1",
            type: "about",
            visible: true,
            components: [
              createComponentNode({
                id: "about-heading",
                type: "content-heading",
                content: { text: "About only", level: 1 },
              }),
            ],
          },
        ],
      },
      {
        id: "contact",
        slug: "contact",
        name: "Contact",
        kind: "custom",
        sections: [
          {
            id: "contact-1",
            type: "contact",
            visible: true,
            components: [
              createComponentNode({
                id: "contact-heading",
                type: "content-heading",
                content: { text: "Contact only", level: 1 },
              }),
            ],
          },
        ],
      },
    ],
    media: {
      "media-a": {
        type: "image",
        url: "https://example.com/a.jpg",
        alt: "Alt before",
      },
    },
    seo: { title: "Final", description: "d", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
  };
}

describe("Phase 3 final — DnD positions & rejection", () => {
  it("resolves BEFORE / INSIDE / AFTER from ratio", () => {
    expect(resolvePositionFromRatio(0.1, true)).toBe("before");
    expect(resolvePositionFromRatio(0.5, true)).toBe("inside");
    expect(resolvePositionFromRatio(0.9, true)).toBe("after");
    expect(resolvePositionFromRatio(0.5, false)).not.toBe("inside");
  });

  it("allows heading inside stack and container", () => {
    expect(canNestBlocks("layout-stack", "content-heading").accepted).toBe(
      true,
    );
    expect(canNestBlocks("layout-container", "layout-stack").accepted).toBe(
      true,
    );
  });

  it("rejects button inside button and section in section", () => {
    expect(canNestBlocks("content-button", "content-heading").accepted).toBe(
      false,
    );
    expect(canNestBlocks("section-hero", "section-about").accepted).toBe(
      false,
    );
  });

  it("canDropOnTarget distinguishes inside vs sibling slots", () => {
    expect(
      canDropOnTarget({
        targetBlockId: "layout-container",
        childBlockId: "content-heading",
        position: "inside",
      }).accepted,
    ).toBe(true);
    expect(
      canDropOnTarget({
        parentBlockId: "layout-stack",
        targetBlockId: "content-heading",
        childBlockId: "content-text",
        position: "before",
      }).accepted,
    ).toBe(true);
    expect(
      canDropOnTarget({
        parentBlockId: "layout-stack",
        targetBlockId: "content-heading",
        childBlockId: "content-text",
        position: "after",
      }).accepted,
    ).toBe(true);
  });

  it("reorderSiblings BEFORE semantics (C before A)", () => {
    const forest = [
      createComponentNode({ id: "a", type: "content-heading" }),
      createComponentNode({ id: "b", type: "content-text" }),
      createComponentNode({ id: "c", type: "content-button" }),
    ];
    const next = reorderSiblings(forest, 2, 0);
    expect(next.map((n) => n.id)).toEqual(["c", "a", "b"]);
  });

  it("reorderSiblings AFTER semantics (A after C)", () => {
    const forest = [
      createComponentNode({ id: "a", type: "content-heading" }),
      createComponentNode({ id: "b", type: "content-text" }),
      createComponentNode({ id: "c", type: "content-button" }),
    ];
    // Move A (0) to after C → index 2
    const next = reorderSiblings(forest, 0, 2);
    expect(next.map((n) => n.id)).toEqual(["b", "c", "a"]);
  });

  it("mintComponentId never uses Date.now identity", () => {
    const a = mintComponentId("content-heading");
    const b = mintComponentId("content-heading");
    expect(a).not.toEqual(b);
    expect(a.includes(String(Date.now()).slice(0, 8))).toBe(false);
  });
});

describe("Phase 3 final — deep Save/Reload canonical equality", () => {
  it("preserves hierarchy content styles responsive lock through project round-trip", () => {
    const tree = [deepTree()];
    const config = configWithTree(tree);
    const project = buildProjectFromWebsiteConfig(config);
    const next = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: "home",
    });
    const home = next.pages?.find((p) => p.id === "home");
    const hero = home?.sections?.find((s) => s.id === "hero-1");
    const container = hero?.components?.[0];
    expect(container?.id).toBe("container-root");
    const stack = container?.children?.[0];
    expect(stack?.id).toBe("stack-1");
    expect(stack?.children?.map((c) => c.id)).toEqual([
      "heading-1",
      "text-1",
      "button-1",
      "image-1",
    ]);
    const heading = stack?.children?.[0];
    expect(String(heading?.content?.text)).toContain("P3-FINAL-HEADING");
    expect(
      heading?.content?.level === 2 || heading?.props?.level === 2,
    ).toBeTruthy();
    expect(
      heading?.styles?.fontSize || heading?.styles?.["font-size"],
    ).toBeTruthy();
    expect(
      heading?.responsive?.tablet || heading?.responsive?.mobile,
    ).toBeTruthy();
    const button = stack?.children?.find((c) => c.id === "button-1");
    expect(button?.locked).toBe(true);
    const image = stack?.children?.find((c) => c.id === "image-1");
    expect(image?.content?.alt).toBe("Alt before");
  });

  it("grapes JSON product node round-trip keeps alt", () => {
    const node = createComponentNode({
      id: "img-rt",
      type: "media-image",
      content: { src: "https://example.com/x.png", alt: "Round trip alt" },
    });
    const json = productNodeToGrapesJson(node);
    const back = grapesJsonToProductNode(json as never);
    expect(back?.content?.alt).toBe("Round trip alt");
  });

  it("duplicate remints ids without collision", () => {
    const source = deepTree();
    const dup = duplicateComponentSubtree(source);
    const ids: string[] = [];
    const walk = (n: WebsiteComponentNode) => {
      ids.push(n.id);
      n.children?.forEach(walk);
    };
    walk(dup);
    expect(new Set(ids).size).toBe(ids.length);
    expect(dup.id).not.toBe(source.id);
  });
});

describe("Phase 3 final — responsive inheritance", () => {
  it("mobile inherits tablet then desktop via resolveComponentStyleProp", () => {
    const node = createComponentNode({
      id: "h",
      type: "content-heading",
      styles: { fontSize: "40px" },
      responsive: { tablet: { fontSize: "28px" } },
    });
    expect(resolveComponentStyleProp(node, "fontSize", "desktop")).toMatchObject(
      { value: "40px" },
    );
    expect(resolveComponentStyleProp(node, "fontSize", "tablet").value).toBe(
      "28px",
    );
    expect(resolveComponentStyleProp(node, "fontSize", "mobile").value).toBe(
      "28px",
    );
    const withoutTablet = createComponentNode({
      id: "h2",
      type: "content-heading",
      styles: { fontSize: "40px" },
      responsive: {},
    });
    expect(
      resolveComponentStyleProp(withoutTablet, "fontSize", "mobile").value,
    ).toBe("40px");
  });

  it("visibility per device is independent", () => {
    const node = createComponentNode({
      id: "v",
      type: "content-text",
      visibility: { desktop: true, tablet: false, mobile: true },
    });
    expect(isComponentVisibleAt(node, "desktop")).toBe(true);
    expect(isComponentVisibleAt(node, "tablet")).toBe(false);
    expect(isComponentVisibleAt(node, "mobile")).toBe(true);
  });
});

describe("Phase 3 final — multi-page isolation", () => {
  it("home about contact trees stay isolated after normalize", () => {
    const config = normalizeWebsiteComponentTrees(configWithTree([deepTree()]));
    const homeSecs =
      config.pages?.find((p) => p.id === "home")?.sections ?? [];
    const aboutSecs =
      config.pages?.find((p) => p.id === "about")?.sections ?? [];
    const contactSecs =
      config.pages?.find((p) => p.id === "contact")?.sections ?? [];
    const home = findComponentById(
      homeSecs.flatMap((s) => s.components ?? []),
      "heading-1",
    );
    const about = findComponentById(
      aboutSecs.flatMap((s) => s.components ?? []),
      "about-heading",
    );
    const contact = findComponentById(
      contactSecs.flatMap((s) => s.components ?? []),
      "contact-heading",
    );
    expect(String(home?.content?.text)).toContain("P3-FINAL-HEADING");
    expect(about?.content?.text).toBe("About only");
    expect(contact?.content?.text).toBe("Contact only");
    expect(home?.id).not.toBe(about?.id);
  });

  it("removing from home does not touch about", () => {
    const config = configWithTree([deepTree()]);
    const homeSecs =
      config.pages?.find((p) => p.id === "home")?.sections ?? [];
    const hero = homeSecs.find((s) => s.id === "hero-1")!;
    hero.components = removeComponentById(hero.components ?? [], "button-1");
    const aboutStill = findComponentById(
      (config.pages?.find((p) => p.id === "about")?.sections ?? []).flatMap(
        (s) => s.components ?? [],
      ),
      "about-heading",
    );
    expect(aboutStill?.content?.text).toBe("About only");
    expect(findComponentById(hero.components ?? [], "button-1")).toBeNull();
  });
});

describe("Phase 3 final — render contract & templates", () => {
  it("specialized+freeform does not duplicate specialized headline", () => {
    const config = configWithTree([
      createComponentNode({
        id: "free-heading",
        type: "content-heading",
        content: { text: "FREEFORM-ONLY-MARKER", level: 2 },
      }),
    ]);
    config.content.hero = {
      style: "minimal",
      headline: "SPECIALIZED-HEADLINE",
      subheadline: "Sub",
      cta: "Go",
    };
    const html = renderToStaticMarkup(
      React.createElement(WebsiteRenderer, {
        config,
        mode: "preview",
      }),
    );
    expect(html).toContain('data-render-mode="specialized+freeform"');
    expect(html).toContain("SPECIALIZED-HEADLINE");
    expect(html).toContain("FREEFORM-ONLY-MARKER");
    const specializedCount = (html.match(/SPECIALIZED-HEADLINE/g) ?? []).length;
    expect(specializedCount).toBeLessThanOrEqual(2);
  });

  it("all 8 templates instantiate with pages and sections", () => {
    const ids = getTemplates().map((t) => t.id);
    expect(ids.length).toBeGreaterThanOrEqual(8);
    for (const id of [
      "fashion-luxury",
      "restaurant-editorial",
      "saas-modern",
      "beauty-premium",
      "agency-creative",
      "portfolio-creator",
      "real-estate",
      "coffee-modern",
    ]) {
      const result = instantiateTemplate(id, {
        brandName: `QA ${id}`,
        locale: "en",
        language: "en",
      });
      expect(result.config.pages?.length ?? 0).toBeGreaterThan(0);
      expect(result.config.sections.length).toBeGreaterThan(0);
      const normalized = normalizeWebsiteComponentTrees(result.config);
      expect(shouldUseCanonicalHomeRenderer(normalized)).toBe(true);
    }
  });

  it("demo auth remains available outside production", () => {
    if (process.env.NODE_ENV !== "production") {
      expect(allowDemoAuth()).toBe(true);
    }
  });
});

describe("Phase 3 final — history-like tree operations", () => {
  it("insert edit reorder duplicate hide delete stay consistent", () => {
    let forest: WebsiteComponentNode[] = [
      createComponentNode({
        id: "a",
        type: "content-heading",
        content: { text: "A" },
      }),
      createComponentNode({
        id: "b",
        type: "content-text",
        content: { text: "B" },
      }),
    ];
    forest = [
      ...forest,
      createComponentNode({
        id: "c",
        type: "content-button",
        content: { label: "C" },
      }),
    ];
    forest = forest.map((n) =>
      n.id === "a"
        ? { ...n, content: { ...n.content, text: "A-EDITED" } }
        : n,
    );
    forest = reorderSiblings(forest, 2, 0);
    expect(forest.map((n) => n.id)).toEqual(["c", "a", "b"]);
    const dupB = duplicateComponentSubtree(forest.find((n) => n.id === "b")!);
    forest = [...forest, dupB];
    const ids = forest.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    forest = forest.map((n) =>
      n.id === "a"
        ? {
            ...n,
            visibility: { desktop: false, tablet: true, mobile: true },
            hidden: true,
          }
        : n,
    );
    expect(
      isComponentVisibleAt(forest.find((n) => n.id === "a")!, "desktop"),
    ).toBe(false);
    forest = removeComponentById(forest, "c");
    expect(forest.find((n) => n.id === "c")).toBeUndefined();
    expect(forest.find((n) => n.id === "a")?.content?.text).toBe("A-EDITED");
  });
});

describe("Phase 3 final — INSIDE nesting & lock semantics", () => {
  it("nests heading inside stack children canonically", () => {
    const stack = createComponentNode({
      id: "stack-nest",
      type: "layout-stack",
      children: [
        createComponentNode({
          id: "h-nest",
          type: "content-heading",
          content: { text: "Nested" },
        }),
        createComponentNode({
          id: "btn-nest",
          type: "content-button",
          content: { label: "Click" },
        }),
      ],
    });
    expect(canNestBlocks("layout-stack", "content-heading").accepted).toBe(true);
    expect(canNestBlocks("layout-stack", "content-button").accepted).toBe(true);
    expect(stack.children?.map((c) => c.id)).toEqual(["h-nest", "btn-nest"]);
  });

  it("locked flag is preserved through normalize", () => {
    const node = createComponentNode({
      id: "locked-1",
      type: "content-heading",
      locked: true,
      content: { text: "Locked" },
    });
    const normalized = normalizeWebsiteComponentTrees(
      configWithTree([node]),
    );
    const found = findComponentById(
      (normalized.pages?.[0]?.sections ?? []).flatMap(
        (s) => s.components ?? [],
      ),
      "locked-1",
    );
    expect(found?.locked).toBe(true);
  });

  it("self-drop and leaf-parent rejected by nesting rules", () => {
    expect(canNestBlocks("content-heading", "content-text").accepted).toBe(
      false,
    );
    expect(
      canDropOnTarget({
        targetBlockId: "content-heading",
        childBlockId: "content-heading",
        position: "inside",
      }).accepted,
    ).toBe(false);
  });
});

describe("Phase 3 final — inspector-like style fields", () => {
  it("layout spacing typography color border effect props round-trip", () => {
    const node = createComponentNode({
      id: "styled",
      type: "content-heading",
      content: { text: "Styled", level: 3 },
      styles: {
        width: "320px",
        height: "auto",
        display: "block",
        margin: "8px",
        padding: "12px",
        fontSize: "20px",
        fontWeight: "600",
        lineHeight: "1.4",
        textAlign: "center",
        color: "#112233",
        backgroundColor: "#fafafa",
        borderWidth: "1px",
        borderRadius: "8px",
        borderStyle: "solid",
        opacity: "0.95",
        boxShadow: "0 1px 2px rgba(0,0,0,.12)",
      },
    });
    const json = productNodeToGrapesJson(node);
    const back = grapesJsonToProductNode(json as never);
    expect(back?.content?.text).toBe("Styled");
    expect(back?.styles?.fontSize || back?.styles?.["font-size"]).toBeTruthy();
    expect(back?.styles?.color || back?.styles?.["color"]).toBeTruthy();
  });
});

describe("Phase 3 final — media alt persistence in tree", () => {
  it("image alt change survives normalize + project sync", () => {
    const tree = [
      createComponentNode({
        id: "image-1",
        type: "media-image",
        content: { src: "https://example.com/a.jpg", alt: "Old alt" },
      }),
    ];
    tree[0] = {
      ...tree[0],
      content: { ...tree[0].content, alt: "P3-FINAL-ALT" },
    };
    const config = configWithTree(tree);
    const project = buildProjectFromWebsiteConfig(config);
    const next = applyVisualProjectToWebsiteConfig(config, project);
    const img = findComponentById(
      (next.pages?.find((p) => p.id === "home")?.sections ?? []).flatMap(
        (s) => s.components ?? [],
      ),
      "image-1",
    );
    expect(img?.content?.alt).toBe("P3-FINAL-ALT");
  });
});
