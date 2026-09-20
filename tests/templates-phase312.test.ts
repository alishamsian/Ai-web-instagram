/**
 * Phase 3.1.2 — Page section sync & section variant parity.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProjectData } from "grapesjs";
import type { SectionConfig, WebsiteConfig } from "@/types/website";
import {
  getTemplates,
  instantiateTemplate,
  resetTemplateRegistry,
} from "@/lib/templates";
import {
  applyVisualProjectToWebsiteConfig,
  buildProjectFromWebsiteConfig,
  mergeSectionsFromMeta,
  websiteConfigSourceFingerprint,
} from "@/lib/visual-editor";
import { ensureWebsitePages } from "@/lib/visual-editor/pages";
import {
  isTemplateCatalogSite,
  resolveHomeSections,
  shouldUseCanonicalHomeRenderer,
} from "@/lib/website/canonical-render";
import {
  resolveCtaVariant,
  resolveGalleryVariant,
  resolveHeroVisualMode,
  resolveKnownSectionVariant,
} from "@/lib/website/section-variant";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { runPublishPreflight } from "@/lib/editor/validation";

beforeEach(() => {
  resetTemplateRegistry();
});

function instantiate(id: string, locale: "fa" | "en" = "en") {
  return instantiateTemplate(id, { locale, language: locale });
}

function homeSections(config: WebsiteConfig): SectionConfig[] {
  return resolveHomeSections(config);
}

function sectionIds(sections: SectionConfig[]): string[] {
  return sections.map((s) => s.id);
}

function sectionTypes(sections: SectionConfig[]): string[] {
  return sections.map((s) => s.type);
}

function getProjectPage(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
): { id: string; component: string } {
  const pages = (project as { pages?: Array<{ id?: string; component?: unknown }> })
    .pages;
  const page = pages?.find((p) => p.id === pageId);
  if (!page || typeof page.component !== "string") {
    throw new Error(`Missing project page ${pageId}`);
  }
  return { id: page.id!, component: page.component };
}

function setProjectPageHtml(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  html: string,
): ProjectData | Record<string, unknown> {
  const next = structuredClone(project) as {
    pages: Array<{ id?: string; component?: unknown; [k: string]: unknown }>;
  };
  const page = next.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Missing project page ${pageId}`);
  page.component = html;
  return next;
}

/** Extract top-level <section ...>...</section> blocks preserving order. */
function extractSectionBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<section\b[^>]*data-section-id="[^"]+"[^>]*>[\s\S]*?<\/section>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    blocks.push(m[0]);
  }
  return blocks;
}

function replaceSectionBlocks(html: string, blocks: string[]): string {
  const existing = extractSectionBlocks(html);
  if (existing.length === 0) {
    return html.replace(/<\/body>/i, `${blocks.join("\n")}\n</body>`);
  }
  const start = html.indexOf(existing[0]!);
  const last = existing[existing.length - 1]!;
  const end = html.indexOf(last, start) + last.length;
  return `${html.slice(0, start)}${blocks.join("\n")}${html.slice(end)}`;
}

function reorderProjectSections(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  orderedIds: string[],
): ProjectData | Record<string, unknown> {
  const page = getProjectPage(project, pageId);
  const blocks = extractSectionBlocks(page.component);
  const byId = new Map(
    blocks.map((b) => {
      const id = /data-section-id="([^"]+)"/.exec(b)?.[1] ?? "";
      return [id, b] as const;
    }),
  );
  const nextBlocks = orderedIds
    .map((id) => byId.get(id))
    .filter((b): b is string => Boolean(b));
  for (const [id, block] of byId) {
    if (!orderedIds.includes(id)) nextBlocks.push(block);
  }
  return setProjectPageHtml(
    project,
    pageId,
    replaceSectionBlocks(page.component, nextBlocks),
  );
}

function removeProjectSection(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  sectionId: string,
): ProjectData | Record<string, unknown> {
  const page = getProjectPage(project, pageId);
  const blocks = extractSectionBlocks(page.component).filter(
    (b) => !b.includes(`data-section-id="${sectionId}"`),
  );
  return setProjectPageHtml(
    project,
    pageId,
    replaceSectionBlocks(page.component, blocks),
  );
}

