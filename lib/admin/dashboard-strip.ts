import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/admin/rbac";
import type { MetricResult } from "@/lib/admin/contracts";
import type { InfrastructureOverview } from "@/lib/admin/phase4-contracts";
import { normalizeJobStatus } from "@/lib/admin/jobs";

/** Keep in sync with STALE_JOB_THRESHOLDS_MS in phase4-queries. */
const STALE_MS = {
  defaultRunning: 30 * 60 * 1000,
  defaultQueued: 60 * 60 * 1000,
  importAnalyze: 45 * 60 * 1000,
} as const;

function available(value: number, source: string): MetricResult<number> {
  return { status: "available", value, source };
}
function unavailable(reason: string, source?: string): MetricResult<number> {
  return { status: "unavailable", reason, source };
}
function metricError(reason: string, source?: string): MetricResult<number> {
  return { status: "error", reason, source };
}

/**
 * Lightweight Founder Dashboard system strip.
 * Head-counts + small probes only — never scans ai_usage_logs samples.
 * Full intelligence lives on /ops.
 */
export async function getAdminDashboardSystemStrip(input: {
  userId: string;
}): Promise<InfrastructureOverview> {
  await requireAdminPermission(input.userId, "system.read");
  const now = new Date().toISOString();

  if (!supabaseConfigured()) {
    const empty = unavailable("Supabase not configured");
    return {
      systemStatus: "unknown",
      systemStatusReason: "Supabase not configured",
      failedJobs24h: empty,
      staleJobs: empty,
      queueDepth: empty,
      openAlerts: empty,
      criticalAlerts: empty,
      aiErrorRate: unavailable("Skipped on dashboard — open /ai for AI health"),
      dependencies: [],
      attention: [],
    };
  }

  const db = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [openAlerts, criticalAlerts, failedJobs, queued, activeJobs, supabaseProbe] =
    await Promise.all([
      db.from("alerts").select("id", { count: "exact", head: true }).eq("status", "open"),
      db
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("severity", "critical"),
      db
        .from("import_jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("updated_at", since24h),
      db
        .from("import_jobs")
        .select("id", { count: "exact", head: true })
        .in("status", ["queued", "retrying"]),
      // Bounded sample for stale detection only
      db
        .from("import_jobs")
        .select("id, status, job_type, updated_at, created_at")
        .in("status", ["queued", "running", "retrying", "scraping", "understanding", "generating", "persisting"])
        .order("updated_at", { ascending: true })
        .limit(100),
      db.from("profiles").select("id", { head: true, count: "exact" }).limit(1),
    ]);

  const nowMs = Date.now();
  let staleCount = 0;
  for (const r of activeJobs.data ?? []) {
    const updated = Date.parse(String(r.updated_at ?? r.created_at));
    if (!Number.isFinite(updated)) continue;
    const age = nowMs - updated;
    const norm = normalizeJobStatus(String(r.status));
    const threshold =
      norm === "queued"
        ? STALE_MS.defaultQueued
        : r.job_type === "instagram_import" || r.job_type === "import"
          ? STALE_MS.importAnalyze
          : STALE_MS.defaultRunning;
    if (age > threshold) staleCount += 1;
  }

  const countOrErr = (
    res: { count: number | null; error: { message: string } | null },
    source: string,
  ): MetricResult<number> => {
    if (res.error) return metricError(res.error.message, source);
    return available(res.count ?? 0, source);
  };

  const failedM = countOrErr(failedJobs, "import_jobs");
  const queueM = countOrErr(queued, "import_jobs");
  const openM = countOrErr(openAlerts, "alerts");
  const critM = countOrErr(criticalAlerts, "alerts");
  const staleM = activeJobs.error
    ? metricError(activeJobs.error.message, "import_jobs")
    : available(staleCount, "import_jobs.updated_at");

  const attention: InfrastructureOverview["attention"] = [];
  if (critM.status === "available" && critM.value > 0) {
    attention.push({
      id: "critical-alerts",
      severity: "critical",
      title: `${critM.value} critical open alert(s)`,
      href: "/errors",
    });
  }
  if (staleM.status === "available" && staleM.value > 0) {
    attention.push({
      id: "stale-jobs",
      severity: "warning",
      title: `${staleM.value} stale job(s)`,
      href: "/jobs",
    });
  }
  if (failedM.status === "available" && failedM.value > 0) {
    attention.push({
      id: "failed-jobs",
      severity: "warning",
      title: `${failedM.value} failed job(s) in 24h`,
      href: "/jobs",
    });
  }

  const depsOk = !supabaseProbe.error;
  if (!depsOk) {
    attention.push({
      id: "supabase",
      severity: "critical",
      title: "Supabase probe failing",
      href: "/system",
    });
  }

  let systemStatus: InfrastructureOverview["systemStatus"] = "healthy";
  let systemStatusReason = "No critical signals in lightweight dashboard probes";
  if (!depsOk || (critM.status === "available" && critM.value > 0)) {
    systemStatus = "critical";
    systemStatusReason = "Critical alerts or database probe failure";
  } else if (
    (staleM.status === "available" && staleM.value > 0) ||
    (failedM.status === "available" && failedM.value > 0)
  ) {
    systemStatus = "degraded";
    systemStatusReason = "Failed or stale jobs detected";
  }

  return {
    systemStatus,
    systemStatusReason,
    failedJobs24h: failedM,
    staleJobs: staleM,
    queueDepth: queueM,
    openAlerts: openM,
    criticalAlerts: critM,
    aiErrorRate: unavailable(
      "AI anomaly scan deferred — open /ai/anomalies",
      "dashboard",
    ),
    dependencies: [
      {
        id: "supabase",
        name: "Supabase",
        status: depsOk ? "healthy" : "failing",
        evidence: depsOk
          ? "Head select on profiles succeeded"
          : `Probe failed (${supabaseProbe.error?.code ?? "error"})`,
        lastCheckedAt: now,
      },
    ],
    attention,
  };
}
