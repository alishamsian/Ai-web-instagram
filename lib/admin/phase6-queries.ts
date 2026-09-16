/**
 * Phase 6 — Founder Intelligence queries (server-only).
 * All metrics from real Supabase tables or honest unavailable.
 * No N+1: batch fetches with caps.
 */

import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import {
  resolveDateRange,
  resolveComparisonPeriod,
  type DateRangePreset,
} from "@/lib/admin/dates";
import type { MetricResult } from "@/lib/admin/contracts";
import {
  ACTIVATION_DEFINITION,
  conversionRate,
  median,
  utcWeekKey,
  addUtcDaysIso,
  computeActivationCohort,
  isValidActivationTimestamp,
  computeCausalFunnel,
  funnelStageConversion,
  computeRetentionDayCell,
  computeRetentionWeekCell,
  type FunnelStepStat,
  type FunnelWorkspaceEvents,
} from "@/lib/admin/intelligence/metrics";
import {
  ANALYTICS_SAMPLE_CAP,
  ACTIVATION_WINDOW_DAYS,
  MAX_ANALYTICS_DAYS,
  clampAnalyticsPreset,
} from "@/lib/admin/intelligence/limits";
import {
  MEASURABLE_FEATURES,
  adoptionRate,
  type FeatureAdoptionStat,
} from "@/lib/admin/intelligence/features";
import { computeHealthScore } from "@/lib/admin/intelligence/health-score";
import { resolveLifecycle } from "@/lib/admin/intelligence/lifecycle";
import { detectAtRisk } from "@/lib/admin/intelligence/at-risk";
import {
  generateFounderInsights,
  type FounderInsight,
} from "@/lib/admin/intelligence/founder-insights";
import { assessDataQuality } from "@/lib/admin/intelligence/data-quality";
import { logAdminFailure } from "@/lib/admin/safe";

function available<T>(value: T, source: string): MetricResult<T> {
  return { status: "available", value, source };
}
function unavailable<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "unavailable", reason, source };
}
function metricError<T = number>(reason: string, source?: string): MetricResult<T> {
  return { status: "error", reason, source };
}
function insufficientSample<T = number>(
  reason: string,
  sampleSize: number,
  source?: string,
): MetricResult<T> {
  return { status: "insufficient_sample", reason, sampleSize, source };
}
function partialMetric<T>(
  value: T,
  source: string,
  warning: string,
): MetricResult<T> {
  return { status: "partial", value, source, warning };
}

/** Clamp preset so analytics never exceed MAX_ANALYTICS_DAYS. */
export { clampAnalyticsPreset };

function assertRangeBounded(start: string, end: string) {
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  if (days > MAX_ANALYTICS_DAYS + 1) {
    throw new Error(`Analytics range exceeds ${MAX_ANALYTICS_DAYS} days`);
  }
}

async function authorize(userId: string) {
  await requireAdminPermission(userId, "system.read");
}

function allActivationUnavailable(
  range: ReturnType<typeof resolveDateRange>,
  reason: string,
): ActivationIntelligence {
  const u = unavailable(reason);
  return {
    definition: ACTIVATION_DEFINITION,
    range,
    eligibleUsers: u,
    activatedUsers: u,
    activatedWorkspaces: u,
    activationRate: u,
    medianHoursToActivation: u,
    dropOff: u,
  };
}

function allActivationError(
  range: ReturnType<typeof resolveDateRange>,
  reason: string,
): ActivationIntelligence {
  const e = metricError(reason);
  return {
    definition: ACTIVATION_DEFINITION,
    range,
    eligibleUsers: e,
    activatedUsers: e,
    activatedWorkspaces: e,
    activationRate: e,
    medianHoursToActivation: e,
    dropOff: e,
  };
}

