import "server-only";

import { requireAdminPermission } from "@/lib/admin/rbac";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import type { MetricResult } from "@/lib/admin/contracts";
import {
  ADMIN_ROLES,
  DESTRUCTIVE_PERMISSIONS,
  ROLE_PERMISSIONS,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/permissions";
import { logAdminFailure } from "@/lib/admin/safe";
import { getConfiguredCronSchedules } from "@/lib/admin/phase4-queries";
import type {
  AuditLogRow,
  CronRunSummary,
  ErrorGroupRow,
  OpsDashboardSignals,
  SecurityOverview,
} from "@/lib/admin/phase5-contracts";
import {
  resolveDateRange,
  type DateRangePreset,
} from "@/lib/admin/dates";

function available<T>(value: T, source: string): MetricResult<T> {
  return { status: "available", value, source };
}
function unavailable<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "unavailable", reason, source };
}

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    /schema cache|does not exist|relation/i.test(error.message ?? "")
  );
}

const SENSITIVE: AdminPermission[] = [
  "users.suspend",
  "billing.refund",
  "jobs.cancel",
  "database.write",
  "websites.restore",
  "feature_flags.write",
  "settings.write",
];

export async function getAdminErrorGroups(input: {
  userId: string;
  status?: string;
  limit?: number;
}): Promise<{ rows: ErrorGroupRow[]; unavailableReason: string | null }> {
  await requireAdminPermission(input.userId, "system.read");
  if (!supabaseConfigured()) {
    return { rows: [], unavailableReason: "Supabase not configured" };
  }
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const db = getSupabaseAdmin();
  let q = db
    .from("admin_error_groups")
    .select(
      "id, fingerprint, source, error_code, normalized_message, severity, occurrence_count, first_seen_at, last_seen_at, last_correlation_id, last_resource_type, last_resource_id, status, linked_incident_id, sample_message",
    )
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (input.status) q = q.eq("status", input.status);

  const { data, error } = await q;
  if (error) {
    logAdminFailure("phase5.error_groups", error.message);
    return {
      rows: [],
      unavailableReason: isMissingRelation(error)
        ? "admin_error_groups missing — apply migration 20260916050000_admin_phase5.sql"
        : "Error groups query failed",
    };
  }

  return {
    rows: (data ?? []).map((r) => ({
      id: r.id as string,
      fingerprint: r.fingerprint as string,
      source: r.source as string,
      errorCode: (r.error_code as string | null) ?? null,
      normalizedMessage: (r.normalized_message as string | null) ?? null,
      severity: r.severity as string,
      occurrenceCount: Number(r.occurrence_count ?? 0),
      firstSeenAt: r.first_seen_at as string,
      lastSeenAt: r.last_seen_at as string,
      lastCorrelationId: (r.last_correlation_id as string | null) ?? null,
      lastResourceType: (r.last_resource_type as string | null) ?? null,
      lastResourceId: (r.last_resource_id as string | null) ?? null,
      status: r.status as string,
      linkedIncidentId: (r.linked_incident_id as string | null) ?? null,
      sampleMessage: (r.sample_message as string | null) ?? null,
    })),
    unavailableReason: null,
  };
}

