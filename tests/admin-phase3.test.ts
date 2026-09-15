import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assessWorkspaceHealth,
  assessWebsiteHealth,
} from "@/lib/admin/health";
import {
  __resetAdminMemoryForTests,
  __setAdminMemoryForTests,
  requireAdminPermission,
  AdminAuthError,
} from "@/lib/admin/rbac";
import { roleHasPermission } from "@/lib/admin/permissions";
import { ADMIN_NAV, adminHref } from "@/components/admin/nav";
import { sanitizeAdminError } from "@/components/admin/format";
import { getAdminRevenue } from "@/lib/admin/queries";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function walkPages(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

beforeEach(() => {
  __resetAdminMemoryForTests();
});

describe("Admin Phase 3 — Business + Product Intelligence", () => {
  it("ships Phase 3 migration for notes/incidents/prompt registry", () => {
    const sql = read("supabase/migrations/20260916010000_admin_phase3.sql");
    expect(sql).toMatch(/admin_support_notes/);
    expect(sql).toMatch(/admin_incidents/);
    expect(sql).toMatch(/ai_prompt_registry/);
    expect(sql).toMatch(/service_role/);
    expect(sql).toMatch(/revoke all on public\.admin_support_notes from anon, authenticated/);
  });

  it("exposes production-grade entity routes with server auth", () => {
    const required = [
      "users",
      "workspaces",
      "websites",
      "imports",
      "jobs",
      "orders",
      "subscriptions",
      "revenue",
      "health",
      "at-risk",
      "ai",
      "ai/usage",
      "ai/costs",
      "ai/models",
      "ai/prompts",
      "ai/failures",
      "analytics/product",
      "analytics/users",
      "analytics/retention",
      "analytics/cohorts",
      "analytics/funnels",
      "analytics/features",
      "content",
      "publishing",
      "domains",
      "media",
      "queues",
      "webhooks",
      "cron",
      "incidents",
      "errors",
      "system",
    ];
    for (const route of required) {
      const page = read(`app/[locale]/admin/${route}/page.tsx`);
      expect(page).toMatch(/requireAdminPage/);
      expect(page).not.toMatch(/Math\.random\(/);
      expect(page).not.toMatch(/fakeMrr|fakeRevenue|hardcoded.*MRR/i);
    }
  });

  it("nav covers Phase 3 IA without removing command center", () => {
    const ids = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain("dashboard");
    expect(ids).toContain("users");
    expect(ids).toContain("health");
    expect(ids).toContain("ai-costs");
    expect(ids).toContain("a-funnels");
    expect(ids).toContain("incidents");
    expect(adminHref("fa", "/users")).toBe("/fa/admin/users");
  });

  it("rule-based health never invents churn scores", () => {
    const healthy = assessWorkspaceHealth({
      websiteCount: 2,
      publishedCount: 1,
      failedImportJobs: 0,
      successfulImports: 1,
      domainCount: 1,
      plan: "pro",
    });
    expect(healthy.framework).toBe("rule-based");
    expect(healthy.level).toBe("healthy");

    const blocked = assessWorkspaceHealth({
      websiteCount: 1,
      publishedCount: 0,
      failedImportJobs: 3,
      successfulImports: 0,
      domainCount: 0,
      plan: "free",
    });
    expect(blocked.level).toBe("blocked");
    expect(blocked.signals.some((s) => s.code === "import_blocked")).toBe(true);
    expect(JSON.stringify(blocked)).not.toMatch(/churn.?score|ml.?model/i);

    const site = assessWebsiteHealth({
      status: "draft",
      hasDomain: false,
      publishedAt: null,
      updatedAt: new Date().toISOString(),
    });
    expect(site.framework).toBe("rule-based");
  });

  it("RBAC gates destructive Phase 3 actions", async () => {
    __setAdminMemoryForTests("analyst-1", "ANALYST");
    expect(roleHasPermission("ANALYST", "jobs.retry")).toBe(false);
    expect(roleHasPermission("SUPPORT", "jobs.retry")).toBe(true);
    expect(roleHasPermission("ANALYST", "system.manage")).toBe(false);
    expect(roleHasPermission("OWNER", "system.manage")).toBe(true);

    await expect(
      requireAdminPermission("analyst-1", "jobs.retry"),
    ).rejects.toBeInstanceOf(AdminAuthError);
  });

  it("revenue metrics stay unavailable without payment provider", async () => {
    __setAdminMemoryForTests("owner-1", "OWNER");
    const revenue = await getAdminRevenue({ userId: "owner-1", preset: "30d" });
    expect(revenue.mrr.status).toBe("unavailable");
    expect(revenue.revenue.status).toBe("unavailable");
    expect(revenue.mrr.status === "unavailable" && revenue.mrr.reason).toMatch(
      /payment|provider|MRR/i,
    );
  });

  it("command palette wires server search + keyboard navigation", () => {
    const palette = read("components/admin/AdminCommandPalette.tsx");
    expect(palette).toMatch(/\/api\/admin\/search/);
    expect(palette).toMatch(/ArrowDown/);
    expect(palette).toMatch(/ArrowUp/);
    expect(palette).toMatch(/Escape/);
    expect(palette).toMatch(/metaKey|ctrlKey/);
  });

  it("secure export endpoint is permission-gated and bounded", () => {
    const route = read("app/api/admin/export/route.ts");
    expect(route).toMatch(/requireAdminPermission/);
    expect(route).toMatch(/EXPORT_LIMIT/);
    expect(route).toMatch(/writeAdminAuditLog/);
    expect(route).not.toMatch(/service_role|SUPABASE_SERVICE/);
  });

  it("job retry requires confirmation UI and audit action", () => {
    const jobsUi = read("components/admin/phase3/JobsCommandCenter.tsx");
    expect(jobsUi).toMatch(/AdminConfirmDialog/);
    expect(jobsUi).toMatch(/retryAdminImportJob/);
    const actions = read("lib/admin/phase3-actions.ts");
    expect(actions).toMatch(/JOB_RETRIED/);
    expect(actions).toMatch(/jobs\.retry/);
    expect(actions).toMatch(/Only failed jobs/);
  });

  it("User 360 + Users command center exist", () => {
    const users = read("components/admin/phase3/UsersCommandCenter.tsx");
    expect(users).toMatch(/\/api\/admin\/user-360/);
    expect(users).toMatch(/createAdminSupportNote/);
    expect(users).toMatch(/HealthBadge/);
    const api = read("app/api/admin/user-360/route.ts");
    expect(api).toMatch(/getAdminUser360/);
  });

  it("sanitizes secrets in AI failure strings and admin errors", () => {
    expect(sanitizeAdminError("leaked service_role key abc")).toMatch(
      /\[redacted\]/i,
    );
    const queries = read("lib/admin/phase3-queries.ts");
    expect(queries).toMatch(/sanitizeError|\[redacted\]/);
  });

  it("no fake analytics generators in admin components/pages", () => {
    const dirs = [
      "components/admin",
      "app/[locale]/admin",
      "lib/admin",
    ];
    for (const dir of dirs) {
      const files = walkPages(join(root, dir)).concat(
        readdirSync(join(root, dir), { recursive: true })
          .map(String)
          .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
          .map((f) => join(root, dir, f)),
      );
      for (const file of files) {
        const src = readFileSync(file, "utf8");
        expect(src).not.toMatch(/Math\.random\(/);
        expect(src).not.toMatch(/fakeMrr|fakeActiveUsers|hardcodedRevenue/i);
      }
    }
  });

  it("retention/cohorts pages mark instrumentation gaps", () => {
    expect(read("app/[locale]/admin/analytics/retention/page.tsx")).toMatch(
      /MetricUnavailable|instrument/i,
    );
    expect(read("app/[locale]/admin/analytics/cohorts/page.tsx")).toMatch(
      /MetricUnavailable|instrument/i,
    );
    expect(read("app/[locale]/admin/analytics/funnels/page.tsx")).toMatch(
      /getAdminFunnelView/,
    );
  });

  it("queues page does not invent Redis/SQS", () => {
    const queues = read("app/[locale]/admin/queues/page.tsx");
    expect(queues).toMatch(/import_jobs/);
    expect(queues).toMatch(/Redis|SQS/);
  });
});
