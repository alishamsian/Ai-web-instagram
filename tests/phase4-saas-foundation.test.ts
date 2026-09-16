import { describe, expect, it, vi, beforeEach } from "vitest";
import { hasOptimisticVersionConflict } from "@/lib/website/optimistic-version";
import { isReservedSlug } from "@/lib/website/slug";
import { runPublishPreflight } from "@/lib/editor/validation";
import { sanitizeEventMetadata } from "@/lib/admin/events";
import type { WebsiteConfig } from "@/types/website";

vi.mock("@/lib/billing/entitlements-resolver", () => ({
  resolveWorkspaceEntitlements: vi.fn(async () => ({
    plan: "free",
    maxAiGenerations: 0,
  })),
}));

vi.mock("@/lib/admin/usage", () => ({
  getUsageCounter: vi.fn(async () => 10),
}));

vi.mock("@/lib/admin/entitlements", () => ({
  getRemainingUsage: vi.fn(() => 0),
}));

describe("phase4 production SaaS foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects optimistic version conflicts", () => {
    expect(hasOptimisticVersionConflict(3, 4)).toBe(true);
    expect(hasOptimisticVersionConflict(4, 4)).toBe(false);
    expect(hasOptimisticVersionConflict(undefined, 4)).toBe(false);
  });

  it("blocks reserved public slugs", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("www")).toBe(true);
    expect(isReservedSlug("my-shop")).toBe(false);
  });

  it("rejects publish preflight without brand/products", () => {
    const empty = {
      template: "store",
      brand: {
        name: "",
        logo: null,
        colors: {
          primary: "#000",
          secondary: "#fff",
          accent: "#111",
          background: "#fff",
          foreground: "#000",
          muted: "#eee",
        },
        typography: { heading: "sans", body: "sans", scale: "compact" },
      },
      content: {
        hero: {
          style: "minimal",
          headline: "",
          subheadline: "",
          cta: "",
        },
        products: { items: [] },
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
    } as unknown as WebsiteConfig;

    const result = runPublishPreflight(empty);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.id === "no-brand")).toBe(true);
  });

  it("strips prompts and secrets from analytics metadata", () => {
    const clean = sanitizeEventMetadata({
      feature: "editor_co_design",
      prompt: "full user prompt must not leak",
      api_key: "sk-secret",
      tokens: 12,
    });
    expect(clean.prompt).toBeUndefined();
    expect(clean.api_key).toBeUndefined();
    expect(clean.feature).toBe("editor_co_design");
    expect(clean.tokens).toBe(12);
  });

  it("enforces AI quota when remaining is zero", async () => {
    const { assertAiGenerationAllowed } = await import(
      "@/lib/billing/ai-quota"
    );
    const result = await assertAiGenerationAllowed({
      workspaceId: "ws_test",
      workspacePlan: "free",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AI_QUOTA_EXCEEDED");
      expect(result.remaining).toBe(0);
    }
  });
});
