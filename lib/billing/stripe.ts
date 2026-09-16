import "server-only";

import Stripe from "stripe";
import { getStripeSecretKey, isBillingConfigured } from "@/lib/billing/config";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!isBillingConfigured()) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(getStripeSecretKey(), {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("BILLING_NOT_CONFIGURED");
  }
  return stripe;
}
