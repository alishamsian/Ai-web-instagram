/**
 * Phase 7 closure tests — billing, entitlements, webhooks, revenue, funnel, sessions.
 * Pure-unit focused; no production data seeding.
 */

import { describe, expect, it } from "vitest";
import {
  normalizeSubscriptionStatus,
  isPaidAccessStatus,
  isBillingRiskStatus,
} from "@/lib/billing/subscription-state";
import {
  subscriptionToMrrCents,
  computeMrrFromSubscriptions,
  computeRevenueFromTransactions,
  arrFromMrrCents,
} from "@/lib/billing/mrr";
import { resolveEntitlementsFromEvidence } from "@/lib/billing/entitlements-resolver";
import {
  computeSignupToPaid,
  computeActivatedToPaid,
} from "@/lib/admin/intelligence/paid-conversion";
import {
  computeActiveUsers,
  sessionRetentionCell,
} from "@/lib/admin/intelligence/session-metrics";
import { resolveCommercialLifecycle } from "@/lib/admin/intelligence/commercial-lifecycle";
import { assessBillingDataQuality } from "@/lib/admin/intelligence/billing-data-quality";
import {
  funnelStageConversion,
  isValidActivationTimestamp,
} from "@/lib/admin/intelligence/metrics";
import {
  roleHasPermission,
  DESTRUCTIVE_PERMISSIONS,
} from "@/lib/admin/permissions";
import { PRODUCT_EVENT_NAMES } from "@/lib/admin/events";
import { ACTIVATION_WINDOW_DAYS } from "@/lib/admin/intelligence/limits";
import fs from "node:fs";
import path from "node:path";

describe("Phase 7 — subscription state machine", () => {
  it("normalizes Stripe statuses", () => {
    expect(normalizeSubscriptionStatus("active")).toBe("active");
    expect(normalizeSubscriptionStatus("past_due")).toBe("past_due");
    expect(normalizeSubscriptionStatus("nope")).toBeNull();
  });

  it("paid access and risk classification", () => {
    expect(isPaidAccessStatus("active")).toBe(true);
    expect(isPaidAccessStatus("trialing")).toBe(true);
    expect(isPaidAccessStatus("past_due")).toBe(true);
    expect(isPaidAccessStatus("canceled")).toBe(false);
    expect(isBillingRiskStatus("past_due")).toBe(true);
    expect(isBillingRiskStatus("unpaid")).toBe(true);
    expect(isBillingRiskStatus("active")).toBe(false);
  });
});

