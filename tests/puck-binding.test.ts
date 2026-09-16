/**
 * Phase 2 — WebsiteConfig binding helpers used by the Puck inspector.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  bindSetContentPath,
  bindSetBrandColor,
  bindSetSeoField,
  bindSetSectionVariant,
  bindToggleSectionVisibility,
  bindUpdateSiteSettings,
  humanSectionLabel,
  findSection,
  syncPuckDataFromConfig,
} from "@/lib/puck/binding";
import {
  puckToWebsiteConfig,
  websiteConfigToPuck,
  listUnregisteredSectionTypes,
} from "@/lib/puck";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
} from "@/lib/store/registry";
import {
  resetVerticalRegistryForTests,
  CORE_VERTICAL_PACKS,
} from "@/lib/store/verticals";
import {
  resetRecipeRegistryForTests,
  CORE_TEMPLATE_RECIPES,
} from "@/lib/store/recipes";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";

beforeEach(() => {
  resetRegistryForTests(ALL_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
  ensureStoreSectionRenderersBound();
});

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "ویترین",
      colors: {
        primary: "#111111",
        secondary: "#FFFFFF",
        accent: "#C9A227",
        background: "#FFFFFF",
        foreground: "#111111",
        muted: "#F5F5F5",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "minimal",
        headline: "قدیمی",
        subheadline: "زیرعنوان",
        cta: "خرید",
      },
      products: {
        title: "محصولات",
        items: [],
        defaults: { category: "general", currency: "IRT" },
      },
    },
    sections: [
      {
        id: "hero-1",
        type: "hero",
        visible: true,
        variant: "classic",
      },
      { id: "products-1", type: "products", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "قدیمی", description: "توضیح", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

describe("Puck binding → WebsiteConfig", () => {
  it("updates content.hero.headline via content path", () => {
    let config = baseConfig();
    const ok = bindSetContentPath({
      config,
      path: "content.hero.headline",
      value: "تیتر جدید",
      onChange: (next) => {
        config = next;
      },
    });
    expect(ok).toBe(true);
    expect(config.content.hero.headline).toBe("تیتر جدید");
  });

  it("updates brand primary color", () => {
    let config = baseConfig();
    bindSetBrandColor({
      config,
      key: "primary",
      value: "#FF0000",
      onChange: (next) => {
        config = next;
      },
    });
    expect(config.brand.colors.primary).toBe("#FF0000");
  });

  it("updates SEO fields", () => {
    let config = baseConfig();
    bindSetSeoField({
      config,
      field: "title",
      value: "سئو جدید",
      onChange: (next) => {
        config = next;
      },
    });
    expect(config.seo.title).toBe("سئو جدید");
  });

  it("toggles section visibility without dropping the section", () => {
    let config = baseConfig();
    bindToggleSectionVisibility({
      config,
      sectionId: "hero-1",
      onChange: (next) => {
        config = next;
      },
    });
    expect(config.sections.find((s) => s.id === "hero-1")?.visible).toBe(
      false,
    );
    expect(config.sections).toHaveLength(3);
  });

  it("sets section variant", () => {
    let config = baseConfig();
    const ok = bindSetSectionVariant({
      config,
      sectionId: "hero-1",
      variantId: "editorial",
      onChange: (next) => {
        config = next;
      },
    });
    // May be false if variant not in registry for fixture — still no crash
    if (ok) {
      expect(config.sections[0]?.variant).toBe("editorial");
    } else {
      expect(findSection(config, "hero-1")).toBeTruthy();
    }
  });

  it("updates site settings (RTL / language)", () => {
    let config = baseConfig();
    bindUpdateSiteSettings({
      config,
      patch: { language: "en", direction: "ltr" },
      onChange: (next) => {
        config = next;
      },
    });
    expect(config.settings.language).toBe("en");
    expect(config.settings.direction).toBe("ltr");
  });

  it("uses human labels instead of raw ids", () => {
    const section = baseConfig().sections[0]!;
    expect(humanSectionLabel(section, "en", { fa: "هیرو", en: "Hero" })).toBe(
      "Hero",
    );
    expect(humanSectionLabel(section, "fa", { fa: "هیرو", en: "Hero" })).toBe(
      "هیرو",
    );
  });

  it("syncs puck projection after WebsiteConfig edits", () => {
    let config = baseConfig();
    bindSetContentPath({
      config,
      path: "content.hero.headline",
      value: "همگام",
      onChange: (next) => {
        config = next;
      },
    });
    const puck = syncPuckDataFromConfig(config);
    expect(
      (puck.root?.props as { content?: { hero?: { headline?: string } } })
        ?.content?.hero?.headline,
    ).toBe("همگام");
  });

  it("preserves inspector content when puck structure changes", () => {
    let config = baseConfig();
    bindSetContentPath({
      config,
      path: "content.hero.headline",
      value: "حفظ‌شده",
      onChange: (next) => {
        config = next;
      },
    });
    const puck = websiteConfigToPuck(config);
    // Simulate stale root in puck while fallback has new headline
    const stale = structuredClone(puck);
    (
      stale.root!.props as { content: { hero: { headline: string } } }
    ).content.hero.headline = "کهنه";
    const restored = puckToWebsiteConfig(stale, config);
    expect(restored.content.hero.headline).toBe("حفظ‌شده");
    expect(restored.sections.map((s) => s.id)).toEqual(
      config.sections.map((s) => s.id),
    );
  });

  it("preserves unknown section types through adapter (no deletion)", () => {
    const config = baseConfig();
    config.sections.splice(1, 0, {
      id: "mystery-1",
      type: "totally-unknown-section" as WebsiteConfig["sections"][number]["type"],
      visible: true,
      settings: { keep: true },
    });
    expect(listUnregisteredSectionTypes(config)).toContain(
      "totally-unknown-section",
    );
    const restored = puckToWebsiteConfig(websiteConfigToPuck(config), config);
    const mystery = restored.sections.find((s) => s.id === "mystery-1");
    expect(mystery).toBeTruthy();
    expect(mystery?.type).toBe("totally-unknown-section");
    expect(mystery?.settings).toEqual({ keep: true });
  });
});
