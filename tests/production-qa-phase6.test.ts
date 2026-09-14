import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applySectionVariant,
  buildVariantPreviewConfig,
  cloneWebsiteConfig,
  createHistoryEntry,
  pushHistory,
  undoHistory,
  redoHistory,
  shouldDebounceHistoryLabel,
  resolveResponsiveValue,
  setResponsiveOverride,
  resetResponsiveOverride,
  resolveResponsiveColumns,
  viewportToBreakpoint,
  deviceFromViewport,
} from "@/lib/editor";
import {
  resolveColorScheme,
  normalizeThemeMode,
  resolveDesignTokens,
  websiteCssVars,
  assertNoEditorTokenLeakage,
  applyVisualPreset,
} from "@/lib/design-system";
import { buildStoreTokens } from "@/lib/store/theme";
import {
  getVariantsForSection,
  resolveSectionVariant,
  resetRegistryForTests,
  validateSectionVariantCatalog,
  isVariantSupported,
} from "@/lib/store/registry";
import {
  hasOptimisticVersionConflict,
  nextPersistenceAfterConfigSave,
} from "@/lib/website/optimistic-version";
import { configsEqual } from "@/components/editor/editor-utils";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Demo",
      colors: {
        primary: "#111111",
        secondary: "#ffffff",
        accent: "#c45c26",
        background: "#faf8f5",
        foreground: "#1a1a1a",
        muted: "#e8e4de",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "fan",
        headline: "Headline A",
        subheadline: "Sub",
        cta: "Shop",
      },
      about: { title: "About", body: "Body" },
      products: {
        title: "Products",
        items: [
          {
            id: "product-1",
            name: "Serum",
            price: 120,
            description: "Nice",
            category: "care",
            currency: "IRT",
            imageIds: [],
            confidence: 1,
          },
        ],
      },
    },
    sections: [
      {
        id: "hero-1",
        type: "hero",
        visible: true,
        variant: "fan",
        settings: { eyebrow: "Brand" },
      },
      {
        id: "products-1",
        type: "products",
        visible: true,
        variant: "classic",
      },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "SEO", description: "Desc", keywords: ["a"] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
      vertical: "beauty",
      themeMode: "light",
      mood: "editorial",
    },
    media: {
      hero: { url: "/x.jpg", alt: "hero", type: "image" },
    },
  };
}

beforeEach(() => {
  resetRegistryForTests();
});