describe("Phase 7 — MRR / revenue", () => {
  it("monthly plan contributes full amount", () => {
    expect(
      subscriptionToMrrCents({
        status: "active",
        billingInterval: "month",
        unitAmountCents: 2900,
        quantity: 1,
        currency: "usd",
      }),
    ).toBe(2900);
  });

  it("annual plan contributes /12", () => {
    expect(
      subscriptionToMrrCents({
        status: "active",
        billingInterval: "year",
        unitAmountCents: 12000,
        quantity: 1,
        currency: "usd",
      }),
    ).toBe(1000);
  });

  it("excludes one-time / week / canceled from MRR", () => {
    expect(
      subscriptionToMrrCents({
        status: "canceled",
        billingInterval: "month",
        unitAmountCents: 2900,
        quantity: 1,
        currency: "usd",
      }),
    ).toBeNull();
    expect(
      subscriptionToMrrCents({
        status: "active",
        billingInterval: "week",
        unitAmountCents: 500,
        quantity: 1,
        currency: "usd",
      }),
    ).toBeNull();
  });

  it("computes ARR from MRR", () => {
    expect(arrFromMrrCents(1000)).toBe(12000);
  });

  it("aggregates MRR by currency and flags mixed", () => {
    const result = computeMrrFromSubscriptions([
      {
        status: "active",
        billingInterval: "month",
        unitAmountCents: 1000,
        quantity: 1,
        currency: "usd",
      },
      {
        status: "active",
        billingInterval: "month",
        unitAmountCents: 2000,
        quantity: 1,
        currency: "eur",
      },
    ]);
    expect(result.mixedCurrency).toBe(true);
    expect(result.totalCurrencies).toBe(2);
  });

  it("computes gross / refunds / net from transactions", () => {
    const rev = computeRevenueFromTransactions(
      [
        {
          transactionType: "invoice_payment",
          status: "succeeded",
          amountCents: 5000,
          refundedAmountCents: 0,
          currency: "usd",
          occurredAt: "2026-09-10T00:00:00.000Z",
        },
        {
          transactionType: "refund",
          status: "succeeded",
          amountCents: 1000,
          refundedAmountCents: 0,
          currency: "usd",
          occurredAt: "2026-09-11T00:00:00.000Z",
        },
        {
          transactionType: "invoice_payment",
          status: "failed",
          amountCents: 9999,
          refundedAmountCents: 0,
          currency: "usd",
          occurredAt: "2026-09-12T00:00:00.000Z",
        },
      ],
      { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T00:00:00.000Z" },
    );
    expect(rev.byCurrency[0]?.grossCents).toBe(5000);
    expect(rev.byCurrency[0]?.refundsCents).toBe(1000);
    expect(rev.byCurrency[0]?.netCents).toBe(4000);
  });
});

describe("Phase 7 — entitlement resolver", () => {
  it("does not grant paid from workspace.plan when billing configured without subscription", () => {
    const r = resolveEntitlementsFromEvidence({
      workspacePlan: "pro",
      subscription: null,
      override: null,
      billingConfigured: true,
    });
    expect(r.plan).toBe("free");
    expect(r.paidAccess).toBe(false);
    expect(r.source).toBe("free_default");
  });

  it("grants paid from active subscription when billing configured", () => {
    const r = resolveEntitlementsFromEvidence({
      workspacePlan: "free",
      subscription: {
        plan: "pro",
        status: "active",
        current_period_end: "2026-10-01T00:00:00.000Z",
      },
      override: null,
      billingConfigured: true,
    });
    expect(r.plan).toBe("pro");
    expect(r.paidAccess).toBe(true);
    expect(r.source).toBe("subscription");
  });

  it("override wins over subscription", () => {
    const r = resolveEntitlementsFromEvidence({
      workspacePlan: "free",
      subscription: {
        plan: "pro",
        status: "active",
        current_period_end: null,
      },
      override: {
        id: "ov-1",
        plan: "business",
        expires_at: "2099-01-01T00:00:00.000Z",
      },
      billingConfigured: true,
    });
    expect(r.plan).toBe("business");
    expect(r.source).toBe("override");
  });

  it("expired override is ignored", () => {
    const r = resolveEntitlementsFromEvidence({
      workspacePlan: "free",
      subscription: null,
      override: {
        id: "ov-1",
        plan: "pro",
        expires_at: "2020-01-01T00:00:00.000Z",
      },
      billingConfigured: true,
      now: new Date("2026-09-16T00:00:00.000Z"),
    });
    expect(r.plan).toBe("free");
  });

  it("falls back to workspace.plan when billing unconfigured", () => {
    const r = resolveEntitlementsFromEvidence({
      workspacePlan: "pro",
      subscription: null,
      override: null,
      billingConfigured: false,
    });
    expect(r.plan).toBe("pro");
    expect(r.source).toBe("billing_unconfigured");
  });
});

describe("Phase 7 — paid conversion maturity", () => {
  it("returns pending when cohort not mature", () => {
    const r = computeSignupToPaid({
      members: [
        {
          userId: "u1",
          signupAt: "2026-09-10T00:00:00.000Z",
          activatedAt: null,
          paidAt: null,
        },
      ],
      cutoff: "2026-09-16T00:00:00.000Z",
      windowDays: 60,
      minCohortSize: 1,
    });
    expect(r.status).toBe("pending");
    expect(r.rate).toBeNull();
  });

  it("computes rate for mature cohort", () => {
    const r = computeSignupToPaid({
      members: [
        {
          userId: "u1",
          signupAt: "2026-01-01T00:00:00.000Z",
          activatedAt: "2026-01-05T00:00:00.000Z",
          paidAt: "2026-01-20T00:00:00.000Z",
        },
        {
          userId: "u2",
          signupAt: "2026-01-01T00:00:00.000Z",
          activatedAt: null,
          paidAt: null,
        },
      ],
      cutoff: "2026-09-16T00:00:00.000Z",
      windowDays: 60,
      minCohortSize: 2,
    });
    expect(r.status).toBe("available");
    expect(r.converted).toBe(1);
    expect(r.rate).toBe(0.5);
  });

  it("rejects paid before activation for activated→paid", () => {
    const r = computeActivatedToPaid({
      members: [
        {
          userId: "u1",
          signupAt: "2026-01-01T00:00:00.000Z",
          activatedAt: "2026-02-01T00:00:00.000Z",
          paidAt: "2026-01-15T00:00:00.000Z",
        },
      ],
      cutoff: "2026-09-16T00:00:00.000Z",
      windowDays: 60,
      minCohortSize: 1,
    });
    expect(r.converted).toBe(0);
  });
});

describe("Phase 7 — sessions / DAU", () => {
  it("returns unavailable when telemetry missing — not zero", () => {
    const r = computeActiveUsers({
      dauUserIds: new Set(),
      wauUserIds: new Set(),
      mauUserIds: new Set(),
      telemetryAvailable: false,
    });
    expect(r.status).toBe("unavailable");
    expect(r.dau).toBeNull();
  });

  it("computes DAU/WAU/MAU when available", () => {
    const r = computeActiveUsers({
      dauUserIds: new Set(["a", "b"]),
      wauUserIds: new Set(["a", "b", "c"]),
      mauUserIds: new Set(["a", "b", "c", "d"]),
      telemetryAvailable: true,
    });
    expect(r.status).toBe("available");
    expect(r.dau).toBe(2);
    expect(r.wau).toBe(3);
    expect(r.mau).toBe(4);
  });

  it("session retention immature → pending not 0%", () => {
    const cell = sessionRetentionCell({
      cohortSize: 100,
      retained: 0,
      mature: false,
      minCohortSize: 5,
    });
    expect(cell.status).toBe("pending");
    expect(cell.rate).toBeNull();
  });
});

describe("Phase 7 — commercial lifecycle", () => {
  const baseProduct = {
    ageDays: 40,
    hasWebsite: true,
    hasPublishedWebsite: true,
    successfulImports: 1,
    daysSinceActivity: 2,
    aiRequestsRecent: 1,
    publicationCount: 0,
    websiteCount: 1,
    healthCategory: "healthy" as const,
  };

  it("maps past_due to at_risk", () => {
    const r = resolveCommercialLifecycle({
      product: baseProduct,
      subscriptionStatus: "past_due",
      plan: "pro",
      hadPaidBefore: true,
      billingTelemetryAvailable: true,
    });
    expect(r.stage).toBe("at_risk");
  });

  it("maps canceled after paid to churned", () => {
    const r = resolveCommercialLifecycle({
      product: baseProduct,
      subscriptionStatus: "canceled",
      plan: "free",
      hadPaidBefore: true,
      billingTelemetryAvailable: true,
    });
    expect(r.stage).toBe("churned");
  });

  it("does not invent churn without billing telemetry", () => {
    const r = resolveCommercialLifecycle({
      product: baseProduct,
      subscriptionStatus: null,
      plan: "free",
      hadPaidBefore: false,
      billingTelemetryAvailable: false,
    });
    expect(r.stage).not.toBe("churned");
  });
});

describe("Phase 7 — funnel conversion math", () => {
  it("zero denominator → insufficient_data not 0%", () => {
    const c = funnelStageConversion(5, 0);
    expect(c.status).toBe("insufficient_data");
  });

  it("activation temporal integrity still holds", () => {
    const signup = "2026-09-01T00:00:00.000Z";
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: "2026-08-31T00:00:00.000Z",
        cutoffAt: "2026-09-16T00:00:00.000Z",
        windowDays: ACTIVATION_WINDOW_DAYS,
      }),
    ).toBe(false);
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: "2026-10-05T00:00:00.000Z",
        cutoffAt: "2026-10-10T00:00:00.000Z",
        windowDays: ACTIVATION_WINDOW_DAYS,
      }),
    ).toBe(false);
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: "2026-09-15T00:00:00.000Z",
        cutoffAt: "2026-09-16T00:00:00.000Z",
        windowDays: ACTIVATION_WINDOW_DAYS,
      }),
    ).toBe(true);
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: "2026-09-20T00:00:00.000Z",
        cutoffAt: "2026-09-16T00:00:00.000Z",
        windowDays: ACTIVATION_WINDOW_DAYS,
      }),
    ).toBe(false);
  });
});

