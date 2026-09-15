import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatDelta,
  metricDisplay,
  sanitizeAdminError,
} from "@/components/admin/format";
import { ADMIN_NAV, adminHref } from "@/components/admin/nav";
import { resolveDateRange } from "@/lib/admin/dates";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Admin Phase 2 UI foundation", () => {
  it("exposes admin routes under locale", () => {
    expect(read("app/[locale]/admin/layout.tsx")).toMatch(/resolveAdminActor|getSession/);
    expect(read("app/[locale]/admin/dashboard/page.tsx")).toMatch(
      /getAdminDashboardMetrics/,
    );
    expect(read("app/[locale]/admin/dashboard/page.tsx")).toMatch(
      /requireAdminPage/,
    );
  });

  it("does not invent MRR/revenue in Founder dashboard", () => {
    const dash = read("components/admin/FounderDashboard.tsx");
    expect(dash).toMatch(/kpis\.mrr/);
    expect(dash).toMatch(/kpis\.revenue/);
    expect(dash).not.toMatch(/\$12,?345|fakeMrr|Math\.random/);
  });

  it("MetricUnavailable / format helpers handle unavailable metrics", () => {
    const unavailable = metricDisplay({
      status: "unavailable",
      reason: "Billing integration required",
    });
    expect(unavailable.kind).toBe("unavailable");
    if (unavailable.kind === "unavailable") {
      expect(unavailable.reason).toMatch(/Billing/);
    }

    expect(
      formatDelta({ status: "unavailable", reason: "no comparison" }),
    ).toBeNull();
    expect(
      formatDelta({ status: "available", value: 0.184, source: "delta" }),
    ).toEqual({ text: "+18.4%", tone: "up" });
  });

  it("sanitizes secrets from admin errors", () => {
    expect(sanitizeAdminError("bad service_role key xyz")).toMatch(
      /\[redacted\]/i,
    );
  });

  it("nav uses logical admin hrefs and marks later phases", () => {
    expect(adminHref("fa", "/dashboard")).toBe("/fa/admin/dashboard");
    const soon = ADMIN_NAV.flatMap((g) => g.items).filter((i) => i.comingSoon);
    expect(soon.length).toBeGreaterThan(0);
  });

  it("date range presets stay centralized", () => {
    const range = resolveDateRange({
      preset: "7d",
      now: new Date("2026-09-15T12:00:00.000Z"),
    });
    expect(range.preset).toBe("7d");
    expect(range.start).toBe("2026-09-09T00:00:00.000Z");
  });

  it("command palette supports keyboard shortcut wiring", () => {
    const palette = read("components/admin/AdminCommandPalette.tsx");
    expect(palette).toMatch(/metaKey|ctrlKey/);
    expect(palette).toMatch(/ArrowDown/);
    expect(palette).toMatch(/ArrowUp/);
  });

  it("admin CSS tokens support light and dark", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.admin-console/);
    expect(css).toMatch(/data-admin-theme="dark"/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });
});