describe("Phase 6 — history integrity", () => {
  it("supports A→B→C undo/redo and truncates redo after a new edit", () => {
    let entries = [createHistoryEntry(baseConfig(), "A")];
    let index = 0;

    const b = {
      ...baseConfig(),
      content: {
        ...baseConfig().content,
        hero: { ...baseConfig().content.hero, headline: "B" },
      },
    };
    ({ entries, index } = pushHistory({
      entries,
      index,
      next: b,
      label: "B",
    }));

    const c = {
      ...b,
      content: {
        ...b.content,
        hero: { ...b.content.hero, headline: "C" },
      },
    };
    ({ entries, index } = pushHistory({
      entries,
      index,
      next: c,
      label: "C",
    }));
    expect(entries).toHaveLength(3);
    expect(index).toBe(2);

    let step = undoHistory({ entries, index });
    index = step.index;
    expect(step.config?.content.hero.headline).toBe("B");

    step = undoHistory({ entries, index });
    index = step.index;
    expect(step.config?.content.hero.headline).toBe("Headline A");

    step = redoHistory({ entries, index });
    index = step.index;
    expect(step.config?.content.hero.headline).toBe("B");

    const d = {
      ...b,
      content: {
        ...b.content,
        hero: { ...b.content.hero, headline: "D" },
      },
    };
    ({ entries, index } = pushHistory({
      entries,
      index,
      next: d,
      label: "D",
    }));
    expect(entries.map((e) => e.label)).toEqual(["A", "B", "D"]);
    expect(index).toBe(2);
    expect(redoHistory({ entries, index }).config).toBeNull();
  });

  it("no-op pushHistory preserves redo stack", () => {
    let entries = [createHistoryEntry(baseConfig(), "A")];
    let index = 0;
    const b = {
      ...baseConfig(),
      content: {
        ...baseConfig().content,
        hero: { ...baseConfig().content.hero, headline: "B" },
      },
    };
    ({ entries, index } = pushHistory({ entries, index, next: b, label: "B" }));
    const undone = undoHistory({ entries, index });
    index = undone.index;

    const noop = pushHistory({
      entries,
      index,
      next: baseConfig(),
      label: "noop",
    });
    expect(noop.entries).toHaveLength(2);
    expect(noop.index).toBe(0);
    expect(noop.entries[1]?.label).toBe("B");
    expect(redoHistory({ entries: noop.entries, index: noop.index }).config?.content.hero.headline).toBe(
      "B",
    );
  });

  it("classifies discrete vs debounced history labels", () => {
    expect(shouldDebounceHistoryLabel("Edit content.hero.headline")).toBe(true);
    expect(shouldDebounceHistoryLabel("Variant hero.minimal")).toBe(false);
    expect(shouldDebounceHistoryLabel("Delete products")).toBe(false);
    expect(shouldDebounceHistoryLabel("Reorder hero")).toBe(false);
  });

  it("variant apply is one history entry and preserves unrelated content", () => {
    const initial = baseConfig();
    const applied = applySectionVariant(initial, "hero-1", "split");
    expect(applied).not.toBeNull();
    const pushed = pushHistory({
      entries: [createHistoryEntry(initial, "Initial")],
      index: 0,
      next: applied!.config,
      label: applied!.label,
    });
    expect(pushed.entries).toHaveLength(2);
    expect(pushed.entries[1]?.label).toMatch(/^Variant /);
    expect(applied!.config.content.hero.headline).toBe("Headline A");
    expect(applied!.config.content.about?.body).toBe("Body");
    expect(applied!.config.seo.title).toBe("SEO");
    expect(applied!.config.media.hero?.url).toBe("/x.jpg");
    expect(applied!.config.sections.find((s) => s.id === "products-1")?.variant).toBe(
      "classic",
    );
  });
});

describe("Phase 6 — preview isolation", () => {
  it("deep-clones preview config so nested mutations cannot leak", () => {
    const source = baseConfig();
    const preview = buildVariantPreviewConfig(source, "hero-1", "minimal");
    expect(preview).not.toBeNull();
    expect(preview!.config).not.toBe(source);
    expect(preview!.config.brand).not.toBe(source.brand);
    expect(preview!.config.media).not.toBe(source.media);
    expect(preview!.config.content).not.toBe(source.content);

    preview!.config.brand.name = "MUTATED";
    preview!.config.media.hero!.url = "https://evil.example/x.jpg";
    preview!.config.content.hero.headline = "LEAK";

    expect(source.brand.name).toBe("Demo");
    expect(source.media.hero?.url).toBe("/x.jpg");
    expect(source.content.hero.headline).toBe("Headline A");
    expect(source.sections.find((s) => s.id === "hero-1")?.variant).toBe("fan");
  });

  it("preview path never equals a history push of the live config", () => {
    const source = baseConfig();
    const before = cloneWebsiteConfig(source);
    buildVariantPreviewConfig(source, "hero-1", "overlay");
    expect(configsEqual(source, before)).toBe(true);
  });
});

describe("Phase 6 — responsive viewport purity", () => {
  it("viewport mapping stays UI-only and overrides stay deterministic", () => {
    expect(deviceFromViewport("390")).toBe("mobile");
    expect(viewportToBreakpoint("mobile")).toBe("mobile");
    expect(viewportToBreakpoint("desktop")).toBe("desktop");

    const base = { desktop: 4 };
    expect(resolveResponsiveValue(base, "mobile").value).toBe(4);
    const withTablet = setResponsiveOverride(base, "tablet", 2);
    expect(resolveResponsiveValue(withTablet, "mobile").value).toBe(2);
    const reset = resetResponsiveOverride(withTablet, "tablet");
    expect(resolveResponsiveValue(reset, "mobile").value).toBe(4);
    // NaN desktop falls back; mobile uses compact fallback when inherited value is invalid.
    expect(resolveResponsiveColumns({ desktop: Number.NaN }, 3)).toEqual({
      mobile: 2,
      tablet: 3,
      desktop: 3,
    });
    const cols = resolveResponsiveColumns(
      { desktop: Number.NaN, mobile: 2 },
      3,
    );
    expect(Number.isFinite(cols.desktop)).toBe(true);
    expect(cols.mobile).toBe(2);
  });
});

