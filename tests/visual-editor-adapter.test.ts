/**
 * Visual Editor Phase 1.1 — hardened adapter, projection, save queue tests.
 */

import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applyVisualProjectToWebsiteConfig,
  assertAdapterPreservesConfig,
  buildModernAgencyProject,
  buildProjectFromWebsiteConfig,
  createSaveQueue,
  extractContentPathValues,
  extractSectionMeta,
  isVisualProjectEmpty,
  websiteConfigHasRenderableContent,
  websiteConfigToVisualProject,
} from "@/lib/visual-editor";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "نور",
      colors: {
        primary: "#111111",
        secondary: "#FFFFFF",
        accent: "#888888",
        background: "#FFFFFF",
        foreground: "#111111",
        muted: "#F5F5F5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "عنوان واقعی",
        subheadline: "توضیح واقعی",
        cta: "خرید",
        imageId: "img-1",
      },
      about: {
        title: "درباره ما",
        body: "متن درباره",
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "fan" },
      { id: "about-1", type: "about", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "SEO", description: "Desc", keywords: ["a"] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {
      "img-1": {
        url: "https://example.com/a.jpg",
        alt: "hero",
        type: "image",
      },
    },
  };
}

describe("websiteConfig projection (no demo overwrite)", () => {
  it("detects renderable real content", () => {
    expect(websiteConfigHasRenderableContent(baseConfig())).toBe(true);
    expect(
      websiteConfigHasRenderableContent({
        ...baseConfig(),
        sections: [],
        content: {
          hero: { style: "minimal", headline: "", subheadline: "", cta: "" },
        },
      }),
    ).toBe(false);
  });

  it("builds project from real WebsiteConfig with stable section ids", () => {
    const project = buildProjectFromWebsiteConfig(baseConfig());
    const html = String(
      (project.pages as { component: string }[])[0]?.component ?? "",
    );
    expect(html).toContain('data-section-id="hero-1"');
    expect(html).toContain('data-section-id="about-1"');
    expect(html).toContain('data-section-id="footer-1"');
    expect(html).toContain('data-content-path="content.hero.headline"');
    expect(html).toContain("عنوان واقعی");
    expect(html).not.toContain("Modern Agency");
    expect(html).not.toContain("Design that earns attention");
  });

  it("prefers real projection over seed when content exists", () => {
    const project = websiteConfigToVisualProject(baseConfig());
    const html = String(
      (project.pages as { component: string }[])[0]?.component ?? "",
    );
    expect(html).toContain("عنوان واقعی");
    expect(html).not.toContain("Design that earns attention");
  });

  it("uses seed only for empty sites", () => {
    const empty: WebsiteConfig = {
      ...baseConfig(),
      sections: [],
      content: {
        hero: { style: "minimal", headline: "", subheadline: "", cta: "" },
      },
      visualEditor: undefined,
    };
    const project = websiteConfigToVisualProject(empty);
    expect(isVisualProjectEmpty(project as never)).toBe(false);
    expect((project.pages as unknown[]).length).toBeGreaterThan(1);
  });

  it("never overwrites existing visualEditor.project with seed", () => {
    const config = baseConfig();
    config.visualEditor = {
      engine: "grapesjs",
      version: 1,
      project: {
        pages: [
          {
            id: "home",
            name: "Home",
            component: '<body data-section-id="hero-1">KEEP</body>',
          },
        ],
      },
    };
    const project = websiteConfigToVisualProject(config);
    const html = String(
      (project.pages as { component: string }[])[0]?.component ?? "",
    );
    expect(html).toContain("KEEP");
  });
});

