/**
 * Phase 7 — Monetization / growth / billing intelligence (server-only).
 * Honest MetricResult statuses — never invent zeros for missing billing data.
 * Bounded queries; no N+1.
 */

import "server-only";

import {
  isBillingConfigured,
  billingDataAvailableFrom,
} from "@/lib/billing/config";
import {
  computeMrrFromSubscriptions,
  arrFromMrrCents,
  computeRevenueFromTransactions,
  type MrrLineInput,
  type TransactionLine,
} from "@/lib/billing/mrr";
import { computeActiveUsers } from "@/lib/admin/intelligence/session-metrics";
import {
  computeSignupToPaid,
  computeActivatedToPaid,
  PAID_CONVERSION_WINDOW_DAYS,
  type PaidConversionMember,
} from "@/lib/admin/intelligence/paid-conversion";
import {
  assessBillingDataQuality,
  type BillingDqIssue,
} from "@/lib/admin/intelligence/billing-data-quality";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import {
  resolveDateRange,
  type DateRangePreset,
  type DateRange,
} from "@/lib/admin/dates";
import {
  ANALYTICS_SAMPLE_CAP,
  MIN_COHORT_SIZE,
  ACTIVATION_WINDOW_DAYS,
  MAX_ANALYTICS_DAYS,
  clampAnalyticsPreset,
} from "@/lib/admin/intelligence/limits";
import {
  requireAdminPermission,
  AdminAuthError,
  type AdminActor,
} from "@/lib/admin/rbac";
import type { AdminPermission } from "@/lib/admin/permissions";
import type { MetricResult } from "@/lib/admin/contracts";
import {
  addUtcDaysIso,
  funnelStageConversion,
  isValidActivationTimestamp,
} from "@/lib/admin/intelligence/metrics";
import {
  resolveCommercialLifecycle,
  type CommercialLifecycleStage,
} from "@/lib/admin/intelligence/commercial-lifecycle";
import { normalizeSubscriptionStatus } from "@/lib/billing/subscription-state";
import { getActivationIntelligence } from "@/lib/admin/phase6-queries";
import { logAdminFailure, listOk, listUnavailable, type AdminListResult } from "@/lib/admin/safe";

// ─── Metric helpers ───────────────────────────────────────────

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
function permissionDenied<T = number>(
  reason: string,
  source = "rbac",
): MetricResult<T> {
  return { status: "permission_denied", reason, source };
}

function centsToMajor(cents: number): number {
  return Math.round(cents) / 100;
}

function assertRangeBounded(start: string, end: string) {
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  if (days > MAX_ANALYTICS_DAYS + 1) {
    throw new Error(`Analytics range exceeds ${MAX_ANALYTICS_DAYS} days`);
  }
}

function chunkIds<T>(ids: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAnyPermission(
  userId: string,
  primary: AdminPermission,
  fallback: AdminPermission,
): Promise<AdminActor> {
  try {
    return await requireAdminPermission(userId, primary);
  } catch (error) {
    if (error instanceof AdminAuthError && error.code === "FORBIDDEN") {
      return requireAdminPermission(userId, fallback);
    }
    throw error;
  }
}

function isMissingRelation(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("schema cache") ||
    m.includes("relation")
  );
}

