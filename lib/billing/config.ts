import "server-only";

import type { PlanId } from "@/lib/admin/entitlements";

/** Server-only Stripe configuration. Never expose secrets to the client. */
export function getStripeSecretKey(): string {
  return (process.env.STRIPE_SECRET_KEY || "").trim();
}

export function getStripeWebhookSecret(): string {
  return (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
}

export function isBillingConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

export function isBillingWebhookConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripeWebhookSecret());
}

export type StripePriceConfig = {
  priceId: string;
  plan: PlanId;
  interval: "month" | "year";
};

/**
 * Price IDs come from env — never hardcode secrets or production price IDs in code.
 * Format: STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_YEARLY,
 *         STRIPE_PRICE_BUSINESS_MONTHLY, STRIPE_PRICE_BUSINESS_YEARLY
 */
export function listConfiguredPrices(): StripePriceConfig[] {
  const entries: Array<[string, PlanId, "month" | "year"]> = [
    ["STRIPE_PRICE_PRO_MONTHLY", "pro", "month"],
    ["STRIPE_PRICE_PRO_YEARLY", "pro", "year"],
    ["STRIPE_PRICE_BUSINESS_MONTHLY", "business", "month"],
    ["STRIPE_PRICE_BUSINESS_YEARLY", "business", "year"],
  ];
  const out: StripePriceConfig[] = [];
  for (const [envKey, plan, interval] of entries) {
    const priceId = (process.env[envKey] || "").trim();
    if (priceId) out.push({ priceId, plan, interval });
  }
  return out;
}

export function resolvePriceConfig(
  priceId: string,
): StripePriceConfig | null {
  const id = priceId.trim();
  if (!id) return null;
  return listConfiguredPrices().find((p) => p.priceId === id) ?? null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  return resolvePriceConfig(priceId)?.plan ?? null;
}

export function billingDataAvailableFrom(): string | null {
  const raw = (process.env.BILLING_DATA_AVAILABLE_FROM || "").trim();
  return raw || null;
}