export async function getAdminSecurityOverview(input: {
  userId: string;
}): Promise<SecurityOverview> {
  await requireAdminPermission(input.userId, "audit.read");
  const emptyRoles = ADMIN_ROLES.map((role) => ({ role, count: 0 }));
  const sensitivePermissions = SENSITIVE.map((permission) => ({
    id: permission,
    permission,
    roles: (Object.keys(ROLE_PERMISSIONS) as AdminRole[]).filter((role) =>
      ROLE_PERMISSIONS[role].includes(permission),
    ),
  }));

  if (!supabaseConfigured()) {
    const u = unavailable("Supabase not configured");
    return {
      activeAdmins: u,
      inactiveAdmins: u,
      recentSecurityEvents: u,
      recentDenied: u,
      recentSensitiveActions: u,
      roles: emptyRoles,
      sensitivePermissions,
      recentEvents: [],
      unavailableReason: "Supabase not configured",
    };
  }

  const db = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [profiles, securityRecent, securityDenied, auditSensitive] =
    await Promise.all([
      db.from("admin_profiles").select("user_id, role, is_active"),
      db
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since24h),
      db
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", since24h)
        .in("event_name", [
          "admin_access_denied",
          "permission_denied",
          "suspicious_request",
        ]),
      db
        .from("admin_audit_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since24h)
        .in("action", [
          "USER_SUSPENDED",
          "JOB_CANCELLED",
          "JOB_RETRIED",
          "WEBSITE_RESTORED",
          "DATA_EXPORTED",
          "SETTING_CHANGED",
        ]),
    ]);

  if (profiles.error) {
    logAdminFailure("phase5.security.profiles", profiles.error.message);
  }

  const rows = profiles.data ?? [];
  const active = rows.filter((r) => r.is_active).length;
  const inactive = rows.filter((r) => !r.is_active).length;
  const roleCounts = new Map<string, number>();
  for (const role of ADMIN_ROLES) roleCounts.set(role, 0);
  for (const r of rows) {
    if (!r.is_active) continue;
    const role = String(r.role);
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }

  const securityTableMissing = isMissingRelation(securityRecent.error);
  const eventsRes = securityTableMissing
    ? { data: [], error: securityRecent.error }
    : await db
        .from("security_events")
        .select(
          "id, event_name, severity, actor_user_id, actor_role, message, occurred_at",
        )
        .order("occurred_at", { ascending: false })
        .limit(30);

  return {
    activeAdmins: profiles.error
      ? unavailable("Admin profiles query failed", "admin_profiles")
      : available(active, "admin_profiles"),
    inactiveAdmins: profiles.error
      ? unavailable("Admin profiles query failed", "admin_profiles")
      : available(inactive, "admin_profiles"),
    recentSecurityEvents: securityTableMissing
      ? unavailable(
          "security_events missing — apply Phase 5 migration",
          "security_events",
        )
      : securityRecent.error
        ? unavailable("Security events query failed", "security_events")
        : available(securityRecent.count ?? 0, "security_events"),
    recentDenied: securityTableMissing
      ? unavailable(
          "security_events missing — apply Phase 5 migration",
          "security_events",
        )
      : securityDenied.error
        ? unavailable("Denied events query failed", "security_events")
        : available(securityDenied.count ?? 0, "security_events"),
    recentSensitiveActions: auditSensitive.error
      ? unavailable("Audit query failed", "admin_audit_logs")
      : available(auditSensitive.count ?? 0, "admin_audit_logs"),
    roles: ADMIN_ROLES.map((role) => ({
      role,
      count: roleCounts.get(role) ?? 0,
    })),
    sensitivePermissions,
    recentEvents: ((eventsRes.data ?? []) as Array<Record<string, unknown>>).map(
      (e) => ({
        id: String(e.id),
        eventName: String(e.event_name),
        severity: String(e.severity),
        actorUserId: (e.actor_user_id as string | null) ?? null,
        actorRole: (e.actor_role as string | null) ?? null,
        message: (e.message as string | null) ?? null,
        occurredAt: String(e.occurred_at),
      }),
    ),
    unavailableReason: null,
  };
}

