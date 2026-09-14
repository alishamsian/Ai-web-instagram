import { describe, expect, it } from "vitest";
import {
  STORE_THEME_IDS,
  moodChrome,
  typographyScale,
  breakpoints,
  viewportBuckets,
  productCardContract,
  buttonContract,
  imageAspect,
  sectionRhythm,
  storeCssVars,
  siteCssVars,
  websiteCssVars,
  assertNoEditorTokenLeakage,
  resolveDesignTokens,
  normalizeThemeMode,
  resolveColorScheme,
  REQUIRED_COLOR_KEYS,
  LIGHT_THEME_BASE,
  DARK_THEME_BASE,
  applyVisualPreset,
  getVisualPreset,
  VISUAL_PRESETS,
} from "@/lib/design-system";
import { buildStoreTokens, inferStoreMood } from "@/lib/store/theme";
import type { WebsiteConfig } from "@/types/website";

function baseConfig(patch?: Partial<WebsiteConfig>): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Atelier Luna",
      tagline: "editorial care",
      colors: {
        primary: "#1c1916",
        secondary: "#faf7f2",
        accent: "#8b6b4a",
        background: "#f7f3ee",
        foreground: "#1c1916",
        muted: "#efe9e1",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
      design: {
        contentWidth: "default",
        sectionSpacing: "comfortable",
        radius: "soft",
        shadow: "subtle",
      },
    },
    content: {
      hero: {
        style: "editorial",
        headline: "",
        subheadline: "",
        cta: "",
      },
    },
    sections: [],
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
    ...patch,
  };
}

describe("design system foundation", () => {
  it("keeps all store theme IDs", () => {
    expect([...STORE_THEME_IDS]).toEqual([
      "luxury",
      "minimal",
      "bold",
      "natural",
      "editorial",
      "modern",
      "dark",
    ]);
  });

  it("preserves mood inference separate from verticals", () => {
    expect(inferStoreMood(baseConfig())).toBe("luxury");
    expect(
      inferStoreMood(
        baseConfig({
          brand: {
            ...baseConfig().brand,
            name: "Night Lab",
            colors: {
              ...baseConfig().brand.colors,
              background: "#0a0a0a",
              foreground: "#fafafa",
            },
          },
        }),
      ),
    ).toBe("dark");
  });

  it("maps tokens to store CSS vars without dropping keys", () => {
    const tokens = buildStoreTokens(baseConfig());
    const vars = storeCssVars(tokens) as Record<string, string>;
    expect(vars["--store-bg"]).toBe(tokens.background);
    expect(vars["--store-primary"]).toBe(tokens.accent);
    expect(vars["--store-wrap"]).toBe("1280px");
    expect(vars["--store-shadow-card"]).toBeTruthy();
    expect(vars["--store-dur-fast"]).toBe("180ms");
  });

  it("exposes typography roles and layout breakpoints", () => {
    expect(typographyScale.display.className).toContain("store-display");
    expect(typographyScale.productTitle.className).toContain("store-card__title");
    expect(breakpoints.desktop).toBe(1280);
    expect(viewportBuckets.mobile).toBe(430);
    expect(imageAspect.portrait).toBe("4 / 5");
    expect(sectionRhythm.editorial).toContain("clamp");
  });

  it("documents ProductCard canonical path and button contract", () => {
    expect(productCardContract.canonicalImport).toBe(
      "@/components/store/StoreProductCard",
    );
    expect(productCardContract.legacyImport).toBe(
      "@/components/website/StoreProductCard",
    );
    expect(buttonContract.variants).toContain("outline");
    expect(moodChrome("luxury").radiusSm).toBe("0");
  });
});

