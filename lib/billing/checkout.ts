import "server-only";

import { APP_URL } from "@/lib/config/env";
import {
  isBillingConfigured,
  resolvePriceConfig,
} from "@/lib/billing/config";
import { getOrCreateBillingCustomer } from "@/lib/billing/customers";
import { requireStripe } from "@/lib/billing/stripe";
import { recordProductEvent } from "@/lib/admin/events";

export async function createCheckoutSession(input: {
  workspaceId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  priceId: string;
  locale?: string;
}): Promise<
  | { ok: true; url: string; sessionId: string }
  | { ok: false; code: string; message: string }
> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      code: "BILLING_NOT_CONFIGURED",
      message: "Billing provider is not configured",
    };
  }

  const price = resolvePriceConfig(input.priceId);
  if (!price) {
    return {
      ok: false,
      code: "INVALID_PRICE",
      message: "Requested price is not configured",
    };
  }

  const customer = await getOrCreateBillingCustomer({
    workspaceId: input.workspaceId,
    email: input.email,
    name: input.name,
  });
  if (!customer.ok) {
    return {
      ok: false,
      code: customer.code,
      message: customer.message,
    };
  }

  const stripe = requireStripe();
  const base = APP_URL.replace(/\/$/, "");
  const locale = input.locale || "en";
  const successUrl = `${base}/${locale}/dashboard/billing?checkout=success`;
  const cancelUrl = `${base}/${locale}/dashboard/billing?checkout=canceled`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.customer.providerCustomerId,
      client_reference_id: input.workspaceId,
      line_items: [{ price: price.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        plan: price.plan,
        billing_interval: price.interval,
      },
      subscription_data: {
        metadata: {
          workspace_id: input.workspaceId,
          user_id: input.userId,
          plan: price.plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return {
        ok: false,
        code: "CHECKOUT_URL_MISSING",
        message: "Checkout session created without redirect URL",
      };
    }

    // Checkout creation is NOT payment proof — only telemetry.
    void recordProductEvent({
      eventName: "checkout_started",
      userId: input.userId,
      workspaceId: input.workspaceId,
      resourceType: "checkout_session",
      resourceId: session.id,
      metadata: {
        plan: price.plan,
        interval: price.interval,
        price_id: price.priceId,
      },
    });

    return { ok: true, url: session.url, sessionId: session.id };
  } catch {
    return {
      ok: false,
      code: "CHECKOUT_CREATE_FAILED",
      message: "Could not create checkout session",
    };
  }
}
