import { describe, expect, it, beforeEach } from "vitest";
import {
  roleHasPermission,
  permissionsForRole,
  isDestructivePermission,
  ROLE_PERMISSIONS,
} from "@/lib/admin/permissions";
import {
  requireAdminPermission,
  AdminAuthError,
  __resetAdminMemoryForTests,
  __setAdminMemoryForTests,
} from "@/lib/admin/rbac";
import {
  writeAdminAuditLog,
  __clearMemoryAuditForTests,
  __getMemoryAuditForTests,
} from "@/lib/admin/audit";
import {
  recordProductEvent,
  recordSystemEvent,
  sanitizeEventMetadata,
  __clearMemoryEventsForTests,
  __getMemoryProductEventsForTests,
  __getMemorySystemEventsForTests,
} from "@/lib/admin/events";
import {
  recordUsageEvent,
  getUsageCounter,
  currentMonthPeriodKey,
  __clearMemoryUsageForTests,
} from "@/lib/admin/usage";
import {
  getWorkspaceEntitlements,
  canUseFeature,
  getUsageLimit,
  getRemainingUsage,
  normalizePlanId,
} from "@/lib/admin/entitlements";
import {
  recordAiUsage,
  __clearMemoryAiUsageForTests,
  __getMemoryAiUsageForTests,
} from "@/lib/admin/ai-telemetry";
import {
  normalizeJobStatus,
  isTerminalJobStatus,
  computeJobDurationMs,
  buildImportJobObservabilityUpdate,
} from "@/lib/admin/jobs";
import {
  createSoftDeleteMeta,
  softDeleteColumns,
  restoreSoftDeleteColumns,
  isSoftDeleted,
} from "@/lib/admin/soft-delete";
import {
  evaluateAlertThreshold,
  createAlertRule,
  __clearMemoryAlertsForTests,
  __getMemoryAlertsForTests,
} from "@/lib/admin/alerts";
import {
  incrementDailyMetrics,
  __clearMemoryMetricsForTests,
  __getMemoryMetricsForTests,
} from "@/lib/admin/metrics";
import { planLimits, isProPlan } from "@/lib/config/plans";

beforeEach(() => {
  __resetAdminMemoryForTests();
  __clearMemoryAuditForTests();
  __clearMemoryEventsForTests();
  __clearMemoryUsageForTests();
  __clearMemoryAiUsageForTests();
  __clearMemoryAlertsForTests();
  __clearMemoryMetricsForTests();
});