/** Chunk `.in()` filters to keep PostgREST URLs bounded. */
function chunkIds<T>(ids: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

// ─── Activation ───────────────────────────────────────────────

export type ActivationIntelligence = {
  definition: typeof ACTIVATION_DEFINITION;
  range: ReturnType<typeof resolveDateRange>;
  eligibleUsers: MetricResult<number>;
  activatedUsers: MetricResult<number>;
  activatedWorkspaces: MetricResult<number>;
  activationRate: MetricResult<number>;
  medianHoursToActivation: MetricResult<number>;
  dropOff: MetricResult<number>;
};

export async function getActivationIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<ActivationIntelligence> {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  assertRangeBounded(range.start, range.end);

  if (!supabaseConfigured()) {
    return allActivationUnavailable(range, "Supabase not configured");
  }

  const db = getSupabaseAdmin();
  const cutoffAt = new Date().toISOString();
  // Related activation evidence may land up to ACTIVATION_WINDOW_DAYS after cohort end.
  const activationScanEnd = addUtcDaysIso(range.end, ACTIVATION_WINDOW_DAYS);

  const profilesRes = await db
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  if (profilesRes.error) {
    logAdminFailure("phase6.activation.profiles", profilesRes.error.message);
    return allActivationError(
      range,
      `Profiles query failed: ${profilesRes.error.message}`,
    );
  }

  const profiles = (profilesRes.data ?? []).map((p) => ({
    id: p.id as string,
    created_at: p.created_at as string,
  }));
  const profileIds = profiles.map((p) => p.id);
  const profilesTruncated = profiles.length >= ANALYTICS_SAMPLE_CAP;

  if (profileIds.length === 0) {
    return {
      definition: ACTIVATION_DEFINITION,
      range,
      eligibleUsers: available(0, "profiles.created_at"),
      activatedUsers: available(0, "activation"),
      activatedWorkspaces: available(0, "activation"),
      activationRate: unavailable("No eligible users in range", "activation_rate"),
      medianHoursToActivation: insufficientSample(
        "No eligible users in range",
        0,
        "median_hours_to_activation",
      ),
      dropOff: unavailable("No eligible users in range"),
    };
  }

  // Workspaces owned by cohort profiles (chunked .in)
  const workspaces: Array<{ id: string; owner_id: string }> = [];
  let workspacesTruncated = false;
  let workspacesError: string | null = null;
  for (const chunk of chunkIds(profileIds)) {
    const res = await db
      .from("workspaces")
      .select("id, owner_id")
      .in("owner_id", chunk)
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP);
    if (res.error) {
      workspacesError = res.error.message;
      break;
    }
    for (const w of res.data ?? []) {
      workspaces.push({
        id: w.id as string,
        owner_id: w.owner_id as string,
      });
    }
    if ((res.data ?? []).length >= ANALYTICS_SAMPLE_CAP) {
      workspacesTruncated = true;
    }
  }
  if (workspacesError) {
    logAdminFailure("phase6.activation.workspaces", workspacesError);
    return allActivationError(
      range,
      `Workspaces query failed: ${workspacesError}`,
    );
  }

  const workspacesByOwner = new Map<string, string[]>();
  const workspaceIds: string[] = [];
  for (const w of workspaces) {
    workspaceIds.push(w.id);
    const list = workspacesByOwner.get(w.owner_id) ?? [];
    list.push(w.id);
    workspacesByOwner.set(w.owner_id, list);
  }

  const activationCandidatesByWorkspace = new Map<string, string[]>();
  function pushCandidate(wsId: string, at: string | null | undefined) {
    if (!at || !wsId) return;
    const list = activationCandidatesByWorkspace.get(wsId) ?? [];
    list.push(at);
    activationCandidatesByWorkspace.set(wsId, list);
  }

  let websitesTruncated = false;
  let importsTruncated = false;

  if (workspaceIds.length > 0) {
    // Published websites in [cohortStart, cohortEnd + window]
    for (const chunk of chunkIds(workspaceIds)) {
      const res = await db
        .from("websites")
        .select("workspace_id, published_at, status")
        .in("workspace_id", chunk)
        .is("deleted_at", null)
        .not("published_at", "is", null)
        .gte("published_at", range.start)
        .lt("published_at", activationScanEnd)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (res.error) {
        logAdminFailure("phase6.activation.websites", res.error.message);
        return allActivationError(
          range,
          `Websites query failed: ${res.error.message}`,
        );
      }
      for (const row of res.data ?? []) {
        pushCandidate(row.workspace_id as string, row.published_at as string);
      }
      if ((res.data ?? []).length >= ANALYTICS_SAMPLE_CAP) {
        websitesTruncated = true;
      }
    }

    // Successful imports only: import_jobs.status = completed
    for (const chunk of chunkIds(workspaceIds)) {
      const res = await db
        .from("import_jobs")
        .select("workspace_id, completed_at, updated_at, status")
        .in("workspace_id", chunk)
        .eq("status", "completed")
        .gte("completed_at", range.start)
        .lt("completed_at", activationScanEnd)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (res.error) {
        // Fallback: some environments may lack completed_at filterability —
        // retry with updated_at bound and filter status in app (still completed only).
        const retry = await db
          .from("import_jobs")
          .select("workspace_id, completed_at, updated_at, status")
          .in("workspace_id", chunk)
          .eq("status", "completed")
          .gte("updated_at", range.start)
          .lt("updated_at", activationScanEnd)
          .limit(ANALYTICS_SAMPLE_CAP);
        if (retry.error) {
          logAdminFailure("phase6.activation.import_jobs", retry.error.message);
          return allActivationError(
            range,
            `Import jobs query failed: ${retry.error.message}`,
          );
        }
        for (const row of retry.data ?? []) {
          const at =
            (row.completed_at as string | null) ?? (row.updated_at as string);
          pushCandidate(row.workspace_id as string, at);
        }
        if ((retry.data ?? []).length >= ANALYTICS_SAMPLE_CAP) {
          importsTruncated = true;
        }
        continue;
      }
      for (const row of res.data ?? []) {
        const at =
          (row.completed_at as string | null) ?? (row.updated_at as string);
        pushCandidate(row.workspace_id as string, at);
      }
      if ((res.data ?? []).length >= ANALYTICS_SAMPLE_CAP) {
        importsTruncated = true;
      }
    }
  }

  const computed = computeActivationCohort({
    profiles,
    workspacesByOwner,
    activationCandidatesByWorkspace,
    windowDays: ACTIVATION_WINDOW_DAYS,
    cutoffAt,
  });

  const truncated =
    profilesTruncated ||
    workspacesTruncated ||
    websitesTruncated ||
    importsTruncated;
  const truncateWarning = `Sample truncated at ${ANALYTICS_SAMPLE_CAP} — metric is partial, not exact`;

  const rate = conversionRate(
    computed.activatedUserIds.size,
    computed.eligibleUsers,
  );
  const med = median(computed.hoursToActivation);

  const countMetric = (value: number, source: string): MetricResult<number> =>
    truncated
      ? partialMetric(value, source, truncateWarning)
      : available(value, source);

  return {
    definition: ACTIVATION_DEFINITION,
    range,
    eligibleUsers: countMetric(computed.eligibleUsers, "profiles.created_at"),
    activatedUsers: countMetric(
      computed.activatedUserIds.size,
      `import_jobs.completed|websites.published_at within ${ACTIVATION_WINDOW_DAYS}d of signup`,
    ),
    activatedWorkspaces: countMetric(
      computed.activatedWorkspaceIds.size,
      `workspaces with valid activation within ${ACTIVATION_WINDOW_DAYS}d`,
    ),
    activationRate:
      rate == null
        ? unavailable("No eligible users in range", "activation_rate")
        : truncated
          ? partialMetric(rate, "activation_rate", truncateWarning)
          : available(
              rate,
              `activated/eligible within ${ACTIVATION_WINDOW_DAYS}d window`,
            ),
    medianHoursToActivation:
      med == null
        ? insufficientSample(
            "No activated users with measurable time-to-activation in window",
            computed.hoursToActivation.length,
            "median_hours_to_activation",
          )
        : truncated
          ? partialMetric(
              med,
              "median(first_valid_activation - signup)",
              truncateWarning,
            )
          : available(med, "median(first_valid_activation - signup)"),
    dropOff:
      rate == null
        ? unavailable("No eligible users in range")
        : truncated
          ? partialMetric(1 - rate, "1 - activation_rate", truncateWarning)
          : available(1 - rate, "1 - activation_rate"),
  };
}

