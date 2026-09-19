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
  extractCanonicalContentPathValues,
  extractContentPathValues,
  extractPageContentPathValues,
  extractPageSectionMeta,
  extractSectionMeta,
  isVisualProjectEmpty,
  mergeProjectedWithSavedProject,
  stableCollectionItemId,
  visualComponentId,
  visualProjectMatchesSource,
  websiteConfigHasRenderableContent,
  websiteConfigSourceFingerprint,
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

describe("Phase 2 stable IDs + lossless adapter", () => {
  it("emits deterministic data-component-id values", () => {
    const project = buildProjectFromWebsiteConfig(baseConfig());
    const html = String(
      (project.pages as { component: string }[])[0]?.component ?? "",
    );
    expect(html).toContain(
      `data-component-id="${visualComponentId("hero-1", "headline")}"`,
    );
    expect(html).toContain(
      `data-component-id="${visualComponentId("hero-1", "image")}"`,
    );
    expect(html).toContain('data-ve-adapter="2"');
    expect(html).toContain('data-href-path="content.hero.ctaHref"');
  });

  it("keeps the same component ids across rebuilds", () => {
    const a = buildProjectFromWebsiteConfig(baseConfig());
    const b = buildProjectFromWebsiteConfig(baseConfig());
    const htmlA = String(
      (a.pages as { component: string }[])[0]?.component ?? "",
    );
    const htmlB = String(
      (b.pages as { component: string }[])[0]?.component ?? "",
    );
    const idsA = [...htmlA.matchAll(/data-component-id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const idsB = [...htmlB.matchAll(/data-component-id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsA).toEqual(idsB);
  });

  it("round-trips href, gallery order, nested product fields, and fingerprint", () => {
    const original = baseConfig();
    original.content.hero.ctaHref = "/shop";
    original.content.products = {
      title: "محصولات",
      items: [
        {
          id: "p1",
          name: "محصول یک",
          description: "توضیح",
          category: "general",
          price: null,
          currency: null,
          imageIds: ["img-1"],
          confidence: 1,
        },
      ],
    };
    original.content.gallery = {
      title: "گالری",
      imageIds: ["img-1", "img-2"],
    };
    original.media["img-2"] = {
      url: "https://example.com/b.jpg",
      alt: "b",
      type: "image",
    };
    original.sections.push({ id: "products-1", type: "products", visible: true });
    original.sections.push({ id: "gallery-1", type: "gallery", visible: true });

    const projected = buildProjectFromWebsiteConfig(original);
    const page = (projected.pages as { component: string }[])[0];
    page.component = page.component
      .replace('href="/shop"', 'href="/sale"')
      .replaceAll("محصول یک", "محصول دو")
      .replace(
        'data-gallery-index="0"',
        'data-gallery-index="9"',
      )
      .replace(
        'data-gallery-index="1"',
        'data-gallery-index="0"',
      );

    // After swapping indices via attributes, extractGalleryImageIds sorts by index
    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    expect(restored.content.hero.ctaHref).toBe("/sale");
    expect(restored.content.products?.items?.[0]?.name).toBe("محصول دو");
    expect(restored.content.gallery?.imageIds).toEqual(["img-2", "img-1"]);
    expect(restored.visualEditor?.version).toBe(2);
    expect(restored.visualEditor?.sourceFingerprint).toBe(
      websiteConfigSourceFingerprint(restored),
    );
    expect(assertAdapterPreservesConfig(original, restored).ok).toBe(true);
  });

  it("preserves saved layout when fingerprint matches", () => {
    const withFp = baseConfig();
    withFp.visualEditor = {
      engine: "grapesjs",
      version: 2,
      project: {
        pages: [
          {
            id: "home",
            name: "Home",
            component: '<body data-section-id="hero-1">LAYOUT_A</body>',
          },
        ],
      },
      sourceFingerprint: websiteConfigSourceFingerprint(withFp),
    };
    expect(visualProjectMatchesSource(withFp)).toBe(true);
    const resolved = websiteConfigToVisualProject(withFp);
    const html = String(
      (resolved.pages as { component: string }[])[0]?.component ?? "",
    );
    expect(html).toContain("LAYOUT_A");
    expect(html).not.toContain("عنوان واقعی");
  });

  it("rebuilds reserved pages on Classic drift but keeps extra pages", () => {
    const config = baseConfig();
    config.visualEditor = {
      engine: "grapesjs",
      version: 2,
      project: {
        pages: [
          {
            id: "home",
            name: "Home",
            component: "<body>STALE_HOME</body>",
          },
          {
            id: "landing",
            name: "Landing",
            component: "<body>EXTRA_PAGE</body>",
          },
        ],
        assets: [{ id: "custom-asset", src: "https://example.com/x.png" }],
      },
      sourceFingerprint: "stale-fingerprint",
    };
    expect(visualProjectMatchesSource(config)).toBe(false);
    const resolved = websiteConfigToVisualProject(config);
    const pages = resolved.pages as { id: string; component: string }[];
    const home = pages.find((p) => p.id === "home");
    const extra = pages.find((p) => p.id === "landing");
    expect(home?.component).toContain("عنوان واقعی");
    expect(home?.component).not.toContain("STALE_HOME");
    expect(extra?.component).toContain("EXTRA_PAGE");
    const assets = (resolved as { assets?: { id?: string }[] }).assets ?? [];
    expect(assets.some((a) => a.id === "custom-asset")).toBe(true);
  });

  it("syncs section settings from data-section-settings", () => {
    const original = baseConfig();
    original.sections[0].settings = { density: "compact" };
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
                      "data-section-settings": JSON.stringify({
                        density: "airy",
                      }),
                    },
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "about-1",
                      "data-visible": "false",
                    },
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "footer-1",
                      "data-visible": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const restored = applyVisualProjectToWebsiteConfig(original, project);
    expect(restored.sections.find((s) => s.id === "hero-1")?.settings).toEqual(
      { density: "airy" },
    );
    expect(restored.sections.find((s) => s.id === "about-1")?.visible).toBe(
      false,
    );
  });

  it("merges projected + saved pages without dropping extras", () => {
    const projected = buildProjectFromWebsiteConfig(baseConfig());
    const saved = {
      pages: [
        { id: "home", component: "<body>OLD</body>" },
        { id: "custom", component: "<body>KEEP_ME</body>" },
      ],
      assets: [{ src: "https://example.com/keep.png" }],
    };
    const merged = mergeProjectedWithSavedProject(projected, saved);
    const pages = merged.pages as { id: string; component: string }[];
    expect(pages.some((p) => p.id === "custom")).toBe(true);
    expect(
      pages.find((p) => p.id === "home")?.component,
    ).not.toContain("OLD");
    expect(
      pages.find((p) => p.id === "custom")?.component,
    ).toContain("KEEP_ME");
  });
});

describe("Phase 2.1 page isolation + collection identity", () => {
  function product(
    id: string,
    name: string,
  ): NonNullable<WebsiteConfig["content"]["products"]>["items"][number] {
    return {
      id,
      name,
      description: `${name} desc`,
      category: "general",
      price: null,
      currency: null,
      imageIds: [],
      confidence: 1,
    };
  }

  it("does not let a custom page overwrite home hero headline", () => {
    const original = baseConfig();
    original.content.hero.headline = "HOME";
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
          name: "Landing",
          frames: [
            {
              component: {
                type: "wrapper",
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

    const byPage = extractPageContentPathValues(project);
    expect(byPage.home["content.hero.headline"]).toBe("HOME");
    expect(byPage.landing["content.hero.headline"]).toBe("LANDING");

    const canonical = extractCanonicalContentPathValues(project);
    expect(canonical["content.hero.headline"]).toBe("HOME");

    const restored = applyVisualProjectToWebsiteConfig(original, project);
    expect(restored.content.hero.headline).toBe("HOME");
    const landingHtml = JSON.stringify(
      (restored.visualEditor?.project?.pages as unknown[])?.find(
        (p) => (p as { id?: string }).id === "landing",
      ),
    );
    expect(landingHtml).toContain("LANDING");
  });

  it("isolates multiple hero fields across home and custom pages", () => {
    const original = baseConfig();
    original.content.hero.headline = "HOME";
    original.content.hero.cta = "HOME CTA";
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
                  {
                    tagName: "a",
                    attributes: { "data-content-path": "content.hero.cta" },
                    components: [{ type: "textnode", content: "HOME CTA" }],
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
                  {
                    tagName: "a",
                    attributes: { "data-content-path": "content.hero.cta" },
                    components: [
                      { type: "textnode", content: "LANDING CTA" },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const restored = applyVisualProjectToWebsiteConfig(original, project);
    expect(restored.content.hero.headline).toBe("HOME");
    expect(restored.content.hero.cta).toBe("HOME CTA");
  });

  it("ignores section visibility/settings from custom pages", () => {
    const original = baseConfig();
    const project = {
      pages: [
        {
          id: "home",
          frames: [
            {
              component: {
                components: [
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "hero-1",
                      "data-visible": "true",
                      "data-section-settings": JSON.stringify({ from: "home" }),
                    },
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "about-1",
                      "data-visible": "true",
                    },
                  },
                  {
                    tagName: "section",
                    attributes: {
                      "data-section-id": "footer-1",
                      "data-visible": "true",
                    },
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
                    tagName: "section",
                    attributes: {
                      "data-section-id": "hero-1",
                      "data-visible": "false",
                      "data-section-settings": JSON.stringify({
                        from: "landing",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const byPage = extractPageSectionMeta(project);
    expect(byPage.landing[0]?.visible).toBe(false);
    expect(extractSectionMeta(project)[0]?.settings).toEqual({ from: "home" });

    const restored = applyVisualProjectToWebsiteConfig(original, project);
    expect(restored.sections.find((s) => s.id === "hero-1")?.visible).toBe(
      true,
    );
    expect(restored.sections.find((s) => s.id === "hero-1")?.settings).toEqual({
      from: "home",
    });
  });

  it("reorders products by stable item id without swapping fields", () => {
    const original = baseConfig();
    original.content.products = {
      title: "Products",
      items: [product("pa", "A"), product("pb", "B"), product("pc", "C")],
    };
    original.sections.push({
      id: "products-1",
      type: "products",
      visible: true,
    });

    const projected = buildProjectFromWebsiteConfig(original);
    const page = (projected.pages as { component: string }[])[0];
    // Simulate visual reorder C, A, B by rewriting product card order via ids
    const cards = [
      ...page.component.matchAll(
        /<div[^>]*data-product-id="([^"]+)"[\s\S]*?<\/div>\s*<\/div>/g,
      ),
    ];
    expect(cards.map((m) => m[1])).toEqual(["pa", "pb", "pc"]);
    const byId = Object.fromEntries(cards.map((m) => [m[1], m[0]]));
    page.component = page.component.replace(
      cards.map((m) => m[0]).join(""),
      [byId.pc, byId.pa, byId.pb].join(""),
    );

    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    expect(restored.content.products?.items?.map((p) => p.id)).toEqual([
      "pc",
      "pa",
      "pb",
    ]);
    expect(restored.content.products?.items?.map((p) => p.name)).toEqual([
      "C",
      "A",
      "B",
    ]);
  });

  it("edits a product field after reorder without corrupting siblings", () => {
    const original = baseConfig();
    original.content.products = {
      title: "Products",
      items: [product("pa", "A"), product("pb", "B"), product("pc", "C")],
    };
    original.sections.push({
      id: "products-1",
      type: "products",
      visible: true,
    });
    const projected = buildProjectFromWebsiteConfig(original);
    const page = (projected.pages as { component: string }[])[0];
    const cards = [
      ...page.component.matchAll(
        /<div[^>]*data-product-id="([^"]+)"[\s\S]*?<\/div>\s*<\/div>/g,
      ),
    ];
    const byId = Object.fromEntries(cards.map((m) => [m[1], m[0]]));
    let reordered = [byId.pc, byId.pa, byId.pb].join("");
    reordered = reordered.replace(
      /data-item-id="pa"[^>]*>A</,
      'data-item-id="pa" data-content-path="content.products.items.name">A updated<',
    );
    // More reliably: replace the name text for pa only
    reordered = reordered.replace(
      /(data-item-id="pa"[^>]*data-content-path="content\.products\.items\.name"[^>]*>)A</,
      "$1A updated<",
    );
    page.component = page.component.replace(
      cards.map((m) => m[0]).join(""),
      reordered,
    );

    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    expect(restored.content.products?.items?.map((p) => p.name)).toEqual([
      "C",
      "A updated",
      "B",
    ]);
  });

  it("reorders faq and testimonials by stable item id", () => {
    const original = baseConfig();
    original.content.faq = {
      title: "FAQ",
      items: [
        { id: "f1", question: "Q1", answer: "A1" },
        { id: "f2", question: "Q2", answer: "A2" },
      ],
    };
    original.content.testimonials = {
      title: "T",
      items: [
        { id: "t1", quote: "QA", author: "AA" },
        { id: "t2", quote: "QB", author: "AB" },
      ],
    };
    const project = {
      pages: [
        {
          id: "home",
          frames: [
            {
              component: {
                components: [
                  {
                    tagName: "details",
                    attributes: {
                      "data-collection": "faq",
                      "data-item-id": "f2",
                      "data-faq-id": "f2",
                    },
                  },
                  {
                    tagName: "details",
                    attributes: {
                      "data-collection": "faq",
                      "data-item-id": "f1",
                      "data-faq-id": "f1",
                    },
                  },
                  {
                    tagName: "blockquote",
                    attributes: {
                      "data-collection": "testimonials",
                      "data-item-id": "t2",
                      "data-testimonial-id": "t2",
                    },
                  },
                  {
                    tagName: "blockquote",
                    attributes: {
                      "data-collection": "testimonials",
                      "data-item-id": "t1",
                      "data-testimonial-id": "t1",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const restored = applyVisualProjectToWebsiteConfig(original, project);
    expect(restored.content.faq?.items?.map((i) => i.id)).toEqual(["f2", "f1"]);
    expect(restored.content.faq?.items?.map((i) => i.question)).toEqual([
      "Q2",
      "Q1",
    ]);
    expect(restored.content.testimonials?.items?.map((i) => i.id)).toEqual([
      "t2",
      "t1",
    ]);
    expect(restored.content.testimonials?.items?.map((i) => i.quote)).toEqual([
      "QB",
      "QA",
    ]);
  });

  it("assigns deterministic ids for legacy arrays without ids", () => {
    const original = baseConfig();
    original.content.products = {
      title: "Products",
      items: [
        {
          name: "A",
          description: "da",
          category: "general",
          price: null,
          currency: null,
          imageIds: [],
          confidence: 1,
        },
        {
          name: "B",
          description: "db",
          category: "general",
          price: null,
          currency: null,
          imageIds: [],
          confidence: 1,
        },
      ],
    };
    original.sections.push({
      id: "products-1",
      type: "products",
      visible: true,
    });
    const projected = buildProjectFromWebsiteConfig(original);
    const html = String(
      (projected.pages as { component: string }[])[0]?.component ?? "",
    );
    const id0 = stableCollectionItemId("products", undefined, 0);
    const id1 = stableCollectionItemId("products", undefined, 1);
    expect(html).toContain(`data-item-id="${id0}"`);
    expect(html).toContain(`data-item-id="${id1}"`);

    const restored = applyVisualProjectToWebsiteConfig(original, projected);
    expect(restored.content.products?.items?.[0]?.id).toBe(id0);
    expect(restored.content.products?.items?.[1]?.id).toBe(id1);
    expect(restored.content.products?.items?.[0]?.name).toBe("A");
    expect(restored.content.products?.items?.[1]?.name).toBe("B");
  });

  it("keeps collection and component identities stable across reopen", () => {
    const config = baseConfig();
    config.content.products = {
      title: "Products",
      items: [product("pa", "A"), product("pb", "B")],
    };
    config.sections.push({
      id: "products-1",
      type: "products",
      visible: true,
    });
    const a = buildProjectFromWebsiteConfig(config);
    const b = buildProjectFromWebsiteConfig(config);
    const htmlA = String(
      (a.pages as { component: string }[])[0]?.component ?? "",
    );
    const htmlB = String(
      (b.pages as { component: string }[])[0]?.component ?? "",
    );
    const itemIdsA = [...htmlA.matchAll(/data-item-id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const itemIdsB = [...htmlB.matchAll(/data-item-id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(itemIdsA).toEqual(itemIdsB);
    expect(itemIdsA).toContain("pa");
    expect(itemIdsA).toContain("pb");
  });
});
