/**
 * Plan entitlements — enforce on API, not just marketing copy.
 * Canonical capability matrix lives in lib/admin/entitlements.ts.
 * This module remains the stable import path for existing callers.
 */

import {
  getWorkspaceEntitlements,
  isPaidPlan,
  normalizePlanId,
  type EntitlementLimits,
  type PlanId as EntitlementPlanId,
} from "@/lib/admin/entitlements";

/** @deprecated Prefer EntitlementPlanId — kept for existing imports. */
export type PlanId = "free" | "pro" | EntitlementPlanId;

/** Legacy shape used across the app (subset of EntitlementLimits). */
export type PlanLimits = Pick<
  EntitlementLimits,
  | "maxWebsites"
  | "maxImportPosts"
  | "customDomain"
  | "removeBranding"
  | "analytics"
  | "smartSync"
  | "maxVersionsKept"
>;

export const PLAN_LIMITS: Record<"free" | "pro" | "business", PlanLimits> = {
  free: {
    maxWebsites: getWorkspaceEntitlements("free").maxWebsites,
    maxImportPosts: getWorkspaceEntitlements("free").maxImportPosts,
    customDomain: getWorkspaceEntitlements("free").customDomain,
    removeBranding: getWorkspaceEntitlements("free").removeBranding,
    analytics: getWorkspaceEntitlements("free").analytics,
    smartSync: getWorkspaceEntitlements("free").smartSync,
    maxVersionsKept: getWorkspaceEntitlements("free").maxVersionsKept,
  },
  pro: {
    maxWebsites: getWorkspaceEntitlements("pro").maxWebsites,
    maxImportPosts: getWorkspaceEntitlements("pro").maxImportPosts,
    customDomain: getWorkspaceEntitlements("pro").customDomain,
    removeBranding: getWorkspaceEntitlements("pro").removeBranding,
    analytics: getWorkspaceEntitlements("pro").analytics,
    smartSync: getWorkspaceEntitlements("pro").smartSync,
    maxVersionsKept: getWorkspaceEntitlements("pro").maxVersionsKept,
  },
  business: {
    maxWebsites: getWorkspaceEntitlements("business").maxWebsites,
    maxImportPosts: getWorkspaceEntitlements("business").maxImportPosts,
    customDomain: getWorkspaceEntitlements("business").customDomain,
    removeBranding: getWorkspaceEntitlements("business").removeBranding,
    analytics: getWorkspaceEntitlements("business").analytics,
    smartSync: getWorkspaceEntitlements("business").smartSync,
    maxVersionsKept: getWorkspaceEntitlements("business").maxVersionsKept,
  },
};

export function planLimits(plan: PlanId | string | undefined): PlanLimits {
  const id = normalizePlanId(plan);
  return PLAN_LIMITS[id];
}

/** True for Pro and Business (paid tiers). */
export function isProPlan(plan: PlanId | string | undefined) {
  return isPaidPlan(plan);
}

export {
  getWorkspaceEntitlements,
  canUseFeature,
  getUsageLimit,
  getRemainingUsage,
  normalizePlanId,
} from "@/lib/admin/entitlements";