// ─── Funnel ───────────────────────────────────────────────────

export type FunnelIntelligence = {
  range: ReturnType<typeof resolveDateRange>;
  mode: "workspace";
  steps: FunnelStepStat[];
  note: string;
};

export async function getFunnelIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<FunnelIntelligence> {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  assertRangeBounded(range.start, range.end);

  const note =
    `Funnel cohort = workspaces created in range. Downstream steps require events ≥ workspace.created_at and ≤ created_at+${ACTIVATION_WINDOW_DAYS}d (and ≤ now). Import step uses import_jobs.status=completed only — not raw instagram_imports rows. Observed counts — not causal attribution.`;

  if (!supabaseConfigured()) {
    return {
      range,
      mode: "workspace",
      note: `${note} Supabase not configured.`,
      steps: [
        {
          id: "signup",
          label: "Signup",
          users: null,
          workspaces: null,
          conversionFromPrevious: null,
          dropOffFromPrevious: null,
          medianHoursToNext: null,
          status: "unavailable",
          reason: "Supabase not configured",
          source: "workspaces",
        },
      ],
    };
  }

  const db = getSupabaseAdmin();
  const cutoffAt = new Date().toISOString();
  const scanEnd = addUtcDaysIso(range.end, ACTIVATION_WINDOW_DAYS);

  const wsRes = await db
    .from("workspaces")
    .select("id, created_at")
    .is("deleted_at", null)
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  if (wsRes.error) {
    logAdminFailure("phase6.funnel.workspaces", wsRes.error.message);
    return {
      range,
      mode: "workspace",
      note,
      steps: [
        {
          id: "signup",
          label: "Signup",
          users: null,
          workspaces: null,
          conversionFromPrevious: null,
          dropOffFromPrevious: null,
          medianHoursToNext: null,
          status: "unavailable",
          reason: `Query failed: ${wsRes.error.message}`,
          source: "workspaces",
        },
      ],
    };
  }

  const cohortRows = (wsRes.data ?? []).map((w) => ({
    id: w.id as string,
    created_at: w.created_at as string,
  }));
  const cohort = new Map(cohortRows.map((w) => [w.id, w.created_at]));
  const cohortIds = [...cohort.keys()];
  const truncated = cohortRows.length >= ANALYTICS_SAMPLE_CAP;

  const byWs = new Map<string, FunnelWorkspaceEvents>();
  for (const row of cohortRows) {
    byWs.set(row.id, {
      workspaceId: row.id,
      createdAt: row.created_at,
      importCompletedAt: null,
      websiteGeneratedAt: null,
      previewProxyAt: null,
      publishedAt: null,
    });
  }

  function earliest(current: string | null, next: string): string {
    return !current || next < current ? next : current;
  }

  if (cohortIds.length > 0) {
    for (const chunk of chunkIds(cohortIds)) {
      const jobs = await db
        .from("import_jobs")
        .select("workspace_id, completed_at, updated_at, status")
        .in("workspace_id", chunk)
        .eq("status", "completed")
        .gte("updated_at", range.start)
        .lt("updated_at", scanEnd)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (jobs.error) {
        logAdminFailure("phase6.funnel.import_jobs", jobs.error.message);
        return {
          range,
          mode: "workspace",
          note,
          steps: [
            {
              id: "import_completed",
              label: "Import completed",
              users: null,
              workspaces: null,
              conversionFromPrevious: null,
              dropOffFromPrevious: null,
              medianHoursToNext: null,
              status: "unavailable",
              reason: `Query failed: ${jobs.error.message}`,
              source: "import_jobs",
            },
          ],
        };
      }
      for (const row of jobs.data ?? []) {
        const ws = row.workspace_id as string;
        const entry = byWs.get(ws);
        if (!entry) continue;
        const at =
          (row.completed_at as string | null) ?? (row.updated_at as string);
        if (
          !isValidActivationTimestamp({
            signupAt: entry.createdAt,
            activationAt: at,
            cutoffAt,
          })
        ) {
          continue;
        }
        entry.importCompletedAt = earliest(entry.importCompletedAt, at);
      }
    }

    for (const chunk of chunkIds(cohortIds)) {
      const sites = await db
        .from("websites")
        .select("workspace_id, created_at, published_at")
        .in("workspace_id", chunk)
        .is("deleted_at", null)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (sites.error) {
        logAdminFailure("phase6.funnel.websites", sites.error.message);
        return {
          range,
          mode: "workspace",
          note,
          steps: [
            {
              id: "website_generated",
              label: "Website generated",
              users: null,
              workspaces: null,
              conversionFromPrevious: null,
              dropOffFromPrevious: null,
              medianHoursToNext: null,
              status: "unavailable",
              reason: `Query failed: ${sites.error.message}`,
              source: "websites",
            },
          ],
        };
      }
      for (const row of sites.data ?? []) {
        const ws = row.workspace_id as string;
        const entry = byWs.get(ws);
        if (!entry) continue;
        const created = row.created_at as string;
        if (
          isValidActivationTimestamp({
            signupAt: entry.createdAt,
            activationAt: created,
            cutoffAt,
          })
        ) {
          entry.websiteGeneratedAt = earliest(
            entry.websiteGeneratedAt,
            created,
          );
        }
        const pub = row.published_at as string | null;
        if (
          pub &&
          isValidActivationTimestamp({
            signupAt: entry.createdAt,
            activationAt: pub,
            cutoffAt,
          })
        ) {
          entry.publishedAt = earliest(entry.publishedAt, pub);
        }
      }
    }

    const edits = await db
      .from("product_events")
      .select("workspace_id, occurred_at")
      .eq("event_name", "website_edited")
      .gte("occurred_at", range.start)
      .lt("occurred_at", scanEnd)
      .limit(ANALYTICS_SAMPLE_CAP);
    if (edits.error) {
      logAdminFailure("phase6.funnel.preview_proxy", edits.error.message);
      // Preview stays unavailable; do not fail the whole funnel.
    } else {
      for (const row of edits.data ?? []) {
        const ws = row.workspace_id as string | null;
        if (!ws) continue;
        const entry = byWs.get(ws);
        if (!entry) continue;
        const at = row.occurred_at as string;
        if (
          !isValidActivationTimestamp({
            signupAt: entry.createdAt,
            activationAt: at,
            cutoffAt,
          })
        ) {
          continue;
        }
        entry.previewProxyAt = earliest(entry.previewProxyAt, at);
      }
    }
  }

  const causal = computeCausalFunnel({
    workspaces: [...byWs.values()],
    cutoffAt,
    windowDays: ACTIVATION_WINDOW_DAYS,
  });

  const hasPreviewTelemetry = [...byWs.values()].some((w) => w.previewProxyAt);

  function stage(
    id: FunnelStepStat["id"],
    label: string,
    count: number | null,
    previousCount: number | null,
    baseStatus: FunnelStepStat["status"],
    source: string,
    reason?: string,
  ): FunnelStepStat {
    if (count == null) {
      return {
        id,
        label,
        users: null,
        workspaces: null,
        conversionFromPrevious: null,
        dropOffFromPrevious: null,
        medianHoursToNext: null,
        status: "unavailable",
        reason,
        source,
      };
    }
    const conv =
      previousCount == null
        ? { rate: null, status: "available" as const }
        : funnelStageConversion(count, previousCount);
    const status: FunnelStepStat["status"] =
      conv.status === "insufficient_data"
        ? "insufficient_data"
        : truncated && baseStatus === "available"
          ? "partial"
          : baseStatus;
    return {
      id,
      label,
      users: null,
      workspaces: count,
      conversionFromPrevious: conv.rate,
      dropOffFromPrevious: conv.rate == null ? null : 1 - conv.rate,
      medianHoursToNext: null,
      status,
      reason:
        conv.status === "insufficient_data"
          ? conv.reason
          : truncated
            ? reason
              ? `${reason}; sample may be truncated at ${ANALYTICS_SAMPLE_CAP}`
              : `Sample truncated at ${ANALYTICS_SAMPLE_CAP}`
            : reason,
      source,
    };
  }

  const steps: FunnelStepStat[] = [
    stage(
      "signup",
      "Signup",
      causal.signup,
      null,
      "available",
      "workspaces.created_at",
    ),
    stage(
      "import_completed",
      "Import completed",
      causal.imported,
      causal.signup,
      "partial",
      "import_jobs.status=completed",
      `completed_at (fallback updated_at); within ${ACTIVATION_WINDOW_DAYS}d of workspace creation`,
    ),
    stage(
      "website_generated",
      "Website generated",
      causal.generated,
      causal.imported,
      "partial",
      "websites.created_at",
      "Generation timestamp = earliest websites.created_at ≥ import and within window",
    ),
    hasPreviewTelemetry
      ? stage(
          "website_previewed",
          "Website previewed",
          causal.previewProxy,
          causal.generated,
          "partial",
          "product_events.website_edited",
          "Preview proxy based on website_edited — not dedicated website_previewed telemetry",
        )
      : stage(
          "website_previewed",
          "Website previewed",
          null,
          null,
          "unavailable",
          "product_events.website_edited",
          "No website_previewed instrumentation; website_edited proxy has no evidence in range",
        ),
    stage(
      "website_published",
      "Website published",
      causal.published,
      causal.generated,
      "partial",
      "websites.published_at",
      `published_at ≥ generation; within ${ACTIVATION_WINDOW_DAYS}d of workspace creation`,
    ),
  ];

  return {
    range,
    mode: "workspace",
    steps,
    note: `${note} Generation semantic: websites.created_at. Preview is proxy-only.`,
  };
}

