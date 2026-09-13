import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  createHistoryEntry,
  commandToggleSection,
  commandDuplicateSection,
  commandReorderSections,
  commandAddSection,
  commandSetContentPath,
  applyEditorAction,
  resolveResponsiveValue,
  setResponsiveOverride,
  resetResponsiveOverride,
  runPublishPreflight,
  scoreWebsiteQuality,
  proposeEditorActions,
  isProductProtectedAction,
  resolveEditorKeyCommand,
  viewportWidth,
} from "@/lib/editor";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
  hasSection,
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
import { applyDesignPreset } from "@/components/editor/editor-presets";
import { inferStoreMood } from "@/lib/store/theme";

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
      name: "Aura",
      colors: {
        primary: "#111111",
        secondary: "#FFFFFF",
        accent: "#2A2A2A",
        background: "#FAFAFA",
        foreground: "#111111",
        muted: "#EEEEEE",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "overlay",
        headline: "Aura",
        subheadline: "Quiet shop",
        cta: "Shop",
      },
      products: {
        title: "Products",
        items: [
          {
            name: "Serum",
            description: "Daily care",
            category: "",
            price: null,
            currency: null,
            imageIds: [],
            confidence: 0.8,
          },
        ],
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true },
      { id: "products-1", type: "products", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "Aura", description: "Aura shop", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
      vertical: "beauty",
      recipeId: "beauty-editorial",
    },
    media: {},
  };
}

describe("editor history", () => {
  it("supports undo/redo with labels", () => {
    const initial = createHistoryEntry(baseConfig(), "Initial");
    let entries = [initial];
    let index = 0;

    const edited = {
      ...baseConfig(),
      content: {
        ...baseConfig().content,
        hero: { ...baseConfig().content.hero, headline: "New" },
      },
    };
    const pushed = pushHistory({
      entries,
      index,
      next: edited,
      label: "Changed Hero headline",
    });
    entries = pushed.entries;
    index = pushed.index;
    expect(entries[index]?.label).toBe("Changed Hero headline");

    const undone = undoHistory({ entries, index });
    expect(undone.config?.content.hero.headline).toBe("Aura");
    index = undone.index;

    const redone = redoHistory({ entries, index });
    expect(redone.config?.content.hero.headline).toBe("New");
  });
});

describe("editor commands", () => {
  it("toggles, duplicates, reorders sections immutably", () => {
    const config = baseConfig();
    const before = structuredClone(config);
    const toggled = commandToggleSection(config, "products-1");
    expect(config).toEqual(before);
    expect(toggled?.config.sections.find((s) => s.id === "products-1")?.visible).toBe(
      false,
    );

    const dup = commandDuplicateSection(config, "products-1");
    expect(dup?.config.sections).toHaveLength(4);

    const reordered = commandReorderSections(config, 0, 2);
    expect(reordered?.config.sections[2]?.type).toBe("hero");
  });

  it("rejects unknown section types", () => {
    expect(
      commandAddSection(baseConfig(), "not-a-section" as never),
    ).toBeNull();
    expect(hasSection("hero")).toBe(true);
  });

  it("protects content paths", () => {
    expect(
      commandSetContentPath(baseConfig(), "content.products.items", "x"),
    ).toBeNull();
    const ok = commandSetContentPath(
      baseConfig(),
      "content.hero.headline",
      "Clean",
    );
    expect(ok?.config.content.hero.headline).toBe("Clean");
  });
});

describe("responsive model", () => {
  it("inherits and resets overrides", () => {
    const value = setResponsiveOverride(48, "mobile", 32);
    expect(
      resolveResponsiveValue(value, "mobile").value,
    ).toBe(32);
    expect(resolveResponsiveValue(value, "mobile").inherited).toBe(false);
    expect(resolveResponsiveValue(value, "tablet").inherited).toBe(true);
    expect(resolveResponsiveValue(value, "desktop").value).toBe(48);

    const reset = resetResponsiveOverride(value, "mobile");
    expect(resolveResponsiveValue(reset, "mobile").inherited).toBe(true);
  });
});

describe("AI actions + safety", () => {
  it("accepts theme restyle and rejects product path", () => {
    const actions = proposeEditorActions(baseConfig(), {
      intent: "restyle",
      direction: "luxurious",
    });
    expect(actions[0]?.type).toBe("setThemePreset");
    const applied = applyEditorAction(baseConfig(), actions[0]!);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.result.config.settings.mood).toBe("luxury");
      expect(inferStoreMood(applied.result.config)).toBe("luxury");
    }

    const unsafe = applyEditorAction(baseConfig(), {
      type: "setContentPath",
      path: "content.products.items",
      value: "hack",
    });
    expect(unsafe.ok).toBe(false);
    expect(
      isProductProtectedAction({
        type: "setContentPath",
        path: "content.products.items",
        value: "x",
      }),
    ).toBe(true);
  });
});

describe("publish + quality", () => {
  it("blocks publish without products and scores with reasons", () => {
    const empty = {
      ...baseConfig(),
      content: {
        ...baseConfig().content,
        products: { title: "Products", items: [] },
      },
      seo: { title: "", description: "", keywords: [] },
    };
    const preflight = runPublishPreflight(empty);
    expect(preflight.ok).toBe(false);
    expect(preflight.errors.some((e) => e.id === "no-products")).toBe(true);

    const score = scoreWebsiteQuality(empty);
    expect(score.total).toBeLessThan(100);
    expect(score.deductions.length).toBeGreaterThan(0);
    expect(score.deductions.every((d) => d.reason.en.length > 0)).toBe(true);
  });

  it("passes when products and brand exist", () => {
    expect(runPublishPreflight(baseConfig()).ok).toBe(true);
  });
});

describe("viewport + keyboard", () => {
  it("resolves viewport widths", () => {
    expect(viewportWidth("390")).toBe(390);
    expect(viewportWidth("1920")).toBe(1920);
    expect(viewportWidth("custom", 1400)).toBe(1400);
  });

  it("maps shortcuts without stealing typing", () => {
    expect(
      resolveEditorKeyCommand(
        { key: "z", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: false, hasSelection: false },
      ),
    ).toBe("undo");
    expect(
      resolveEditorKeyCommand(
        { key: "k", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: false, hasSelection: false },
      ),
    ).toBe("commandPalette");
    expect(
      resolveEditorKeyCommand(
        { key: "Backspace", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: true, hasSelection: true },
      ),
    ).toBeNull();
  });
});

describe("theme presets", () => {
  it("applyDesignPreset changes mood chrome source", () => {
    const next = applyDesignPreset(baseConfig(), "luxury");
    expect(next.settings.mood).toBe("luxury");
    expect(next.brand.colors.background).toBe("#0A0A0A");
  });
});
