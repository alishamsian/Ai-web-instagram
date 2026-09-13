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
