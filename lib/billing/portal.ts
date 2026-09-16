import "server-only";

import { APP_URL } from "@/lib/config/env";
import { isBillingConfigured } from "@/lib/billing/config";
import { getOrCreateBillingCustomer } from "@/lib/billing/customers";
import { requireStripe } from "@/lib/billing/stripe";

export async function createCustomerPortalSession(input: {
  workspaceId: string;
  email?: string | null;
  name?: string | null;
  locale?: string;
}): Promise<
  | { ok: true; url: string }
  | { ok: false; code: string; message: string }
> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      code: "BILLING_NOT_CONFIGURED",
      message: "Billing provider is not configured",
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
  const returnUrl = `${base}/${locale}/dashboard/billing`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.customer.providerCustomerId,
      return_url: returnUrl,
    });
    return { ok: true, url: session.url };
  } catch {
    return {
      ok: false,
      code: "PORTAL_CREATE_FAILED",
      message: "Could not create customer portal session",
    };
  }
}
