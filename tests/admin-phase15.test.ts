import { describe, expect, it, beforeEach } from "vitest";
import {
  resolveDateRange,
  resolveComparisonPeriod,
  dateKeysInRange,
} from "@/lib/admin/dates";
import {
  DASHBOARD_METRIC_SOURCES,
  type MetricResult,
} from "@/lib/admin/contracts";
import {
  getAdminDashboardMetrics,
  getAdminRevenue,
  getAdminSystemHealth,
  getAdminUsers,
  getAdminActivity,
} from "@/lib/admin/queries";
import {
  requireAdminPermission,
  AdminAuthError,
  __resetAdminMemoryForTests,
  __setAdminMemoryForTests,
} from "@/lib/admin/rbac";
import {
  excludeSoftDeleted,
  isSoftDeleted,
} from "@/lib/admin/soft-delete";
import { normalizePlanId, isProPlan, planLimits } from "@/lib/config/plans";

beforeEach(() => {
  __resetAdminMemoryForTests();
});

describe("Admin date ranges", () => {
  const now = new Date("2026-09-15T15:30:00.000Z");

  it("resolves presets in UTC with exclusive end", () => {
    const today = resolveDateRange({ preset: "today", now });
    expect(today.start).toBe("2026-09-15T00:00:00.000Z");
    expect(today.end).toBe("2026-09-16T00:00:00.000Z");

    const week = resolveDateRange({ preset: "7d", now });
    expect(week.start).toBe("2026-09-09T00:00:00.000Z");
    expect(dateKeysInRange(week)).toHaveLength(7);

    const month = resolveDateRange({ preset: "30d", now });
    expect(dateKeysInRange(month)).toHaveLength(30);
  });

  it("builds equal-length comparison periods", () => {
    const current = resolveDateRange({ preset: "7d", now });
    const { previous } = resolveComparisonPeriod(current);
    const curMs = Date.parse(current.end) - Date.parse(current.start);
    const prevMs = Date.parse(previous.end) - Date.parse(previous.start);
    expect(prevMs).toBe(curMs);
    expect(previous.end).toBe(current.start);
  });

  it("validates custom ranges", () => {
    expect(() =>
      resolveDateRange({
        preset: "custom",
        customStart: "2026-09-10T00:00:00.000Z",
        customEnd: "2026-09-01T00:00:00.000Z",
      }),
    ).toThrow(/after/);
  });
});

describe("Admin query authorization", () => {
  it("denies unauthenticated and unauthorized callers", async () => {
    await expect(
      getAdminDashboardMetrics({ userId: "nobody" }),
    ).rejects.toBeInstanceOf(AdminAuthError);

    __setAdminMemoryForTests("support1", "SUPPORT", true);
    await expect(
      getAdminRevenue({ userId: "support1" }),
    ).rejects.toBeInstanceOf(AdminAuthError);

    __setAdminMemoryForTests("inactive", "OWNER", false);
    await expect(
      getAdminUsers({ userId: "inactive" }),
    ).rejects.toBeInstanceOf(AdminAuthError);
  });

  it("allows analyst system.read for dashboard metrics", async () => {
    __setAdminMemoryForTests("analyst1", "ANALYST");
    const metrics = await getAdminDashboardMetrics({
      userId: "analyst1",
      preset: "30d",
    });
    expect(metrics.mrr.status).toBe("unavailable");
    expect(metrics.revenue.status).toBe("unavailable");
    expect(metrics.activeUsers.current.status).toBe("unavailable");
    expect(metrics.range.preset).toBe("30d");
    expect(metrics.comparison.previous.start).toBeTruthy();
  });

  it("returns unavailable revenue without inventing numbers", async () => {
    __setAdminMemoryForTests("owner1", "OWNER");
    const revenue = await getAdminRevenue({ userId: "owner1", preset: "30d" });
    expect(revenue.mrr).toMatchObject({ status: "unavailable" } satisfies Partial<MetricResult<number>>);
    expect(revenue.revenue.status).toBe("unavailable");
  });

  it("gates activity behind audit.read", async () => {
    __setAdminMemoryForTests("ops1", "OPERATIONS");
    await expect(getAdminActivity({ userId: "ops1" })).resolves.toEqual([]);

    __setAdminMemoryForTests("support2", "SUPPORT");
    // SUPPORT has audit.read
    await expect(getAdminActivity({ userId: "support2" })).resolves.toEqual([]);
  });

  it("gates system health behind system.read", async () => {
    __setAdminMemoryForTests("support3", "SUPPORT");
    await expect(
      getAdminSystemHealth({ userId: "support3" }),
    ).rejects.toBeInstanceOf(AdminAuthError);

    __setAdminMemoryForTests("analyst2", "ANALYST");
    const health = await getAdminSystemHealth({ userId: "analyst2" });
    expect(health.openAlerts.status === "unavailable" || health.openAlerts.status === "available").toBe(
      true,
    );
  });
});

describe("Soft-delete product visibility", () => {
  it("excludes soft-deleted rows from product lists", () => {
    const rows = [
      { id: "a", deleted_at: null },
      { id: "b", deleted_at: "2026-09-01T00:00:00.000Z" },
      { id: "c", deletedAt: "2026-09-02T00:00:00.000Z" },
    ];
    expect(excludeSoftDeleted(rows).map((r) => r.id)).toEqual(["a"]);
    expect(isSoftDeleted(rows[1]!)).toBe(true);
  });
});

describe("Plan / entitlement compatibility", () => {
  it("preserves free/pro/business limits", () => {
    expect(normalizePlanId("business")).toBe("business");
    expect(isProPlan("business")).toBe(true);
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(planLimits("business").maxWebsites).toBeGreaterThan(
      planLimits("pro").maxWebsites,
    );
    expect(planLimits("free").maxWebsites).toBe(4);
  });
});

describe("Dashboard metric source map", () => {
  it("documents real sources and unavailable money metrics", () => {
    expect(DASHBOARD_METRIC_SOURCES.mrr.primary).toBe("unavailable");
    expect(DASHBOARD_METRIC_SOURCES.revenue.primary).toBe("unavailable");
    expect(DASHBOARD_METRIC_SOURCES.websitesCreated.fallback).toContain(
      "deleted_at",
    );
  });
});

describe("RBAC still deny-by-default for query permissions", () => {
  it("requireAdminPermission rejects missing permission", async () => {
    __setAdminMemoryForTests("a1", "ANALYST");
    await expect(
      requireAdminPermission("a1", "users.suspend"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
