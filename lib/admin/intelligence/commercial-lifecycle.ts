/**
 * Commercial customer lifecycle — deterministic, single authoritative module.
 *
 * Precedence (highest first):
 * 1. churned — canceled paid subscription, no reactivation
 * 2. at_risk — past_due/unpaid OR prolonged inactivity after paid/activated
 * 3. reactivated — previously canceled, now active paid again
 * 4. expansion — business plan (or upgrade evidence)
 * 5. paid — active/trialing paid subscription
 * 6. trial — trialing status
 * 7. engaged / activated / new — product-stage fallbacks from Phase 6 signals
 *
 * Missing billing telemetry is NOT treated as negative evidence.
 */

import type { LifecycleStage } from "@/lib/admin/intelligence/lifecycle";
import { resolveLifecycle, type LifecycleInput } from "@/lib/admin/intelligence/lifecycle";
import type { SubscriptionStatus } from "@/lib/billing/subscription-state";
import {
  isBillingRiskStatus,
  isPaidAccessStatus,
} from "@/lib/billing/subscription-state";

export type CommercialLifecycleStage =
  | "new"
  | "activated"
  | "engaged"
  | "trial"
  | "paid"
  | "expansion"
  | "at_risk"
  | "churned"
  | "reactivated";

export type CommercialLifecycleInput = {
  product: LifecycleInput;
  subscriptionStatus: SubscriptionStatus | null;
  plan: string | null;
  /** True when we have any billing history for this workspace */
  hadPaidBefore: boolean;
  billingTelemetryAvailable: boolean;
};

export type CommercialLifecycleResult = {
  stage: CommercialLifecycleStage;
  reasons: string[];
  productStage: LifecycleStage;
};

export function resolveCommercialLifecycle(
  input: CommercialLifecycleInput,
): CommercialLifecycleResult {
  const product = resolveLifecycle(input.product);
  const reasons: string[] = [];
  const status = input.subscriptionStatus;
  const plan = (input.plan || "free").toLowerCase();

  if (input.billingTelemetryAvailable) {
    if (isBillingRiskStatus(status)) {
      reasons.push(`billing_status=${status}`);
      return { stage: "at_risk", reasons, productStage: product.stage };
    }

    if (status === "canceled" && input.hadPaidBefore) {
      reasons.push("subscription_canceled_after_paid");
      return { stage: "churned", reasons, productStage: product.stage };
    }

    if (
      isPaidAccessStatus(status) &&
      input.hadPaidBefore &&
      plan !== "free" &&
      (product.stage === "dormant" || product.stage === "at_risk")
    ) {
      reasons.push("paid_after_dormant_or_risk");
      return { stage: "reactivated", reasons, productStage: product.stage };
    }

    if (status === "trialing") {
      reasons.push("subscription_trialing");
      return { stage: "trial", reasons, productStage: product.stage };
    }

    if (isPaidAccessStatus(status) && plan === "business") {
      reasons.push("plan=business");
      return { stage: "expansion", reasons, productStage: product.stage };
    }

    if (isPaidAccessStatus(status) && plan !== "free") {
      reasons.push(`paid_status=${status}`);
      return { stage: "paid", reasons, productStage: product.stage };
    }
  }

  // Product-stage mapping (no invented billing)
  const map: Record<LifecycleStage, CommercialLifecycleStage> = {
    new: "new",
    onboarding: "new",
    activated: "activated",
    engaged: "engaged",
    power_user: "engaged",
    dormant: "at_risk",
    at_risk: "at_risk",
  };

  reasons.push(...product.reasons);
  return {
    stage: map[product.stage],
    reasons,
    productStage: product.stage,
  };
}
