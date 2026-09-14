import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  resolveResponsiveValue,
  setResponsiveOverride,
  resetResponsiveOverride,
  resolveResponsiveColumns,
  hasExplicitResponsiveOverride,
  isValidBreakpointKey,
  applySectionVariant,
  buildVariantPreviewConfig,
  pushHistory,
  cloneWebsiteConfig,
} from "@/lib/editor";
import {
  resolveDesignTokens,
  applyVisualPreset,
  websiteCssVars,
  REQUIRED_COLOR_KEYS,
  resolveColorScheme,
  normalizeThemeMode,
  assertNoEditorTokenLeakage,
} from "@/lib/design-system";
import { buildStoreTokens } from "@/lib/store/theme";
import {
  getVariantsForSection,
  resetRegistryForTests,
  validateSectionVariantCatalog,
  resolveSectionRenderer,
  getVariantRendererKey,
  ALL_SECTION_DEFINITIONS,
  isVariantResponsiveStrategy,
} from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { ensureVariantRenderersBound } from "@/components/store/variants/bind-variant-renderers";

function baseConfig(patch?: Partial<WebsiteConfig>): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Demo",
      colors: {
        primary: "#111111",
        secondary: "#ffffff",
        accent: "#2f5d50",
        background: "#f7f5f2",
        foreground: "#1a1816",
        muted: "#efebe6",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "fan",
        headline: "Hello",
        subheadline: "Sub",
        cta: "Shop",
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "fan" },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {},
    ...patch,
  };
}

const PREMIUM = [
  "hero",
  "products",
  "featured-products",
  "bestsellers",
  "about",
  "gallery",
  "cta",
  "trust",
] as const;

describe("phase 5 — responsive intelligence", () => {
  it("resolves desktop-only, tablet, and mobile overrides deterministically", () => {
    const desktopOnly = { desktop: 48 };
    expect(resolveResponsiveValue(desktopOnly, "desktop")).toMatchObject({
      value: 48,
      inherited: false,
      source: "desktop",
    });
    expect(resolveResponsiveValue(desktopOnly, "tablet")).toMatchObject({
      value: 48,
      inherited: true,
      source: "desktop",
    });
    expect(resolveResponsiveValue(desktopOnly, "mobile")).toMatchObject({
      value: 48,
      inherited: true,
      source: "desktop",
    });

    const withTablet = setResponsiveOverride(desktopOnly, "tablet", 32);
    expect(resolveResponsiveValue(withTablet, "tablet").value).toBe(32);
    expect(resolveResponsiveValue(withTablet, "mobile").value).toBe(32);

    const withMobile = setResponsiveOverride(withTablet, "mobile", 16);
    expect(resolveResponsiveValue(withMobile, "mobile")).toMatchObject({
      value: 16,
      inherited: false,
      source: "mobile",
    });
    expect(resolveResponsiveValue(withMobile, "desktop").value).toBe(48);
  });

  it("reset removes only the selected override and restores inheritance", () => {
    const full = { desktop: 40, tablet: 28, mobile: 18 };
    const resetMobile = resetResponsiveOverride(full, "mobile");
    expect(resolveResponsiveValue(resetMobile, "mobile")).toMatchObject({
      value: 28,
      inherited: true,
      source: "tablet",
    });
    expect(hasExplicitResponsiveOverride(resetMobile, "mobile")).toBe(false);
    expect(hasExplicitResponsiveOverride(resetMobile, "tablet")).toBe(true);

    const resetTablet = resetResponsiveOverride(resetMobile, "tablet");
    expect(resolveResponsiveValue(resetTablet, "tablet")).toMatchObject({
      value: 40,
      inherited: true,
      source: "desktop",
    });
  });

  it("handles invalid/missing breakpoints and columns safely", () => {
    expect(resolveResponsiveValue(null, "desktop").source).toBe("none");
    expect(resolveResponsiveValue({}, "desktop").source).toBe("none");
    expect(isValidBreakpointKey("laptop")).toBe(false);
    expect(isValidBreakpointKey("tablet")).toBe(true);

    expect(resolveResponsiveColumns({ desktop: 99 }, 4)).toEqual({
      mobile: 2,
      tablet: 4,
      desktop: 4,
    });
    expect(resolveResponsiveColumns({ desktop: "x" as never }, 3)).toEqual({
      mobile: 2,
      tablet: 3,
      desktop: 3,
    });
    expect(resolveResponsiveColumns({ mobile: 2, tablet: 3, desktop: 5 })).toEqual({
      mobile: 2,
      tablet: 3,
      desktop: 5,
    });
  });

  it("viewport switching does not mutate WebsiteConfig", () => {
    const config = baseConfig();
    const snapshot = cloneWebsiteConfig(config);
    // Resolving for different viewports is pure — no write.
    resolveResponsiveValue(
      config.sections[0]?.settings?.columns as never,
      "mobile",
    );
    resolveResponsiveValue(
      config.sections[0]?.settings?.columns as never,
      "desktop",
    );
    expect(config).toEqual(snapshot);
  });
});