describe("Phase 6 — theme / tokens", () => {
  it("resolves light/dark/system with SSR-safe system fallback", () => {
    expect(normalizeThemeMode(undefined)).toBe("light");
    expect(resolveColorScheme("light")).toBe("light");
    expect(resolveColorScheme("dark")).toBe("dark");
    expect(resolveColorScheme("system", null)).toBe("light");
    expect(resolveColorScheme("system", "dark")).toBe("dark");
  });

  it("websiteCssVars expose semantic + legacy tokens without editor leakage", () => {
    const config = baseConfig();
    const design = resolveDesignTokens(config, { systemPreference: null });
    const store = buildStoreTokens(config, { systemPreference: null });
    const vars = websiteCssVars(store, design) as Record<string, unknown>;
    expect(assertNoEditorTokenLeakage(vars)).toEqual([]);
    expect(vars["--site-color-on-media"]).toBeTruthy();
    expect(vars["--store-on-media"]).toBe(vars["--site-color-on-media"]);
    expect(vars["--store-focus"]).toBeTruthy();
    expect(vars["--store-bg"]).toBeTruthy();
  });

  it("visual preset preserves explicit themeMode", () => {
    const config = {
      ...baseConfig(),
      settings: { ...baseConfig().settings, themeMode: "dark" as const },
    };
    const next = applyVisualPreset(config, "quiet-luxury");
    expect(next.settings.themeMode).toBe("dark");
  });
});

describe("Phase 6 — variants / registry", () => {
  it("keeps registry integrity and safe invalid/alias handling", () => {
    expect(validateSectionVariantCatalog().ok).toBe(true);
    expect(validateSectionVariantCatalog().errors).toEqual([]);
    expect(isVariantSupported("hero", "not-a-real-variant")).toBe(false);
    expect(resolveSectionVariant("hero", "menu").id).toBe("editorial");
    expect(resolveSectionVariant("hero", "garbage").id).toBeTruthy();
    for (const type of [
      "hero",
      "products",
      "featured-products",
      "bestsellers",
      "about",
      "gallery",
      "cta",
      "trust",
    ] as const) {
      const variants = getVariantsForSection(type);
      expect(variants.length).toBeGreaterThan(0);
      for (const v of variants) {
        expect(v.theme?.light).toBe(true);
        expect(v.theme?.dark).toBe(true);
        expect(v.responsive).toBeTruthy();
      }
    }
  });
});

describe("Phase 6 — persistence integrity", () => {
  it("detects optimistic version conflicts", () => {
    expect(hasOptimisticVersionConflict(3, 3)).toBe(false);
    expect(hasOptimisticVersionConflict(2, 3)).toBe(true);
    expect(hasOptimisticVersionConflict(undefined, 3)).toBe(false);
  });

  it("config save increments version without clearing publish metadata", () => {
    const next = nextPersistenceAfterConfigSave({
      status: "published",
      publishedAt: "2026-01-01T00:00:00.000Z",
      version: 4,
    });
    expect(next).toEqual({
      status: "published",
      publishedAt: "2026-01-01T00:00:00.000Z",
      version: 5,
    });
  });
});

describe("Phase 6 — a11y contract smoke", () => {
  it("variant library option interaction remains keyboard-classifiable", () => {
    // Structural invariant: discrete variant labels are not debounced merges.
    expect(shouldDebounceHistoryLabel("Variant hero.split")).toBe(false);
    // Touch/focus tokens exist for store chrome.
    const design = resolveDesignTokens(baseConfig());
    expect(design.layout.touchMin).toBeTruthy();
    expect(design.colors.focus).toBeTruthy();
  });
});
