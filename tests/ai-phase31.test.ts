/**
 * Phase 3.1 — AI Co-Designer hardening tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import { routePromptToIntent } from "@/lib/editor/ai/intents";
import {
  mergeTrustedDraftHints,
  buildDraftHintsFromConfig,
} from "@/lib/editor/ai/draft";
import { assertProposalFresh } from "@/lib/editor/ai/freshness";
import { validateEditorActions } from "@/lib/editor/ai/validator";
import { executeAiActionBatch } from "@/lib/editor/ai/executor";
import { applyEditorAction } from "@/lib/editor/actions";
import { isProductProtectedAction } from "@/lib/editor/ai";
import {
  pushHistory,
  undoHistory,
  redoHistory,
  createHistoryEntry,
} from "@/lib/editor/history";
import { cloneWebsiteConfig } from "@/lib/editor/types";
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
        headline: "عنوان خیلی خیلی طولانی برای تست کوتاه‌سازی هیرو در فاز سه یک",
        subheadline: "توضیح",
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
      services: { title: "خدمات", items: [] },
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true },
      { id: "services-1", type: "services", visible: true },
      { id: "gallery-1", type: "gallery", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    seo: { title: "نور", description: "فروشگاه", keywords: [] },
    settings: {
      language: "fa",
      direction: "rtl",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

describe("selection-aware deterministic routing", () => {
  it("Hero selected + shorten → shorten_hero", () => {
    const routed = routePromptToIntent({
      prompt: "کوتاه‌ترش کن",
      locale: "fa",
      hasSelection: true,
      selectedSectionType: "hero",
    });
    expect(routed.kind).toBe("deterministic");
    if (routed.kind === "deterministic") {
      expect(routed.request.intent).toBe("shorten_hero");
    }
  });

  it("Services selected + shorten → does NOT silently shorten hero", () => {
    const routed = routePromptToIntent({
      prompt: "کوتاه‌ترش کن",
      locale: "fa",
      hasSelection: true,
      selectedSectionType: "services",
    });
    expect(routed.kind).not.toBe("deterministic");
    expect(["llm", "clarify"]).toContain(routed.kind);
  });

  it("Gallery selected + improve → llm or clarify, not hero CTA", () => {
    const routed = routePromptToIntent({
      prompt: "این رو بهتر کن",
      locale: "fa",
      hasSelection: true,
      selectedSectionType: "gallery",
    });
    expect(routed.kind).toBe("llm");
  });

  it("No selection + ambiguous → clarify", () => {
    const routed = routePromptToIntent({
      prompt: "این رو بهتر کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("clarify");
  });

  it("Explicit hero reference → shorten_hero", () => {
    const routed = routePromptToIntent({
      prompt: "عنوان هیرو رو کوتاه‌تر کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("deterministic");
    if (routed.kind === "deterministic") {
      expect(routed.request.intent).toBe("shorten_hero");
    }
  });

  it("No selection + generic shorten → clarify", () => {
    const routed = routePromptToIntent({
      prompt: "کوتاهش کن",
      locale: "fa",
      hasSelection: false,
    });
    expect(routed.kind).toBe("clarify");
  });
});

describe("server-authoritative draft hints", () => {
  it("overlays allowlisted content without trusting full client config", () => {
    const server = baseConfig();
    const merged = mergeTrustedDraftHints(server, {
      contentPaths: [
        { path: "content.hero.headline", value: "پیش‌نویس ذخیره‌نشده" },
      ],
      brandColors: { primary: "#111111" },
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.config.content.hero.headline).toBe("پیش‌نویس ذخیره‌نشده");
    expect(merged.config.brand.colors.primary).toBe("#111111");
    // Product data untouched
    expect(merged.config.content.products?.items?.[0]?.price).toBe(100000);
  });

  it("rejects product price draft paths", () => {
    const merged = mergeTrustedDraftHints(baseConfig(), {
      contentPaths: [
        { path: "content.products.items", value: "hack" },
      ],
    });
    expect(merged.ok).toBe(false);
  });

  it("buildDraftHintsFromConfig never includes product items", () => {
    const hints = buildDraftHintsFromConfig(baseConfig());
    const blob = JSON.stringify(hints);
    expect(blob.includes("100000")).toBe(false);
    expect(blob.includes("products.items")).toBe(false);
  });
});

describe("proposal freshness / race", () => {
  it("allows apply when revisions match", () => {
    expect(
      assertProposalFresh({
        proposal: { baseVersion: 3, localRevision: 7 },
        currentLocalRevision: 7,
        currentServerVersion: 3,
      }).ok,
    ).toBe(true);
  });

  it("rejects stale local revision after manual edit", () => {
    const result = assertProposalFresh({
      proposal: { baseVersion: 3, localRevision: 7 },
      currentLocalRevision: 8,
      currentServerVersion: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("STALE_PROPOSAL");
  });

  it("rejects server version conflict", () => {
    const result = assertProposalFresh({
      proposal: { baseVersion: 3, localRevision: 7 },
      currentLocalRevision: 7,
      currentServerVersion: 4,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VERSION_CONFLICT");
  });

  it("propose path does not mutate original config object", () => {
    const config = baseConfig();
    const before = cloneWebsiteConfig(config);
    const batch = executeAiActionBatch({
      config,
      actions: [
        {
          type: "setContentPath",
          path: "content.hero.cta",
          value: "مشاهده مجموعه",
        },
      ],
    });
    expect(batch.ok).toBe(true);
    // Original untouched until client Apply
    expect(config.content.hero.cta).toBe(before.content.hero.cta);
  });
});

describe("product / fabricated claim protection", () => {
  it("rejects product price content path", () => {
    expect(
      isProductProtectedAction({
        type: "setContentPath",
        path: "content.products.items",
        value: "1",
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

  it("rejects award-winning SEO claims", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "setSeoField",
      field: "title",
      value: "Award winning shop",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects fabricated social proof in content", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "setContentPath",
      path: "content.hero.subheadline",
      value: "Loved by 10,000 customers with 5-star ratings",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects nested product settings patch", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "patchSectionSettings",
      sectionId: "services-1",
      patch: { price: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown settings keys", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "patchSectionSettings",
      sectionId: "services-1",
      patch: { arbitraryNested: { evil: true } as unknown as string },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid reorder indexes", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "reorderSections",
      fromIndex: -1,
      toIndex: 99,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown section type add", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "addSection",
      sectionType: "not-real" as WebsiteConfig["sections"][number]["type"],
    });
    expect(result.ok).toBe(false);
  });
});

describe("AI history transaction", () => {
  it("one batch = one undo restores exact previous config", () => {
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
      label: "AI Edit: luxury shorten",
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

    const undone = undoHistory({ entries, index });
    expect(undone.config?.content.hero.cta).toBe("خرید");
    expect(undone.config?.brand.colors.primary).toBe("#C9A227");

    const redone = redoHistory({ entries, index: undone.index });
    expect(redone.config?.content.hero.cta).toBe("مشاهده مجموعه");
    expect(redone.config?.brand.colors.primary).toBe("#111111");
  });
});

describe("edge cases", () => {
  it("rejects oversized action arrays", () => {
    const actions = Array.from({ length: 20 }, () => ({
      type: "setBrandColor" as const,
      key: "primary" as const,
      value: "#111111",
    }));
    expect(validateEditorActions(baseConfig(), actions).ok).toBe(false);
  });

  it("rejects extremely long content values", () => {
    const result = applyEditorAction(baseConfig(), {
      type: "setContentPath",
      path: "content.hero.headline",
      value: "x".repeat(5000),
    });
    expect(result.ok).toBe(false);
  });
});
