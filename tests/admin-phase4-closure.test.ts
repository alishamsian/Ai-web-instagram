import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { roleHasPermission } from "@/lib/admin/permissions";
import { metricDisplay } from "@/components/admin/format";
import type { MetricResult } from "@/lib/admin/contracts";
import {
  LATENCY_P50_MIN_SAMPLES,
  LATENCY_P95_MIN_SAMPLES,
  LATENCY_P99_MIN_SAMPLES,
} from "@/lib/admin/phase4-anomalies";
import { sanitizeAiErrorMessage } from "@/lib/admin/phase4-queries";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Admin Phase 4 closure — crash / honesty hardening", () => {
  it("Founder Dashboard uses lite KPI + strip only (no heavy AI scans)", () => {
    const page = read("app/[locale]/admin/dashboard/page.tsx");
    expect(page).toMatch(/getAdminDashboardKpisLite/);
    expect(page).toMatch(/getAdminDashboardSystemStrip/);
    expect(page).toMatch(/settledValue|Promise\.allSettled/);
    expect(page).not.toMatch(/getAdminAiOverview|detectAiAnomalies|getAdminInfrastructureOverview/);
    expect(page).not.toMatch(/ai_usage_logs/);

    const lite = read("lib/admin/dashboard-lite.ts");
    expect(lite).toMatch(/head: true/);
    expect(lite).toMatch(/intentionally deferred/);
    expect(lite).not.toMatch(/limit\(5000\)/);

    const strip = read("lib/admin/dashboard-strip.ts");
    expect(strip).toMatch(/limit\(100\)/);
    expect(strip).toMatch(/never scans ai_usage_logs/);
    expect(strip).not.toMatch(/\.from\(["']ai_usage_logs["']\)/);
  });

  it("unavailable metrics are not displayed as zero", () => {
    const zero: MetricResult<number> = {
      status: "available",
      value: 0,
      source: "t",
    };
    const miss: MetricResult<number> = {
      status: "unavailable",
      reason: "no telemetry",
    };
    const zeroDisplay = metricDisplay(zero);
    const missDisplay = metricDisplay(miss);
    expect(zeroDisplay.kind).toBe("value");
    if (zeroDisplay.kind === "value") {
      expect(zeroDisplay.text).toMatch(/0/);
    }
    expect(missDisplay.kind).toBe("unavailable");
  });

  it("Admin error boundary exists and does not echo raw errors", () => {
    const err = read("app/[locale]/admin/error.tsx");
    expect(err).toMatch(/AdminErrorState/);
    expect(err).toMatch(/onRetry/);
    expect(err).not.toMatch(/error\.message/);
    expect(err).not.toMatch(/stack/);
    expect(existsSync(join(root, "app/[locale]/admin/loading.tsx"))).toBe(true);
  });

  it("list queries return AdminListResult instead of throwing", () => {
    const src = read("lib/admin/queries.ts");
    expect(src).toMatch(/AdminListResult/);
    expect(src).toMatch(/listUnavailable/);
    expect(src).toMatch(/getAdminJobs[\s\S]*AdminListResult/);
    expect(src).toMatch(/getAdminImports[\s\S]*AdminListResult/);
    expect(src).toMatch(/getAdminOrders[\s\S]*AdminListResult/);
    expect(src).toMatch(/getAdminAlerts[\s\S]*AdminListResult/);
  });

  it("layout keeps AdminShell outside remounting Suspense of the whole tree", () => {
    const layout = read("app/[locale]/admin/layout.tsx");
    expect(layout).toMatch(/AdminShell/);
    // Children may suspend; shell chrome stays mounted (topbar has its own Suspense).
    expect(layout).toMatch(/<AdminShell[\s\S]*\{children\}[\s\S]*<\/AdminShell>/);
    expect(layout).toMatch(/Do NOT wrap \{children\} here|remounting the whole tree/);
  });

  it("search and export API routes require server-side admin permission", () => {
    const search = read("app/api/admin/search/route.ts");
    expect(search).toMatch(/requireAdminPermission/);
    expect(search).toMatch(/users\.read/);
    expect(search).toMatch(/logAdminFailure/);

    const exp = read("app/api/admin/export/route.ts");
    expect(exp).toMatch(/requireAdminPermission/);
    expect(exp).toMatch(/EXPORT_LIMIT/);
    expect(exp).toMatch(/writeAdminAuditLog/);
    expect(exp).not.toMatch(/select\("\*"\)/);
  });

  it("ANALYST cannot retry jobs; OPERATIONS can", () => {
    expect(roleHasPermission("ANALYST", "jobs.retry")).toBe(false);
    expect(roleHasPermission("OPERATIONS", "jobs.retry")).toBe(true);
    expect(roleHasPermission("ANALYST", "ai.manage")).toBe(false);
  });

  it("retryAdminImportJob is permissioned, audited, and bounded", () => {
    const src = read("lib/admin/phase3-actions.ts");
    expect(src).toMatch(/jobs\.retry/);
    expect(src).toMatch(/writeAdminAuditLog/);
    expect(src).toMatch(/JOB_RETRIED/);
    expect(src).toMatch(/max_attempts|maxAttempts/);
    expect(src).toMatch(/eq\("status", "failed"\)/);
  });

  it("price_suggest records AI usage telemetry", () => {
    const src = read("lib/ai/price-suggest.ts");
    expect(src).toMatch(/recordAiUsage/);
    expect(src).toMatch(/price_suggest/);
    expect(src).toMatch(/inputTokens|prompt_tokens/);
  });

  it("websites list does not scan page_views with limit 5000", () => {
    const src = read("lib/admin/phase3-queries.ts");
    expect(src).not.toMatch(/page_views[\s\S]{0,120}limit\(5000\)/);
    expect(src).toMatch(/pageViews: null/);
  });

  it("phase4 query failures do not return raw DB error messages to MetricResult", () => {
    const src = read("lib/admin/phase4-queries.ts");
    expect(src).toMatch(/safeQueryFailure/);
    expect(src).not.toMatch(/metricError\(open\.error\.message/);
    expect(src).not.toMatch(/metricError\(depthRes\.error\.message/);
    expect(src).not.toMatch(/unavailableReason: error\.message/);
  });

  it("sanitizeAiErrorMessage strips secrets", () => {
    const msg = sanitizeAiErrorMessage(
      "Authorization: Bearer sk-live-abcdefghijklmnopqrstuvwxyz error",
    );
    expect(msg).toBeTruthy();
    expect(String(msg).toLowerCase()).toMatch(/redacted/);
    expect(String(msg)).not.toMatch(/sk-live/);
  });

  it("latency percentiles require minimum samples", () => {
    expect(LATENCY_P50_MIN_SAMPLES).toBeGreaterThanOrEqual(5);
    expect(LATENCY_P95_MIN_SAMPLES).toBeGreaterThanOrEqual(20);
    expect(LATENCY_P99_MIN_SAMPLES).toBeGreaterThanOrEqual(20);
  });

  it("no service_role in client admin components", () => {
    const files = [
      "components/admin/AdminShell.tsx",
      "components/admin/AdminTopbar.tsx",
      "components/admin/FounderDashboardLite.tsx",
      "components/admin/AdminCommandPalette.tsx",
      "components/admin/phase3/JobsCommandCenter.tsx",
      "components/admin/phase4/PromptRegistryClient.tsx",
    ];
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/service_role|SERVICE_ROLE|getSupabaseAdmin/);
    }
  });

  it("heavy admin nav links disable prefetch", () => {
    const sidebar = read("components/admin/AdminSidebar.tsx");
    expect(sidebar).toMatch(/prefetch=\{false\}/);
    const lite = read("components/admin/FounderDashboardLite.tsx");
    expect(lite).toMatch(/prefetch=\{false\}/);
  });

  it("gate soft-fails infra errors without blanking via throw", () => {
    const gate = read("lib/admin/gate.ts");
    expect(gate).toMatch(/AdminAuthError/);
    expect(gate).toMatch(/redirect/);
    expect(gate).toMatch(/\[admin:gate\]/);
  });
});
