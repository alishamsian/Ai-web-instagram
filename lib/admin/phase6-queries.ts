/**
 * Phase 6 — Founder Intelligence queries (server-only).
 * All metrics from real Supabase tables or honest unavailable.
 * No N+1: batch fetches with caps.
 */

import "server-only";

import { supabaseConfigured, getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminPermission } from "@/lib/admin/rbac";
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
  retentionPercent,
  utcWeekKey,
  isRetainedOnDay,
  isRetainedInWeek,
  type FunnelStepStat,
} from "@/lib/admin/intelligence/metrics";
import {
  ANALYTICS_SAMPLE_CAP,
  MAX_ANALYTICS_DAYS,
  MIN_COHORT_SIZE,
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
function insufficientSample<T = number>(
  reason: string,
  sampleSize: number,
  source?: string,
): MetricResult<T> {
  return { status: "insufficient_sample", reason, sampleSize, source };
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
    const u = unavailable("Supabase not configured");
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

  const db = getSupabaseAdmin();

  const [profilesRes, websitesRes, importsRes, workspacesRes] = await Promise.all([
    db
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("id, workspace_id, published_at, status, created_at")
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("instagram_imports")
      .select("id, workspace_id, created_at")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("workspaces")
      .select("id, owner_id, created_at")
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  if (profilesRes.error) {
    logAdminFailure("phase6.activation.profiles", profilesRes.error.message);
  }

  const profiles = profilesRes.data ?? [];
  const websites = websitesRes.data ?? [];
  const imports = importsRes.data ?? [];
  const workspaces = workspacesRes.data ?? [];

  const ownerByWs = new Map(
    workspaces.map((w) => [w.id as string, w.owner_id as string | null]),
  );

  const publishedByWs = new Map<string, string>();
  for (const w of websites) {
    const pub =
      w.published_at ??
      (w.status === "published" ? (w.created_at as string) : null);
    if (!pub) continue;
    const ws = w.workspace_id as string;
    const prev = publishedByWs.get(ws);
    if (!prev || pub < prev) publishedByWs.set(ws, pub);
  }

  const importByWs = new Map<string, string>();
  for (const row of imports) {
    const ws = row.workspace_id as string;
    const at = row.created_at as string;
    const prev = importByWs.get(ws);
    if (!prev || at < prev) importByWs.set(ws, at);
  }

  const activatedWs = new Set([...publishedByWs.keys(), ...importByWs.keys()]);
  const activatedOwners = new Set<string>();
  for (const ws of activatedWs) {
    const owner = ownerByWs.get(ws);
    if (owner) activatedOwners.add(owner);
  }

  const eligible = profiles.length;
  const activatedInCohort = profiles.filter((p) =>
    activatedOwners.has(p.id as string),
  ).length;

  const hours: number[] = [];
  for (const p of profiles) {
    if (!activatedOwners.has(p.id as string)) continue;
    const owned = workspaces.filter((w) => w.owner_id === p.id);
    let first: string | null = null;
    for (const w of owned) {
      const candidates = [
        publishedByWs.get(w.id as string),
        importByWs.get(w.id as string),
      ].filter(Boolean) as string[];
      for (const c of candidates) {
        if (!first || c < first) first = c;
      }
    }
    if (first && first >= (p.created_at as string)) {
      hours.push(
        (Date.parse(first) - Date.parse(p.created_at as string)) / 3_600_000,
      );
    }
  }

  const rate = conversionRate(activatedInCohort, eligible);
  const med = median(hours);

  const truncated =
    profiles.length >= ANALYTICS_SAMPLE_CAP ||
    websites.length >= ANALYTICS_SAMPLE_CAP;

  return {
    definition: ACTIVATION_DEFINITION,
    range,
    eligibleUsers: available(eligible, "profiles.created_at"),
    activatedUsers: available(
      activatedInCohort,
      "websites.published|instagram_imports ∩ profiles",
    ),
    activatedWorkspaces: available(
      activatedWs.size,
      "websites.published|instagram_imports",
    ),
    activationRate:
      rate == null
        ? unavailable("No eligible users in range", "activation_rate")
        : truncated
          ? {
              status: "partial",
              value: rate,
              source: "activation_rate",
              warning: `Sample truncated at ${ANALYTICS_SAMPLE_CAP}`,
            }
          : available(rate, "activated/eligible profiles"),
    medianHoursToActivation:
      med == null
        ? insufficientSample(
            "No activated users with measurable time-to-activation",
            hours.length,
            "median_hours_to_activation",
          )
        : available(med, "median(first_activation - signup)"),
    dropOff:
      rate == null
        ? unavailable("No eligible users")
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
    "Funnel uses table existence timestamps (profiles → imports → websites → publish). Preview step is unavailable until website_previewed is instrumented. Observed counts — not causal attribution.";

  if (!supabaseConfigured()) {
    return {
      range,
      mode: "workspace",
      note,
      steps: [],
    };
  }

  const db = getSupabaseAdmin();
  const [wsRes, importRes, siteRes, pubRes, editEvents] = await Promise.all([
    db
      .from("workspaces")
      .select("id, created_at")
      .is("deleted_at", null)
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("instagram_imports")
      .select("workspace_id, created_at")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("workspace_id, created_at, published_at, status")
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("workspace_id, published_at, status")
      .is("deleted_at", null)
      .or("status.eq.published,published_at.not.is.null")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("product_events")
      .select("workspace_id, occurred_at")
      .eq("event_name", "website_edited")
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  const cohort = new Set((wsRes.data ?? []).map((w) => w.id as string));
  const signupN = cohort.size;

  const imported = new Set<string>();
  for (const row of importRes.data ?? []) {
    const ws = row.workspace_id as string;
    if (cohort.has(ws)) imported.add(ws);
  }

  const generated = new Set<string>();
  for (const row of siteRes.data ?? []) {
    const ws = row.workspace_id as string;
    if (cohort.has(ws)) generated.add(ws);
  }

  const edited = new Set<string>();
  for (const row of editEvents.data ?? []) {
    const ws = row.workspace_id as string | null;
    if (ws && cohort.has(ws)) edited.add(ws);
  }

  const published = new Set<string>();
  for (const row of pubRes.data ?? []) {
    const ws = row.workspace_id as string;
    if (cohort.has(ws)) published.add(ws);
  }

  function step(
    id: FunnelStepStat["id"],
    label: string,
    count: number,
    prev: number | null,
    status: FunnelStepStat["status"],
    source: string,
    reason?: string,
  ): FunnelStepStat {
    const conv = prev == null ? null : conversionRate(count, prev);
    return {
      id,
      label,
      users: null,
      workspaces: status === "unavailable" ? null : count,
      conversionFromPrevious: conv,
      dropOffFromPrevious: conv == null ? null : 1 - conv,
      medianHoursToNext: null,
      status,
      reason,
      source,
    };
  }

  const steps: FunnelStepStat[] = [
    step("signup", "Signup", signupN, null, "available", "workspaces.created_at"),
    step(
      "import_completed",
      "Import completed",
      imported.size,
      signupN,
      "partial",
      "instagram_imports.workspace_id",
    ),
    step(
      "website_generated",
      "Website generated",
      generated.size,
      imported.size || signupN,
      "partial",
      "websites.created_at",
    ),
    {
      id: "website_previewed",
      label: "Website previewed",
      users: null,
      workspaces: edited.size > 0 ? edited.size : null,
      conversionFromPrevious:
        edited.size > 0 ? conversionRate(edited.size, generated.size) : null,
      dropOffFromPrevious: null,
      medianHoursToNext: null,
      status: edited.size > 0 ? "partial" : "unavailable",
      reason:
        edited.size > 0
          ? "Proxied via website_edited events (not dedicated preview)"
          : "No website_previewed instrumentation",
      source: "product_events.website_edited",
    },
    step(
      "website_published",
      "Website published",
      published.size,
      generated.size || signupN,
      "partial",
      "websites.published_at|status",
    ),
  ];

  return { range, mode: "workspace", steps, note };
}

// ─── Retention & Cohorts ──────────────────────────────────────

export type RetentionDay = {
  day: number;
  retained: number | null;
  cohortSize: number;
  rate: number | null;
  status: "available" | "insufficient_data";
  reason?: string;
};

export type RetentionIntelligence = {
  cohortBasis: "signup_date";
  activityDefinition: string;
  range: ReturnType<typeof resolveDateRange>;
  days: RetentionDay[];
  weekly: Array<{
    week: number;
    retained: number | null;
    cohortSize: number;
    rate: number | null;
    status: "available" | "insufficient_data";
    reason?: string;
  }>;
};

export async function getRetentionIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<RetentionIntelligence> {
  await authorize(input.userId);
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  assertRangeBounded(range.start, range.end);

  const activityDefinition =
    "Activity = any product_events.occurred_at OR websites.updated_at OR import_jobs.updated_at for the user/workspace after signup. Not session/login telemetry — if those are missing, retention is activity-based.";

  if (!supabaseConfigured()) {
    return {
      cohortBasis: "signup_date",
      activityDefinition,
      range,
      days: [],
      weekly: [],
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
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("websites")
      .select("workspace_id, updated_at")
      .is("deleted_at", null)
      .gte("updated_at", range.start)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("import_jobs")
      .select("workspace_id, updated_at, user_id")
      .gte("updated_at", range.start)
      .limit(ANALYTICS_SAMPLE_CAP),
  ]);

  const profiles = profilesRes.data ?? [];
  const cohortSize = profiles.length;

  // Map workspace → owner for activity attribution
  const { data: wsRows } = await db
    .from("workspaces")
    .select("id, owner_id")
    .is("deleted_at", null)
    .limit(ANALYTICS_SAMPLE_CAP);
  const ownerByWs = new Map(
    (wsRows ?? []).map((w) => [w.id as string, w.owner_id as string]),
  );

  const activitiesByUser = new Map<string, string[]>();
  function pushActivity(userId: string | null | undefined, at: string) {
    if (!userId) return;
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
    if (cohortSize < MIN_COHORT_SIZE) {
      return {
        day,
        retained: null,
        cohortSize,
        rate: null,
        status: "insufficient_data",
        reason: `cohort_size=${cohortSize} < min=${MIN_COHORT_SIZE}`,
      };
    }
    let retained = 0;
    for (const p of profiles) {
      const acts = activitiesByUser.get(p.id as string) ?? [];
      if (
        acts.some((a) => isRetainedOnDay(p.created_at as string, a, day))
      ) {
        retained += 1;
      }
    }
    const rp = retentionPercent(retained, cohortSize);
    return {
      day,
      retained,
      cohortSize,
      rate: rp.value,
      status: rp.status,
      reason: rp.reason,
    };
  });

  const weekOffsets = [0, 1, 2, 3, 4, 8, 12];
  const weekly = weekOffsets.map((week) => {
    if (cohortSize < MIN_COHORT_SIZE) {
      return {
        week,
        retained: null,
        cohortSize,
        rate: null,
        status: "insufficient_data" as const,
        reason: `cohort_size=${cohortSize} < min=${MIN_COHORT_SIZE}`,
      };
    }
    let retained = 0;
    for (const p of profiles) {
      const acts = activitiesByUser.get(p.id as string) ?? [];
      if (
        acts.some((a) => isRetainedInWeek(p.created_at as string, a, week))
      ) {
        retained += 1;
      }
    }
    const rp = retentionPercent(retained, cohortSize);
    return {
      week,
      retained,
      cohortSize,
      rate: rp.value,
      status: rp.status,
      reason: rp.reason,
    };
  });

  return {
    cohortBasis: "signup_date",
    activityDefinition,
    range,
    days,
    weekly,
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
}> {
  const retention = await getRetentionIntelligence(input);
  const note =
    "Rows = signup week (UTC). Columns W0–W12 = activity-based retention. Insufficient data when cohort < min size.";

  if (!supabaseConfigured()) {
    return { cohortBasis: "signup_week", rows: [], note };
  }

  const db = getSupabaseAdmin();
  const range = retention.range;
  const { data: profiles } = await db
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  // Rebuild activity map (same as retention) — bounded
  const { data: events } = await db
    .from("product_events")
    .select("user_id, occurred_at")
    .not("user_id", "is", null)
    .gte("occurred_at", range.start)
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
    const list = acts.get(uid) ?? [];
    list.push(e.occurred_at as string);
    acts.set(uid, list);
  }

  const weekOffsets = [0, 1, 2, 3, 4, 8, 12];
  const rows: CohortRow[] = [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, members]) => {
      const size = members.length;
      const cells = weekOffsets.map((week) => {
        if (size < MIN_COHORT_SIZE) {
          return {
            week,
            retained: null,
            rate: null,
            status: "insufficient_data" as const,
          };
        }
        let retained = 0;
        for (const m of members) {
          const a = acts.get(m.id) ?? [];
          if (a.some((t) => isRetainedInWeek(m.created_at, t, week))) {
            retained += 1;
          }
        }
        const rp = retentionPercent(retained, size);
        return {
          week,
          retained,
          rate: rp.value,
          status: rp.status,
        };
      });
      return { weekKey, size, cells };
    });

  return { cohortBasis: "signup_week", rows, note };
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
}): Promise<{ insights: FounderInsight[]; note: string }> {
  await authorize(input.userId);
  const note =
    "Deterministic rule-based insights from head-counts and bounded rates. Not causal claims.";

  if (!supabaseConfigured()) {
    return { insights: [], note };
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

  let atRiskCount: number | null = null;
  try {
    const atRiskApprox = await getCustomerIntelligence({
      userId: input.userId,
      limit: 100,
    });
    atRiskCount = atRiskApprox.rows.filter((r) => r.riskFlags.length > 0)
      .length;
  } catch {
    atRiskCount = null;
  }

  const actRate =
    activation.activationRate.status === "available" ||
    activation.activationRate.status === "partial"
      ? activation.activationRate.value
      : null;

  // Retention/activation period deltas require daily_metrics history —
  // pass null rather than inventing a prior period comparison.
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

  return { insights, note };
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
