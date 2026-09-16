import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { requireStripe } from "@/lib/billing/stripe";
import { isBillingConfigured } from "@/lib/billing/config";

export type BillingCustomerRow = {
  id: string;
  workspaceId: string;
  provider: string;
  providerCustomerId: string;
  email: string | null;
};

/**
 * Idempotent Stripe customer create/reuse keyed by workspace.
 */
export async function getOrCreateBillingCustomer(input: {
  workspaceId: string;
  email?: string | null;
  name?: string | null;
}): Promise<
  | { ok: true; customer: BillingCustomerRow; created: boolean }
  | { ok: false; code: string; message: string }
> {
  if (!isBillingConfigured()) {
    return {
      ok: false,
      code: "BILLING_NOT_CONFIGURED",
      message: "Billing provider is not configured",
    };
  }
  if (!supabaseConfigured()) {
    return {
      ok: false,
      code: "DATABASE_UNAVAILABLE",
      message: "Database is not configured",
    };
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from("billing_customers")
    .select("id, workspace_id, provider, provider_customer_id, email")
    .eq("workspace_id", input.workspaceId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      code: "BILLING_CUSTOMER_LOOKUP_FAILED",
      message: "Could not look up billing customer",
    };
  }

  if (existing?.provider_customer_id) {
    return {
      ok: true,
      created: false,
      customer: {
        id: existing.id as string,
        workspaceId: existing.workspace_id as string,
        provider: existing.provider as string,
        providerCustomerId: existing.provider_customer_id as string,
        email: (existing.email as string | null) ?? null,
      },
    };
  }

  const stripe = requireStripe();
  let stripeCustomer;
  try {
    stripeCustomer = await stripe.customers.create({
      email: input.email ?? undefined,
      name: input.name ?? undefined,
      metadata: {
        workspace_id: input.workspaceId,
      },
    });
  } catch {
    return {
      ok: false,
      code: "STRIPE_CUSTOMER_CREATE_FAILED",
      message: "Could not create billing customer",
    };
  }

  const { data: inserted, error: insertError } = await db
    .from("billing_customers")
    .upsert(
      {
        workspace_id: input.workspaceId,
        provider: "stripe",
        provider_customer_id: stripeCustomer.id,
        email: input.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,provider" },
    )
    .select("id, workspace_id, provider, provider_customer_id, email")
    .maybeSingle();

  if (insertError || !inserted) {
    // Race: another request may have inserted — re-read
    const { data: raced } = await db
      .from("billing_customers")
      .select("id, workspace_id, provider, provider_customer_id, email")
      .eq("workspace_id", input.workspaceId)
      .eq("provider", "stripe")
      .maybeSingle();
    if (raced?.provider_customer_id) {
      return {
        ok: true,
        created: false,
        customer: {
          id: raced.id as string,
          workspaceId: raced.workspace_id as string,
          provider: raced.provider as string,
          providerCustomerId: raced.provider_customer_id as string,
          email: (raced.email as string | null) ?? null,
        },
      };
    }
    return {
      ok: false,
      code: "BILLING_CUSTOMER_PERSIST_FAILED",
      message: "Could not persist billing customer",
    };
  }

  return {
    ok: true,
    created: true,
    customer: {
      id: inserted.id as string,
      workspaceId: inserted.workspace_id as string,
      provider: inserted.provider as string,
      providerCustomerId: inserted.provider_customer_id as string,
      email: (inserted.email as string | null) ?? null,
    },
  };
}