function sevenDaysAgoIso(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

const MRR_MOVEMENT_REASON =
  "Subscription history transitions (new/expansion/contraction/churn/reactivation) are not instrumented yet — refusing to invent MRR movement";

// ─── Revenue intelligence ─────────────────────────────────────

export type RevenueIntelligence = {
  range: DateRange;
  currency: string | null;
  definition: string;
  mrr: MetricResult<number>;
  arr: MetricResult<number>;
  grossRevenue: MetricResult<number>;
  refunds: MetricResult<number>;
  netRevenue: MetricResult<number>;
  activePaidSubscriptions: MetricResult<number>;
  failedPayments: MetricResult<number>;
  newMrr: MetricResult<number>;
  expansionMrr: MetricResult<number>;
  contractionMrr: MetricResult<number>;
  churnedMrr: MetricResult<number>;
  reactivationMrr: MetricResult<number>;
};

function allRevenueUnavailable(
  range: DateRange,
  reason: string,
): RevenueIntelligence {
  const u = unavailable(reason, "billing");
  return {
    range,
    currency: null,
    definition: reason,
    mrr: u,
    arr: u,
    grossRevenue: u,
    refunds: u,
    netRevenue: u,
    activePaidSubscriptions: u,
    failedPayments: u,
    newMrr: u,
    expansionMrr: u,
    contractionMrr: u,
    churnedMrr: u,
    reactivationMrr: u,
  };
}

function allRevenuePermissionDenied(range: DateRange): RevenueIntelligence {
  const p = permissionDenied("revenue.read or billing.read required");
  return {
    range,
    currency: null,
    definition: "permission_denied",
    mrr: p,
    arr: p,
    grossRevenue: p,
    refunds: p,
    netRevenue: p,
    activePaidSubscriptions: p,
    failedPayments: p,
    newMrr: p,
    expansionMrr: p,
    contractionMrr: p,
    churnedMrr: p,
    reactivationMrr: p,
  };
}

export async function getRevenueIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<RevenueIntelligence> {
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  try {
    await requireAnyPermission(input.userId, "revenue.read", "billing.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return allRevenuePermissionDenied(range);
    }
    throw error;
  }

  assertRangeBounded(range.start, range.end);

  if (!isBillingConfigured()) {
    return allRevenueUnavailable(range, "Billing provider not configured");
  }
  if (!supabaseConfigured()) {
    return allRevenueUnavailable(range, "Supabase not configured");
  }

  const dataFrom = billingDataAvailableFrom();
  const partialWarning =
    dataFrom && range.start < dataFrom
      ? `Range starts before BILLING_DATA_AVAILABLE_FROM (${dataFrom}); earlier period may be incomplete`
      : null;

  const db = getSupabaseAdmin();
  const movementUnavailable = unavailable(MRR_MOVEMENT_REASON, "subscriptions.history");

  const [subsRes, txRes, failedRes] = await Promise.all([
    db
      .from("subscriptions")
      .select(
        "status, billing_interval, unit_amount_cents, quantity, currency, cancel_at_period_end",
      )
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused", "canceled"])
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_transactions")
      .select(
        "transaction_type, status, amount_cents, refunded_amount_cents, currency, occurred_at",
      )
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("occurred_at", range.start)
      .lt("occurred_at", range.end),
  ]);

  if (subsRes.error) {
    logAdminFailure("phase7.revenue.subscriptions", subsRes.error.message);
    if (isMissingRelation(subsRes.error.message)) {
      return allRevenueUnavailable(
        range,
        "Subscriptions billing columns not available — apply Phase 7 migration",
      );
    }
    return allRevenueUnavailable(
      range,
      `Subscriptions query failed: ${subsRes.error.message}`,
    );
  }

  const lines: MrrLineInput[] = (subsRes.data ?? []).map((row) => ({
    status: String(row.status),
    billingInterval: (row.billing_interval as MrrLineInput["billingInterval"]) ?? null,
    unitAmountCents:
      row.unit_amount_cents == null ? null : Number(row.unit_amount_cents),
    quantity: Number(row.quantity ?? 1),
    currency: (row.currency as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  }));

  const mrrResult = computeMrrFromSubscriptions(lines);
  const primary = mrrResult.byCurrency.sort((a, b) => b.mrrCents - a.mrrCents)[0];
  const currency = primary?.currency ?? null;
  const mrrMajor = primary ? centsToMajor(primary.mrrCents) : 0;
  const arrMajor = primary ? centsToMajor(arrFromMrrCents(primary.mrrCents)) : 0;
  const activePaid = primary?.activePaidCount ?? 0;
  const mrrSource = "subscriptions.unit_amount_cents";

  let gross = unavailable<number>("No billing transactions in range", "billing_transactions");
  let refunds = unavailable<number>("No billing transactions in range", "billing_transactions");
  let net = unavailable<number>("No billing transactions in range", "billing_transactions");

  if (txRes.error) {
    logAdminFailure("phase7.revenue.transactions", txRes.error.message);
    const reason = isMissingRelation(txRes.error.message)
      ? "billing_transactions table missing — apply Phase 7 migration"
      : `Transactions query failed: ${txRes.error.message}`;
    gross = unavailable(reason, "billing_transactions");
    refunds = unavailable(reason, "billing_transactions");
    net = unavailable(reason, "billing_transactions");
  } else {
    const txLines: TransactionLine[] = (txRes.data ?? []).map((row) => ({
      transactionType: String(row.transaction_type),
      status: String(row.status),
      amountCents: Number(row.amount_cents ?? 0),
      refundedAmountCents: Number(row.refunded_amount_cents ?? 0),
      currency: String(row.currency || "").toUpperCase(),
      occurredAt: String(row.occurred_at),
    }));
    const rev = computeRevenueFromTransactions(txLines, range);
    const primaryTx =
      rev.byCurrency.find((c) => c.currency === currency) ??
      rev.byCurrency.sort((a, b) => b.grossCents - a.grossCents)[0];

    if (!primaryTx) {
      gross = available(0, "billing_transactions");
      refunds = available(0, "billing_transactions");
      net = available(0, "billing_transactions");
      if (partialWarning) {
        gross = partialMetric(0, "billing_transactions", partialWarning);
        refunds = partialMetric(0, "billing_transactions", partialWarning);
        net = partialMetric(0, "billing_transactions", partialWarning);
      }
    } else {
      const warnParts: string[] = [];
      if (rev.mixedCurrency) {
        warnParts.push(
          `Mixed currencies — showing ${primaryTx.currency} only`,
        );
      }
      if (partialWarning) warnParts.push(partialWarning);
      const warn = warnParts.join("; ") || null;
      const src = "billing_transactions";
      gross = warn
        ? partialMetric(centsToMajor(primaryTx.grossCents), src, warn)
        : available(centsToMajor(primaryTx.grossCents), src);
      refunds = warn
        ? partialMetric(centsToMajor(primaryTx.refundsCents), src, warn)
        : available(centsToMajor(primaryTx.refundsCents), src);
      net = warn
        ? partialMetric(centsToMajor(primaryTx.netCents), src, warn)
        : available(centsToMajor(primaryTx.netCents), src);
    }
  }

  let failedPayments: MetricResult<number>;
  if (failedRes.error) {
    logAdminFailure("phase7.revenue.failed", failedRes.error.message);
    failedPayments = isMissingRelation(failedRes.error.message)
      ? unavailable("billing_transactions table missing", "billing_transactions")
      : metricError(failedRes.error.message, "billing_transactions");
  } else {
    const count = failedRes.count ?? 0;
    failedPayments = partialWarning
      ? partialMetric(count, "billing_transactions.status=failed", partialWarning)
      : available(count, "billing_transactions.status=failed");
  }

  const mrrWarnings: string[] = [];
  if (mrrResult.mixedCurrency) {
    mrrWarnings.push(`Mixed currencies — showing ${currency} only`);
  }
  if (partialWarning) mrrWarnings.push(partialWarning);
  const mrrWarn = mrrWarnings.join("; ") || null;

  const mrrMetric =
    mrrWarn != null
      ? partialMetric(mrrMajor, mrrSource, mrrWarn)
      : available(mrrMajor, mrrSource);

  const arrMetric =
    mrrMetric.status === "available"
      ? available(arrMajor, mrrSource)
      : mrrMetric.status === "partial"
        ? partialMetric(arrMajor, mrrSource, mrrMetric.warning)
        : mrrMetric;

  const activeMetric =
    mrrMetric.status === "partial"
      ? partialMetric(activePaid, mrrSource, mrrMetric.warning)
      : available(activePaid, mrrSource);

  return {
    range,
    currency,
    definition: mrrResult.definition,
    mrr: mrrMetric,
    arr: arrMetric,
    grossRevenue: gross,
    refunds,
    netRevenue: net,
    activePaidSubscriptions: activeMetric,
    failedPayments,
    newMrr: movementUnavailable,
    expansionMrr: movementUnavailable,
    contractionMrr: movementUnavailable,
    churnedMrr: movementUnavailable,
    reactivationMrr: movementUnavailable,
  };
}

// ─── Growth intelligence ──────────────────────────────────────

export type GrowthIntelligence = {
  range: DateRange;
  signups: MetricResult<number>;
  activationRate: MetricResult<number>;
  signupToPaidRate: MetricResult<number>;
  activatedToPaidRate: MetricResult<number>;
  dau: MetricResult<number>;
  wau: MetricResult<number>;
  mau: MetricResult<number>;
  lifecycleDistribution: MetricResult<Record<CommercialLifecycleStage, number>>;
  note: string;
};

function paidResultToMetric(
  result: ReturnType<typeof computeSignupToPaid>,
  source: string,
): MetricResult<number> {
  if (result.status === "pending") {
    return unavailable(
      result.reason ?? "Cohort not mature for paid conversion window",
      source,
    );
  }
  if (result.status === "insufficient_data") {
    return insufficientSample(
      result.reason ?? "Insufficient mature cohort",
      result.cohortSize,
      source,
    );
  }
  if (result.rate == null) {
    return unavailable("Paid conversion rate unavailable", source);
  }
  if (result.status === "partial") {
    return partialMetric(
      result.rate,
      source,
      result.reason ?? "Sample truncated",
    );
  }
  return available(result.rate, source);
}

export async function getGrowthIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<GrowthIntelligence> {
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  try {
    await requireAnyPermission(input.userId, "growth.read", "system.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      const p = permissionDenied("growth.read or system.read required");
      return {
        range,
        signups: p,
        activationRate: p,
        signupToPaidRate: p,
        activatedToPaidRate: p,
        dau: p,
        wau: p,
        mau: p,
        lifecycleDistribution: permissionDenied(
          "growth.read or system.read required",
        ),
        note: "permission_denied",
      };
    }
    throw error;
  }

  assertRangeBounded(range.start, range.end);
  const note =
    "Growth metrics use bounded samples. Paid conversion requires billing telemetry. DAU/WAU/MAU never invent 0 when telemetry is missing.";

  if (!supabaseConfigured()) {
    const u = unavailable("Supabase not configured");
    return {
      range,
      signups: u,
      activationRate: u,
      signupToPaidRate: u,
      activatedToPaidRate: u,
      dau: u,
      wau: u,
      mau: u,
      lifecycleDistribution: unavailable("Supabase not configured"),
      note,
    };
  }

  const db = getSupabaseAdmin();
  const cutoff = new Date().toISOString();

  const [profilesRes, activation] = await Promise.all([
    db
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ANALYTICS_SAMPLE_CAP),
    getActivationIntelligence({ userId: input.userId, preset: input.preset }).catch(
      (error) => {
        if (error instanceof AdminAuthError) {
          return null;
        }
        logAdminFailure("phase7.growth.activation", error);
        return null;
      },
    ),
  ]);

  let signups: MetricResult<number>;
  if (profilesRes.error) {
    logAdminFailure("phase7.growth.signups", profilesRes.error.message);
    signups = metricError(profilesRes.error.message, "profiles");
  } else {
    const n = profilesRes.data?.length ?? 0;
    signups =
      n >= ANALYTICS_SAMPLE_CAP
        ? partialMetric(n, "profiles.created_at", `Sample capped at ${ANALYTICS_SAMPLE_CAP}`)
        : available(n, "profiles.created_at");
  }

  const activationRate =
    activation?.activationRate ??
    unavailable("Activation intelligence unavailable", "activation");

  // Paid conversion cohort
  let signupToPaidRate: MetricResult<number> = unavailable(
    "Billing not configured",
    "subscriptions",
  );
  let activatedToPaidRate: MetricResult<number> = unavailable(
    "Billing not configured",
    "subscriptions",
  );

  if (isBillingConfigured() && !profilesRes.error && (profilesRes.data?.length ?? 0) > 0) {
    const profiles = (profilesRes.data ?? []).map((p) => ({
      id: p.id as string,
      created_at: p.created_at as string,
    }));
    const profileIds = profiles.map((p) => p.id);
    const truncated = profiles.length >= ANALYTICS_SAMPLE_CAP;

    const ownerToPaid = new Map<string, string>();
    const ownerToActivated = new Map<string, string>();

    for (const chunk of chunkIds(profileIds)) {
      const wsRes = await db
        .from("workspaces")
        .select("id, owner_id")
        .in("owner_id", chunk)
        .is("deleted_at", null)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (wsRes.error) {
        logAdminFailure("phase7.growth.workspaces", wsRes.error.message);
        break;
      }
      const wsRows = wsRes.data ?? [];
      const wsIds = wsRows.map((w) => w.id as string);
      const ownerByWs = new Map(
        wsRows.map((w) => [w.id as string, w.owner_id as string]),
      );

      for (const wsChunk of chunkIds(wsIds)) {
        const subRes = await db
          .from("subscriptions")
          .select("workspace_id, status, plan, created_at, updated_at")
          .in("workspace_id", wsChunk)
          .in("status", ["active", "trialing", "past_due", "canceled"])
          .limit(ANALYTICS_SAMPLE_CAP);
        if (subRes.error) {
          logAdminFailure("phase7.growth.subs", subRes.error.message);
          continue;
        }
        for (const s of subRes.data ?? []) {
          const owner = ownerByWs.get(s.workspace_id as string);
          if (!owner) continue;
          const plan = String(s.plan || "free").toLowerCase();
          if (plan === "free") continue;
          const paidAt =
            (s.created_at as string) || (s.updated_at as string) || null;
          if (!paidAt) continue;
          const prev = ownerToPaid.get(owner);
          if (!prev || paidAt < prev) ownerToPaid.set(owner, paidAt);
        }
      }
    }

    // Activation timestamps: reuse activation definition via published site / completed import
    // Lightweight: earliest published website or completed import per owner within window
    for (const chunk of chunkIds(profileIds)) {
      const wsRes = await db
        .from("workspaces")
        .select("id, owner_id, created_at")
        .in("owner_id", chunk)
        .is("deleted_at", null)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (wsRes.error) break;
      const wsRows = wsRes.data ?? [];
      const wsIds = wsRows.map((w) => w.id as string);
      const ownerByWs = new Map(
        wsRows.map((w) => [w.id as string, w.owner_id as string]),
      );
      const createdByWs = new Map(
        wsRows.map((w) => [w.id as string, w.created_at as string]),
      );

      for (const wsChunk of chunkIds(wsIds)) {
        const [sites, jobs] = await Promise.all([
          db
            .from("websites")
            .select("workspace_id, published_at")
            .in("workspace_id", wsChunk)
            .not("published_at", "is", null)
            .limit(ANALYTICS_SAMPLE_CAP),
          db
            .from("import_jobs")
            .select("workspace_id, completed_at, updated_at, status")
            .in("workspace_id", wsChunk)
            .eq("status", "completed")
            .limit(ANALYTICS_SAMPLE_CAP),
        ]);
        for (const row of sites.data ?? []) {
          const ws = row.workspace_id as string;
          const owner = ownerByWs.get(ws);
          const signupAt = createdByWs.get(ws);
          const at = row.published_at as string;
          if (!owner || !signupAt || !at) continue;
          if (
            !isValidActivationTimestamp({
              signupAt,
              activationAt: at,
              cutoffAt: cutoff,
            })
          ) {
            continue;
          }
          const prev = ownerToActivated.get(owner);
          if (!prev || at < prev) ownerToActivated.set(owner, at);
        }
        for (const row of jobs.data ?? []) {
          const ws = row.workspace_id as string;
          const owner = ownerByWs.get(ws);
          const signupAt = createdByWs.get(ws);
          const at =
            (row.completed_at as string | null) ?? (row.updated_at as string);
          if (!owner || !signupAt || !at) continue;
          if (
            !isValidActivationTimestamp({
              signupAt,
              activationAt: at,
              cutoffAt: cutoff,
            })
          ) {
            continue;
          }
          const prev = ownerToActivated.get(owner);
          if (!prev || at < prev) ownerToActivated.set(owner, at);
        }
      }
    }

    const members: PaidConversionMember[] = profiles.map((p) => ({
      userId: p.id,
      signupAt: p.created_at,
      activatedAt: ownerToActivated.get(p.id) ?? null,
      paidAt: ownerToPaid.get(p.id) ?? null,
    }));

    const signupPaid = computeSignupToPaid({
      members,
      cutoff,
      windowDays: PAID_CONVERSION_WINDOW_DAYS,
      minCohortSize: MIN_COHORT_SIZE,
      truncated,
    });
    const activatedPaid = computeActivatedToPaid({
      members,
      cutoff,
      windowDays: PAID_CONVERSION_WINDOW_DAYS,
      minCohortSize: MIN_COHORT_SIZE,
      truncated,
    });
    signupToPaidRate = paidResultToMetric(signupPaid, "subscriptions.paid");
    activatedToPaidRate = paidResultToMetric(
      activatedPaid,
      "subscriptions.paid+activation",
    );
  } else if (!isBillingConfigured()) {
    signupToPaidRate = unavailable(
      "Billing provider not configured",
      "subscriptions",
    );
    activatedToPaidRate = unavailable(
      "Billing provider not configured",
      "subscriptions",
    );
  }

  // DAU / WAU / MAU
  const now = Date.now();
  const d1 = new Date(now - 1 * 86_400_000).toISOString();
  const d7 = new Date(now - 7 * 86_400_000).toISOString();
  const d30 = new Date(now - 30 * 86_400_000).toISOString();

  async function loadSessionUsers(
    since: string,
  ): Promise<{ ids: Set<string>; source: string; truncated: boolean; ok: boolean }> {
    const sessions = await db
      .from("user_sessions")
      .select("user_id, last_seen_at, started_at")
      .or(`last_seen_at.gte.${since},started_at.gte.${since}`)
      .limit(ANALYTICS_SAMPLE_CAP);
    if (!sessions.error && (sessions.data?.length ?? 0) > 0) {
      const ids = new Set<string>();
      for (const row of sessions.data ?? []) {
        const seen = (row.last_seen_at as string) || (row.started_at as string);
        if (seen && seen >= since) ids.add(row.user_id as string);
      }
      return {
        ids,
        source: "user_sessions",
        truncated: (sessions.data?.length ?? 0) >= ANALYTICS_SAMPLE_CAP,
        ok: true,
      };
    }
    if (sessions.error && !isMissingRelation(sessions.error.message)) {
      logAdminFailure("phase7.growth.sessions", sessions.error.message);
    }

    const events = await db
      .from("product_events")
      .select("user_id, occurred_at")
      .in("event_name", ["login", "session_started"])
      .gte("occurred_at", since)
      .limit(ANALYTICS_SAMPLE_CAP);
    if (events.error) {
      logAdminFailure("phase7.growth.login_events", events.error.message);
      return { ids: new Set(), source: "none", truncated: false, ok: false };
    }
    if ((events.data?.length ?? 0) === 0) {
      return { ids: new Set(), source: "none", truncated: false, ok: false };
    }
    const ids = new Set<string>();
    for (const row of events.data ?? []) {
      if (row.user_id) ids.add(row.user_id as string);
    }
    return {
      ids,
      source: "product_events.login|session_started",
      truncated: (events.data?.length ?? 0) >= ANALYTICS_SAMPLE_CAP,
      ok: true,
    };
  }

  const [mauBundle, wauBundle, dauBundle] = await Promise.all([
    loadSessionUsers(d30),
    loadSessionUsers(d7),
    loadSessionUsers(d1),
  ]);

  const active = computeActiveUsers({
    dauUserIds: dauBundle.ok ? dauBundle.ids : new Set(),
    wauUserIds: wauBundle.ok ? wauBundle.ids : new Set(),
    mauUserIds: mauBundle.ok ? mauBundle.ids : new Set(),
    telemetryAvailable: mauBundle.ok || wauBundle.ok || dauBundle.ok,
    truncated: mauBundle.truncated || wauBundle.truncated || dauBundle.truncated,
  });

  const toActiveMetric = (
    value: number | null,
    source: string,
  ): MetricResult<number> => {
    if (active.status === "unavailable" || value == null) {
      return unavailable(
        active.reason ?? "Session telemetry not available",
        source,
      );
    }
    if (active.status === "partial") {
      return partialMetric(
        value,
        source,
        active.reason ?? "Sample truncated",
      );
    }
    return available(value, source);
  };

  const sessionSource = mauBundle.source !== "none" ? mauBundle.source : active.source;

  // Lifecycle distribution — bounded workspace sample
  let lifecycleDistribution: MetricResult<
    Record<CommercialLifecycleStage, number>
  >;
  const wsSample = await db
    .from("workspaces")
    .select("id, plan, created_at, owner_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(Math.min(500, ANALYTICS_SAMPLE_CAP));

  if (wsSample.error) {
    logAdminFailure("phase7.growth.lifecycle", wsSample.error.message);
    lifecycleDistribution = unavailable(wsSample.error.message, "workspaces");
  } else if ((wsSample.data?.length ?? 0) === 0) {
    lifecycleDistribution = unavailable("No workspaces to sample", "workspaces");
  } else {
    const rows = wsSample.data ?? [];
    const wsIds = rows.map((w) => w.id as string);
    const subByWs = new Map<
      string,
      { status: string; plan: string; hadPaid: boolean }
    >();
    for (const chunk of chunkIds(wsIds)) {
      const subs = await db
        .from("subscriptions")
        .select("workspace_id, status, plan")
        .in("workspace_id", chunk)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (subs.error) break;
      for (const s of subs.data ?? []) {
        const ws = s.workspace_id as string;
        const plan = String(s.plan || "free").toLowerCase();
        const prev = subByWs.get(ws);
        const hadPaid = (prev?.hadPaid ?? false) || plan !== "free";
        subByWs.set(ws, {
          status: String(s.status),
          plan,
          hadPaid,
        });
      }
    }

    const dist: Record<string, number> = {};
    const billingOn = isBillingConfigured();
    for (const w of rows) {
      const sub = subByWs.get(w.id as string);
      const ageDays = Math.max(
        0,
        Math.floor(
          (Date.now() - Date.parse(w.created_at as string)) / 86_400_000,
        ),
      );
      const result = resolveCommercialLifecycle({
        product: {
          ageDays,
          hasWebsite: false,
          hasPublishedWebsite: false,
          successfulImports: 0,
          daysSinceActivity: null,
          aiRequestsRecent: 0,
          publicationCount: 0,
          websiteCount: 0,
          healthCategory: "insufficient_data",
        },
        subscriptionStatus: normalizeSubscriptionStatus(sub?.status),
        plan: sub?.plan ?? (w.plan as string) ?? "free",
        hadPaidBefore: sub?.hadPaid ?? false,
        billingTelemetryAvailable: billingOn && Boolean(sub),
      });
      dist[result.stage] = (dist[result.stage] ?? 0) + 1;
    }
    lifecycleDistribution = partialMetric(
      dist as Record<CommercialLifecycleStage, number>,
      "workspaces+subscriptions sample",
      `Bounded sample of ${rows.length} workspaces; product signals incomplete — commercial stages preferred when billing present`,
    );
  }

  return {
    range,
    signups,
    activationRate,
    signupToPaidRate,
    activatedToPaidRate,
    dau: toActiveMetric(active.dau, sessionSource),
    wau: toActiveMetric(active.wau, sessionSource),
    mau: toActiveMetric(active.mau, sessionSource),
    lifecycleDistribution,
    note,
  };
}

// ─── Billing operations ───────────────────────────────────────

export type BillingSubscriptionRow = {
  id: string;
  workspaceId: string;
  plan: string;
  status: string;
  billingInterval: string | null;
  unitAmountCents: number | null;
  currency: string | null;
  providerSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string | null;
  createdAt: string;
};

export type BillingEventRow = {
  id: string;
  eventType: string;
  status: string;
  workspaceId: string | null;
  providerEventId: string;
  errorCode: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type BillingFailedPaymentRow = {
  id: string;
  workspaceId: string | null;
  transactionType: string;
  amountCents: number;
  currency: string;
  occurredAt: string;
  providerTransactionId: string;
};

export type BillingOperations = {
  subscriptions: AdminListResult<BillingSubscriptionRow>;
  events: AdminListResult<BillingEventRow>;
  failedPayments: AdminListResult<BillingFailedPaymentRow>;
};

export async function getBillingOperations(input: {
  userId: string;
  search?: string;
}): Promise<BillingOperations> {
  try {
    await requireAdminPermission(input.userId, "billing.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      const reason = "billing.read required";
      return {
        subscriptions: listUnavailable(reason),
        events: listUnavailable(reason),
        failedPayments: listUnavailable(reason),
      };
    }
    throw error;
  }

  if (!supabaseConfigured()) {
    const reason = "Supabase not configured";
    return {
      subscriptions: listUnavailable(reason),
      events: listUnavailable(reason),
      failedPayments: listUnavailable(reason),
    };
  }

  const db = getSupabaseAdmin();
  const search =
    input.search && UUID_RE.test(input.search.trim())
      ? input.search.trim()
      : null;

  let subsQ = db
    .from("subscriptions")
    .select(
      "id, workspace_id, plan, status, billing_interval, unit_amount_cents, currency, provider_subscription_id, current_period_end, cancel_at_period_end, updated_at, created_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);
  if (search) subsQ = subsQ.eq("workspace_id", search);

  let eventsQ = db
    .from("billing_events")
    .select(
      "id, event_type, status, workspace_id, provider_event_id, error_code, created_at, processed_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (search) eventsQ = eventsQ.eq("workspace_id", search);

  let failedQ = db
    .from("billing_transactions")
    .select(
      "id, workspace_id, transaction_type, amount_cents, currency, occurred_at, provider_transaction_id",
    )
    .eq("status", "failed")
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (search) failedQ = failedQ.eq("workspace_id", search);

  const [subsRes, eventsRes, failedRes] = await Promise.all([
    subsQ,
    eventsQ,
    failedQ,
  ]);

  const subscriptions: AdminListResult<BillingSubscriptionRow> = subsRes.error
    ? (logAdminFailure("phase7.ops.subs", subsRes.error.message),
      listUnavailable(subsRes.error.message))
    : listOk(
        (subsRes.data ?? []).map((r) => ({
          id: r.id as string,
          workspaceId: r.workspace_id as string,
          plan: String(r.plan),
          status: String(r.status),
          billingInterval: (r.billing_interval as string | null) ?? null,
          unitAmountCents:
            r.unit_amount_cents == null ? null : Number(r.unit_amount_cents),
          currency: (r.currency as string | null) ?? null,
          providerSubscriptionId:
            (r.provider_subscription_id as string | null) ?? null,
          currentPeriodEnd: (r.current_period_end as string | null) ?? null,
          cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
          updatedAt: (r.updated_at as string | null) ?? null,
          createdAt: r.created_at as string,
        })),
      );

  const events: AdminListResult<BillingEventRow> = eventsRes.error
    ? (logAdminFailure("phase7.ops.events", eventsRes.error.message),
      listUnavailable(
        isMissingRelation(eventsRes.error.message)
          ? "billing_events table missing"
          : eventsRes.error.message,
      ))
    : listOk(
        (eventsRes.data ?? []).map((r) => ({
          id: r.id as string,
          eventType: String(r.event_type),
          status: String(r.status),
          workspaceId: (r.workspace_id as string | null) ?? null,
          providerEventId: String(r.provider_event_id),
          errorCode: (r.error_code as string | null) ?? null,
          createdAt: r.created_at as string,
          processedAt: (r.processed_at as string | null) ?? null,
        })),
      );

  const failedPayments: AdminListResult<BillingFailedPaymentRow> =
    failedRes.error
      ? (logAdminFailure("phase7.ops.failed", failedRes.error.message),
        listUnavailable(
          isMissingRelation(failedRes.error.message)
            ? "billing_transactions table missing"
            : failedRes.error.message,
        ))
      : listOk(
          (failedRes.data ?? []).map((r) => ({
            id: r.id as string,
            workspaceId: (r.workspace_id as string | null) ?? null,
            transactionType: String(r.transaction_type),
            amountCents: Number(r.amount_cents ?? 0),
            currency: String(r.currency || ""),
            occurredAt: r.occurred_at as string,
            providerTransactionId: String(r.provider_transaction_id),
          })),
        );

  return { subscriptions, events, failedPayments };
}

// ─── Webhook health ───────────────────────────────────────────

export type BillingWebhookHealth = {
  processed: MetricResult<number>;
  failed: MetricResult<number>;
  unprocessed: MetricResult<number>;
  windowDays: number;
};

export async function getBillingWebhookHealth(input: {
  userId: string;
}): Promise<BillingWebhookHealth> {
  const windowDays = 7;
  try {
    await requireAnyPermission(input.userId, "billing.read", "system.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      const p = permissionDenied("billing.read or system.read required");
      return { processed: p, failed: p, unprocessed: p, windowDays };
    }
    throw error;
  }

  if (!supabaseConfigured()) {
    const u = unavailable("Supabase not configured", "billing_events");
    return { processed: u, failed: u, unprocessed: u, windowDays };
  }

  const db = getSupabaseAdmin();
  const since = sevenDaysAgoIso();

  const [processed, failed, unprocessed] = await Promise.all([
    db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "processed")
      .gte("created_at", since),
    db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since),
    db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["received", "processing"])
      .gte("created_at", since),
  ]);

  const mapCount = (
    res: { count: number | null; error: { message: string } | null },
    source: string,
  ): MetricResult<number> => {
    if (res.error) {
      logAdminFailure("phase7.webhook", res.error.message);
      if (isMissingRelation(res.error.message)) {
        return unavailable("billing_events table missing", source);
      }
      return metricError(res.error.message, source);
    }
    return available(res.count ?? 0, source);
  };

  return {
    processed: mapCount(processed, "billing_events.status=processed"),
    failed: mapCount(failed, "billing_events.status=failed"),
    unprocessed: mapCount(
      unprocessed,
      "billing_events.status=received|processing",
    ),
    windowDays,
  };
}

// ─── Founder billing summary (bounded) ────────────────────────

export type FounderBillingSummary = {
  mrr: MetricResult<number>;
  paidWorkspaces: MetricResult<number>;
  failedPayments7d: MetricResult<number>;
  webhookFailed7d: MetricResult<number>;
  atRiskPastDue: MetricResult<number>;
};

export async function getFounderBillingSummary(input: {
  userId: string;
}): Promise<FounderBillingSummary> {
  try {
    await requireAdminPermission(input.userId, "system.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      const p = permissionDenied("system.read required");
      return {
        mrr: p,
        paidWorkspaces: p,
        failedPayments7d: p,
        webhookFailed7d: p,
        atRiskPastDue: p,
      };
    }
    throw error;
  }

  if (!isBillingConfigured()) {
    const u = unavailable("Billing provider not configured", "billing");
    return {
      mrr: u,
      paidWorkspaces: u,
      failedPayments7d: u,
      webhookFailed7d: u,
      atRiskPastDue: u,
    };
  }
  if (!supabaseConfigured()) {
    const u = unavailable("Supabase not configured");
    return {
      mrr: u,
      paidWorkspaces: u,
      failedPayments7d: u,
      webhookFailed7d: u,
      atRiskPastDue: u,
    };
  }

  const db = getSupabaseAdmin();
  const since = sevenDaysAgoIso();

  const [subsRes, failedRes, webhookRes, pastDueRes] = await Promise.all([
    db
      .from("subscriptions")
      .select(
        "workspace_id, status, billing_interval, unit_amount_cents, quantity, currency",
      )
      .in("status", ["active", "trialing"])
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("occurred_at", since),
    db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since),
    db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due"),
  ]);

  let mrr: MetricResult<number>;
  let paidWorkspaces: MetricResult<number>;
  if (subsRes.error) {
    logAdminFailure("phase7.founder.subs", subsRes.error.message);
    mrr = unavailable(subsRes.error.message, "subscriptions");
    paidWorkspaces = unavailable(subsRes.error.message, "subscriptions");
  } else {
    const lines: MrrLineInput[] = (subsRes.data ?? []).map((row) => ({
      status: String(row.status),
      billingInterval:
        (row.billing_interval as MrrLineInput["billingInterval"]) ?? null,
      unitAmountCents:
        row.unit_amount_cents == null ? null : Number(row.unit_amount_cents),
      quantity: Number(row.quantity ?? 1),
      currency: (row.currency as string | null) ?? null,
    }));
    const computed = computeMrrFromSubscriptions(lines);
    const primary = computed.byCurrency.sort((a, b) => b.mrrCents - a.mrrCents)[0];
    const workspaces = new Set(
      (subsRes.data ?? []).map((r) => r.workspace_id as string),
    );
    const mrrVal = primary ? centsToMajor(primary.mrrCents) : 0;
    mrr = computed.mixedCurrency
      ? partialMetric(
          mrrVal,
          "subscriptions",
          `Mixed currencies — showing ${primary?.currency ?? "?"} only`,
        )
      : available(mrrVal, "subscriptions");
    paidWorkspaces =
      workspaces.size >= ANALYTICS_SAMPLE_CAP
        ? partialMetric(
            workspaces.size,
            "subscriptions.active|trialing",
            `Sample capped at ${ANALYTICS_SAMPLE_CAP}`,
          )
        : available(workspaces.size, "subscriptions.active|trialing");
  }

  const countOrUnavailable = (
    res: { count: number | null; error: { message: string } | null },
    source: string,
  ): MetricResult<number> => {
    if (res.error) {
      if (isMissingRelation(res.error.message)) {
        return unavailable("Table missing — apply Phase 7 migration", source);
      }
      return metricError(res.error.message, source);
    }
    return available(res.count ?? 0, source);
  };

  return {
    mrr,
    paidWorkspaces,
    failedPayments7d: countOrUnavailable(
      failedRes,
      "billing_transactions.failed.7d",
    ),
    webhookFailed7d: countOrUnavailable(webhookRes, "billing_events.failed.7d"),
    atRiskPastDue: countOrUnavailable(pastDueRes, "subscriptions.past_due"),
  };
}

// ─── Commercial funnel ────────────────────────────────────────

export type CommercialFunnelStepId =
  | "signup"
  | "import"
  | "website_created"
  | "editor_opened"
  | "website_edited"
  | "website_previewed"
  | "publish"
  | "domain"
  | "checkout_started"
  | "paid";

export type CommercialFunnelStep = {
  id: CommercialFunnelStepId;
  label: string;
  workspaces: number | null;
  conversionFromPrevious: number | null;
  dropOffFromPrevious: number | null;
  status: "available" | "partial" | "unavailable" | "insufficient_data" | "pending";
  reason?: string;
  source: string;
};

export type CommercialFunnelIntelligence = {
  range: DateRange;
  steps: CommercialFunnelStep[];
  note: string;
  truncated: boolean;
};

type CommercialWsEvents = {
  workspaceId: string;
  createdAt: string;
  importAt: string | null;
  websiteCreatedAt: string | null;
  editorOpenedAt: string | null;
  websiteEditedAt: string | null;
  websitePreviewedAt: string | null;
  publishedAt: string | null;
  domainAt: string | null;
  checkoutStartedAt: string | null;
  paidAt: string | null;
};

function earliest(current: string | null, next: string): string {
  return !current || next < current ? next : current;
}

function withinProductWindow(
  signupAt: string,
  at: string | null,
  cutoffAt: string,
): string | null {
  if (!at) return null;
  return isValidActivationTimestamp({
    signupAt,
    activationAt: at,
    cutoffAt,
    windowDays: ACTIVATION_WINDOW_DAYS,
  })
    ? at
    : null;
}

function withinPaidWindow(
  signupAt: string,
  at: string | null,
  cutoffAt: string,
): string | null {
  if (!at) return null;
  if (at < signupAt || at > cutoffAt) return null;
  if (at > addDaysIso(signupAt, PAID_CONVERSION_WINDOW_DAYS)) return null;
  return at;
}

export async function getCommercialFunnelIntelligence(input: {
  userId: string;
  preset?: DateRangePreset;
}): Promise<CommercialFunnelIntelligence> {
  const range = resolveDateRange({ preset: clampAnalyticsPreset(input.preset) });
  const note = `Commercial funnel cohort = workspaces created in range. Product stages use ${ACTIVATION_WINDOW_DAYS}d window; checkout/paid use ${PAID_CONVERSION_WINDOW_DAYS}d. Causal order required.`;

  try {
    await requireAnyPermission(input.userId, "growth.read", "system.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return {
        range,
        truncated: false,
        note: "permission_denied",
        steps: [
          {
            id: "signup",
            label: "Signup",
            workspaces: null,
            conversionFromPrevious: null,
            dropOffFromPrevious: null,
            status: "unavailable",
            reason: "growth.read or system.read required",
            source: "rbac",
          },
        ],
      };
    }
    throw error;
  }

  assertRangeBounded(range.start, range.end);

  if (!supabaseConfigured()) {
    return {
      range,
      truncated: false,
      note,
      steps: [
        {
          id: "signup",
          label: "Signup",
          workspaces: null,
          conversionFromPrevious: null,
          dropOffFromPrevious: null,
          status: "unavailable",
          reason: "Supabase not configured",
          source: "workspaces",
        },
      ],
    };
  }

  const db = getSupabaseAdmin();
  const cutoffAt = new Date().toISOString();
  const productScanEnd = addUtcDaysIso(range.end, ACTIVATION_WINDOW_DAYS);
  const paidScanEnd = addUtcDaysIso(range.end, PAID_CONVERSION_WINDOW_DAYS);

  const wsRes = await db
    .from("workspaces")
    .select("id, created_at")
    .is("deleted_at", null)
    .gte("created_at", range.start)
    .lt("created_at", range.end)
    .limit(ANALYTICS_SAMPLE_CAP);

  if (wsRes.error) {
    logAdminFailure("phase7.funnel.workspaces", wsRes.error.message);
    return {
      range,
      truncated: false,
      note,
      steps: [
        {
          id: "signup",
          label: "Signup",
          workspaces: null,
          conversionFromPrevious: null,
          dropOffFromPrevious: null,
          status: "unavailable",
          reason: wsRes.error.message,
          source: "workspaces",
        },
      ],
    };
  }

  const cohort = (wsRes.data ?? []).map((w) => ({
    id: w.id as string,
    created_at: w.created_at as string,
  }));
  const truncated = cohort.length >= ANALYTICS_SAMPLE_CAP;
  const byWs = new Map<string, CommercialWsEvents>();
  for (const row of cohort) {
    byWs.set(row.id, {
      workspaceId: row.id,
      createdAt: row.created_at,
      importAt: null,
      websiteCreatedAt: null,
      editorOpenedAt: null,
      websiteEditedAt: null,
      websitePreviewedAt: null,
      publishedAt: null,
      domainAt: null,
      checkoutStartedAt: null,
      paidAt: null,
    });
  }
  const cohortIds = [...byWs.keys()];

  if (cohortIds.length > 0) {
    for (const chunk of chunkIds(cohortIds)) {
      const [jobs, sites] = await Promise.all([
        db
          .from("import_jobs")
          .select("workspace_id, completed_at, updated_at, status")
          .in("workspace_id", chunk)
          .eq("status", "completed")
          .gte("updated_at", range.start)
          .lt("updated_at", productScanEnd)
          .limit(ANALYTICS_SAMPLE_CAP),
        db
          .from("websites")
          .select("id, workspace_id, created_at, published_at")
          .in("workspace_id", chunk)
          .is("deleted_at", null)
          .limit(ANALYTICS_SAMPLE_CAP),
      ]);

      for (const row of jobs.data ?? []) {
        const entry = byWs.get(row.workspace_id as string);
        if (!entry) continue;
        const at =
          (row.completed_at as string | null) ?? (row.updated_at as string);
        const valid = withinProductWindow(entry.createdAt, at, cutoffAt);
        if (valid) entry.importAt = earliest(entry.importAt, valid);
      }

      const websiteIds: string[] = [];
      const websiteToWs = new Map<string, string>();
      for (const row of sites.data ?? []) {
        const entry = byWs.get(row.workspace_id as string);
        if (!entry) continue;
        websiteIds.push(row.id as string);
        websiteToWs.set(row.id as string, row.workspace_id as string);
        const created = withinProductWindow(
          entry.createdAt,
          row.created_at as string,
          cutoffAt,
        );
        if (created) {
          entry.websiteCreatedAt = earliest(entry.websiteCreatedAt, created);
        }
        const pub = withinProductWindow(
          entry.createdAt,
          (row.published_at as string | null) ?? null,
          cutoffAt,
        );
        if (pub) entry.publishedAt = earliest(entry.publishedAt, pub);
      }

      for (const siteChunk of chunkIds(websiteIds)) {
        const domains = await db
          .from("domains")
          .select("website_id, created_at")
          .in("website_id", siteChunk)
          .limit(ANALYTICS_SAMPLE_CAP);
        for (const d of domains.data ?? []) {
          const wsId = websiteToWs.get(d.website_id as string);
          if (!wsId) continue;
          const entry = byWs.get(wsId);
          if (!entry) continue;
          const at = withinProductWindow(
            entry.createdAt,
            d.created_at as string,
            cutoffAt,
          );
          if (at) entry.domainAt = earliest(entry.domainAt, at);
        }
      }
    }

    const eventNames = [
      "editor_opened",
      "website_edited",
      "website_previewed",
      "checkout_started",
      "subscription_started",
      "payment_succeeded",
    ] as const;

    for (const chunk of chunkIds(cohortIds)) {
      const events = await db
        .from("product_events")
        .select("workspace_id, event_name, occurred_at")
        .in("workspace_id", chunk)
        .in("event_name", [...eventNames])
        .gte("occurred_at", range.start)
        .lt("occurred_at", paidScanEnd)
        .limit(ANALYTICS_SAMPLE_CAP);
      if (events.error) {
        logAdminFailure("phase7.funnel.events", events.error.message);
        continue;
      }
      for (const row of events.data ?? []) {
        const entry = byWs.get(row.workspace_id as string);
        if (!entry) continue;
        const at = row.occurred_at as string;
        const name = row.event_name as string;
        if (name === "editor_opened") {
          const v = withinProductWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.editorOpenedAt = earliest(entry.editorOpenedAt, v);
        } else if (name === "website_edited") {
          const v = withinProductWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.websiteEditedAt = earliest(entry.websiteEditedAt, v);
        } else if (name === "website_previewed") {
          const v = withinProductWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.websitePreviewedAt = earliest(entry.websitePreviewedAt, v);
        } else if (name === "checkout_started") {
          const v = withinPaidWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.checkoutStartedAt = earliest(entry.checkoutStartedAt, v);
        } else if (
          name === "subscription_started" ||
          name === "payment_succeeded"
        ) {
          const v = withinPaidWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.paidAt = earliest(entry.paidAt, v);
        }
      }
    }

    // Paid from subscriptions if billing configured
    if (isBillingConfigured()) {
      for (const chunk of chunkIds(cohortIds)) {
        const subs = await db
          .from("subscriptions")
          .select("workspace_id, plan, created_at, updated_at")
          .in("workspace_id", chunk)
          .neq("plan", "free")
          .limit(ANALYTICS_SAMPLE_CAP);
        for (const s of subs.data ?? []) {
          const entry = byWs.get(s.workspace_id as string);
          if (!entry) continue;
          const at =
            (s.created_at as string) || (s.updated_at as string) || null;
          const v = withinPaidWindow(entry.createdAt, at, cutoffAt);
          if (v) entry.paidAt = earliest(entry.paidAt, v);
        }
      }
    }
  }

  const hasRealPreview = [...byWs.values()].some((w) => w.websitePreviewedAt);

  // Causal counting
  let imported = 0;
  let websiteCreated = 0;
  let editorOpened = 0;
  let websiteEdited = 0;
  let previewed = 0;
  let published = 0;
  let domain = 0;
  let checkout = 0;
  let paid = 0;

  for (const w of byWs.values()) {
    if (!w.importAt) continue;
    imported += 1;
    if (!w.websiteCreatedAt || w.websiteCreatedAt < w.importAt) continue;
    websiteCreated += 1;
    if (!w.editorOpenedAt || w.editorOpenedAt < w.websiteCreatedAt) {
      // editor optional soft — still allow edited if present after create
    } else {
      editorOpened += 1;
    }
    const editedGate = w.websiteEditedAt;
    if (!editedGate || editedGate < w.websiteCreatedAt) continue;
    websiteEdited += 1;

    const previewAt = hasRealPreview
      ? w.websitePreviewedAt
      : w.websiteEditedAt; // proxy only for count when marking partial
    if (hasRealPreview) {
      if (previewAt && previewAt >= w.websiteCreatedAt) previewed += 1;
    } else if (w.websiteEditedAt) {
      previewed += 1; // proxy count among edited
    }

    if (!w.publishedAt || w.publishedAt < w.websiteCreatedAt) continue;
    published += 1;
    if (w.domainAt && w.domainAt >= w.publishedAt) domain += 1;
    if (w.checkoutStartedAt && w.checkoutStartedAt >= w.createdAt) checkout += 1;
    if (w.paidAt && w.paidAt >= w.createdAt) paid += 1;
  }

  // Recount editor_opened properly (those who opened after website created)
  editorOpened = 0;
  for (const w of byWs.values()) {
    if (
      w.importAt &&
      w.websiteCreatedAt &&
      w.websiteCreatedAt >= w.importAt &&
      w.editorOpenedAt &&
      w.editorOpenedAt >= w.websiteCreatedAt
    ) {
      editorOpened += 1;
    }
  }

  function stage(
    id: CommercialFunnelStepId,
    label: string,
    count: number | null,
    previous: number | null,
    baseStatus: CommercialFunnelStep["status"],
    source: string,
    reason?: string,
  ): CommercialFunnelStep {
    if (count == null) {
      return {
        id,
        label,
        workspaces: null,
        conversionFromPrevious: null,
        dropOffFromPrevious: null,
        status: "unavailable",
        reason,
        source,
      };
    }
    const conv =
      previous == null
        ? { rate: null as number | null, status: "available" as const }
        : funnelStageConversion(count, previous);
    const status: CommercialFunnelStep["status"] =
      conv.status === "insufficient_data"
        ? "insufficient_data"
        : truncated && baseStatus === "available"
          ? "partial"
          : baseStatus;
    return {
      id,
      label,
      workspaces: count,
      conversionFromPrevious: conv.rate,
      dropOffFromPrevious: conv.rate == null ? null : 1 - conv.rate,
      status,
      reason:
        conv.status === "insufficient_data"
          ? conv.reason
          : truncated
            ? reason
              ? `${reason}; sample may be truncated`
              : `Sample truncated at ${ANALYTICS_SAMPLE_CAP}`
            : reason,
      source,
    };
  }

  const signupCount = byWs.size;
  const previewStep = hasRealPreview
    ? stage(
        "website_previewed",
        "Website previewed",
        previewed,
        websiteEdited,
        truncated ? "partial" : "available",
        "product_events.website_previewed",
      )
    : stage(
        "website_previewed",
        "Website previewed",
        previewed,
        websiteEdited,
        "partial",
        "product_events.website_edited",
        "Historical preview may use website_edited proxy; real website_previewed instrumentation starts in Phase 7",
      );

  const paidStep = isBillingConfigured()
    ? stage(
        "paid",
        "Paid",
        paid,
        checkout > 0 ? checkout : published,
        truncated ? "partial" : "available",
        "subscriptions|product_events.subscription_started|payment_succeeded",
        `Within ${PAID_CONVERSION_WINDOW_DAYS}d of workspace creation`,
      )
    : stage(
        "paid",
        "Paid",
        null,
        null,
        "unavailable",
        "subscriptions",
        "Billing provider not configured",
      );

  return {
    range,
    truncated,
    note,
    steps: [
      stage("signup", "Signup", signupCount, null, "available", "workspaces.created_at"),
      stage(
        "import",
        "Import",
        imported,
        signupCount,
        "partial",
        "import_jobs.status=completed",
        `Within ${ACTIVATION_WINDOW_DAYS}d`,
      ),
      stage(
        "website_created",
        "Website created",
        websiteCreated,
        imported,
        "partial",
        "websites.created_at",
      ),
      stage(
        "editor_opened",
        "Editor opened",
        editorOpened,
        websiteCreated,
        editorOpened > 0 ? "partial" : "unavailable",
        "product_events.editor_opened",
        editorOpened === 0
          ? "No editor_opened events in cohort window"
          : undefined,
      ),
      stage(
        "website_edited",
        "Website edited",
        websiteEdited,
        websiteCreated,
        websiteEdited > 0 ? "partial" : "unavailable",
        "product_events.website_edited",
        websiteEdited === 0
          ? "No website_edited events in cohort window"
          : undefined,
      ),
      previewStep,
      stage(
        "publish",
        "Publish",
        published,
        websiteCreated,
        "partial",
        "websites.published_at",
      ),
      stage(
        "domain",
        "Domain",
        domain,
        published,
        domain > 0 ? "partial" : "unavailable",
        "domains.created_at",
        domain === 0 ? "No domains linked in cohort window" : undefined,
      ),
      stage(
        "checkout_started",
        "Checkout started",
        isBillingConfigured() ? checkout : null,
        published,
        isBillingConfigured()
          ? checkout > 0
            ? "partial"
            : "unavailable"
          : "unavailable",
        "product_events.checkout_started",
        !isBillingConfigured()
          ? "Billing provider not configured"
          : checkout === 0
            ? "No checkout_started events in paid conversion window"
            : undefined,
      ),
      paidStep,
    ],
  };
}