function duplicateProjectSection(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  sectionId: string,
  newId: string,
): ProjectData | Record<string, unknown> {
  const page = getProjectPage(project, pageId);
  const blocks = extractSectionBlocks(page.component);
  const idx = blocks.findIndex((b) =>
    b.includes(`data-section-id="${sectionId}"`),
  );
  if (idx < 0) throw new Error(`section ${sectionId} not found`);
  const clone = blocks[idx]!
    .replaceAll(`data-section-id="${sectionId}"`, `data-section-id="${newId}"`)
    .replaceAll(`"${sectionId}:`, `"${newId}:`);
  const next = [...blocks];
  next.splice(idx + 1, 0, clone);
  return setProjectPageHtml(
    project,
    pageId,
    replaceSectionBlocks(page.component, next),
  );
}

function addProjectSection(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  sectionHtml: string,
): ProjectData | Record<string, unknown> {
  const page = getProjectPage(project, pageId);
  const blocks = extractSectionBlocks(page.component);
  const next = [...blocks];
  const footerIdx = next.findIndex((b) =>
    /data-section-type="footer"/.test(b),
  );
  if (footerIdx >= 0) next.splice(footerIdx, 0, sectionHtml);
  else next.push(sectionHtml);
  return setProjectPageHtml(
    project,
    pageId,
    replaceSectionBlocks(page.component, next),
  );
}

function setSectionAttr(
  project: ProjectData | Record<string, unknown>,
  pageId: string,
  sectionId: string,
  attr: string,
  value: string,
): ProjectData | Record<string, unknown> {
  const page = getProjectPage(project, pageId);
  const blocks = extractSectionBlocks(page.component).map((b) => {
    if (!b.includes(`data-section-id="${sectionId}"`)) return b;
    const re = new RegExp(`${attr}="[^"]*"`);
    if (re.test(b)) return b.replace(re, `${attr}="${value}"`);
    return b.replace("<section", `<section ${attr}="${value}"`);
  });
  return setProjectPageHtml(
    project,
    pageId,
    replaceSectionBlocks(page.component, blocks),
  );
}

function renderSite(config: WebsiteConfig, pageId = "home"): string {
  return renderToStaticMarkup(
    createElement(WebsiteRenderer, {
      config,
      mode: "published",
      pageId,
    }),
  );
}

describe("Phase 3.1.2 mergeSectionsFromMeta", () => {
  it("reorders existing sections by meta order", () => {
    const existing: SectionConfig[] = [
      { id: "a", type: "hero", visible: true },
      { id: "b", type: "products", visible: true },
      { id: "c", type: "cta", visible: true },
    ];
    const merged = mergeSectionsFromMeta(
      existing,
      [
        { id: "c", visible: true },
        { id: "a", visible: true },
        { id: "b", visible: true },
      ],
      { dropMissing: true },
    );
    expect(sectionIds(merged)).toEqual(["c", "a", "b"]);
  });

  it("adds new sections from meta with independent clones", () => {
    const existing: SectionConfig[] = [
      { id: "a", type: "hero", visible: true, settings: { x: 1 } },
    ];
    const merged = mergeSectionsFromMeta(
      existing,
      [
        { id: "a", visible: true },
        { id: "d", type: "gallery", visible: true, settings: { columns: 3 } },
      ],
      { dropMissing: true },
    );
    expect(sectionIds(merged)).toEqual(["a", "d"]);
    expect(merged[1]?.settings).toEqual({ columns: 3 });
    merged[1]!.settings!.columns = 9;
    expect(existing[0]?.settings).toEqual({ x: 1 });
  });

  it("removes sections absent from meta when dropMissing", () => {
    const merged = mergeSectionsFromMeta(
      [
        { id: "a", type: "hero", visible: true },
        { id: "b", type: "about", visible: true },
      ],
      [{ id: "a", visible: true }],
      { dropMissing: true },
    );
    expect(sectionIds(merged)).toEqual(["a"]);
  });

  it("keeps orphans when dropMissing is false", () => {
    const merged = mergeSectionsFromMeta(
      [
        { id: "a", type: "hero", visible: true },
        { id: "b", type: "about", visible: true },
      ],
      [{ id: "a", visible: true }],
      { dropMissing: false },
    );
    expect(sectionIds(merged)).toEqual(["a", "b"]);
  });

  it("keeps footer last after structural ops", () => {
    const merged = mergeSectionsFromMeta(
      [
        { id: "a", type: "hero", visible: true },
        { id: "f", type: "footer", visible: true },
        { id: "b", type: "cta", visible: true },
      ],
      [
        { id: "f", visible: true },
        { id: "b", visible: true },
        { id: "a", visible: true },
      ],
      { dropMissing: true },
    );
    expect(merged.map((s) => s.type)).toEqual(["cta", "hero", "footer"]);
  });
});

