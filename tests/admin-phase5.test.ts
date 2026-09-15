import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildErrorFingerprint,
  newCorrelationId,
} from "@/lib/admin/observability";
import {
  isRetryableErrorCode,
  OPS_RETRY,
  OPS_THRESHOLDS_MS,
  staleThresholdMs,
} from "@/lib/admin/ops-thresholds";
import { roleHasPermission } from "@/lib/admin/permissions";
import { STALE_JOB_THRESHOLDS_MS } from "@/lib/admin/phase4-queries";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Admin Phase 5 — operations & security", () => {
  it("migration is additive with error groups, cron_runs, security_events", () => {
    const sql = read("supabase/migrations/20260916050000_admin_phase5.sql");
    expect(sql).toMatch(/admin_error_groups/);
    expect(sql).toMatch(/cron_runs/);
    expect(sql).toMatch(/security_events/);
    expect(sql).toMatch(/revoke all on public\.admin_error_groups from anon, authenticated/);
    expect(sql).toMatch(/acknowledged/);
    expect(sql).not.toMatch(/drop table/i);
  });

  it("error fingerprint is deterministic and ignores volatile ids", () => {
    const a = buildErrorFingerprint({
      source: "import",
      errorCode: "TIMEOUT",
      message: "failed job 123 uuid 11111111-1111-4111-8111-111111111111",
    });
    const b = buildErrorFingerprint({
      source: "import",
      errorCode: "TIMEOUT",
      message: "failed job 999 uuid 22222222-2222-4222-8222-222222222222",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  it("correlation ids are UUIDs without secrets", () => {
    const id = newCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("retry policy marks auth/validation as non-retryable", () => {
    expect(isRetryableErrorCode("UNAUTHORIZED")).toBe(false);
    expect(isRetryableErrorCode("VALIDATION")).toBe(false);
    expect(isRetryableErrorCode("TIMEOUT")).toBe(true);
    expect(OPS_RETRY.defaultMaxAttempts).toBeGreaterThan(0);
  });

  it("stale thresholds are centralized", () => {
    expect(STALE_JOB_THRESHOLDS_MS.defaultQueued).toBe(OPS_THRESHOLDS_MS.defaultQueued);
    expect(staleThresholdMs({ status: "queued" })).toBe(OPS_THRESHOLDS_MS.defaultQueued);
    expect(
      staleThresholdMs({ status: "running", jobType: "instagram_import" }),
    ).toBe(OPS_THRESHOLDS_MS.importAnalyze);
  });

  it("ANALYST cannot cancel or manage system; OPERATIONS can cancel", () => {
    expect(roleHasPermission("ANALYST", "jobs.cancel")).toBe(false);
    expect(roleHasPermission("ANALYST", "system.manage")).toBe(false);
    expect(roleHasPermission("OPERATIONS", "jobs.cancel")).toBe(true);
    expect(roleHasPermission("OPERATIONS", "system.manage")).toBe(false);
    expect(roleHasPermission("OWNER", "system.manage")).toBe(true);
  });

  it("cancel job action is permissioned, audited, and status-conditional", () => {
    const src = read("lib/admin/phase5-actions.ts");
    expect(src).toMatch(/jobs\.cancel/);
    expect(src).toMatch(/JOB_CANCELLED/);
    expect(src).toMatch(/queued.*retrying|in\("status", \["queued", "retrying"\]\)/);
    expect(src).toMatch(/writeAdminAuditLog/);
  });

  it("incident transitions require system.manage and audit", () => {
    const src = read("lib/admin/phase5-actions.ts");
    expect(src).toMatch(/system\.manage/);
    expect(src).toMatch(/INCIDENT_UPDATED/);
    expect(src).toMatch(/acknowledged/);
  });

  it("security and error center pages exist", () => {
    expect(existsSync(join(root, "app/[locale]/admin/security/page.tsx"))).toBe(
      true,
    );
    expect(read("app/[locale]/admin/errors/page.tsx")).toMatch(
      /getAdminErrorGroups/,
    );
    expect(read("components/admin/nav.ts")).toMatch(/href: "\/security"/);
  });

  it("webhooks remain honest unavailable without delivery telemetry", () => {
    const src = read("app/[locale]/admin/webhooks/page.tsx");
    expect(src).toMatch(/MetricUnavailable|telemetry/);
    expect(src).not.toMatch(/success_rate\s*=\s*100|Math\.random/);
  });

  it("dashboard stays bounded and isolates ops signals", () => {
    const page = read("app/[locale]/admin/dashboard/page.tsx");
    expect(page).toMatch(/getAdminDashboardKpisLite/);
    expect(page).toMatch(/getAdminOpsDashboardSignals/);
    expect(page).toMatch(/settledValue|Promise\.allSettled/);
    expect(page).not.toMatch(/ai_usage_logs/);
  });

  it("cron workers record cron_runs", () => {
    expect(read("app/api/jobs/process/route.ts")).toMatch(/recordCronRun/);
    expect(read("app/api/publishing/process-due/route.ts")).toMatch(
      /recordCronRun/,
    );
  });

  it("phase5 docs exist", () => {
    expect(existsSync(join(root, "docs/admin-phase5.md"))).toBe(true);
  });
});