describe("phase 1 — theme + design tokens", () => {
  it("defaults missing/invalid themeMode to light", () => {
    expect(normalizeThemeMode(undefined)).toBe("light");
    expect(normalizeThemeMode(null)).toBe("light");
    expect(normalizeThemeMode("nope")).toBe("light");
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("system")).toBe("system");
  });

  it("resolves light/dark/system schemes deterministically", () => {
    expect(resolveColorScheme("light")).toBe("light");
    expect(resolveColorScheme("dark")).toBe("dark");
    expect(resolveColorScheme("system")).toBe("light");
    expect(resolveColorScheme("system", "dark")).toBe("dark");
    expect(resolveColorScheme("system", "light")).toBe("light");
    expect(resolveColorScheme(undefined)).toBe("light");
  });

  it("builds complete semantic tokens for light and dark", () => {
    const light = resolveDesignTokens(
      baseConfig({ settings: { ...baseConfig().settings, themeMode: "light" } }),
    );
    const dark = resolveDesignTokens(
      baseConfig({ settings: { ...baseConfig().settings, themeMode: "dark" } }),
    );
    expect(light.scheme).toBe("light");
    expect(dark.scheme).toBe("dark");
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(light.colors[key as keyof typeof light.colors]).toBeTruthy();
      expect(dark.colors[key as keyof typeof dark.colors]).toBeTruthy();
    }
    expect(light.colors.background).not.toBe(dark.colors.background);
    expect(LIGHT_THEME_BASE.background).not.toBe("#000000");
    expect(DARK_THEME_BASE.background).not.toBe("#000000");
    expect(DARK_THEME_BASE.foreground).not.toBe("#ffffff");
  });

  it("keeps WebsiteConfig without themeMode readable", () => {
    const tokens = resolveDesignTokens(baseConfig());
    expect(tokens.themeMode).toBe("light");
    expect(tokens.scheme).toBe("light");
    expect(tokens.layout.pageMaxWidth).toBeTruthy();
    expect(tokens.fonts.body).toContain("sans-serif");
  });

  it("generates site CSS vars without editor leakage", () => {
    const design = resolveDesignTokens(baseConfig());
    const store = buildStoreTokens(baseConfig());
    const site = siteCssVars(design) as Record<string, string>;
    const merged = websiteCssVars(store, design) as Record<string, string>;
    expect(site["--site-color-background"]).toBe(design.colors.background);
    expect(site["--site-font-body"]).toBeTruthy();
    expect(site["--site-radius-card"]).toBeTruthy();
    expect(site["--site-motion-fast"]).toBe("180ms");
    expect(merged["--store-bg"]).toBe(store.background);
    expect(merged["--site-color-accent"]).toBe(design.colors.accent);
    expect(assertNoEditorTokenLeakage(merged)).toEqual([]);
    expect(Object.keys(merged).some((k) => k.startsWith("--ed-"))).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const a = resolveDesignTokens(baseConfig());
    const b = resolveDesignTokens(baseConfig());
    expect(a).toEqual(b);
    expect(siteCssVars(a)).toEqual(siteCssVars(b));
    expect(websiteCssVars(buildStoreTokens(baseConfig()), a)).toEqual(
      websiteCssVars(buildStoreTokens(baseConfig()), b),
    );
  });

  it("integrates brand.design chrome", () => {
    const sharp = resolveDesignTokens(
      baseConfig({
        brand: {
          ...baseConfig().brand,
          design: {
            contentWidth: "narrow",
            sectionSpacing: "compact",
            radius: "sharp",
            shadow: "none",
          },
        },
      }),
    );
    expect(sharp.layout.pageMaxWidth).toBe("72rem");
    expect(sharp.radius.subtle).toBe("0");
    expect(sharp.elevation.subtle).toBe("none");
  });

  it("integrates visual preset design hints and themeMode", () => {
    const withPreset = applyVisualPreset(baseConfig(), "studio-grid");
    expect(withPreset.settings.themeMode).toBe("light");
    expect(withPreset.settings.mood).toBe("studio-grid");
    const tokens = resolveDesignTokens(withPreset);
    expect(tokens.visualPresetId).toBe("studio-grid");
    expect(getVisualPreset("studio-grid")?.designHints?.spacingDensity).toBe(
      "compact",
    );
    expect(tokens.spacing.component).toBeTruthy();
    for (const preset of VISUAL_PRESETS) {
      expect(preset.designHints).toBeTruthy();
      expect(preset.theme.supportsDark).toBe(true);
    }
  });

  it("collapses motion when reducedMotion is requested", () => {
    const tokens = resolveDesignTokens(baseConfig(), { reducedMotion: true });
    expect(tokens.reducedMotion).toBe(true);
    expect(tokens.motion.fast).toBe("0.01ms");
    expect(tokens.motion.normal).toBe("0.01ms");
  });

  it("keeps RTL-safe font stacks", () => {
    const fa = resolveDesignTokens(
      baseConfig({
        settings: {
          ...baseConfig().settings,
          language: "fa",
          direction: "rtl",
        },
      }),
    );
    expect(fa.fonts.body).toMatch(/Vazirmatn|Noto Sans Arabic|sans-serif/);
    expect(fa.fonts.heading).toMatch(/Georgia|Noto Naskh Arabic|serif/);
    expect(fa.layout.touchMin).toBe("44px");
  });

  it("respects themeMode in buildStoreTokens surfaces", () => {
    const dark = buildStoreTokens(
      baseConfig({
        settings: { ...baseConfig().settings, themeMode: "dark" },
      }),
    );
    const light = buildStoreTokens(
      baseConfig({
        settings: { ...baseConfig().settings, themeMode: "light" },
      }),
    );
    expect(dark.surface).not.toBe(light.surface);
  });
});