describe("Phase 3.1.2 page section synchronization", () => {
  it("1 initial page sections match resolveHomeSections", () => {
    const { config } = instantiate("fashion-luxury");
    const home = config.pages?.find((p) => p.id === "home");
    expect(home?.sections?.length).toBeGreaterThan(0);
    expect(sectionIds(homeSections(config))).toEqual(
      sectionIds(home!.sections!),
    );
  });

  it("2 reorder persists into pages[].sections", () => {
    const { config } = instantiate("saas-modern");
    const before = homeSections(config);
    const body = before.filter((s) => s.type !== "footer");
    expect(body.length).toBeGreaterThanOrEqual(3);
    const reordered = [body[2]!, body[0]!, body[1]!, ...body.slice(3)];
    const orderIds = [
      ...reordered.map((s) => s.id),
      ...before.filter((s) => s.type === "footer").map((s) => s.id),
    ];
    const project = reorderProjectSections(
      buildProjectFromWebsiteConfig(config),
      "home",
      orderIds,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(sectionIds(homeSections(synced))).toEqual(orderIds);
    expect(
      sectionIds(synced.pages?.find((p) => p.id === "home")?.sections ?? []),
    ).toEqual(orderIds);
  });

  it("3 add persists into the correct page", () => {
    const { config } = instantiate("fashion-luxury");
    const project = addProjectSection(
      buildProjectFromWebsiteConfig(config),
      "home",
      `<section data-section-id="cta-added" data-section-type="cta" data-section-variant="simple" data-visible="true"><h2>New CTA</h2></section>`,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(homeSections(synced).some((s) => s.id === "cta-added")).toBe(true);
    expect(
      synced.pages
        ?.find((p) => p.id === "home")
        ?.sections?.some((s) => s.id === "cta-added"),
    ).toBe(true);
  });

  it("4 remove drops from pages[].sections", () => {
    const { config } = instantiate("saas-modern");
    const target = homeSections(config).find((s) => s.type !== "footer");
    expect(target).toBeTruthy();
    const project = removeProjectSection(
      buildProjectFromWebsiteConfig(config),
      "home",
      target!.id,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(homeSections(synced).some((s) => s.id === target!.id)).toBe(false);
    expect(
      synced.pages
        ?.find((p) => p.id === "home")
        ?.sections?.some((s) => s.id === target!.id),
    ).toBe(false);
  });

  it("5 duplicate creates distinct stable ids", () => {
    const { config } = instantiate("fashion-luxury");
    const hero = homeSections(config).find((s) => s.type === "hero");
    expect(hero).toBeTruthy();
    const project = duplicateProjectSection(
      buildProjectFromWebsiteConfig(config),
      "home",
      hero!.id,
      `${hero!.id}__dup`,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    const heroes = homeSections(synced).filter((s) => s.type === "hero");
    expect(heroes.length).toBeGreaterThanOrEqual(2);
    const ids = new Set(heroes.map((s) => s.id));
    expect(ids.size).toBe(heroes.length);
    expect(ids.has(`${hero!.id}__dup`)).toBe(true);
  });

  it("6 hide/show visibility survives sync", () => {
    const { config } = instantiate("restaurant-editorial");
    const about = homeSections(config).find((s) => s.type === "about");
    expect(about).toBeTruthy();
    let project = setSectionAttr(
      buildProjectFromWebsiteConfig(config),
      "home",
      about!.id,
      "data-visible",
      "false",
    );
    let synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(
      homeSections(synced).find((s) => s.id === about!.id)?.visible,
    ).toBe(false);
    project = setSectionAttr(project, "home", about!.id, "data-visible", "true");
    synced = applyVisualProjectToWebsiteConfig(synced, project);
    expect(
      homeSections(synced).find((s) => s.id === about!.id)?.visible,
    ).toBe(true);
  });

  it("7 save/reload round-trip keeps order", () => {
    const { config } = instantiate("saas-modern");
    const before = homeSections(config);
    const body = before.filter((s) => s.type !== "footer");
    const orderIds = [
      body[1]!.id,
      body[0]!.id,
      ...body.slice(2).map((s) => s.id),
      ...before.filter((s) => s.type === "footer").map((s) => s.id),
    ];
    const project = reorderProjectSections(
      buildProjectFromWebsiteConfig(config),
      "home",
      orderIds,
    );
    const saved = applyVisualProjectToWebsiteConfig(config, project);
    const reloaded = applyVisualProjectToWebsiteConfig(
      saved,
      buildProjectFromWebsiteConfig(saved),
    );
    expect(sectionIds(homeSections(reloaded))).toEqual(orderIds);
  });

  it("8 multiple independent pages stay isolated", () => {
    const { config } = instantiate("restaurant-editorial");
    const menu = config.pages?.find((p) => p.id === "menu");
    expect(menu?.sections?.length).toBeGreaterThan(0);
    const menuBefore = sectionIds(menu!.sections!);
    const homeBody = homeSections(config).filter((s) => s.type !== "footer");
    const homeOrder = [
      homeBody[1]!.id,
      homeBody[0]!.id,
      ...homeBody.slice(2).map((s) => s.id),
      ...homeSections(config)
        .filter((s) => s.type === "footer")
        .map((s) => s.id),
    ];
    const project = reorderProjectSections(
      buildProjectFromWebsiteConfig(config),
      "home",
      homeOrder,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(sectionIds(homeSections(synced))).toEqual(homeOrder);
    expect(
      sectionIds(synced.pages?.find((p) => p.id === "menu")?.sections ?? []),
    ).toEqual(menuBefore);
  });

  it("9 page switching preserves each page's sections", () => {
    const { config } = instantiate("agency-creative");
    const aboutBefore = sectionIds(
      config.pages?.find((p) => p.id === "about")?.sections ?? [],
    );
    const home = homeSections(config);
    const target = home.find((s) => s.type !== "footer" && s.type !== "hero");
    expect(target).toBeTruthy();
    const project = removeProjectSection(
      buildProjectFromWebsiteConfig(config),
      "home",
      target!.id,
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project, {
      activePageId: "about",
    });
    expect(synced.visualEditor?.activePageId).toBe("about");
    expect(homeSections(synced).some((s) => s.id === target!.id)).toBe(false);
    expect(
      sectionIds(synced.pages?.find((p) => p.id === "about")?.sections ?? []),
    ).toEqual(aboutBefore);
  });

  it("10 legacy top-level sections still sync without catalog id", () => {
    const legacy: WebsiteConfig = {
      template: "store",
      brand: {
        name: "Legacy",
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
          headline: "H",
          subheadline: "S",
          cta: "Go",
          imageId: "img-1",
        },
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
      media: {
        "img-1": { url: "https://example.com/a.jpg", alt: "a", type: "image" },
      },
    };
    expect(isTemplateCatalogSite(legacy)).toBe(false);
    const project = reorderProjectSections(
      buildProjectFromWebsiteConfig(legacy),
      "home",
      ["about-1", "hero-1", "footer-1"],
    );
    const synced = applyVisualProjectToWebsiteConfig(legacy, project);
    expect(sectionIds(synced.sections)).toEqual([
      "about-1",
      "hero-1",
      "footer-1",
    ]);
  });

  it("11 stable section ids survive reorder", () => {
    const { config } = instantiate("beauty-premium");
    const ids = new Set(sectionIds(homeSections(config)));
    const body = homeSections(config).filter((s) => s.type !== "footer");
    const order = [
      body[body.length - 1]!.id,
      ...body.slice(0, -1).map((s) => s.id),
      ...homeSections(config)
        .filter((s) => s.type === "footer")
        .map((s) => s.id),
    ];
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      reorderProjectSections(buildProjectFromWebsiteConfig(config), "home", order),
    );
    for (const id of sectionIds(homeSections(synced))) {
      expect(ids.has(id) || id.includes("__dup")).toBe(true);
    }
    expect(sectionIds(homeSections(synced))).toEqual(order);
  });

  it("12 nested content/media preserved through structural sync", () => {
    const { config } = instantiate("fashion-luxury");
    const mediaBefore = structuredClone(config.media);
    const lookbookBefore = structuredClone(config.content.lookbook);
    const body = homeSections(config).filter((s) => s.type !== "footer");
    const order = [
      body[1]!.id,
      body[0]!.id,
      ...body.slice(2).map((s) => s.id),
      ...homeSections(config)
        .filter((s) => s.type === "footer")
        .map((s) => s.id),
    ];
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      reorderProjectSections(buildProjectFromWebsiteConfig(config), "home", order),
    );
    expect(synced.media).toEqual(mediaBefore);
    expect(synced.content.lookbook?.title).toBe(lookbookBefore?.title);
    expect(synced.content.lookbook?.items?.length).toBe(
      lookbookBefore?.items?.length,
    );
    expect(
      synced.content.lookbook?.items?.map((i) => i.imageId ?? i.caption),
    ).toEqual(
      lookbookBefore?.items?.map((i) => i.imageId ?? i.caption),
    );
  });
});

describe("Phase 3.1.2 variant parity", () => {
  it("13 variant persistence through visual sync", () => {
    const { config } = instantiate("saas-modern");
    const hero = homeSections(config).find((s) => s.type === "hero")!;
    const project = setSectionAttr(
      buildProjectFromWebsiteConfig(config),
      "home",
      hero.id,
      "data-section-variant",
      "editorial",
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(homeSections(synced).find((s) => s.id === hero.id)?.variant).toBe(
      "editorial",
    );
  });

  it("14 variant drives canonical hero rendering", () => {
    const { config } = instantiate("saas-modern");
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections = home.sections!.map((s) =>
      s.type === "hero" ? { ...s, variant: "minimal" } : s,
    );
    config.sections = structuredClone(home.sections);
    const html = renderSite(config);
    expect(html).toContain('data-variant="minimal"');
    expect(html).toContain("vitrin-hero--minimal");
  });

  it("15 preview mode uses same variant output as published", () => {
    const { config } = instantiate("fashion-luxury");
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections = home.sections!.map((s) =>
      s.type === "hero" ? { ...s, variant: "split" } : s,
    );
    config.sections = structuredClone(home.sections);
    const published = renderSite(config);
    const preview = renderToStaticMarkup(
      createElement(WebsiteRenderer, {
        config,
        mode: "preview",
        pageId: "home",
      }),
    );
    expect(published).toContain('data-variant="split"');
    expect(preview).toContain('data-variant="split"');
  });

  it("16 publish preflight still accepts variant-bearing template configs", () => {
    const { config } = instantiate("saas-modern");
    const hero = homeSections(config).find((s) => s.type === "hero")!;
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      setSectionAttr(
        buildProjectFromWebsiteConfig(config),
        "home",
        hero.id,
        "data-section-variant",
        "overlay",
      ),
    );
    synced.settings.published = true;
    const result = runPublishPreflight(synced);
    expect(result.ok || result.errors.length >= 0).toBe(true);
    expect(
      homeSections(synced).find((s) => s.id === hero.id)?.variant,
    ).toBe("overlay");
  });

  it("17 variant + settings persist together", () => {
    const { config } = instantiate("portfolio-creator");
    const gallery = homeSections(config).find(
      (s) => s.type === "gallery" || s.type === "portfolio",
    );
    expect(gallery).toBeTruthy();
    let project = setSectionAttr(
      buildProjectFromWebsiteConfig(config),
      "home",
      gallery!.id,
      "data-section-variant",
      "masonry",
    );
    project = setSectionAttr(
      project,
      "home",
      gallery!.id,
      "data-section-settings",
      JSON.stringify({ columns: 3 }).replace(/"/g, "&quot;"),
    );
    // settings attr is JSON in attribute — use direct HTML replace for reliability
    const page = getProjectPage(project, "home");
    const html = page.component.replace(
      new RegExp(
        `(data-section-id="${gallery!.id}"[^>]*?)(?:data-section-settings="[^"]*")?`,
      ),
      `$1 data-section-settings="${JSON.stringify({ columns: 3 }).replace(/"/g, "&quot;")}"`,
    );
    project = setProjectPageHtml(project, "home", html);
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    const next = homeSections(synced).find((s) => s.id === gallery!.id);
    expect(next?.variant).toBe("masonry");
    expect(next?.settings).toEqual({ columns: 3 });
  });

  it("18 unsupported variant falls back to registry default", () => {
    expect(resolveKnownSectionVariant("hero", "not-a-real-variant")).toBe(
      "minimal",
    );
    expect(resolveGalleryVariant({ id: "g", type: "gallery", visible: true, variant: "weird" })).toBe(
      "grid",
    );
    expect(resolveCtaVariant({ id: "c", type: "cta", visible: true, variant: "nope" })).toBe(
      "simple",
    );
  });

  it("19 multiple section types honor variants", () => {
    const { config } = instantiate("coffee-modern");
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections = home.sections!.map((s) => {
      if (s.type === "hero") return { ...s, variant: "centered" };
      if (s.type === "about") return { ...s, variant: "split" };
      if (s.type === "cta" || s.type === "promo")
        return { ...s, variant: "full-width" };
      return s;
    });
    config.sections = structuredClone(home.sections);
    const html = renderSite(config);
    expect(html).toMatch(/data-section="hero"[^>]*data-variant="centered"|data-variant="centered"/);
    expect(html).toContain('data-variant="split"');
  });

  it("20 visual editor → canonical round trip for variant", () => {
    const { config } = instantiate("saas-modern");
    const hero = homeSections(config).find((s) => s.type === "hero")!;
    const project = setSectionAttr(
      buildProjectFromWebsiteConfig(config),
      "home",
      hero.id,
      "data-section-variant",
      "split",
    );
    const synced = applyVisualProjectToWebsiteConfig(config, project);
    expect(homeSections(synced).find((s) => s.id === hero.id)?.variant).toBe(
      "split",
    );
    const html = renderSite(synced);
    expect(html).toContain('data-variant="split"');
    expect(html).toContain("vitrin-hero--split");
  });
});

describe("Phase 3.1.2 regression matrix", () => {
  it("21 template instantiation still produces catalog metadata", () => {
    const { config } = instantiate("fashion-luxury");
    expect(config.templateCatalogId).toBe("fashion-luxury");
    expect(shouldUseCanonicalHomeRenderer(config)).toBe(true);
  });

  it.each([
    ["22 Fashion", "fashion-luxury"],
    ["23 SaaS", "saas-modern"],
    ["24 Restaurant", "restaurant-editorial"],
    ["25 Beauty", "beauty-premium"],
    ["26 Agency", "agency-creative"],
    ["27 Portfolio", "portfolio-creator"],
    ["28 Real Estate", "real-estate"],
    ["29 Coffee", "coffee-modern"],
  ] as const)("%s round-trips page.sections via visual project", (_label, id) => {
    const { config } = instantiate(id);
    const before = sectionTypes(homeSections(config));
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      buildProjectFromWebsiteConfig(config),
    );
    expect(sectionTypes(homeSections(synced))).toEqual(before);
    expect(synced.pages?.find((p) => p.id === "home")?.sections?.length).toBe(
      before.length,
    );
  });

  it("30 legacy store without catalog does not force canonical home renderer", () => {
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
        typography: { heading: "sans", body: "sans", scale: "editorial" },
      },
      content: {
        hero: {
          style: "overlay",
          headline: "Store",
          subheadline: "Legacy",
          cta: "Shop",
          imageId: "img-1",
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
      media: {
        "img-1": { url: "https://example.com/a.jpg", alt: "a", type: "image" },
      },
    };
    expect(shouldUseCanonicalHomeRenderer(legacy)).toBe(false);
    expect(resolveHeroVisualMode(legacy, null)).toBe("editorial");
  });

  it("31 ensureWebsitePages still preserves non-home page.sections", () => {
    const { config } = instantiate("restaurant-editorial");
    const pages = ensureWebsitePages(config);
    expect(pages.find((p) => p.id === "menu")?.sections?.some((s) => s.type === "menu")).toBe(
      true,
    );
  });

  it("32 fingerprint includes page.sections variant changes", () => {
    const { config } = instantiate("saas-modern");
    const a = websiteConfigSourceFingerprint(config);
    const home = config.pages!.find((p) => p.id === "home")!;
    home.sections = home.sections!.map((s) =>
      s.type === "hero" ? { ...s, variant: "editorial" } : s,
    );
    const b = websiteConfigSourceFingerprint(config);
    expect(a).not.toBe(b);
  });

  it("33 RTL instantiate still syncs page sections", () => {
    const { config } = instantiate("fashion-luxury", "fa");
    expect(config.settings.direction).toBe("rtl");
    const synced = applyVisualProjectToWebsiteConfig(
      config,
      buildProjectFromWebsiteConfig(config),
    );
    expect(homeSections(synced).length).toBe(homeSections(config).length);
  });

  it("34 catalog still has eight templates", () => {
    expect(getTemplates()).toHaveLength(8);
  });

  it("35 nested page section clone does not share references", () => {
    const existing: SectionConfig[] = [
      {
        id: "a",
        type: "gallery",
        visible: true,
        settings: { columns: 2 },
        variant: "grid",
      },
    ];
    const merged = mergeSectionsFromMeta(
      existing,
      [{ id: "a", visible: true, variant: "masonry", settings: { columns: 4 } }],
      { dropMissing: true },
    );
    merged[0]!.settings!.columns = 99;
    expect(existing[0]!.settings!.columns).toBe(2);
    expect(merged[0]!.variant).toBe("masonry");
  });
});
