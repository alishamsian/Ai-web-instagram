/**
 * Phase 2.2 — multi-page builder architecture tests.
 */

import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  addBlankProjectPage,
  applyVisualProjectToWebsiteConfig,
  blankPageComponent,
  buildProjectFromWebsiteConfig,
  duplicateProjectPage,
  ensureWebsitePages,
  extractCanonicalContentPathValues,
  extractPageContentPathValues,
  findPageByIdOrSlug,
  normalizePageSlug,
  pageIdFromSlug,
  removeProjectPage,
  renamePageMeta,
  renameProjectPage,
  reorderPageMeta,
  reorderProjectPages,
  resolvePageHref,
  extractProjectPageHtml,
  syncPagesMetaFromProject,
  uniqueCopySlug,
  validateNewPageInput,
  PageOpError,
  VISUAL_PAGE_HOME,
  VISUAL_PAGE_ABOUT,
} from "@/lib/visual-editor";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Test",
      colors: {
        primary: "#111",
        secondary: "#fff",
        accent: "#888",
        background: "#fff",
        foreground: "#111",
        muted: "#f5f5f5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "HOME",
        subheadline: "sub",
        cta: "Go",
      },
      about: { title: "About", body: "About body" },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true },
      { id: "about-1", type: "about", visible: true },
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
}

describe("Phase 2.2 page identity", () => {
  it("keeps reserved page ids stable", () => {
    const project = buildProjectFromWebsiteConfig(baseConfig());
    const pages = syncPagesMetaFromProject(baseConfig(), project);
    expect(pages.find((p) => p.kind === "home")?.id).toBe(VISUAL_PAGE_HOME);
    expect(pages.find((p) => p.kind === "about")?.id).toBe(VISUAL_PAGE_ABOUT);
  });

  it("keeps custom page id stable across projection sync", () => {
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, {
      id: "services",
      name: "Services",
      slug: "services",
    });
    const a = syncPagesMetaFromProject(baseConfig(), project);
    const b = syncPagesMetaFromProject({ ...baseConfig(), pages: a }, project);
    expect(a.find((p) => p.id === "services")?.id).toBe("services");
    expect(b.find((p) => p.id === "services")?.id).toBe("services");
  });

  it("derives deterministic id from slug for legacy pages", () => {
    expect(pageIdFromSlug("our-services")).toBe("our-services");
    expect(normalizePageSlug("/Hello World/")).toBe("hello-world");
  });

  it("opening sync twice does not mint new page ids", () => {
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, {
      id: "contact",
      name: "Contact",
      slug: "contact",
    });
    const first = ensureWebsitePages({
      ...baseConfig(),
      visualEditor: {
        engine: "grapesjs",
        version: 2,
        project: project as never,
      },
    });
    const second = ensureWebsitePages({
      ...baseConfig(),
      pages: first,
      visualEditor: {
        engine: "grapesjs",
        version: 2,
        project: project as never,
      },
    });
    expect(first.map((p) => p.id)).toEqual(second.map((p) => p.id));
  });
});

describe("Phase 2.2 page CRUD", () => {
  it("creates page with unique slug/id", () => {
    const pages = ensureWebsitePages(baseConfig());
    const created = validateNewPageInput("Services", "services", pages);
    expect(created.id).toBe("services");
    expect(created.slug).toBe("services");
  });

  it("rename preserves id", () => {
    const pages = [
      { id: "services", slug: "services", name: "Services", kind: "custom" as const },
    ];
    const next = renamePageMeta(pages, "services", { name: "Our Services" });
    expect(next[0].id).toBe("services");
    expect(next[0].name).toBe("Our Services");
  });

  it("slug change preserves id", () => {
    const pages = [
      { id: "services", slug: "services", name: "Services", kind: "custom" as const },
    ];
    const next = renamePageMeta(pages, "services", {
      name: "Services",
      slug: "our-services",
    });
    expect(next[0].id).toBe("services");
    expect(next[0].slug).toBe("our-services");
  });

  it("blocks reserved slug and home delete", () => {
    expect(() => validateNewPageInput("X", "about", [])).toThrow(PageOpError);
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, {
      id: "x",
      name: "X",
      slug: "x",
    });
    expect(() => removeProjectPage(project, VISUAL_PAGE_HOME)).toThrow(
      PageOpError,
    );
  });

  it("deletes custom page from project", () => {
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, {
      id: "x",
      name: "X",
      slug: "x",
    });
    project = removeProjectPage(project, "x");
    const ids = ((project as { pages: { id: string }[] }).pages || []).map(
      (p) => p.id,
    );
    expect(ids).not.toContain("x");
  });

  it("duplicates page with new id without mutating original", () => {
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, {
      id: "services",
      name: "Services",
      slug: "services",
    });
    const before = JSON.stringify(
      (project as { pages: unknown[] }).pages.find(
        (p) => (p as { id: string }).id === "services",
      ),
    );
    project = duplicateProjectPage(project, "services", {
      id: "services-copy",
      name: "Services (copy)",
      slug: "services-copy",
    });
    const afterOriginal = JSON.stringify(
      (project as { pages: unknown[] }).pages.find(
        (p) => (p as { id: string }).id === "services",
      ),
    );
    expect(afterOriginal).toBe(before);
    expect(
      (project as { pages: { id: string }[] }).pages.some(
        (p) => p.id === "services-copy",
      ),
    ).toBe(true);
  });
});