export async function getAdminAuditLogs(input: {
  userId: string;
  preset?: DateRangePreset;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: AuditLogRow[]; unavailableReason: string | null }> {
  await requireAdminPermission(input.userId, "audit.read");
  if (!supabaseConfigured()) {
    return { rows: [], unavailableReason: "Supabase not configured" };
  }
  const range = resolveDateRange({ preset: input.preset ?? "30d" });
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const db = getSupabaseAdmin();
  let q = db
    .from("admin_audit_logs")
    .select(
      "id, action, actor_user_id, actor_role, resource_type, resource_id, created_at, reason",
    )
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (input.action) q = q.eq("action", input.action);

  const { data, error } = await q;
  if (error) {
    logAdminFailure("phase5.audit", error.message);
    return { rows: [], unavailableReason: "Audit query failed" };
  }
  return {
    rows: (data ?? []).map((r) => ({
      id: r.id as string,
      action: r.action as string,
      actorUserId: (r.actor_user_id as string | null) ?? null,
      actorRole: (r.actor_role as string | null) ?? null,
      resourceType: (r.resource_type as string | null) ?? null,
      resourceId: (r.resource_id as string | null) ?? null,
      createdAt: r.created_at as string,
      reason: (r.reason as string | null) ?? null,
    })),
    unavailableReason: null,
  };
}

export async function getAdminCronRunSummaries(input: {
  userId: string;
}): Promise<{ rows: CronRunSummary[]; historyUnavailableReason: string | null }> {
  await requireAdminPermission(input.userId, "system.read");
  const schedules = getConfiguredCronSchedules();
  if (!supabaseConfigured()) {
    return {
      rows: schedules.map((s) => ({
        id: s.id,
        jobName: s.name,
        path: s.path,
        configuredSchedule: s.configuredSchedule,
        lastStatus: unavailable("Supabase not configured"),
        lastStartedAt: unavailable("Supabase not configured"),
        lastDurationMs: unavailable("Supabase not configured"),
        success24h: unavailable("Supabase not configured"),
        failed24h: unavailable("Supabase not configured"),
      })),
      historyUnavailableReason: "Supabase not configured",
    };
  }

  const db = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("cron_runs")
    .select("job_name, path, status, started_at, duration_ms")
    .gte("started_at", since24h)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error) {
    const missing = isMissingRelation(error);
    if (!missing) logAdminFailure("phase5.cron_runs", error.message);
    return {
      rows: schedules.map((s) => ({
        id: s.id,
        jobName: s.name,
        path: s.path,
        configuredSchedule: s.configuredSchedule,
        lastStatus: unavailable(
          missing
            ? "Execution history unavailable — cron_runs not migrated"
            : "Cron runs query failed",
        ),
        lastStartedAt: unavailable(
          missing
            ? "Execution history unavailable — cron_runs not migrated"
            : "Cron runs query failed",
        ),
        lastDurationMs: unavailable(
          missing
            ? "Execution history unavailable — cron_runs not migrated"
            : "Cron runs query failed",
        ),
        success24h: unavailable(
          missing
            ? "Execution history unavailable — cron_runs not migrated"
            : "Cron runs query failed",
        ),
        failed24h: unavailable(
          missing
            ? "Execution history unavailable — cron_runs not migrated"
            : "Cron runs query failed",
        ),
      })),
      historyUnavailableReason: missing
        ? "Execution history unavailable — apply migration 20260916050000_admin_phase5.sql"
        : "Cron runs query failed",
    };
  }

  const rows = data ?? [];
  return {
    rows: schedules.map((s) => {
      const forJob = rows.filter(
        (r) => r.job_name === s.name || r.path === s.path,
      );
      const last = forJob[0];
      const success24h = forJob.filter((r) => r.status === "succeeded").length;
      const failed24h = forJob.filter((r) => r.status === "failed").length;
      return {
        id: s.id,
        jobName: s.name,
        path: s.path,
        configuredSchedule: s.configuredSchedule,
        lastStatus: last
          ? available(String(last.status), "cron_runs")
          : unavailable("No executions in last 24h", "cron_runs"),
        lastStartedAt: last
          ? available(String(last.started_at), "cron_runs")
          : unavailable("No executions in last 24h", "cron_runs"),
        lastDurationMs:
          last?.duration_ms == null
            ? unavailable("Duration not recorded", "cron_runs")
            : available(Number(last.duration_ms), "cron_runs"),
        success24h: available(success24h, "cron_runs"),
        failed24h: available(failed24h, "cron_runs"),
      };
    }),
    historyUnavailableReason: null,
  };
}

/** Bounded founder-dashboard signals — head counts only. */
export async function getAdminOpsDashboardSignals(input: {
  userId: string;
}): Promise<OpsDashboardSignals> {
  await requireAdminPermission(input.userId, "system.read");
  if (!supabaseConfigured()) {
    const u = unavailable("Supabase not configured");
    return {
      openIncidents: u,
      criticalErrorGroups: u,
      securityEvents24h: u,
      cronFailures24h: u,
    };
  }
  const db = getSupabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [incidents, errors, security, cronFail] = await Promise.all([
    db
      .from("admin_incidents")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "acknowledged", "investigating", "monitoring"]),
    db
      .from("admin_error_groups")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("severity", "critical"),
    db
      .from("security_events")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", since24h),
    db
      .from("cron_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("started_at", since24h),
  ]);

  const metric = (
    res: { count: number | null; error: { message?: string } | null },
    source: string,
    missingHint: string,
  ): MetricResult<number> => {
    if (res.error) {
      if (isMissingRelation(res.error)) {
        return unavailable(missingHint, source);
      }
      logAdminFailure(`phase5.dashboard.${source}`, res.error.message ?? "err");
      return unavailable("Query failed", source);
    }
    return available(res.count ?? 0, source);
  };

  return {
    openIncidents: metric(
      incidents,
      "admin_incidents",
      "Incidents table unavailable",
    ),
    criticalErrorGroups: metric(
      errors,
      "admin_error_groups",
      "Error groups unavailable — apply Phase 5 migration",
    ),
    securityEvents24h: metric(
      security,
      "security_events",
      "Security events unavailable — apply Phase 5 migration",
    ),
    cronFailures24h: metric(
      cronFail,
      "cron_runs",
      "Cron history unavailable — apply Phase 5 migration",
    ),
  };
}

export function listDestructivePermissions(): readonly AdminPermission[] {
  return DESTRUCTIVE_PERMISSIONS;
}