// ─── Retention & Cohorts ──────────────────────────────────────

export type RetentionDay = {
  day: number;
  retained: number | null;
  cohortSize: number;
  matureSize: number;
  rate: number | null;
  status: "available" | "insufficient_data" | "pending" | "partial" | "error";
  reason?: string;
};

export type RetentionIntelligence = {
  cohortBasis: "signup_date";
  activityDefinition: string;
  cutoffAt: string;
  timezone: "UTC";
  range: ReturnType<typeof resolveDateRange>;
  days: RetentionDay[];
  weekly: Array<{
    week: number;
    retained: number | null;
    cohortSize: number;
    matureSize: number;
    rate: number | null;
    status: "available" | "insufficient_data" | "pending" | "partial" | "error";
    reason?: string;
  }>;
  status: "available" | "unavailable" | "error" | "partial";
  reason?: string;
};

export async function getRetentionIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<RetentionIntelligence> {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  assertRangeBounded(range.start, range.end);
  const cutoffAt = new Date().toISOString();

  const activityDefinition =
    "Activity-based retention (NOT session/login retention). Activity = product_events.occurred_at OR websites.updated_at OR import_jobs.updated_at attributed to the user, with activity_at ≤ cutoff. Cohort = profiles.created_at. Timezone = UTC. Immature Day/Week cells are pending — never shown as 0%.";

  if (!supabaseConfigured()) {
    return {
      cohortBasis: "signup_date",
      activityDefinition,
      cutoffAt,
      timezone: "UTC",
      range,
      days: [],
      weekly: [],
      status: "unavailable",
      reason: "Supabase not configured",
    };
  }

  const db = getSupabaseAdmin();
  const [profilesRes, eventsRes, sitesRes, jobsRes] = await Promise.all([
    db
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("product_events")
      .select("user_id, occurred_at")
      .not("user_id", "is", null)
      .gte("occurred_at", range.start)
      .lte("occurred_at", cutoffAt)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("workspace_id, updated_at")
      .is("deleted_at", null)
      .gte("updated_at", range.start)
      .lte("updated_at", cutoffAt)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("import_jobs")
      .select("workspace_id, updated_at, user_id")
      .gte("updated_at", range.start)
      .lte("updated_at", cutoffAt)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  if (profilesRes.error) {
    logAdminFailure("phase6.retention.profiles", profilesRes.error.message);
    return {
      cohortBasis: "signup_date",
      activityDefinition,
      cutoffAt,
      timezone: "UTC",
      range,
      days: [],
      weekly: [],
      status: "error",
      reason: `Profiles query failed: ${profilesRes.error.message}`,
    };
  }

  const profiles = (profilesRes.data ?? []).map((p) => ({
    id: p.id as string,
    created_at: p.created_at as string,
  }));
  const truncated =
    profiles.length >= ANALYTICS_SAMPLE_CAP ||
    (eventsRes.data ?? []).length >= ANALYTICS_SAMPLE_CAP ||
    (sitesRes.data ?? []).length >= ANALYTICS_SAMPLE_CAP ||
    (jobsRes.data ?? []).length >= ANALYTICS_SAMPLE_CAP;

  const { data: wsRows, error: wsError } = await db
    .from("workspaces")
    .select("id, owner_id")
    .is("deleted_at", null)
    .limit(ANALYTICS_SAMPLE_CAP);
  if (wsError) {
    logAdminFailure("phase6.retention.workspaces", wsError.message);
    return {
      cohortBasis: "signup_date",
      activityDefinition,
      cutoffAt,
      timezone: "UTC",
      range,
      days: [],
      weekly: [],
      status: "error",
      reason: `Workspaces query failed: ${wsError.message}`,
    };
  }
  const ownerByWs = new Map(
    (wsRows ?? []).map((w) => [w.id as string, w.owner_id as string]),
  );

  const activitiesByUser = new Map<string, string[]>();
  function pushActivity(userId: string | null | undefined, at: string) {
    if (!userId) return;
    if (Date.parse(at) > Date.parse(cutoffAt)) return;
    const list = activitiesByUser.get(userId) ?? [];
    list.push(at);
    activitiesByUser.set(userId, list);
  }

  for (const e of eventsRes.data ?? []) {
    pushActivity(e.user_id as string, e.occurred_at as string);
  }
  for (const s of sitesRes.data ?? []) {
    pushActivity(ownerByWs.get(s.workspace_id as string), s.updated_at as string);
  }
  for (const j of jobsRes.data ?? []) {
    const uid =
      (j.user_id as string | null) ??
      ownerByWs.get(j.workspace_id as string);
    pushActivity(uid, j.updated_at as string);
  }

  const dayOffsets = [1, 7, 14, 30];
  const days: RetentionDay[] = dayOffsets.map((day) => {
    const cell = computeRetentionDayCell({
      profiles,
      activitiesByUser,
      dayOffset: day,
      cutoffAt,
    });
    return {
      day,
      retained: cell.retained,
      cohortSize: cell.cohortSize,
      matureSize: cell.matureSize,
      rate: cell.rate,
      status: truncated && cell.status === "available" ? "partial" : cell.status,
      reason:
        truncated && cell.status === "available"
          ? `${cell.reason ?? "ok"}; sample may be truncated`
          : cell.reason,
    };
  });

  const weekOffsets = [0, 1, 2, 3, 4, 8, 12];
  const weekly = weekOffsets.map((week) => {
    const cell = computeRetentionWeekCell({
      profiles,
      activitiesByUser,
      weekOffset: week,
      cutoffAt,
    });
    return {
      week,
      retained: cell.retained,
      cohortSize: cell.cohortSize,
      matureSize: cell.matureSize,
      rate: cell.rate,
      status: truncated && cell.status === "available" ? "partial" : cell.status,
      reason:
        truncated && cell.status === "available"
          ? `${cell.reason ?? "ok"}; sample may be truncated`
          : cell.reason,
    };
  });

  return {
    cohortBasis: "signup_date",
    activityDefinition,
    cutoffAt,
    timezone: "UTC",
    range,
    days,
    weekly,
    status: truncated ? "partial" : "available",
    reason: truncated
      ? `Sample truncated at ${ANALYTICS_SAMPLE_CAP}`
      : undefined,
  };
}

export type CohortRow = {
  weekKey: string;
  size: number;
  cells: Array<{
    week: number;
    retained: number | null;
    rate: number | null;
    status: "available" | "insufficient_data" | "pending";
  }>;
};

export async function getCohortTable(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<{
  cohortBasis: "signup_week";
  rows: CohortRow[];
  note: string;
  status: "available" | "unavailable" | "error" | "partial";
  reason?: string;
}> {
  const retention = await getRetentionIntelligence(input);
  const note =
    "Rows = signup week (UTC). Columns W0–W12 = activity-based retention with maturity gates. Immature cells = pending (never 0%). Timezone UTC.";

  if (retention.status === "unavailable" || retention.status === "error") {
    return {
      cohortBasis: "signup_week",
      rows: [],
      note,
      status: retention.status,
      reason: retention.reason,
    };
  }

  if (!supabaseConfigured()) {
    return {
      cohortBasis: "signup_week",
      rows: [],
      note,
      status: "unavailable",
      reason: "Supabase not configured",
    };
  }

  const db = getSupabaseAdmin();
  const range = retention.range;
  const cutoffAt = retention.cutoffAt;
  const { data: profiles, error: profilesError } = await db
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  if (profilesError) {
    logAdminFailure("phase6.cohorts.profiles", profilesError.message);
    return {
      cohortBasis: "signup_week",
      rows: [],
      note,
      status: "error",
      reason: `Profiles query failed: ${profilesError.message}`,
    };
  }

  const { data: events } = await db
    .from("product_events")
    .select("user_id, occurred_at")
    .not("user_id", "is", null)
    .gte("occurred_at", range.start)
    .lte("occurred_at", cutoffAt)
    .limit(ANALYTICS_SAMPLE_CAP);

  const byWeek = new Map<string, Array<{ id: string; created_at: string }>>();
  for (const p of profiles ?? []) {
    const key = utcWeekKey(p.created_at as string);
    const list = byWeek.get(key) ?? [];
    list.push({ id: p.id as string, created_at: p.created_at as string });
    byWeek.set(key, list);
  }

  const acts = new Map<string, string[]>();
  for (const e of events ?? []) {
    const uid = e.user_id as string;
    const at = e.occurred_at as string;
    if (Date.parse(at) > Date.parse(cutoffAt)) continue;
    const list = acts.get(uid) ?? [];
    list.push(at);
    acts.set(uid, list);
  }

  const weekOffsets = [0, 1, 2, 3, 4, 8, 12];
  const rows: CohortRow[] = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, members]) => {
      const cells = weekOffsets.map((week) => {
        const cell = computeRetentionWeekCell({
          profiles: members,
          activitiesByUser: acts,
          weekOffset: week,
          cutoffAt,
        });
        return {
          week,
          retained: cell.retained,
          rate: cell.rate,
          status:
            cell.status === "pending"
              ? ("pending" as const)
              : cell.status === "insufficient_data"
                ? ("insufficient_data" as const)
                : ("available" as const),
        };
      });
      return { weekKey, size: members.length, cells };
    });

  return {
    cohortBasis: "signup_week",
    rows,
    note,
    status: retention.status,
    reason: retention.reason,
  };
}

