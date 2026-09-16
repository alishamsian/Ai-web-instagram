import "server-only";

import type Stripe from "stripe";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { planFromPriceId } from "@/lib/billing/config";
import {
  normalizeSubscriptionStatus,
  type SubscriptionStatus,
} from "@/lib/billing/subscription-state";
import { normalizePlanId, type PlanId } from "@/lib/admin/entitlements";
import { recordProductEvent } from "@/lib/admin/events";
import {
  newCorrelationId,
  recordSystemFailure,
  recordSystemSuccess,
} from "@/lib/admin/observability";
import { createInboxNotification } from "@/lib/notifications/inbox";

export type WebhookProcessResult =
  | { ok: true; status: "processed" | "ignored" | "duplicate"; correlationId: string }
  | { ok: false; status: "failed"; code: string; correlationId: string };

function safePayload(event: Stripe.Event): Record<string, unknown> {
  const obj = event.data?.object as unknown as Record<string, unknown> | null;
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    object_id: obj && typeof obj.id === "string" ? obj.id : null,
    object_type: obj && typeof obj.object === "string" ? obj.object : null,
  };
}

function unixToIso(sec: number | null | undefined): string | null {
  if (sec == null || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000).toISOString();
}

function priceIdFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

function intervalFromSubscription(
  sub: Stripe.Subscription,
): "month" | "year" | "week" | "day" | null {
  const item = sub.items?.data?.[0];
  const interval = item?.price?.recurring?.interval;
  if (interval === "month" || interval === "year" || interval === "week" || interval === "day") {
    return interval;
  }
  return null;
}

function unitAmountFromSubscription(sub: Stripe.Subscription): number | null {
  const item = sub.items?.data?.[0];
  const amount = item?.price?.unit_amount;
  return typeof amount === "number" ? amount : null;
}

function currencyFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  const currency = item?.price?.currency;
  return currency ? currency.toLowerCase() : null;
}

function quantityFromSubscription(sub: Stripe.Subscription): number {
  const item = sub.items?.data?.[0];
  return Math.max(1, item?.quantity ?? 1);
}

async function resolveWorkspaceId(input: {
  metadataWorkspaceId?: string | null;
  customerId?: string | null;
  clientReferenceId?: string | null;
}): Promise<string | null> {
  if (input.metadataWorkspaceId) return input.metadataWorkspaceId;
  if (input.clientReferenceId) return input.clientReferenceId;
  if (!input.customerId || !supabaseConfigured()) return null;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("billing_customers")
    .select("workspace_id")
    .eq("provider", "stripe")
    .eq("provider_customer_id", input.customerId)
    .maybeSingle();
  return (data?.workspace_id as string | undefined) ?? null;
}

async function syncWorkspacePlan(
  workspaceId: string,
  plan: PlanId,
): Promise<void> {
  if (!supabaseConfigured()) return;
  const db = getSupabaseAdmin();
  await db
    .from("workspaces")
    .update({ plan })
    .eq("id", workspaceId);
}

