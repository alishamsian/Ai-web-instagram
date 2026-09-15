import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  __resetAdminMemoryForTests,
  __setAdminMemoryForTests,
  requireAdminPermission,
  AdminAuthError,
} from "@/lib/admin/rbac";
import { getAdminRevenue, getAdminDashboardMetrics } from "@/lib/admin/queries";
import { assessWorkspaceHealth } from "@/lib/admin/health";
import { normalizeJobStatus } from "@/lib/admin/jobs";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

beforeEach(() => {
  __resetAdminMemoryForTests();
});

describe("Admin Phase 3 production closure", () => {
  it("users enriched uses DB-side search and exact counts (no full-table AI join)", () => {
    const src = read("lib/admin/phase3-queries.ts");
    expect(src).toMatch(/sanitizeIlikeTerm/);
    expect(src).toMatch(/count: "exact"/);
    expect(src).toMatch(/\.in\("owner_id"/);
    expect(src).not.toMatch(
      /db\.from\("ai_usage_logs"\)\.select\("id, user_id"\)\.limit\(5000\)/,
    );
  });

  it("head-count metrics never collapse a failed query into a silent zero", () => {
    const p3 = read("lib/admin/phase3-queries.ts");
    const q = read("lib/admin/queries.ts");
    // Every exact head-count in the Phase 3 list queries goes through countMetric.
    expect(p3).toMatch(/function countMetric\(/);
    expect(p3).not.toMatch(/available\(\w+Res\.count \?\? 0/);
    expect(q).not.toMatch(/available\(\w+\.count \?\? 0, "(alerts|system_events|import_jobs)"\)/);
    // page_views errors mark the column unreliable instead of showing 0.
    expect(p3).toMatch(/viewsRes\.error \|\| viewRows\.length === 5000/);
  });

  it("AdminDataTable can be rendered from Server Components without passing functions to the client", () => {
    // Column defs contain functions (cell/sortValue). The shared layer must
    // evaluate them and pass only serializable data across the RSC boundary.
    const shared = read("components/admin/AdminDataTable.tsx");
    const client = read("components/admin/AdminDataTableClient.tsx");
    expect(shared).not.toMatch(/^"use client";/m);
    expect(client).toMatch(/^"use client";/m);
    expect(shared).toMatch(/cells\[col\.id\] = col\.cell\(row\)/);
    expect(shared).toMatch(/sortValues\[col\.id\] = col\.sortValue\(row\)/);
    expect(client).toMatch(/onRowClick\?: \(rowId: string\) => void/);
    // Server pages must not pass onRowClick (a function) to the table.
    const serverPagesWithRowClick = [
      "app/[locale]/admin/websites/page.tsx",
      "app/[locale]/admin/workspaces/page.tsx",
      "app/[locale]/admin/orders/page.tsx",
      "app/[locale]/admin/imports/page.tsx",
    ].filter((p) => /onRowClick/.test(read(p)));
    expect(serverPagesWithRowClick).toEqual([]);
  });

  it("missing Phase 3 tables surface as unavailable, not as empty lists", () => {
    const src = read("lib/admin/phase3-queries.ts");
    expect(src).toMatch(/function isMissingRelation\(/);
    expect(src).toMatch(/unavailableReason: isMissingRelation\(error\)/);
    expect(src).toMatch(/promptsUnavailableReason/);
    expect(src).toMatch(/notesUnavailableReason/);
    // getAdminIncidents must not swallow errors into [] anymore.
    const idx = src.indexOf("export async function getAdminIncidents");
    const body = src.slice(idx, idx + 1200);
    expect(body).not.toMatch(/if \(error\) return \[\];/);

    const incidents = read("app/[locale]/admin/incidents/page.tsx");
    expect(incidents).toMatch(/unavailableReason \?/);
    const prompts = read("app/[locale]/admin/ai/prompts/page.tsx");
    expect(prompts).toMatch(/promptsUnavailableReason \?/);
  });

  it("admin orders list does not select customer PII / drift-prone columns", () => {
    const src = read("lib/admin/queries.ts");
    const idx = src.indexOf("export async function getAdminOrders");
    const body = src.slice(idx, idx + 900);
    const select = body.match(/\.select\(\s*"([^"]+)"\s*\)/)?.[1] ?? "";
    expect(select).toBe(
      "id, website_id, workspace_id, channel, status, created_at",
    );
  });

  it("admin segment has an error boundary that hides raw error text", () => {
    const src = read("app/[locale]/admin/error.tsx");
    expect(src).toMatch(/^"use client";/m);
    expect(src).toMatch(/error\.digest/);
    expect(src).not.toMatch(/error\.message/);
  });

  it("User 360 looks up target user directly (not via 200-row list)", () => {
    const src = read("lib/admin/phase3-queries.ts");
    const idx = src.indexOf("export async function getAdminUser360");
    const body = src.slice(idx, idx + 2500);
    expect(body).not.toMatch(/getAdminUsersEnriched/);
    expect(body).toMatch(/\.eq\("id", input\.targetUserId\)/);
    expect(body).toMatch(/\.eq\("owner_id", input\.targetUserId\)/);
  });

  it("workspace/website metrics use exact totals not page length as truth", () => {
    const src = read("lib/admin/phase3-queries.ts");
    expect(src).toMatch(/countMetric\(totalRes, "workspaces"\)/);
    expect(src).toMatch(/countMetric\(totalRes, "websites"\)/);
    expect(src).toMatch(/pageViewsReliable/);
  });

  it("export allowlist uses owner_id and fails closed on DB errors", () => {
    const src = read("app/api/admin/export/route.ts");
    expect(src).toMatch(/owner_id/);
    expect(src).not.toMatch(/owner_user_id/);
    expect(src).toMatch(/DATA_EXPORTED/);
    expect(src).toMatch(/status: 500/);
    expect(src).toMatch(/EXPORT_LIMIT/);
  });

  it("job retry wakes worker, clears completion, and uses atomic filters", () => {
    const src = read("lib/admin/phase3-actions.ts");
    expect(src).toMatch(/triggerImportWorker/);
    expect(src).toMatch(/completedAt: null/);
    expect(src).toMatch(/\.lt\("retry_count", maxAttempts\)/);
    expect(src).toMatch(/\.eq\("status", "failed"\)/);
  });

  it("daily_metrics empty is unavailable not fake zero", () => {
    const src = read("lib/admin/queries.ts");
    expect(src).toMatch(/No daily_metrics rows for selected period/);
    expect(src).toMatch(/Sample truncated at 2000 rows/);
  });

  it("AI percentiles require minimum samples", () => {
    const src = read("lib/admin/phase3-queries.ts");
    expect(src).toMatch(/Insufficient latency samples/);
  });

  it("search excludes soft-deleted workspaces/websites", () => {
    const src = read("lib/admin/phase3-queries.ts");
    const idx = src.indexOf("export async function searchAdminEntities");
    const body = src.slice(idx, idx + 2000);
    expect(body).toMatch(/deleted_at/);
  });

  it("phase3 index migration is additive", () => {
    const sql = read(
      "supabase/migrations/20260916020000_admin_phase3_indexes.sql",
    );
    expect(sql).toMatch(/import_jobs_status_created_idx/);
    expect(sql).toMatch(/ai_usage_logs_user_created_idx/);
    expect(sql).toMatch(/workspaces_created_active_idx/);
  });

  it("revenue remains unavailable without payment provider", async () => {
    __setAdminMemoryForTests("owner-1", "OWNER");
    const revenue = await getAdminRevenue({ userId: "owner-1", preset: "30d" });
    expect(revenue.mrr.status).toBe("unavailable");
    expect(revenue.revenue.status).toBe("unavailable");
  });

  it("dashboard active users stay unavailable", async () => {
    __setAdminMemoryForTests("owner-1", "OWNER");
    const dash = await getAdminDashboardMetrics({
      userId: "owner-1",
      preset: "30d",
    });
    expect(dash.activeUsers.current.status).toBe("unavailable");
    expect(dash.mrr.status).toBe("unavailable");
  });

  it("health framework remains explicitly rule-based", () => {
    const h = assessWorkspaceHealth({
      websiteCount: 0,
      publishedCount: 0,
      failedImportJobs: 0,
      successfulImports: 0,
      domainCount: 0,
      plan: "free",
    });
    expect(h.framework).toBe("rule-based");
    expect(JSON.stringify(h)).not.toMatch(/churn|ml score/i);
  });

  it("normalizeJobStatus maps pipeline stages to running", () => {
    expect(normalizeJobStatus("scraping")).toBe("running");
    expect(normalizeJobStatus("generating")).toBe("running");
    expect(normalizeJobStatus("failed")).toBe("failed");
  });

  it("ANALYST cannot retry jobs", async () => {
    __setAdminMemoryForTests("a1", "ANALYST");
    await expect(requireAdminPermission("a1", "jobs.retry")).rejects.toBeInstanceOf(
      AdminAuthError,
    );
  });

  it("admin sidebar disables prefetch to avoid query storms", () => {
    const src = read("components/admin/AdminSidebar.tsx");
    expect(src).toMatch(/prefetch=\{false\}/);
  });

  it("admin layout is force-dynamic", () => {
    const src = read("app/[locale]/admin/layout.tsx");
    expect(src).toMatch(/force-dynamic/);
  });
});
