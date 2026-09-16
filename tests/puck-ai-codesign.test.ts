/**
 * Phase 3 — AI Co-Designer tests (schema, validation, intents, transactions).
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  proposeEditorActions,
  isProductProtectedAction,
} from "@/lib/editor/ai";
import { routePromptToIntent } from "@/lib/editor/ai/intents";
import { buildAiEditorContext } from "@/lib/editor/ai/context";
import { parseAiActionsPayload } from "@/lib/editor/ai/schema";
import { validateEditorActions } from "@/lib/editor/ai/validator";
import { executeAiActionBatch } from "@/lib/editor/ai/executor";
import { applyEditorAction } from "@/lib/editor/actions";
import {
  pushHistory,
  undoHistory,
  createHistoryEntry,
} from "@/lib/editor/history";
import { websiteConfigToPuck, puckToWebsiteConfig } from "@/lib/puck";
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
      name: "نور",
      colors: {
        primary: "#C9A227",
        secondary: "#FFFFFF",
        accent: "#C9A227",
        background: "#FFFFFF",
        foreground: "#111111",
        muted: "#F5F5F5",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "overlay",
        headline:
          "این یک عنوان خیلی خیلی طولانی برای تست کوتاه‌سازی هیرو است که باید truncate شود",
        subheadline:
          "توضیح بلند برای موبایل که باید در tighten_mobile_copy کوتاه شود و بیش از هشتاد کاراکتر باشد تا تغییر اعمال گردد",
        cta: "خرید",
      },
      products: {
        title: "محصولات",
        items: [
          {
            name: "سرم",
            description: "روزانه",
            category: "care",
            price: 100000,
            currency: "IRT",
            imageIds: [],
            confidence: 0.9,
          },
        ],
        defaults: { category: "care", currency: "IRT" },
      },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true, variant: "overlay" },
      { id: "products-1", type: "products", visible: true },
      { id: "services-1", type: "services", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "نور", description: "فروشگاه", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
      vertical: "beauty",
    },
    media: {},
  };
}

describe("deterministic AI intents", () => {
  it("shorten_hero produces content path actions", () => {
    const actions = proposeEditorActions(baseConfig(), {
      intent: "shorten_hero",
    });
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((a) => a.type === "setContentPath")).toBe(true);
  });

  it("restyle luxury maps to theme preset", () => {
    const actions = proposeEditorActions(baseConfig(), {
      intent: "restyle",
      direction: "luxurious",
    });
    expect(actions[0]).toEqual({
      type: "setThemePreset",
      presetId: "luxury",
    });
  });

  it("set_primary_black updates brand colors", () => {
    const actions = proposeEditorActions(baseConfig(), {
      intent: "set_primary_black",
    });
    let config = baseConfig();
    for (const action of actions) {
      const applied = applyEditorAction(config, action);
      expect(applied.ok).toBe(true);
      if (applied.ok) config = applied.result.config;
    }
    expect(config.brand.colors.primary).toBe("#111111");
  });
});

describe("prompt routing", () => {
  it("routes FA luxury prompt deterministically", () => {
    const routed = routePromptToIntent({
      prompt: "این صفحه رو لوکس‌تر کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("deterministic");
    if (routed.kind === "deterministic") {
      expect(routed.request.intent).toBe("restyle");
      expect(routed.request.direction).toBe("luxurious");
    }
  });

  it("routes black buttons deterministically", () => {
    const routed = routePromptToIntent({
      prompt: "رنگ دکمه‌ها رو مشکی کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("deterministic");
    if (routed.kind === "deterministic") {
      expect(routed.request.intent).toBe("set_primary_black");
    }
  });

  it("asks for clarification on vague short prompt", () => {
    const routed = routePromptToIntent({
      prompt: "این رو بهتر کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("clarify");
  });
});

describe("context building", () => {
  it("excludes product item prices from context", () => {
    const ctx = buildAiEditorContext({
      config: baseConfig(),
      selectedSectionId: "products-1",
      locale: "fa",
    });
    expect(ctx.selectedSection?.relevantContent).toEqual(
      expect.objectContaining({ title: "محصولات", itemCount: 1 }),
    );
    expect(
      JSON.stringify(ctx).includes("100000"),
    ).toBe(false);
  });
});

describe("AI action schema + validation", () => {
  it("rejects invalid actions", () => {
    const parsed = parseAiActionsPayload(
      {
        summary: "bad",
        actions: [{ type: "setContentPath", path: 1, value: "x" }],
      },
      baseConfig(),
    );
    expect(parsed.ok).toBe(false);
  });

  it("rejects product-protected mutations", () => {
    expect(
      isProductProtectedAction({
        type: "setContentPath",
        path: "content.products.items",
        value: "x",
      }),
    ).toBe(true);

    const validated = validateEditorActions(baseConfig(), [
      {
        type: "setContentPath",
        path: "content.products.items",
        value: "hack",
      },
    ]);
    expect(validated.ok).toBe(false);
  });

  it("accepts safe content rewrite batch", () => {
    const validated = validateEditorActions(baseConfig(), [
      {
        type: "setContentPath",
        path: "content.hero.headline",
        value: "نور",
      },
      {
        type: "setBrandColor",
        key: "primary",
        value: "#111111",
      },
    ]);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.proposedConfig.content.hero.headline).toBe("نور");
      expect(validated.proposedConfig.brand.colors.primary).toBe("#111111");
    }
  });

  it("rejects unknown section types in addSection", () => {
    const parsed = parseAiActionsPayload(
      {
        summary: "add",
        actions: [{ type: "addSection", sectionType: "not-a-real-section" }],
      },
      baseConfig(),
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("AI transaction + undo", () => {
  it("applies multiple actions as one history entry", () => {
    const config = baseConfig();
    const batch = executeAiActionBatch({
      config,
      actions: [
        {
          type: "setContentPath",
          path: "content.hero.cta",
          value: "مشاهده مجموعه",
        },
        {
          type: "setBrandColor",
          key: "primary",
          value: "#111111",
        },
      ],
      label: "AI Edit: test",
    });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;

    let entries = [createHistoryEntry(config, "Initial")];
    let index = 0;
    const pushed = pushHistory({
      entries,
      index,
      next: batch.config,
      label: batch.label,
    });
    entries = pushed.entries;
    index = pushed.index;
    expect(entries).toHaveLength(2);
    expect(entries[1]?.label).toBe("AI Edit: test");

    const undone = undoHistory({ entries, index });
    expect(undone.config?.content.hero.cta).toBe("خرید");
    expect(undone.config?.brand.colors.primary).toBe("#C9A227");
  });
});

describe("Puck projection after AI", () => {
  it("round-trips WebsiteConfig after AI batch", () => {
    const config = baseConfig();
    const batch = executeAiActionBatch({
      config,
      actions: proposeEditorActions(config, {
        intent: "shorten_hero",
      }),
    });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;
    const puck = websiteConfigToPuck(batch.config);
    const restored = puckToWebsiteConfig(puck, batch.config);
    expect(restored.content.hero.headline).toBe(
      batch.config.content.hero.headline,
    );
  });

  it("preserves unknown sections through AI-adjacent flow", () => {
    const config = baseConfig();
    config.sections.splice(1, 0, {
      id: "mystery-1",
      type: "totally-unknown-section" as WebsiteConfig["sections"][number]["type"],
      visible: true,
    });
    const batch = executeAiActionBatch({
      config,
      actions: [{ type: "setThemePreset", presetId: "minimal" }],
    });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;
    expect(
      batch.config.sections.some((s) => s.id === "mystery-1"),
    ).toBe(true);
  });
});