async function upsertSubscriptionFromStripe(input: {
  workspaceId: string;
  sub: Stripe.Subscription;
  previousPlan?: string | null;
}): Promise<{ plan: PlanId; status: SubscriptionStatus | null }> {
  const db = getSupabaseAdmin();
  const priceId = priceIdFromSubscription(input.sub);
  const plan =
    planFromPriceId(priceId) ??
    normalizePlanId(
      (input.sub.metadata?.plan as string | undefined) ?? input.previousPlan ?? "pro",
    );
  const status = normalizeSubscriptionStatus(input.sub.status);
  const customerId =
    typeof input.sub.customer === "string"
      ? input.sub.customer
      : input.sub.customer?.id ?? null;

  const row = {
    workspace_id: input.workspaceId,
    provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: input.sub.id,
    provider_price_id: priceId,
    plan,
    status: status ?? input.sub.status,
    billing_interval: intervalFromSubscription(input.sub),
    quantity: quantityFromSubscription(input.sub),
    current_period_start: unixToIso(input.sub.current_period_start),
    current_period_end: unixToIso(input.sub.current_period_end),
    cancel_at_period_end: Boolean(input.sub.cancel_at_period_end),
    canceled_at: unixToIso(input.sub.canceled_at),
    trial_start: unixToIso(input.sub.trial_start),
    trial_end: unixToIso(input.sub.trial_end),
    unit_amount_cents: unitAmountFromSubscription(input.sub),
    currency: currencyFromSubscription(input.sub),
    updated_at: new Date().toISOString(),
  };

  // Upsert by provider_subscription_id
  const { data: existing } = await db
    .from("subscriptions")
    .select("id, plan")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", input.sub.id)
    .maybeSingle();

  if (existing?.id) {
    await db.from("subscriptions").update(row).eq("id", existing.id);
  } else {
    // Clear conflicting live rows for this workspace before insert
    await db
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", input.workspaceId)
      .in("status", ["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])
      .neq("provider_subscription_id", input.sub.id);

    await db.from("subscriptions").insert(row);
  }

  return { plan, status };
}

async function upsertTransaction(input: {
  workspaceId: string | null;
  providerTransactionId: string;
  providerInvoiceId?: string | null;
  providerChargeId?: string | null;
  providerSubscriptionId?: string | null;
  transactionType: "invoice_payment" | "charge" | "refund" | "credit" | "adjustment";
  status: "pending" | "succeeded" | "failed" | "canceled" | "refunded" | "partially_refunded";
  amountCents: number;
  currency: string;
  refundedAmountCents?: number;
  occurredAt?: string;
  metadataSafe?: Record<string, unknown>;
}): Promise<void> {
  if (!supabaseConfigured()) return;
  const db = getSupabaseAdmin();
  await db.from("billing_transactions").upsert(
    {
      workspace_id: input.workspaceId,
      provider: "stripe",
      provider_transaction_id: input.providerTransactionId,
      provider_invoice_id: input.providerInvoiceId ?? null,
      provider_charge_id: input.providerChargeId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      transaction_type: input.transactionType,
      status: input.status,
      amount_cents: input.amountCents,
      currency: input.currency.toLowerCase(),
      refunded_amount_cents: input.refundedAmountCents ?? 0,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata_safe: input.metadataSafe ?? {},
    },
    { onConflict: "provider,provider_transaction_id" },
  );
}

/**
 * Idempotent Stripe webhook processor.
 * Unique (provider, provider_event_id) prevents duplicate side effects.
 */
export async function processStripeEvent(
  event: Stripe.Event,
): Promise<WebhookProcessResult> {
  const correlationId = newCorrelationId();

  if (!supabaseConfigured()) {
    return {
      ok: false,
      status: "failed",
      code: "DATABASE_UNAVAILABLE",
      correlationId,
    };
  }

  const db = getSupabaseAdmin();

  // Insert ledger row first — unique constraint = idempotency gate
  const { data: inserted, error: insertError } = await db
    .from("billing_events")
    .insert({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      status: "processing",
      correlation_id: correlationId,
      payload_safe: safePayload(event),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    // Duplicate provider_event_id
    if (
      insertError.code === "23505" ||
      /duplicate|unique/i.test(insertError.message || "")
    ) {
      return { ok: true, status: "duplicate", correlationId };
    }
    void recordSystemFailure({
      source: "webhook.stripe",
      eventName: "webhook.persist_failed",
      errorCode: insertError.code || "persist_failed",
      message: "Could not persist billing event",
      severity: "warning",
      correlationId,
    });
    return {
      ok: false,
      status: "failed",
      code: "EVENT_PERSIST_FAILED",
      correlationId,
    };
  }

  const eventRowId = inserted?.id as string | undefined;

  try {
    const result = await dispatchStripeEvent(event, correlationId);
    await db
      .from("billing_events")
      .update({
        status: result.ignored ? "ignored" : "processed",
        workspace_id: result.workspaceId,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventRowId);

    void recordSystemSuccess({
      source: "webhook.stripe",
      eventName: "webhook.processed",
      correlationId,
      workspaceId: result.workspaceId,
      metadata: { event_type: event.type, ignored: result.ignored },
    });

    return {
      ok: true,
      status: result.ignored ? "ignored" : "processed",
      correlationId,
    };
  } catch (error) {
    const code =
      error instanceof Error && error.message
        ? error.message.slice(0, 80)
        : "PROCESSING_FAILED";
    await db
      .from("billing_events")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_code: code,
        error_message_safe: "Webhook processing failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventRowId);

    void recordSystemFailure({
      source: "webhook.stripe",
      eventName: "webhook.processing_failed",
      errorCode: code,
      message: "Stripe webhook processing failed",
      severity: "critical",
      correlationId,
      openIncidentIfCritical: true,
      metadata: { event_type: event.type },
    });

    return { ok: false, status: "failed", code, correlationId };
  }
}

async function dispatchStripeEvent(
  event: Stripe.Event,
  correlationId: string,
): Promise<{ workspaceId: string | null; ignored: boolean }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = await resolveWorkspaceId({
        metadataWorkspaceId: session.metadata?.workspace_id ?? null,
        clientReferenceId: session.client_reference_id,
        customerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null,
      });
      if (workspaceId) {
        void recordProductEvent({
          eventName: "checkout_completed",
          userId: session.metadata?.user_id ?? null,
          workspaceId,
          resourceType: "checkout_session",
          resourceId: session.id,
          metadata: {
            mode: session.mode,
            correlation_id: correlationId,
          },
        });
      }
      // Entitlement comes from subscription.* events — not checkout alone.
      return { workspaceId, ignored: false };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = await resolveWorkspaceId({
        metadataWorkspaceId: sub.metadata?.workspace_id ?? null,
        customerId:
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id ?? null,
      });
      if (!workspaceId) {
        return { workspaceId: null, ignored: true };
      }

      const db = getSupabaseAdmin();
      const { data: prev } = await db
        .from("subscriptions")
        .select("plan, status")
        .eq("provider", "stripe")
        .eq("provider_subscription_id", sub.id)
        .maybeSingle();

      const { plan, status } = await upsertSubscriptionFromStripe({
        workspaceId,
        sub,
        previousPlan: (prev?.plan as string | null) ?? null,
      });

      if (status === "active" || status === "trialing") {
        await syncWorkspacePlan(workspaceId, plan);
      } else if (
        status === "canceled" ||
        status === "incomplete_expired" ||
        status === "unpaid"
      ) {
        await syncWorkspacePlan(workspaceId, "free");
      }

      const prevPlan = normalizePlanId((prev?.plan as string | null) ?? "free");
      let eventName:
        | "subscription_started"
        | "subscription_upgraded"
        | "subscription_downgraded"
        | "subscription_canceled"
        | "subscription_changed" = "subscription_changed";

      if (event.type === "customer.subscription.created") {
        eventName = "subscription_started";
      } else if (status === "canceled") {
        eventName = "subscription_canceled";
      } else if (prevPlan === "free" && plan !== "free") {
        eventName = "subscription_started";
      } else if (prevPlan === "pro" && plan === "business") {
        eventName = "subscription_upgraded";
      } else if (prevPlan === "business" && plan === "pro") {
        eventName = "subscription_downgraded";
      } else if (prevPlan !== "free" && plan === "free") {
        eventName = "subscription_canceled";
      }

      void recordProductEvent({
        eventName,
        userId: sub.metadata?.user_id ?? null,
        workspaceId,
        resourceType: "subscription",
        resourceId: sub.id,
        metadata: {
          plan,
          status,
          previous_plan: prevPlan,
          correlation_id: correlationId,
        },
      });

      if (status === "past_due" || status === "unpaid") {
        void createInboxNotification({
          workspaceId,
          kind: "system",
          title: "Payment issue",
          body: "There is a problem with your subscription payment.",
          href: "/dashboard/billing",
          tone: "warning",
          meta: { status, correlation_id: correlationId },
        });
      }

      return { workspaceId, ignored: false };
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = await resolveWorkspaceId({
        metadataWorkspaceId: sub.metadata?.workspace_id ?? null,
        customerId:
          typeof sub.customer === "string"
            ? sub.customer
            : sub.customer?.id ?? null,
      });
      if (!workspaceId) return { workspaceId: null, ignored: true };

      const db = getSupabaseAdmin();
      await db
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("provider", "stripe")
        .eq("provider_subscription_id", sub.id);

      await syncWorkspacePlan(workspaceId, "free");

      void recordProductEvent({
        eventName: "subscription_canceled",
        userId: sub.metadata?.user_id ?? null,
        workspaceId,
        resourceType: "subscription",
        resourceId: sub.id,
        metadata: { correlation_id: correlationId },
      });

      void createInboxNotification({
        workspaceId,
        kind: "system",
        title: "Subscription canceled",
        body: "Your paid subscription has ended. Free plan limits now apply.",
        href: "/dashboard/billing",
        tone: "warning",
        meta: { correlation_id: correlationId },
      });

      return { workspaceId, ignored: false };
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const workspaceId = await resolveWorkspaceId({
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null,
      });
      const amount = invoice.amount_paid ?? invoice.amount_due ?? 0;
      const currency = (invoice.currency || "usd").toLowerCase();
      await upsertTransaction({
        workspaceId,
        providerTransactionId: invoice.id,
        providerInvoiceId: invoice.id,
        providerChargeId:
          typeof invoice.charge === "string"
            ? invoice.charge
            : invoice.charge?.id ?? null,
        providerSubscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null,
        transactionType: "invoice_payment",
        status: "succeeded",
        amountCents: amount,
        currency,
        occurredAt: unixToIso(invoice.status_transitions?.paid_at) ??
          unixToIso(invoice.created) ??
          new Date().toISOString(),
      });
      if (workspaceId) {
        void recordProductEvent({
          eventName: "payment_succeeded",
          workspaceId,
          resourceType: "invoice",
          resourceId: invoice.id,
          metadata: {
            amount_cents: amount,
            currency,
            correlation_id: correlationId,
          },
        });
      }
      return { workspaceId, ignored: false };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const workspaceId = await resolveWorkspaceId({
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? null,
      });
      const amount = invoice.amount_due ?? 0;
      const currency = (invoice.currency || "usd").toLowerCase();
      await upsertTransaction({
        workspaceId,
        providerTransactionId: `${invoice.id}:failed`,
        providerInvoiceId: invoice.id,
        providerSubscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null,
        transactionType: "invoice_payment",
        status: "failed",
        amountCents: amount,
        currency,
        occurredAt: unixToIso(invoice.created) ?? new Date().toISOString(),
      });
      if (workspaceId) {
        void recordProductEvent({
          eventName: "payment_failed",
          workspaceId,
          resourceType: "invoice",
          resourceId: invoice.id,
          metadata: {
            amount_cents: amount,
            currency,
            correlation_id: correlationId,
          },
        });
        void createInboxNotification({
          workspaceId,
          kind: "system",
          title: "Payment failed",
          body: "We could not process your latest invoice. Please update your payment method.",
          href: "/dashboard/billing",
          tone: "warning",
          meta: { correlation_id: correlationId },
        });
      }
      return { workspaceId, ignored: false };
    }

    case "invoice.finalized": {
      // Informational — ignore for entitlements
      return { workspaceId: null, ignored: true };
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const workspaceId = await resolveWorkspaceId({
        customerId:
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id ?? null,
      });
      const refunded = charge.amount_refunded ?? 0;
      const currency = (charge.currency || "usd").toLowerCase();
      await upsertTransaction({
        workspaceId,
        providerTransactionId: `refund:${charge.id}`,
        providerChargeId: charge.id,
        transactionType: "refund",
        status: "succeeded",
        amountCents: refunded,
        currency,
        refundedAmountCents: refunded,
        occurredAt: unixToIso(charge.created) ?? new Date().toISOString(),
      });
      if (workspaceId) {
        void recordProductEvent({
          eventName: "refund_created",
          workspaceId,
          resourceType: "charge",
          resourceId: charge.id,
          metadata: {
            amount_cents: refunded,
            currency,
            correlation_id: correlationId,
          },
        });
      }
      return { workspaceId, ignored: false };
    }

    default:
      return { workspaceId: null, ignored: true };
  }
}