describe("Phase 7 — billing data quality", () => {
  it("emits issues only when counts > 0", () => {
    const issues = assessBillingDataQuality({
      subscriptionsWithoutWorkspace: 0,
      multipleLiveSubscriptions: 2,
      duplicateProviderCustomers: 0,
      duplicateProviderEvents: 0,
      unprocessedBillingEvents: 1,
      paidEntitlementWithoutSubscription: 3,
      canceledStillPaidPlan: 0,
      transactionsWithoutAmount: 0,
      unsupportedCurrency: 0,
      impossibleTimestamps: 0,
      duplicateProductEvents: 0,
    });
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "multiple_live_subscriptions",
        "unprocessed_billing_event",
        "paid_entitlement_without_subscription",
      ]),
    );
    expect(issues.find((i) => i.code === "subscription_without_workspace")).toBeUndefined();
  });
});

describe("Phase 7 — RBAC", () => {
  it("ANALYST is read-only for billing/growth/revenue", () => {
    expect(roleHasPermission("ANALYST", "billing.read")).toBe(true);
    expect(roleHasPermission("ANALYST", "revenue.read")).toBe(true);
    expect(roleHasPermission("ANALYST", "growth.read")).toBe(true);
    expect(roleHasPermission("ANALYST", "billing.manage")).toBe(false);
    expect(roleHasPermission("ANALYST", "billing.override")).toBe(false);
    expect(roleHasPermission("ANALYST", "billing.write")).toBe(false);
  });

  it("SUPPORT cannot override entitlements", () => {
    expect(roleHasPermission("SUPPORT", "billing.override")).toBe(false);
    expect(roleHasPermission("SUPPORT", "billing.manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "billing.read")).toBe(false);
  });

  it("OPERATIONS cannot manage/override billing", () => {
    expect(roleHasPermission("OPERATIONS", "billing.read")).toBe(true);
    expect(roleHasPermission("OPERATIONS", "billing.manage")).toBe(false);
    expect(roleHasPermission("OPERATIONS", "billing.override")).toBe(false);
  });

  it("billing.override is destructive", () => {
    expect(DESTRUCTIVE_PERMISSIONS).toContain("billing.override");
  });
});

describe("Phase 7 — event taxonomy", () => {
  it("includes billing and session events", () => {
    for (const name of [
      "checkout_started",
      "checkout_completed",
      "payment_succeeded",
      "payment_failed",
      "refund_created",
      "session_started",
      "website_previewed",
      "website_created",
      "editor_opened",
      "domain_connection_started",
      "publish_flow_started",
    ] as const) {
      expect(PRODUCT_EVENT_NAMES).toContain(name);
    }
  });
});

describe("Phase 7 — migration presence", () => {
  it("ships additive billing migration", () => {
    const p = path.join(
      process.cwd(),
      "supabase/migrations/20260916200000_admin_phase7_billing.sql",
    );
    expect(fs.existsSync(p)).toBe(true);
    const sql = fs.readFileSync(p, "utf8");
    expect(sql).toContain("billing_customers");
    expect(sql).toContain("billing_events");
    expect(sql).toContain("billing_transactions");
    expect(sql).toContain("entitlement_overrides");
    expect(sql).toContain("user_sessions");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.billing_events from anon");
  });
});
