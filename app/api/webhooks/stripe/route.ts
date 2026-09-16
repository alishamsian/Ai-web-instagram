import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { getStripeWebhookSecret, isBillingWebhookConfigured } from "@/lib/billing/config";
import { processStripeEvent } from "@/lib/billing/webhooks";
import {
  newCorrelationId,
  recordSystemFailure,
} from "@/lib/admin/observability";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const correlationId = newCorrelationId();

  if (!isBillingWebhookConfigured()) {
    void recordSystemFailure({
      source: "webhook.stripe",
      eventName: "webhook.not_configured",
      errorCode: "BILLING_WEBHOOK_NOT_CONFIGURED",
      message: "Stripe webhook secret or secret key missing",
      severity: "warning",
      correlationId,
    });
    return NextResponse.json(
      { error: "BILLING_WEBHOOK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "BILLING_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch {
    void recordSystemFailure({
      source: "webhook.stripe",
      eventName: "webhook.invalid_signature",
      errorCode: "INVALID_SIGNATURE",
      message: "Stripe webhook signature verification failed",
      severity: "warning",
      correlationId,
    });
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  const result = await processStripeEvent(event);
  if (!result.ok) {
    // Return 500 so Stripe retries recoverable failures.
    return NextResponse.json(
      {
        error: result.code,
        correlationId: result.correlationId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    received: true,
    status: result.status,
    correlationId: result.correlationId,
  });
}