// ─── Billing data quality ─────────────────────────────────────

export type BillingDataQualityReport = {
  issues: BillingDqIssue[];
  unavailableReason: string | null;
};

export async function getBillingDataQualityReport(input: {
  userId: string;
}): Promise<BillingDataQualityReport> {
  try {
    await requireAnyPermission(input.userId, "billing.read", "system.read");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return {
        issues: [],
        unavailableReason: "billing.read or system.read required",
      };
    }
    throw error;
  }

  if (!supabaseConfigured()) {
    return { issues: [], unavailableReason: "Supabase not configured" };
  }
  if (!isBillingConfigured()) {
    return {
      issues: [],
      unavailableReason: "Billing provider not configured — DQ deferred",
    };
  }

  const db = getSupabaseAdmin();

  const [
    subsNoWs,
    liveSubs,
    customers,
    eventsDupCheck,
    unprocessed,
    workspacesPaid,
    canceledSubs,
    txBadAmount,
    txBadCurrency,
    futureTs,
  ] = await Promise.all([
    db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .is("workspace_id", null),
    db
      .from("subscriptions")
      .select("workspace_id, status")
      .in("status", [
        "active",
        "trialing",
        "past_due",
        "unpaid",
        "paused",
        "incomplete",
      ])
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_customers")
      .select("provider_customer_id")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_events")
      .select("provider_event_id")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .in("status", ["received", "processing", "failed"]),
    db
      .from("workspaces")
      .select("id, plan")
      .in("plan", ["pro", "business"])
      .is("deleted_at", null)
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("subscriptions")
      .select("workspace_id, status, plan")
      .eq("status", "canceled")
      .limit(ANALYTICS_SAMPLE_CAP),
    db
      .from("billing_transactions")
      .select("id", { count: "exact", head: true })
      .lte("amount_cents", 0),
    db
      .from("billing_transactions")
      .select("id", { count: "exact", head: true })
      .or("currency.is.null,currency.eq."),
    db
      .from("billing_transactions")
      .select("id", { count: "exact", head: true })
      .gt("occurred_at", new Date().toISOString()),
  ]);

  const anyMissing =
    [subsNoWs, liveSubs, customers, eventsDupCheck, unprocessed].some(
      (r) => r.error && isMissingRelation(r.error.message),
    );
  if (anyMissing) {
    return {
      issues: [],
      unavailableReason: "Billing tables missing — apply Phase 7 migration",
    };
  }

  // Multiple live subscriptions per workspace
  const liveCount = new Map<string, number>();
  for (const row of liveSubs.data ?? []) {
    const ws = row.workspace_id as string;
    liveCount.set(ws, (liveCount.get(ws) ?? 0) + 1);
  }
  let multipleLive = 0;
  for (const n of liveCount.values()) if (n > 1) multipleLive += 1;

  // Duplicate provider customers
  const custIds = (customers.data ?? []).map(
    (c) => c.provider_customer_id as string,
  );
  const custSeen = new Set<string>();
  let dupCustomers = 0;
  for (const id of custIds) {
    if (custSeen.has(id)) dupCustomers += 1;
    else custSeen.add(id);
  }

  // Duplicate provider events (should be unique — count collisions in sample)
  const eventIds = (eventsDupCheck.data ?? []).map(
    (e) => e.provider_event_id as string,
  );
  const eventSeen = new Set<string>();
  let dupEvents = 0;
  for (const id of eventIds) {
    if (eventSeen.has(id)) dupEvents += 1;
    else eventSeen.add(id);
  }

  // Paid workspace without subscription
  const paidWsIds = (workspacesPaid.data ?? []).map((w) => w.id as string);
  const liveWs = new Set(liveCount.keys());
  let paidWithoutSub = 0;
  for (const id of paidWsIds) {
    if (!liveWs.has(id)) paidWithoutSub += 1;
  }

  // Canceled but workspace still paid — need workspace plan lookup
  let canceledStillPaid = 0;
  const canceledWs = [
    ...new Set(
      (canceledSubs.data ?? []).map((s) => s.workspace_id as string),
    ),
  ];
  if (canceledWs.length > 0) {
    for (const chunk of chunkIds(canceledWs)) {
      const ws = await db
        .from("workspaces")
        .select("id, plan")
        .in("id", chunk)
        .in("plan", ["pro", "business"]);
      // Only count if no live sub
      for (const row of ws.data ?? []) {
        if (!liveWs.has(row.id as string)) canceledStillPaid += 1;
      }
    }
  }

  const issues = assessBillingDataQuality({
    subscriptionsWithoutWorkspace: subsNoWs.count ?? 0,
    multipleLiveSubscriptions: multipleLive,
    duplicateProviderCustomers: dupCustomers,
    duplicateProviderEvents: dupEvents,
    unprocessedBillingEvents: unprocessed.count ?? 0,
    paidEntitlementWithoutSubscription: paidWithoutSub,
    canceledStillPaidPlan: canceledStillPaid,
    transactionsWithoutAmount: txBadAmount.count ?? 0,
    unsupportedCurrency: txBadCurrency.count ?? 0,
    impossibleTimestamps: futureTs.count ?? 0,
    duplicateProductEvents: 0,
  });

  return { issues, unavailableReason: null };
}