describe("Admin RBAC", () => {
  it("denies by default and grants role permissions", () => {
    expect(roleHasPermission(null, "users.read")).toBe(false);
    expect(roleHasPermission("ANALYST", "users.read")).toBe(true);
    expect(roleHasPermission("ANALYST", "users.suspend")).toBe(false);
    expect(roleHasPermission("SUPPORT", "billing.refund")).toBe(false);
    expect(roleHasPermission("OWNER", "database.write")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "database.write")).toBe(false);
    expect(isDestructivePermission("users.suspend")).toBe(true);
    expect(permissionsForRole("ANALYST").length).toBeGreaterThan(0);
    expect(ROLE_PERMISSIONS.OWNER.length).toBeGreaterThan(
      ROLE_PERMISSIONS.ANALYST.length,
    );
  });

  it("requireAdminPermission enforces server-side", async () => {
    await expect(
      requireAdminPermission(undefined, "audit.read"),
    ).rejects.toBeInstanceOf(AdminAuthError);

    __setAdminMemoryForTests("u1", "ANALYST");
    await expect(
      requireAdminPermission("u1", "users.suspend"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const actor = await requireAdminPermission("u1", "audit.read");
    expect(actor.role).toBe("ANALYST");
  });
});

describe("Admin audit + events", () => {
  it("writes append-only audit entries", async () => {
    __setAdminMemoryForTests("admin-1", "OPERATIONS");
    const actor = await requireAdminPermission("admin-1", "jobs.cancel");
    await writeAdminAuditLog({
      actor,
      action: "JOB_CANCELLED",
      resourceType: "import_job",
      resourceId: "job-1",
      reason: "stuck worker",
    });
    expect(__getMemoryAuditForTests()).toHaveLength(1);
    expect(__getMemoryAuditForTests()[0]?.action).toBe("JOB_CANCELLED");
  });

  it("records product/system events and sanitizes secrets", async () => {
    await recordProductEvent({
      eventName: "import_started",
      workspaceId: "ws-1",
      metadata: { api_key: "secret", posts: 12 },
    });
    await recordSystemEvent({
      eventName: "provider_failure",
      severity: "critical",
      errorCode: "APIFY_DOWN",
    });
    expect(__getMemoryProductEventsForTests()).toHaveLength(1);
    expect(__getMemorySystemEventsForTests()[0]?.severity).toBe("critical");
    expect(sanitizeEventMetadata({ password: "x", ok: 1 })).toEqual({ ok: 1 });
  });
});

describe("Usage + entitlements", () => {
  it("meters usage and computes remaining against plan limits", async () => {
    await recordUsageEvent({
      feature: "ai_generations",
      workspaceId: "ws-1",
      quantity: 3,
    });
    const used = await getUsageCounter({
      workspaceId: "ws-1",
      feature: "ai_generations",
      periodKey: currentMonthPeriodKey(),
    });
    expect(used).toBe(3);

    expect(normalizePlanId("nope")).toBe("free");
    expect(getWorkspaceEntitlements("free").maxWebsites).toBe(4);
    expect(canUseFeature("free", "custom_domains")).toBe(false);
    expect(canUseFeature("pro", "custom_domains")).toBe(true);
    expect(getUsageLimit("pro", "max_ai_generations")).toBe(500);
    expect(
      getRemainingUsage({
        plan: "free",
        feature: "max_ai_generations",
        used: 5,
      }),
    ).toBe(15);

    // Backward-compatible planLimits facade
    expect(planLimits("free").maxImportPosts).toBe(12);
    expect(planLimits("business").maxWebsites).toBe(100);
    expect(isProPlan("business")).toBe(true);
    expect(isProPlan("free")).toBe(false);
  });
});

describe("AI telemetry + jobs + soft-delete + alerts + metrics", () => {
  it("records AI usage lifecycle", async () => {
    await recordAiUsage({
      feature: "import_analyze",
      status: "started",
      workspaceId: "ws-1",
    });
    await recordAiUsage({
      feature: "import_analyze",
      status: "completed",
      workspaceId: "ws-1",
      inputTokens: 10,
      outputTokens: 20,
    });
    const rows = __getMemoryAiUsageForTests();
    expect(rows).toHaveLength(2);
    expect(rows[1]?.status).toBe("completed");
  });

  it("normalizes job observability", () => {
    expect(normalizeJobStatus("scraping")).toBe("running");
    expect(isTerminalJobStatus("failed")).toBe(true);
    expect(computeJobDurationMs("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:01.000Z")).toBe(
      1000,
    );
    const patch = buildImportJobObservabilityUpdate({
      status: "completed",
      durationMs: 1200,
      attempt: 1,
    });
    expect(patch.status).toBe("completed");
    expect(patch.duration_ms).toBe(1200);
    expect(patch.retry_count).toBe(1);
  });

  it("builds soft-delete metadata", () => {
    const meta = createSoftDeleteMeta({ deletedBy: "u1", reason: "spam" });
    expect(softDeleteColumns(meta).deleted_at).toBeTruthy();
    expect(isSoftDeleted({ deleted_at: meta.deletedAt })).toBe(true);
    expect(restoreSoftDeleteColumns().deleted_at).toBeNull();
  });

  it("evaluates alert thresholds and stores rules", async () => {
    expect(
      evaluateAlertThreshold({
        metric: "ai_error_rate",
        value: 0.08,
        operator: "gt",
        threshold: 0.05,
      }),
    ).toBe(true);
    await createAlertRule({
      name: "AI errors",
      metric: "ai_error_rate",
      operator: "gt",
      threshold: 0.05,
      severity: "critical",
    });
    expect(__getMemoryAlertsForTests().rules).toHaveLength(1);
  });

  it("increments daily metrics", async () => {
    await incrementDailyMetrics({
      date: "2026-09-15",
      increments: { imports: 2, successful_imports: 1 },
    });
    await incrementDailyMetrics({
      date: "2026-09-15",
      increments: { imports: 1 },
    });
    expect(__getMemoryMetricsForTests().get("2026-09-15")?.imports).toBe(3);
  });
});
