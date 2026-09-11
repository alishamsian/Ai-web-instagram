/** Plan entitlements — enforce on API, not just marketing copy. */
export type PlanId = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    maxWebsites: 1,
    customDomain: false,
    removeBranding: false,
    analytics: true, // basic pageviews for everyone
    smartSync: false,
    maxVersionsKept: 20,
  },
  pro: {
    maxWebsites: 25,
    customDomain: true,
    removeBranding: true,
    analytics: true,
    smartSync: true,
    maxVersionsKept: 100,
  },
} as const;

export function planLimits(plan: PlanId | string | undefined) {
  return plan === "pro" ? PLAN_LIMITS.pro : PLAN_LIMITS.free;
}

export function isProPlan(plan: PlanId | string | undefined) {
  return plan === "pro";
}
