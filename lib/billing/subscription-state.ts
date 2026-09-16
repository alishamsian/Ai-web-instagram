/**
 * Normalized subscription state machine.
 * Map all provider statuses through this module — never scatter Stripe strings.
 */

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  unpaid: "unpaid",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "incomplete_expired",
  paused: "paused",
};

/** Normalize a provider status string into the internal vocabulary. */
export function normalizeSubscriptionStatus(
  providerStatus: string | null | undefined,
): SubscriptionStatus | null {
  if (!providerStatus) return null;
  const key = providerStatus.trim().toLowerCase();
  return STRIPE_STATUS_MAP[key] ?? null;
}

/** Statuses that may grant paid entitlements (subject to plan + period). */
export function isPaidAccessStatus(
  status: SubscriptionStatus | null | undefined,
): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/** Statuses that indicate billing trouble (at-risk for paid customers). */
export function isBillingRiskStatus(
  status: SubscriptionStatus | null | undefined,
): boolean {
  return status === "past_due" || status === "unpaid" || status === "incomplete";
}

/** Statuses considered "live" for uniqueness constraints. */
export function isLiveSubscriptionStatus(
  status: SubscriptionStatus | null | undefined,
): boolean {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "unpaid" ||
    status === "paused" ||
    status === "incomplete"
  );
}