describe("phase 5 — theme system", () => {
  it("resolves light/dark/system SSR-safely", () => {
    expect(normalizeThemeMode(undefined)).toBe("light");
    expect(normalizeThemeMode("nope")).toBe("light");
    expect(resolveColorScheme("system", null)).toBe("light");
    expect(resolveColorScheme("system", "dark")).toBe("dark");

    const light = resolveDesignTokens(
      baseConfig({
        settings: { ...baseConfig().settings, themeMode: "light" },
      }),
    );
    const dark = resolveDesignTokens(
      baseConfig({
        settings: { ...baseConfig().settings, themeMode: "dark" },
      }),
    );
    expect(light.scheme).toBe("light");
    expect(dark.scheme).toBe("dark");
    expect(light.colors.background).not.toBe(dark.colors.background);
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(light.colors[key]).toBeTruthy();
      expect(dark.colors[key]).toBeTruthy();
    }
  });

  it("emits semantic site + store tokens without editor leakage", () => {
    const config = baseConfig({
      settings: { ...baseConfig().settings, themeMode: "dark" },
    });
    const design = resolveDesignTokens(config);
    const vars = websiteCssVars(buildStoreTokens(config), design) as Record<
      string,
      unknown
    >;
    expect(assertNoEditorTokenLeakage(vars)).toEqual([]);
    expect(vars["--site-color-background"]).toBeTruthy();
    expect(vars["--site-color-focus"]).toBeTruthy();
    expect(vars["--site-color-on-media"]).toBeTruthy();
    expect(vars["--store-on-media"]).toBe(design.colors.onMedia);
    expect(vars["--store-fg"]).toBeTruthy();
  });

  it("applyVisualPreset preserves explicit themeMode and remains deterministic", () => {
    const explicit = applyVisualPreset(
      baseConfig({
        settings: { ...baseConfig().settings, themeMode: "dark" },
      }),
      "quiet-luxury",
    );
    expect(explicit.settings.themeMode).toBe("dark");
    expect(explicit.settings.mood).toBe("quiet-luxury");

    const seeded = applyVisualPreset(baseConfig(), "immersive-cinema");
    expect(seeded.settings.themeMode).toBe("dark"); // preset default when missing

    const a = resolveDesignTokens(explicit);
    const b = resolveDesignTokens(cloneWebsiteConfig(explicit));
    expect(a).toEqual(b);
  });
});

describe("phase 5 — variant contracts + regressions", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    ensureStoreSectionRenderersBound();
    ensureVariantRenderersBound();
  });

  it("every premium variant has responsive + light/dark semantic contracts", () => {
    const report = validateSectionVariantCatalog();
    expect(report.ok).toBe(true);
    for (const type of PREMIUM) {
      for (const variant of getVariantsForSection(type)) {
        expect(isVariantResponsiveStrategy(variant.responsive!.mobile)).toBe(
          true,
        );
        expect(isVariantResponsiveStrategy(variant.responsive!.tablet)).toBe(
          true,
        );
        expect(isVariantResponsiveStrategy(variant.responsive!.desktop)).toBe(
          true,
        );
        expect(variant.theme?.light).toBe(true);
        expect(variant.theme?.dark).toBe(true);
        expect(variant.theme?.semanticTokens).toBe(true);
        expect(getVariantRendererKey(type, variant.id)).toBe(
          `${type}.${variant.id}`,
        );
      }
    }
  });

  it("renderer resolution remains intact across light/dark configs", () => {
    expect(resolveSectionRenderer("hero", "overlay")).toBeTypeOf("function");
    expect(resolveSectionRenderer("gallery", "masonry")).toBeTypeOf("function");
    expect(resolveSectionRenderer("trust", "metrics")).toBeTypeOf("function");
  });

  it("phase 4 apply still creates one history entry; preview stays non-mutating", () => {
    const initial = baseConfig();
    const entries = [
      {
        id: "h0",
        label: "init",
        config: cloneWebsiteConfig(initial),
        createdAt: 1,
      },
    ];
    const applied = applySectionVariant(initial, "hero-1", "split")!;
    const pushed = pushHistory({
      entries,
      index: 0,
      next: applied.config,
      label: applied.label,
    });
    expect(pushed.entries).toHaveLength(2);

    const snapshot = cloneWebsiteConfig(initial);
    buildVariantPreviewConfig(initial, "hero-1", "minimal");
    expect(initial).toEqual(snapshot);
  });

  it("full registry still validates", () => {
    resetRegistryForTests(ALL_SECTION_DEFINITIONS);
    expect(validateSectionVariantCatalog().ok).toBe(true);
    expect(CORE_SECTION_DEFINITIONS.length).toBeGreaterThan(10);
  });
});
