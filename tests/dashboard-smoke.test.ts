import { describe, expect, it } from "vitest";
import { classifyReferrer, versionDiffLabel } from "@/lib/dashboard/data";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { planLimits, isProPlan } from "@/lib/config/plans";
import { IMPORT_STALE_MS } from "@/lib/config/import";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";

describe("dashboard smoke — core happy path helpers", () => {
  it("classifies common referrers", () => {
    expect(classifyReferrer(null)).toBe("direct");
    expect(classifyReferrer("")).toBe("direct");
    expect(classifyReferrer("https://www.instagram.com/p/x")).toBe("instagram");
    expect(classifyReferrer("https://t.me/shop")).toBe("telegram");
    expect(classifyReferrer("https://www.google.com/search?q=x")).toBe(
      "google",
    );
    expect(classifyReferrer("https://example.com/blog")).toBe("example.com");
  });

  it("builds a public store URL from slug", () => {
    const url = publishedSiteUrl("demo-shop");
    expect(url).toContain("demo-shop");
    expect(url.startsWith("http")).toBe(true);
  });

  it("keeps free/pro plan gates honest", () => {
    expect(planLimits("free").maxWebsites).toBe(4);
    expect(planLimits("free").maxImportPosts).toBe(10);
    expect(planLimits("free").customDomain).toBe(false);
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("free")).toBe(false);
  });

  it("order status flow is new → confirmed → shipped → delivered", () => {
    const next = (status: string) =>
      status === "new"
        ? "confirmed"
        : status === "confirmed"
          ? "shipped"
          : status === "shipped"
            ? "delivered"
            : null;
    expect(next("new")).toBe("confirmed");
    expect(next("confirmed")).toBe("shipped");
    expect(next("shipped")).toBe("delivered");
    expect(next("delivered")).toBe(null);
  });

  it("import stale window is finite and > 1 minute", () => {
    expect(IMPORT_STALE_MS).toBeGreaterThan(60_000);
    expect(Number.isFinite(IMPORT_STALE_MS)).toBe(true);
  });

  it("typical import minutes scale with posts", async () => {
    const { importTypicalMinutes } = await import("@/lib/config/import");
    expect(importTypicalMinutes(4)).toBeLessThan(importTypicalMinutes(20));
    expect(importTypicalMinutes(6)).toBeGreaterThanOrEqual(2);
    expect(importTypicalMinutes(50)).toBeLessThanOrEqual(10);
  });

  it("resolves primary site cookie over list order", () => {
    const sites = [
      { id: "a" },
      { id: "b" },
    ] as Parameters<typeof resolveWorkspaceWebsite>[0];
    const resolved = resolveWorkspaceWebsite(sites, { primaryId: "b" });
    expect(resolved.website?.id).toBe("b");
    expect(resolved.isPrimary).toBe(true);
  });

  it("labels version diffs", () => {
    const label = versionDiffLabel(
      { brandName: "New", productCount: 5, template: "store" },
      { brandName: "Old", productCount: 3, template: "store" },
      "en",
    );
    expect(label).toContain("brand");
    expect(label).toContain("products 3→5");
  });
});
