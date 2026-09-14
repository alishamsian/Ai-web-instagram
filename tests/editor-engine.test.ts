import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  createHistoryEntry,
  commandToggleSection,
  commandDuplicateSection,
  commandDeleteSection,
  commandMoveSection,
  commandReorderSections,
  commandReorderSectionRelative,
  commandAddSection,
  commandApplyTemplate,
  commandApplyThemePreset,
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
  pinFooterLast,
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
import { applyTemplate } from "@/components/editor/editor-utils";
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
      { id: "hero-1", type: "hero", visible: true, settings: { spacing: "comfortable" } },
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

  it("keeps a single history entry per push and supports multi-step undo", () => {
    let entries = [createHistoryEntry(baseConfig(), "Initial")];
    let index = 0;

    const a = commandApplyThemePreset(baseConfig(), "luxury");
    const pushA = pushHistory({
      entries,
      index,
      next: a.config,
      label: a.label,
    });
    entries = pushA.entries;
    index = pushA.index;

    const b = commandSetContentPath(a.config, "content.hero.headline", "Lux");
    expect(b).not.toBeNull();
    const pushB = pushHistory({
      entries,
      index,
      next: b!.config,
      label: b!.label,
    });
    entries = pushB.entries;
    index = pushB.index;
    expect(entries).toHaveLength(3);

    const u1 = undoHistory({ entries, index });
    index = u1.index;
    expect(u1.config?.content.hero.headline).toBe("Aura");
    const u2 = undoHistory({ entries, index });
    expect(u2.config?.settings.mood).not.toBe("luxury");
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
    expect(dup?.selectedSectionId).toBeTruthy();
    expect(dup?.config.sections.at(-1)?.type).toBe("footer");

    const reordered = commandReorderSections(config, 0, 2);
    expect(reordered?.config.sections.at(-1)?.type).toBe("footer");
  });

  it("protects footer from delete and duplicate", () => {
    expect(commandDeleteSection(baseConfig(), "footer-1")).toBeNull();
    expect(commandDuplicateSection(baseConfig(), "footer-1")).toBeNull();
    expect(commandMoveSection(baseConfig(), "footer-1", "up")).toBeNull();
  });

  it("clears selection on delete and selects on duplicate/add", () => {
    const deleted = commandDeleteSection(baseConfig(), "products-1");
    expect(deleted?.selectedSectionId).toBeNull();

    const dup = commandDuplicateSection(baseConfig(), "hero-1");
    expect(dup?.selectedSectionId).toMatch(/^hero-/);
    expect(dup?.config.sections.filter((s) => s.type === "hero")).toHaveLength(2);

    const added = commandAddSection(baseConfig(), "about", {
      afterSectionId: "hero-1",
    });
    expect(added?.selectedSectionId).toBeTruthy();
    const ids = added!.config.sections.map((s) => s.id);
    expect(ids.indexOf(added!.selectedSectionId!)).toBeGreaterThan(
      ids.indexOf("hero-1"),
    );
    expect(added!.config.sections.at(-1)?.type).toBe("footer");
  });

  it("reorders relatively and keeps footer last", () => {
    const relative = commandReorderSectionRelative(
      baseConfig(),
      "products-1",
      "hero-1",
      "before",
    );
    expect(relative?.config.sections[0]?.id).toBe("products-1");
    expect(relative?.config.sections.at(-1)?.type).toBe("footer");
    expect(relative?.selectedSectionId).toBe("products-1");

    expect(
      commandReorderSectionRelative(baseConfig(), "footer-1", "hero-1", "before"),
    ).toBeNull();
    expect(commandReorderSections(baseConfig(), 2, 0)).toBeNull();
  });

  it("rejects unknown section types and invalid ids", () => {
    expect(
      commandAddSection(baseConfig(), "not-a-section" as never),
    ).toBeNull();
    expect(commandDeleteSection(baseConfig(), "missing")).toBeNull();
    expect(commandToggleSection(baseConfig(), "missing")).toBeNull();
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

describe("templates + presets", () => {
  it("applies template without losing section settings and keeps unique ids", () => {
    const next = applyTemplate(baseConfig(), "portfolio");
    const hero = next.sections.find((s) => s.type === "hero");
    expect(hero?.settings?.spacing).toBe("comfortable");
    expect(next.template).toBe("portfolio");
    expect(next.content.hero.headline).toBe("Aura");
    const ids = next.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);

    const cmd = commandApplyTemplate(baseConfig(), "creator");
    expect(cmd.config.template).toBe("creator");
    const pushed = pushHistory({
      entries: [createHistoryEntry(baseConfig(), "Initial")],
      index: 0,
      next: cmd.config,
      label: cmd.label,
    });
    const undone = undoHistory({
      entries: pushed.entries,
      index: pushed.index,
    });
    expect(undone.config?.template).toBe("store");
  });

  it("preserves content when applying design presets", () => {
    const next = applyDesignPreset(baseConfig(), "luxury");
    expect(next.content.hero.headline).toBe("Aura");
    expect(next.content.products?.items[0]?.name).toBe("Serum");
    expect(next.settings.mood).toBe("luxury");
    expect(next.brand.design?.radius).toBe("sharp");

    const viaCommand = commandApplyThemePreset(baseConfig(), "soft");
    expect(viaCommand.config.brand.colors.background).not.toBe(
      baseConfig().brand.colors.background,
    );
    expect(viaCommand.config.content.hero.cta).toBe("Shop");
  });
});

describe("responsive model", () => {
  it("inherits and resets overrides", () => {
    const value = setResponsiveOverride(48, "mobile", 32);
    expect(resolveResponsiveValue(value, "mobile").value).toBe(32);
    expect(resolveResponsiveValue(value, "mobile").inherited).toBe(false);
    expect(resolveResponsiveValue(value, "tablet").inherited).toBe(true);
    expect(resolveResponsiveValue(value, "desktop").value).toBe(48);

    const reset = resetResponsiveOverride(value, "mobile");
    expect(resolveResponsiveValue(reset, "mobile").inherited).toBe(true);
  });

  it("keeps tablet override separate from mobile", () => {
    let value = setResponsiveOverride(20, "tablet", 18);
    value = setResponsiveOverride(value, "mobile", 14);
    expect(resolveResponsiveValue(value, "desktop").value).toBe(20);
    expect(resolveResponsiveValue(value, "tablet").value).toBe(18);
    expect(resolveResponsiveValue(value, "mobile").value).toBe(14);
    const resetTablet = resetResponsiveOverride(value, "tablet");
    expect(resolveResponsiveValue(resetTablet, "tablet").value).toBe(20);
    expect(resolveResponsiveValue(resetTablet, "mobile").value).toBe(14);
  });
});

describe("pinFooterLast", () => {
  it("moves footers to the end", () => {
    const pinned = pinFooterLast([
      { id: "f", type: "footer", visible: true },
      { id: "h", type: "hero", visible: true },
    ]);
    expect(pinned.map((s) => s.type)).toEqual(["hero", "footer"]);
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
        { key: "d", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false },
        { typing: false, hasSelection: true },
      ),
    ).toBe("duplicateSection");
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
