import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  applySectionVariant,
  buildVariantPreviewConfig,
  pushHistory,
  undoHistory,
  redoHistory,
  cloneWebsiteConfig,
} from "@/lib/editor";
import {
  getVariantsForSection,
  getDefaultVariant,
  getRecommendedVariants,
  resolveSectionVariant,
  resetRegistryForTests,
  validateSectionVariantCatalog,
} from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { applyVisualPreset } from "@/lib/design-system/visual-presets";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Demo",
      colors: {
        primary: "#111",
        secondary: "#fff",
        accent: "#333",
        background: "#fff",
        foreground: "#111",
        muted: "#eee",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "fan",
        headline: "Keep headline",
        subheadline: "Keep sub",
        cta: "Shop",
      },
      about: { title: "About", body: "Story body" },
    },
    sections: [
      {
        id: "hero-1",
        type: "hero",
        visible: true,
        variant: "fan",
        settings: { eyebrow: "Brand" },
      },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
      mood: "quiet-luxury",
    },
    media: {},
  };
}

describe("phase 4 — visual library apply engine", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
  });

  it("library data comes from registry (no hardcoded hero list)", () => {
    const variants = getVariantsForSection("hero");
    expect(variants.map((v) => v.id)).toEqual(
      expect.arrayContaining(["fan", "overlay", "editorial", "split", "minimal"]),
    );
    expect(getDefaultVariant("hero")?.id).toBe("fan");
    expect(validateSectionVariantCatalog().ok).toBe(true);
  });

  it("apply changes only variant and preserves identity/content/settings", () => {
    const before = baseConfig();
    const result = applySectionVariant(before, "hero-1", "editorial");
    expect(result).not.toBeNull();
    const section = result!.config.sections.find((s) => s.id === "hero-1")!;
    expect(section).toMatchObject({
      id: "hero-1",
      type: "hero",
      variant: "editorial",
      visible: true,
      settings: { eyebrow: "Brand" },
    });
    expect(result!.config.content.hero.headline).toBe("Keep headline");
    expect(result!.config.content.about).toEqual(before.content.about);
    expect(result!.label).toContain("editorial");
  });

  it("rejects invalid variants and canonicalizes aliases", () => {
    expect(applySectionVariant(baseConfig(), "hero-1", "nope")).toBeNull();
    expect(applySectionVariant(baseConfig(), "missing", "split")).toBeNull();
    const aliased = applySectionVariant(baseConfig(), "hero-1", "menu");
    expect(aliased?.config.sections[0]?.variant).toBe("editorial");
    expect(applySectionVariant(baseConfig(), "hero-1", "fan")).toBeNull();
  });

  it("one apply creates one history entry; undo/redo restore variant", () => {
    const initial = baseConfig();
    let entries = [ { id: "h0", label: "init", config: cloneWebsiteConfig(initial), createdAt: 1 } ];
    let index = 0;

    const applied = applySectionVariant(initial, "hero-1", "overlay")!;
    const pushed = pushHistory({
      entries,
      index,
      next: applied.config,
      label: applied.label,
    });
    entries = pushed.entries;
    index = pushed.index;
    expect(entries).toHaveLength(2);
    expect(entries[1]?.config.sections[0]?.variant).toBe("overlay");

    const undone = undoHistory({ entries, index });
    expect(undone.config?.sections[0]?.variant).toBe("fan");
    index = undone.index;

    const redone = redoHistory({ entries, index });
    expect(redone.config?.sections[0]?.variant).toBe("overlay");
  });

  it("preview clone does not mutate source config", () => {
    const source = baseConfig();
    const snapshot = cloneWebsiteConfig(source);
    const preview = buildVariantPreviewConfig(source, "hero-1", "split");
    expect(preview?.config.sections[0]?.variant).toBe("split");
    expect(source).toEqual(snapshot);
    expect(source.sections[0]?.variant).toBe("fan");
  });

  it("recommendations are registry-backed and apply does not mutate mood/theme", () => {
    const recs = getRecommendedVariants("hero", "quiet-luxury");
    expect(recs.some((v) => v.id === "editorial")).toBe(true);
    const before = baseConfig();
    const withPreset = applyVisualPreset(before, "quiet-luxury");
    const applied = applySectionVariant(withPreset, "hero-1", "editorial")!;
    expect(applied.config.settings.mood).toBe(withPreset.settings.mood);
    expect(applied.config.settings.themeMode).toBe(withPreset.settings.themeMode);
  });

  it("resolve unknown variant falls back safely for UI", () => {
    expect(resolveSectionVariant("hero", "ghost").id).toBe("fan");
    expect(resolveSectionVariant("gallery", null).id).toBe("lookbook");
  });
});
