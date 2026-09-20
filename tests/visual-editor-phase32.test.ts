/**
 * Phase 3.2 — Production visual builder regression suite.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  blockCanNest,
  buildProjectFromWebsiteConfig,
  canDropComponent,
  canDropOnTarget,
  canNestBlocks,
  createBlockHtml,
  getAllowedChildren,
  getAllowedParents,
  getVisualBlock,
  getVisualRegistry,
  isLeafBlock,
  isSectionBlock,
  listVisualBlocks,
  remintAttributeTree,
} from "@/lib/visual-editor";
import { resolveStyleProp } from "@/lib/visual-editor/responsive-style";
import {
  LOCK_ATTR,
  isComponentLocked,
  setComponentLocked,
} from "@/lib/visual-editor/lock";
import { readVisibilityMap } from "@/lib/visual-editor/responsive-visibility";
import { resolveResponsiveValue } from "@/lib/editor/responsive";
import {
  instantiateTemplate,
  resetTemplateRegistry,
} from "@/lib/templates";
import { shouldUseCanonicalHomeRenderer } from "@/lib/website/canonical-render";

beforeEach(() => {
  resetTemplateRegistry();
});

function mockComponent(attrs: Record<string, string> = {}, style: Record<string, string> = {}) {
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

describe("Phase 3.2 registry primitives", () => {
  it("registers layout row/column/flex/stack/grid/container", () => {
    for (const id of [
      "layout-container",
      "layout-row",
      "layout-column",
      "layout-flex",
      "layout-stack",
      "layout-grid",
    ]) {
      expect(getVisualBlock(id)?.canNest).toBe(true);
    }
  });

  it("registers leaf content primitives", () => {
    for (const id of [
      "content-heading",
      "content-text",
      "content-button",
      "content-icon",
      "media-image",
      "layout-spacer",
      "layout-divider",
    ]) {
      expect(isLeafBlock(id)).toBe(true);
    }
  });

  it("registers form primitives under forms tab", () => {
    const forms = listVisualBlocks({ tab: "forms" });
    expect(forms.some((b) => b.id === "form-form")).toBe(true);
    expect(forms.some((b) => b.id === "form-input")).toBe(true);
    expect(forms.some((b) => b.id === "form-textarea")).toBe(true);
    expect(forms.some((b) => b.id === "form-select")).toBe(true);
    expect(forms.some((b) => b.id === "form-checkbox")).toBe(true);
  });

  it("registers navbar and simple footer", () => {
    expect(getVisualBlock("nav-navbar")?.category).toBe("navigation");
    expect(getVisualBlock("nav-footer")?.canNest).toBe(true);
  });

  it("every block id remains unique", () => {
    const ids = getVisualRegistry().blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("layout-container declares allowed children", () => {
    const def = getVisualBlock("layout-container");
    expect(def?.nesting?.allowedChildren?.length).toBeGreaterThan(5);
  });

  it("button is not nestable", () => {
    expect(blockCanNest("content-button")).toBe(false);
    expect(isLeafBlock("content-button")).toBe(true);
  });

  it("image is not nestable", () => {
    expect(blockCanNest("media-image")).toBe(false);
  });

  it("form-form accepts inputs but not sections", () => {
    expect(canNestBlocks("form-form", "form-input").accepted).toBe(true);
    expect(canNestBlocks("form-form", "section-hero").accepted).toBe(false);
  });

  it("column prefers row/columns parents", () => {
    const parents = getAllowedParents("layout-column");
    expect(parents).toContain("layout-row");
    expect(parents).toContain("layout-columns");
  });
});

describe("Phase 3.2 nesting rules", () => {
  it("wrapper accepts sections", () => {
    expect(canNestBlocks("wrapper", "section-hero").accepted).toBe(true);
    expect(canDropComponent(null, "section-about").accepted).toBe(true);
  });

  it("rejects section inside section", () => {
    const d = canNestBlocks("section-hero", "section-cta");
    expect(d.accepted).toBe(false);
  });

  it("allows heading inside container", () => {
    expect(canNestBlocks("layout-container", "content-heading").accepted).toBe(
      true,
    );
  });

  it("rejects heading children", () => {
    expect(canNestBlocks("content-heading", "content-text").accepted).toBe(
      false,
    );
  });

  it("getAllowedChildren excludes sections under sections", () => {
    const kids = getAllowedChildren("section-hero");
    expect(kids.every((id) => !isSectionBlock(id) || id === "section-hero")).toBe(
      true,
    );
  });

  it("canDropOnTarget inside vs sibling", () => {
    const inside = canDropOnTarget({
      targetBlockId: "layout-stack",
      childBlockId: "content-button",
      position: "inside",
    });
    expect(inside.accepted).toBe(true);
    const sibling = canDropOnTarget({
      parentBlockId: "wrapper",
      targetBlockId: "section-hero",
      childBlockId: "section-cta",
      position: "after",
    });
    expect(sibling.accepted).toBe(true);
  });

  it("layout-column denied as child of button", () => {
    expect(canNestBlocks("content-button", "layout-column").accepted).toBe(
      false,
    );
  });

  it("card accepts nested text", () => {
    expect(canNestBlocks("content-card", "content-text").accepted).toBe(true);
  });

  it("createBlockHtml for row includes data-component-type", () => {
    const { html } = createBlockHtml("layout-row", {
      locale: "en",
      pageId: "home",
      sectionId: "row-1",
    });
    expect(html).toContain('data-component-type="layout-row"');
  });

  it("createBlockHtml for columns tags inner columns", () => {
    const { html } = createBlockHtml("layout-columns", {
      locale: "en",
      pageId: "home",
      sectionId: "cols-1",
    });
    expect(html).toContain('data-component-type="layout-column"');
  });

  it("createBlockHtml for form includes stable field ids", () => {
    const { html } = createBlockHtml("form-form", {
      locale: "en",
      pageId: "contact",
      sectionId: "form-1",
    });
    expect(html).toContain("data-component-id=");
    expect(html).toContain('data-component-type="form-input"');
  });
});

describe("Phase 3.2 lock system", () => {
  it("setComponentLocked writes data-locked", () => {
    const cmp = mockComponent() as never;
    setComponentLocked(cmp, true);
    expect(isComponentLocked(cmp)).toBe(true);
    expect((cmp as { getAttributes: () => Record<string, string> }).getAttributes()[LOCK_ATTR]).toBe(
      "true",
    );
  });

  it("unlock clears lock attr", () => {
    const cmp = mockComponent({ [LOCK_ATTR]: "true" }) as never;
    setComponentLocked(cmp, false);
    expect(isComponentLocked(cmp)).toBe(false);
  });

  it("unlocked by default", () => {
    expect(isComponentLocked(mockComponent() as never)).toBe(false);
  });
});

describe("Phase 3.2 responsive inheritance", () => {
  it("classic resolveResponsiveValue inherits tablet → mobile", () => {
    const r = resolveResponsiveValue(
      { desktop: 64, tablet: 48 },
      "mobile",
    );
    expect(r.value).toBe(48);
    expect(r.inherited).toBe(true);
    expect(r.source).toBe("tablet");
  });

  it("classic explicit mobile wins", () => {
    const r = resolveResponsiveValue(
      { desktop: 64, tablet: 48, mobile: 32 },
      "mobile",
    );
    expect(r.value).toBe(32);
    expect(r.inherited).toBe(false);
  });

  it("visual resolveStyleProp inherits desktop → tablet", () => {
    const cmp = mockComponent({
      "data-rstyle-desktop-font-size": "64px",
    }) as never;
    const r = resolveStyleProp(cmp, "font-size", "tablet");
    expect(r.value).toBe("64px");
    expect(r.inherited).toBe(true);
    expect(r.source).toBe("desktop");
  });

  it("visual tablet override wins over desktop", () => {
    const cmp = mockComponent({
      "data-rstyle-desktop-font-size": "64px",
      "data-rstyle-tablet-font-size": "48px",
    }) as never;
    const r = resolveStyleProp(cmp, "font-size", "mobile");
    expect(r.value).toBe("48px");
    expect(r.source).toBe("tablet");
    expect(r.inherited).toBe(true);
  });

  it("visual mobile override is not inherited", () => {
    const cmp = mockComponent({
      "data-rstyle-desktop-font-size": "64px",
      "data-rstyle-mobile-font-size": "28px",
    }) as never;
    const r = resolveStyleProp(cmp, "font-size", "mobile");
    expect(r.value).toBe("28px");
    expect(r.inherited).toBe(false);
  });

  it("visibility map defaults to visible", () => {
    const cmp = mockComponent() as never;
    expect(readVisibilityMap(cmp)).toEqual({
      desktop: true,
      tablet: true,
      mobile: true,
    });
  });

  it("visibility map respects per-device attrs", () => {
    const cmp = mockComponent({
      "data-visible-mobile": "false",
      "data-visible-tablet": "true",
    }) as never;
    const map = readVisibilityMap(cmp);
    expect(map.mobile).toBe(false);
    expect(map.tablet).toBe(true);
  });
});

describe("Phase 3.2 duplication identity", () => {
  it("remintAttributeTree assigns new section ids without Date.now", () => {
    const out = remintAttributeTree(
      [
        {
          attrs: {
            "data-section-id": "hero-1",
            "data-section-type": "hero",
            "data-component-id": "hero-1__headline",
          },
          children: [
            {
              attrs: {
                "data-component-id": "hero-1__cta",
                "data-content-path": "content.hero.cta",
              },
            },
          ],
        },
      ],
      ["hero-1"],
    );
    expect(out[0]?.attrs["data-section-id"]).not.toBe("hero-1");
    expect(out[0]?.attrs["data-section-id"]).toMatch(/^hero-/);
    expect(out[0]?.children?.[0]?.attrs["data-content-path"]).toBeUndefined();
  });

  it("duplicate remint is deterministic for same inputs", () => {
    const input = [
      {
        attrs: {
          "data-section-id": "cta-1",
          "data-section-type": "cta",
        },
      },
    ];
    const a = remintAttributeTree(input, ["cta-1"]);
    const b = remintAttributeTree(input, ["cta-1"]);
    expect(a[0]?.attrs["data-section-id"]).toBe(b[0]?.attrs["data-section-id"]);
  });
});

describe("Phase 3.2 WebsiteConfig round-trip", () => {
  it("saas template projects and syncs home sections", () => {
    const { config } = instantiateTemplate("saas-modern", {
      locale: "en",
      language: "en",
    });
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(true);
    const project = buildProjectFromWebsiteConfig(config);
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(
      synced.pages?.find((p) => p.id === "home")?.sections?.length,
    ).toBeGreaterThan(0);
  });

  it("page isolation: home reorder does not change about", () => {
    const { config } = instantiateTemplate("agency-creative", {
      locale: "en",
      language: "en",
    });
    const aboutBefore = structuredClone(
      config.pages?.find((p) => p.id === "about")?.sections ?? [],
    );
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections = [...(home.sections ?? [])].reverse();
    config.sections = structuredClone(home.sections);
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      buildProjectFromWebsiteConfig(config),
    );
    expect(synced.pages?.find((p) => p.id === "about")?.sections).toEqual(
      aboutBefore,
    );
  });

  it.each([
    "fashion-luxury",
    "restaurant-editorial",
    "saas-modern",
    "beauty-premium",
    "agency-creative",
    "portfolio-creator",
    "real-estate",
    "coffee-modern",
  ] as const)("%s still instantiates with catalog id", (id) => {
    const { config } = instantiateTemplate(id, { locale: "en", language: "en" });
    expect(config.templateCatalogId).toBe(id);
    expect(config.pages?.some((p) => p.id === "home")).toBe(true);
  });
});

describe("Phase 3.2 legacy compatibility", () => {
  it("legacy store without catalog keeps top-level sections path", () => {
    const legacy: WebsiteConfig = {
      template: "store",
      brand: {
        name: "Shop",
        colors: {
          primary: "#111",
          secondary: "#fff",
          accent: "#888",
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
          cta: "Go",
        },
      },
      sections: [
        { id: "hero-1", type: "hero", visible: true },
        { id: "footer-1", type: "footer", visible: true },
      ],
      seo: { title: "t", description: "d", keywords: [] },
      settings: {
        language: "en",
        direction: "ltr",
        showBranding: true,
        published: false,
      },
      media: {},
    };
    expect(shouldUseCanonicalHomeRenderer(legacy)).toBe(false);
    const synced = applyVisualProjectToWebsiteConfig(
      legacy,
      buildProjectFromWebsiteConfig(legacy),
    );
    expect(synced.sections.map((s) => s.id)).toEqual(["hero-1", "footer-1"]);
  });
});

describe("Phase 3.2 library search", () => {
  it("search finds form input", () => {
    expect(
      listVisualBlocks({ query: "checkbox" }).some(
        (b) => b.id === "form-checkbox",
      ),
    ).toBe(true);
  });

  it("search finds flex", () => {
    expect(
      listVisualBlocks({ tab: "layout", query: "flex" }).some(
        (b) => b.id === "layout-flex",
      ),
    ).toBe(true);
  });

  it("category forms filter works", () => {
    const forms = listVisualBlocks({ category: "forms" });
    expect(forms.length).toBeGreaterThan(0);
    expect(forms.every((b) => b.category === "forms")).toBe(true);
  });
});

describe("Phase 3.2 section block metadata", () => {
  it("section-hero remains a section block", () => {
    expect(isSectionBlock("section-hero")).toBe(true);
    expect(isSectionBlock("hero")).toBe(true);
  });

  it("hero variants still resolve", () => {
    const block = getVisualBlock("section-hero");
    expect(block?.variants?.some((v) => v.id === "editorial")).toBe(true);
  });

  it("draggable defaults true for layout container", () => {
    expect(getVisualBlock("layout-container")?.draggable !== false).toBe(true);
  });

  it("duplicatable defaults true for heading", () => {
    expect(getVisualBlock("content-heading")?.duplicatable !== false).toBe(
      true,
    );
  });

  it("icon create includes aria-label", () => {
    const { html } = createBlockHtml("content-icon", {
      locale: "en",
      pageId: "home",
      sectionId: "icon-1",
    });
    expect(html).toContain("aria-label");
  });

  it("navbar create is a nav landmark", () => {
    const { html } = createBlockHtml("nav-navbar", {
      locale: "en",
      pageId: "home",
      sectionId: "nav-1",
    });
    expect(html).toContain("<nav");
    expect(html).toContain('aria-label="Primary"');
  });
});