describe("Phase 2.2 ordering + isolation + persistence helpers", () => {
  it("reorder preserves ids", () => {
    const pages = [
      { id: "home", slug: "", name: "Home", kind: "home" as const },
      { id: "a", slug: "a", name: "A", kind: "custom" as const },
      { id: "b", slug: "b", name: "B", kind: "custom" as const },
    ];
    const next = reorderPageMeta(pages, ["home", "b", "a"]);
    expect(next.map((p) => p.id)).toEqual(["home", "b", "a"]);
  });

  it("reorder project pages survives round structure", () => {
    let project = buildProjectFromWebsiteConfig(baseConfig());
    project = addBlankProjectPage(project, { id: "a", name: "A", slug: "a" });
    project = addBlankProjectPage(project, { id: "b", name: "B", slug: "b" });
    project = reorderProjectPages(project, ["home", "b", "a", "about"]);
    const ids = ((project as { pages: { id: string }[] }).pages || []).map(
      (p) => p.id,
    );
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("a"));
  });

  it("custom page does not overwrite home canonical content", () => {
    const project = {
      pages: [
        {
          id: "home",
          frames: [
            {
              component: {
                components: [
                  {
                    tagName: "h1",
                    attributes: {
                      "data-content-path": "content.hero.headline",
                    },
                    components: [{ type: "textnode", content: "HOME" }],
                  },
                ],
              },
            },
          ],
        },
        {
          id: "landing",
          frames: [
            {
              component: {
                components: [
                  {
                    tagName: "h1",
                    attributes: {
                      "data-content-path": "content.hero.headline",
                    },
                    components: [{ type: "textnode", content: "LANDING" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(extractPageContentPathValues(project).landing["content.hero.headline"]).toBe(
      "LANDING",
    );
    expect(extractCanonicalContentPathValues(project)["content.hero.headline"]).toBe(
      "HOME",
    );
    const restored = applyVisualProjectToWebsiteConfig(baseConfig(), project);
    expect(restored.content.hero.headline).toBe("HOME");
    expect(restored.pages?.some((p) => p.id === "landing")).toBe(true);
  });

  it("create → sync → reload keeps page meta", () => {
    const original = baseConfig();
    let project = buildProjectFromWebsiteConfig(original);
    project = addBlankProjectPage(project, {
      id: "services",
      name: "Services",
      slug: "services",
    });
    const restored = applyVisualProjectToWebsiteConfig(original, project, {
      activePageId: "services",
    });
    expect(restored.pages?.find((p) => p.id === "services")?.slug).toBe(
      "services",
    );
    expect(restored.visualEditor?.activePageId).toBe("services");

    const renamedProject = renameProjectPage(project, "services", {
      name: "Our Services",
      slug: "services",
    });
    const renamed = applyVisualProjectToWebsiteConfig(
      restored,
      renamedProject,
    );
    expect(renamed.pages?.find((p) => p.id === "services")?.name).toBe(
      "Our Services",
    );
  });

  it("resolves internal page href by stable id after slug change", () => {
    const pages = [
      { id: "services", slug: "our-services", name: "Services", kind: "custom" as const },
    ];
    expect(resolvePageHref(pages, "services")).toBe("/our-services");
    expect(findPageByIdOrSlug(pages, "our-services")?.id).toBe("services");
  });

  it("uniqueCopySlug avoids collisions", () => {
    const pages = [
      { id: "a", slug: "services-copy", name: "A", kind: "custom" as const },
    ];
    expect(uniqueCopySlug("services", pages)).toBe("services-copy-2");
  });

  it("blank page component includes stable markers", () => {
    const html = blankPageComponent({
      id: "services",
      slug: "services",
      name: "Services",
    });
    expect(html).toContain('data-website-page="services"');
    expect(html).toContain('data-page-slug="services"');
  });

  it("extracts HTML from GrapesJS frames JSON for custom page preview", () => {
    const project = {
      pages: [
        {
          id: "services",
          name: "Services",
          frames: [
            {
              component: {
                type: "wrapper",
                components: [
                  {
                    type: "text",
                    tagName: "h1",
                    attributes: { "data-page-title": "true" },
                    components: [
                      { type: "textnode", content: "Services" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const html = extractProjectPageHtml(project, "services");
    expect(html).toContain("Services");
    expect(html).toContain("<h1");
  });
});