// ─── Feature adoption ─────────────────────────────────────────

export async function getFeatureAdoptionIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<{ features: FeatureAdoptionStat[]; range: ReturnType<typeof resolveDateRange> }> {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  assertRangeBounded(range.start, range.end);

  if (!supabaseConfigured()) {
    return {
      range,
      features: MEASURABLE_FEATURES.map((f) => ({
        id: f.id,
        label: f.label,
        eligible: null,
        adopters: null,
        adoptionRate: null,
        status: "unavailable" as const,
        reason: "Supabase not configured",
        source: f.source,
      })),
    };
  }

  const db = getSupabaseAdmin();
  const [
    wsCount,
    siteWs,
    pubWs,
    imports,
    domains,
    pubs,
    aiUsers,
    editEvents,
  ] = await Promise.all([
    db
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    db
      .from("websites")
      .select("workspace_id")
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("workspace_id")
      .is("deleted_at", null)
      .or("status.eq.published,published_at.not.is.null")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("instagram_imports")
      .select("workspace_id")
      .limit(ANALYTICS_SAMPLE_CAP),
    db.from("domains").select("website_id").limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("publications")
      .select("workspace_id")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("ai_usage_logs")
      .select("user_id")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("product_events")
      .select("workspace_id")
      .in("event_name", ["website_edited", "editor_saved"])
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  const eligibleAll = wsCount.count ?? 0;
  const withSite = new Set(
    (siteWs.data ?? []).map((r) => r.workspace_id as string),
  ).size;
  const withPub = new Set(
    (pubWs.data ?? []).map((r) => r.workspace_id as string),
  ).size;
  const importAdopters = new Set(
    (imports.data ?? []).map((r) => r.workspace_id as string),
  ).size;
  const domainAdopters = new Set(
    (domains.data ?? []).map((r) => r.website_id as string),
  ).size;
  const pubAdopters = new Set(
    (pubs.data ?? [])
      .map((r) => r.workspace_id as string | null)
      .filter(Boolean) as string[],
  ).size;
  const aiAdopters = new Set(
    (aiUsers.data ?? [])
      .map((r) => r.user_id as string | null)
      .filter(Boolean) as string[],
  ).size;
  const editorAdopters = new Set(
    (editEvents.data ?? [])
      .map((r) => r.workspace_id as string | null)
      .filter(Boolean) as string[],
  ).size;

  const features: FeatureAdoptionStat[] = MEASURABLE_FEATURES.map((f) => {
    switch (f.id) {
      case "instagram_import": {
        const rate = adoptionRate(importAdopters, eligibleAll);
        return {
          id: f.id,
          label: f.label,
          eligible: eligibleAll,
          adopters: importAdopters,
          adoptionRate: rate,
          status: "available" as const,
          source: "instagram_imports",
        };
      }
      case "website_editor": {
        if (editorAdopters === 0) {
          return {
            id: f.id,
            label: f.label,
            eligible: withSite,
            adopters: null,
            adoptionRate: null,
            status: "unavailable" as const,
            reason: "No website_edited product events in range yet",
            source: "product_events.website_edited",
          };
        }
        return {
          id: f.id,
          label: f.label,
          eligible: withSite,
          adopters: editorAdopters,
          adoptionRate: adoptionRate(editorAdopters, withSite),
          status: "partial" as const,
          reason: "Based on website_edited events only",
          source: "product_events.website_edited",
        };
      }
      case "website_publish":
        return {
          id: f.id,
          label: f.label,
          eligible: withSite,
          adopters: withPub,
          adoptionRate: adoptionRate(withPub, withSite),
          status: "available" as const,
          source: "websites.status|published_at",
        };
      case "custom_domain":
        return {
          id: f.id,
          label: f.label,
          eligible: withPub,
          adopters: domainAdopters,
          adoptionRate: adoptionRate(domainAdopters, withPub),
          status: "partial" as const,
          reason: "Adopters counted by domain rows (website-level), eligible by published workspaces",
          source: "domains",
        };
      case "ai_generation":
        return {
          id: f.id,
          label: f.label,
          eligible: eligibleAll,
          adopters: aiAdopters,
          adoptionRate: adoptionRate(aiAdopters, eligibleAll),
          status: "available" as const,
          source: "ai_usage_logs.user_id",
        };
      case "channel_publishing": {
        if ((pubs.error && /does not exist|relation/i.test(pubs.error.message)) || pubs.data == null) {
          return {
            id: f.id,
            label: f.label,
            eligible: withPub,
            adopters: null,
            adoptionRate: null,
            status: "unavailable" as const,
            reason: pubs.error?.message ?? "publications table unavailable",
            source: "publications",
          };
        }
        return {
          id: f.id,
          label: f.label,
          eligible: withPub,
          adopters: pubAdopters,
          adoptionRate: adoptionRate(pubAdopters, withPub),
          status: "available" as const,
          source: "publications",
        };
      }
      default:
        return {
          id: f.id,
          label: f.label,
          eligible: null,
          adopters: null,
          adoptionRate: null,
          status: "unavailable" as const,
          reason: "Unknown feature",
          source: f.source,
        };
    }
  });

  return { range, features };
}

// ─── Customer intelligence (bounded list) ─────────────────────

export type CustomerIntelRow = {
  workspaceId: string;
  name: string;
  plan: string;
  createdAt: string;
  healthScore: number | null;
  healthCategory: string;
  lifecycle: string;
  riskFlags: ReturnType<typeof detectAtRisk>;
  websiteCount: number;
  publishedCount: number;
  successfulImports: number;
  daysSinceActivity: number | null;
};

export async function getCustomerIntelligence(input: {
  userId: string;
  limit?: number;
  segment?: {
    plan?: string;
    health?: string;
    lifecycle?: string;
    activated?: boolean;
  };
}): Promise<{ rows: CustomerIntelRow[]; note: string }> {
  await requireAdminPermission(input.userId, "workspaces.read");
  const limit = Math.min(input.limit ?? 100, 200);
  const note =
    "Health/lifecycle/risk are rule-based and explainable. Not predictive ML.";

  if (!supabaseConfigured()) return { rows: [], note };

  const db = getSupabaseAdmin();
  const since14 = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const { data: workspaces } = await db
    .from("workspaces")
    .select("id, name, plan, created_at, owner_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  const wsIds = (workspaces ?? []).map((w) => w.id as string);
  if (wsIds.length === 0) return { rows: [], note };

  const [sites, imports, jobs, ai, pubs] = await Promise.all([
    db
      .from("websites")
      .select("workspace_id, status, published_at, updated_at")
      .in("workspace_id", wsIds)
      .is("deleted_at", null),
    db
      .from("instagram_imports")
      .select("workspace_id, created_at")
      .in("workspace_id", wsIds),
    db
      .from("import_jobs")
      .select("workspace_id, status, updated_at")
      .in("workspace_id", wsIds)
      .gte("updated_at", since14)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("ai_usage_logs")
      .select("workspace_id, created_at")
      .in("workspace_id", wsIds)
      .gte("created_at", since14)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("publications")
      .select("workspace_id, status, created_at")
      .in("workspace_id", wsIds)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  const rows: CustomerIntelRow[] = [];
  for (const w of workspaces ?? []) {
    const id = w.id as string;
    const wsSites = (sites.data ?? []).filter((s) => s.workspace_id === id);
    const wsImports = (imports.data ?? []).filter((i) => i.workspace_id === id);
    const wsJobs = (jobs.data ?? []).filter((j) => j.workspace_id === id);
    const wsAi = (ai.data ?? []).filter((a) => a.workspace_id === id);
    const wsPubs = (pubs.data ?? []).filter((p) => p.workspace_id === id);

    const publishedCount = wsSites.filter(
      (s) => s.status === "published" || s.published_at,
    ).length;
    const failedJobs = wsJobs.filter((j) => j.status === "failed").length;
    const failedPubs = wsPubs.filter(
      (p) => p.status === "failed" || p.status === "error",
    ).length;

    const activityDates = [
      ...wsSites.map((s) => s.updated_at as string),
      ...wsImports.map((i) => i.created_at as string),
      ...wsJobs.map((j) => j.updated_at as string),
      ...wsAi.map((a) => a.created_at as string),
    ].filter(Boolean);
    const lastActivity =
      activityDates.length > 0
        ? activityDates.sort().at(-1)!
        : (w.created_at as string);
    const daysSince = Math.floor(
      (Date.now() - Date.parse(lastActivity)) / 86_400_000,
    );
    const ageDays = Math.floor(
      (Date.now() - Date.parse(w.created_at as string)) / 86_400_000,
    );

    const health = computeHealthScore({
      daysSinceActivity: daysSince,
      hasPublishedWebsite: publishedCount > 0,
      hasWebsite: wsSites.length > 0,
      successfulImports: wsImports.length,
      failedJobsRecent: failedJobs,
      aiRequestsRecent: wsAi.length,
      publicationCount: wsPubs.length,
    });

    const lifecycle = resolveLifecycle({
      ageDays,
      hasWebsite: wsSites.length > 0,
      hasPublishedWebsite: publishedCount > 0,
      successfulImports: wsImports.length,
      daysSinceActivity: daysSince,
      aiRequestsRecent: wsAi.length,
      publicationCount: wsPubs.length,
      websiteCount: wsSites.length,
      healthCategory: health.category,
    });

    const riskFlags = detectAtRisk({
      daysSinceActivity: daysSince,
      lastActivityAt: lastActivity,
      hasPublishedWebsite: publishedCount > 0,
      hasWebsite: wsSites.length > 0,
      successfulImports: wsImports.length,
      failedImports: failedJobs,
      failedJobsRecent: failedJobs,
      publishingFailuresRecent: failedPubs,
      ageDays,
      activityRecent: wsJobs.length + wsAi.length,
      activityPrevious: null,
    });

    const row: CustomerIntelRow = {
      workspaceId: id,
      name: (w.name as string) ?? id.slice(0, 8),
      plan: (w.plan as string) ?? "free",
      createdAt: w.created_at as string,
      healthScore: health.score,
      healthCategory: health.category,
      lifecycle: lifecycle.stage,
      riskFlags,
      websiteCount: wsSites.length,
      publishedCount,
      successfulImports: wsImports.length,
      daysSinceActivity: daysSince,
    };

    const seg = input.segment;
    if (seg?.plan && row.plan !== seg.plan) continue;
    if (seg?.health && row.healthCategory !== seg.health) continue;
    if (seg?.lifecycle && row.lifecycle !== seg.lifecycle) continue;
    if (seg?.activated === true && row.publishedCount === 0 && row.successfulImports === 0)
      continue;
    if (seg?.activated === false && (row.publishedCount > 0 || row.successfulImports > 0))
      continue;

    rows.push(row);
  }

  return { rows, note };
}

// ─── Founder insights (bounded) ───────────────────────────────

export async function getFounderInsightsLite(input: {
  userId: string;
}): Promise<{
  insights: FounderInsight[];
  note: string;
  atRisk: MetricResult<number>;
}> {
  await authorize(input.userId);
  const note =
    "Deterministic rule-based insights from head-counts and bounded rates. Not causal claims.";

  if (!supabaseConfigured()) {
    return {
      insights: [],
      note,
      atRisk: unavailable("Supabase not configured", "at_risk"),
    };
  }

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const d1 = new Date(Date.now() - 86_400_000).toISOString();
  const d2 = new Date(Date.now() - 2 * 86_400_000).toISOString();

  const [failed24, failedPrev, queued, activation] = await Promise.all([
    db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", d1),
    db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("updated_at", d2)
      .lt("updated_at", d1),
    db
      .from("import_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "retrying"]),
    getActivationIntelligence({ userId: input.userId, preset: "30d" }),
  ]);

  let atRisk: MetricResult<number>;
  let atRiskCount: number | null = null;
  try {
    const atRiskApprox = await getCustomerIntelligence({
      userId: input.userId,
      limit: 100,
    });
    atRiskCount = atRiskApprox.rows.filter((r) => r.riskFlags.length > 0)
      .length;
    atRisk = available(atRiskCount, "workspaces.read rule-based at-risk");
  } catch (error) {
    if (error instanceof AdminAuthError && error.code === "FORBIDDEN") {
      atRisk = {
        status: "permission_denied",
        reason: "workspaces.read required to compute at-risk customers",
        source: "rbac",
      };
    } else {
      atRisk = metricError(
        error instanceof Error ? error.message : "At-risk query failed",
        "at_risk",
      );
    }
    atRiskCount = null;
  }

  const actRate =
    activation.activationRate.status === "available" ||
    activation.activationRate.status === "partial"
      ? activation.activationRate.value
      : null;

  const insights = generateFounderInsights({
    generatedAt: now,
    activationRate: actRate,
    previousActivationRate: null,
    day7Retention: null,
    previousDay7Retention: null,
    failedJobs24h: failed24.count ?? null,
    previousFailedJobs24h: failedPrev.count ?? null,
    queueDepth: queued.count ?? null,
    aiErrorRate: null,
    previousAiErrorRate: null,
    atRiskCount,
    publishingFailures24h: null,
    previousPublishingFailures24h: null,
  });

  return { insights, note, atRisk };
}

// ─── Data quality ─────────────────────────────────────────────

export async function getDataQualityReport(input: {
  userId: string;
  preset?: DateRangePreset;
}) {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });

  if (!supabaseConfigured()) {
    return {
      issues: assessDataQuality({
        eventsMissingTimestamp: 0,
        eventsInvalidUserRef: 0,
        eventsDuplicateFingerprints: 0,
        staleTelemetryHours: null,
        aiUsageMissingCost: 0,
        billingAmountMissing: true,
        productEventsSampleSize: 0,
      }),
      range,
    };
  }

  const db = getSupabaseAdmin();
  const { data: events } = await db
    .from("product_events")
    .select("id, occurred_at, user_id, event_name, workspace_id")
    .gte("occurred_at", range.start)
    .lt("occurred_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  const rows = events ?? [];
  const { data: latest } = await db
    .from("product_events")
    .select("occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(1);

  const lastAt = latest?.[0]?.occurred_at
    ? Date.parse(latest[0].occurred_at as string)
    : null;
  const staleHours =
    lastAt == null
      ? 999
      : Math.floor((Date.now() - lastAt) / 3_600_000);

  const { count: missingCost } = await db
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .is("estimated_cost", null)
    .gte("created_at", range.start)
    .lt("created_at", range.end);

  // Duplicate heuristic: same user+event within same second
  const seen = new Set<string>();
  let dupes = 0;
  for (const e of rows) {
    const key = `${e.user_id}|${e.event_name}|${String(e.occurred_at).slice(0, 19)}`;
    if (seen.has(key)) dupes += 1;
    else seen.add(key);
  }

  return {
    range,
    issues: assessDataQuality({
      eventsMissingTimestamp: rows.filter((e) => !e.occurred_at).length,
      eventsInvalidUserRef: 0,
      eventsDuplicateFingerprints: dupes,
      staleTelemetryHours: staleHours,
      aiUsageMissingCost: missingCost ?? 0,
      billingAmountMissing: true,
      productEventsSampleSize: rows.length,
    }),
  };
}

// ─── Business intelligence (honest) ───────────────────────────

export async function getBusinessIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}) {
  await authorize(input.userId);
  const activation = await getActivationIntelligence(input);
  const range = activation.range;

  if (!supabaseConfigured()) {
    return {
      range,
      signupToActivation: unavailable("Supabase not configured"),
      activationToPublish: unavailable("Supabase not configured"),
      planDistribution: [] as Array<{ plan: string; count: number }>,
      revenue: unavailable(
        "Billing amount/currency telemetry is not wired — Revenue unavailable",
        "billing",
      ),
      mrr: unavailable(
        "Billing provider telemetry is not available — MRR unavailable",
        "billing",
      ),
      planMovement: unavailable(
        "subscription_changed events are not instrumented",
        "product_events",
      ),
    };
  }

  const db = getSupabaseAdmin();
  const { data: plans } = await db
    .from("workspaces")
    .select("plan")
    .is("deleted_at", null)
    .limit(ANALYTICS_SAMPLE_CAP);

  const dist = new Map<string, number>();
  for (const p of plans ?? []) {
    const plan = (p.plan as string) || "unknown";
    dist.set(plan, (dist.get(plan) ?? 0) + 1);
  }

  const { count: publishedWs } = await db
    .from("websites")
    .select("workspace_id", { count: "exact", head: true })
    .is("deleted_at", null)
    .or("status.eq.published,published_at.not.is.null");

  const activated =
    activation.activatedWorkspaces.status === "available"
      ? activation.activatedWorkspaces.value
      : null;

  return {
    range,
    signupToActivation: activation.activationRate,
    activationToPublish:
      activated == null || activated === 0
        ? unavailable("No activated workspaces to compute publish conversion")
        : available(
            Math.min(1, (publishedWs ?? 0) / activated),
            "published_websites / activated_workspaces (approx)",
          ),
    planDistribution: [...dist.entries()].map(([plan, count]) => ({
      plan,
      count,
    })),
    revenue: unavailable(
      "store_orders has no amount/currency columns — Revenue unavailable",
      "billing",
    ),
    mrr: unavailable(
      "No Stripe/billing amount telemetry — MRR unavailable",
      "billing",
    ),
    planMovement: unavailable(
      "subscription_changed / plan movement events not instrumented",
      "product_events",
    ),
  };
}

export { resolveComparisonPeriod };