describe("round-trip sync", () => {
  it("preserves section ids and syncs headline text", () => {
    const original = baseConfig();
    const projected = buildProjectFromWebsiteConfig(original);
    // Simulate user edit in HTML
    const page = (projected.pages as { component: string }[])[0];
    page.component = page.component.replace("عنوان واقعی", "عنوان جدید");

    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    const check = assertAdapterPreservesConfig(original, restored);
    expect(check.ok).toBe(true);
    expect(restored.content.hero.headline).toBe("عنوان جدید");
    expect(restored.sections.map((s) => s.id)).toEqual([
      "hero-1",
      "about-1",
      "footer-1",
    ]);
    expect(restored.seo.title).toBe("SEO");
    expect(restored.media["img-1"]?.url).toBe("https://example.com/a.jpg");
  });

  it("preserves orphan sections not present in canvas", () => {
    const original = baseConfig();
    original.sections.push({
      id: "mystery-1",
      type: "trust",
      visible: true,
    });
    const projected = buildProjectFromWebsiteConfig({
      ...original,
      sections: original.sections.filter((s) => s.id !== "mystery-1"),
    });
    // Apply onto config that still has mystery — sync should keep orphan
    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    expect(restored.sections.some((s) => s.id === "mystery-1")).toBe(true);
  });

  it("extracts content paths from GrapesJS frames JSON trees", () => {
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
                    tagName: "h1",
                    type: "text",
                    attributes: {
                      "data-content-path": "content.hero.headline",
                    },
                    components: [
                      { type: "textnode", content: "RTE headline" },
                    ],
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "hero-1",
                      "data-section-type": "hero",
                      "data-visible": "true",
                    },
                    components: [],
                  },
                  {
                    tagName: "img",
                    type: "image",
                    attributes: {
                      "data-content-path": "content.hero.imageId",
                      "data-media-id": "img-1",
                      src: "https://example.com/a.jpg",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const values = extractContentPathValues(project);
    expect(values["content.hero.headline"]).toBe("RTE headline");
    expect(values["content.hero.imageId"]).toBe("img-1");
    const meta = extractSectionMeta(project);
    expect(meta.map((m) => m.id)).toContain("hero-1");

    const restored = applyVisualProjectToWebsiteConfig(baseConfig(), project);
    expect(restored.content.hero.headline).toBe("RTE headline");
    expect(restored.content.hero.imageId).toBe("img-1");
  });

  it("isolates page content across GrapesJS pages in saved project", () => {
    const original = baseConfig();
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
                    tagName: "h1",
                    attributes: { "data-content-path": "content.hero.headline" },
                    components: [{ type: "textnode", content: "HOME_ONLY" }],
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
                    tagName: "h2",
                    attributes: { "data-content-path": "content.about.title" },
                    components: [{ type: "textnode", content: "ABOUT_ONLY" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const restored = applyVisualProjectToWebsiteConfig(original, project, {
      activePageId: "about",
    });
    expect(restored.content.hero.headline).toBe("HOME_ONLY");
    expect(restored.content.about?.title).toBe("ABOUT_ONLY");
    expect(restored.visualEditor?.activePageId).toBe("about");
    expect((restored.visualEditor?.project?.pages as unknown[])?.length).toBe(
      2,
    );
  });
});

describe("save queue race safety", () => {
  it("keeps latest config when enqueued rapidly", async () => {
    const calls: WebsiteConfig[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        config: WebsiteConfig;
      };
      calls.push(body.config);
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ version: calls.length + 1 }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      let version = 1;
      const queue = createSaveQueue({
        websiteId: "site-1",
        getExpectedVersion: () => version,
        setExpectedVersion: (v) => {
          version = v;
        },
      });
      const a = baseConfig();
      a.content.hero.headline = "A";
      const b = baseConfig();
      b.content.hero.headline = "B";
      const p1 = queue.enqueue(a);
      const p2 = queue.enqueue(b);
      await Promise.all([p1, p2]);
      const last = calls.at(-1);
      expect(last?.content.hero.headline).toBe("B");
      expect(version).toBeGreaterThan(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("surfaces version conflict without clearing dirty responsibility", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "VERSION_CONFLICT" }), {
        status: 409,
      })) as typeof fetch;
    try {
      const queue = createSaveQueue({
        websiteId: "site-1",
        getExpectedVersion: () => 3,
        setExpectedVersion: () => undefined,
      });
      const result = await queue.enqueue(baseConfig());
      expect(result?.ok).toBe(false);
      if (result && !result.ok) {
        expect(result.conflict).toBe(true);
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("seed isolation", () => {
  it("modern agency seed still builds for empty dev sites", () => {
    const project = buildModernAgencyProject();
    expect((project.pages as unknown[]).length).toBe(4);
  });
});
