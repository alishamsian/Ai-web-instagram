import { describe, expect, it } from "vitest";
import { buildAnalyticsInsights } from "@/lib/dashboard/analytics-insights";
import { buildNextActions } from "@/lib/dashboard/ops";
import type { WebsiteRecord } from "@/types/website";

const site = {
  id: "site-1",
  slug: "demo",
  status: "draft",
  config: { brand: { name: "Demo" } },
} as unknown as WebsiteRecord;

describe("buildNextActions", () => {
  it("prioritizes new orders and missing prices", () => {
    const actions = buildNextActions({
      locale: "fa",
      website: { ...site, status: "published" } as WebsiteRecord,
      freshNewOrders: 2,
      productsCount: 4,
      productsMissingPrice: 3,
      hasImport: true,
      channels: [],
      failedPublishCount: 1,
    });
    expect(actions[0]?.id).toBe("orders");
    expect(actions.some((a) => a.id === "queue-fail")).toBe(true);
    expect(actions.some((a) => a.id === "prices")).toBe(true);
  });
});

describe("buildAnalyticsInsights", () => {
  it("suggests sharing when there are no visits", () => {
    const insights = buildAnalyticsInsights({
      total: 0,
      series: [],
      byReferrer: [],
      topProductViews: 0,
      publishedCount: 1,
      locale: "fa",
    });
    expect(insights[0]?.id).toBe("share");
  });

  it("detects growth vs prior window", () => {
    const insights = buildAnalyticsInsights({
      total: 40,
      series: [
        { date: "2026-09-01", count: 2 },
        { date: "2026-09-02", count: 2 },
        { date: "2026-09-03", count: 2 },
        { date: "2026-09-04", count: 10 },
        { date: "2026-09-05", count: 10 },
        { date: "2026-09-06", count: 12 },
      ],
      byReferrer: [{ source: "instagram", count: 20 }],
      topProductViews: 5,
      publishedCount: 1,
      locale: "en",
    });
    expect(insights.some((i) => i.id === "growth" || i.id === "source")).toBe(
      true,
    );
  });
});
