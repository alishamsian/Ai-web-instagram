import "server-only";

import {
  getWorkspaceEntitlements,
  isPaidPlan,
  normalizePlanId,
  type EntitlementLimits,
  type PlanId,
} from "@/lib/admin/entitlements";
import { isBillingConfigured } from "@/lib/billing/config";
import {
  isPaidAccessStatus,
  normalizeSubscriptionStatus,
  type SubscriptionStatus,
} from "@/lib/billing/subscription-state";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type ResolvedEntitlements = {
  plan: PlanId;
  limits: EntitlementLimits;
  source:
    | "override"
    | "subscription"
    | "workspace_plan"
    | "free_default"
    | "billing_unconfigured";
  subscriptionStatus: SubscriptionStatus | null;
  paidAccess: boolean;
  overrideId: string | null;
  overrideExpiresAt: string | null;
  reason: string;
};

type SubscriptionSnap = {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

type OverrideSnap = {
  id: string;
  plan: string;
  expires_at: string | null;
};

/**
 * Authoritative entitlement resolver.
 *
 * Flow: provider subscription → local row → override → product access.
 * When billing IS configured, paid access requires a valid subscription or
 * an unexpired override — stale workspaces.plan alone is not enough.
 * When billing is NOT configured, fall back to workspaces.plan (dev/legacy).
 */
export function resolveEntitlementsFromEvidence(input: {
  workspacePlan: string | null | undefined;
  subscription: SubscriptionSnap | null;
  override: OverrideSnap | null;
  billingConfigured: boolean;
  now?: Date;
}): ResolvedEntitlements {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  if (
    input.override &&
    !isExpired(input.override.expires_at, nowIso)
  ) {
    const plan = normalizePlanId(input.override.plan);
    return {
      plan,
      limits: getWorkspaceEntitlements(plan),
      source: "override",
      subscriptionStatus: normalizeSubscriptionStatus(
        input.subscription?.status,
      ),
      paidAccess: isPaidPlan(plan),
      overrideId: input.override.id,
      overrideExpiresAt: input.override.expires_at,
      reason: "active_entitlement_override",
    };
  }

  if (input.billingConfigured) {
    const status = normalizeSubscriptionStatus(input.subscription?.status);
    if (input.subscription && isPaidAccessStatus(status)) {
      const plan = normalizePlanId(input.subscription.plan);
      return {
        plan,
        limits: getWorkspaceEntitlements(plan),
        source: "subscription",
        subscriptionStatus: status,
        paidAccess: isPaidPlan(plan),
        overrideId: null,
        overrideExpiresAt: null,
        reason: `subscription_status=${status}`,
      };
    }
    return {
      plan: "free",
      limits: getWorkspaceEntitlements("free"),
      source: "free_default",
      subscriptionStatus: status,
      paidAccess: false,
      overrideId: null,
      overrideExpiresAt: null,
      reason: status
        ? `subscription_not_paid_access:${status}`
        : "no_valid_subscription",
    };
  }

  const plan = normalizePlanId(input.workspacePlan);
  return {
    plan,
    limits: getWorkspaceEntitlements(plan),
    source: "billing_unconfigured",
    subscriptionStatus: null,
    paidAccess: isPaidPlan(plan),
    overrideId: null,
    overrideExpiresAt: null,
    reason: "billing_provider_not_configured_using_workspace_plan",
  };
}

function isExpired(expiresAt: string | null, nowIso: string): boolean {
  if (!expiresAt) return false;
  return expiresAt <= nowIso;
}

export async function resolveWorkspaceEntitlements(
  workspaceId: string,
  workspacePlan?: string | null,
): Promise<ResolvedEntitlements> {
  const billingConfigured = isBillingConfigured();

  if (!supabaseConfigured()) {
    return resolveEntitlementsFromEvidence({
      workspacePlan: workspacePlan ?? "free",
      subscription: null,
      override: null,
      billingConfigured,
    });
  }

  const db = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const [subRes, overrideRes, wsRes] = await Promise.all([
    db
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("workspace_id", workspaceId)
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("entitlement_overrides")
      .select("id, plan, expires_at, revoked_at")
      .eq("workspace_id", workspaceId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    workspacePlan == null
      ? db
          .from("workspaces")
          .select("plan")
          .eq("id", workspaceId)
          .maybeSingle()
      : Promise.resolve({ data: { plan: workspacePlan }, error: null }),
  ]);

  const override =
    overrideRes.data && !(overrideRes.data as { revoked_at?: string | null }).revoked_at
      ? {
          id: overrideRes.data.id as string,
          plan: overrideRes.data.plan as string,
          expires_at: (overrideRes.data.expires_at as string | null) ?? null,
        }
      : null;

  // Treat expired override as absent
  const activeOverride =
    override && (!override.expires_at || override.expires_at > nowIso)
      ? override
      : null;

  return resolveEntitlementsFromEvidence({
    workspacePlan:
      workspacePlan ??
      ((wsRes.data as { plan?: string } | null)?.plan ?? "free"),
    subscription: subRes.data
      ? {
          plan: (subRes.data.plan as string | null) ?? null,
          status: (subRes.data.status as string | null) ?? null,
          current_period_end:
            (subRes.data.current_period_end as string | null) ?? null,
        }
      : null,
    override: activeOverride,
    billingConfigured,
  });
}
