/**
 * Billing data-quality checks — separate from business analytics.
 */

export type BillingDqIssue = {
  code: string;
  severity: "info" | "warning" | "critical";
  count: number;
  message: string;
};

export type BillingDqInput = {
  subscriptionsWithoutWorkspace: number;
  multipleLiveSubscriptions: number;
  duplicateProviderCustomers: number;
  duplicateProviderEvents: number;
  unprocessedBillingEvents: number;
  paidEntitlementWithoutSubscription: number;
  canceledStillPaidPlan: number;
  transactionsWithoutAmount: number;
  unsupportedCurrency: number;
  impossibleTimestamps: number;
  duplicateProductEvents: number;
};

export function assessBillingDataQuality(
  input: BillingDqInput,
): BillingDqIssue[] {
  const issues: BillingDqIssue[] = [];
  const push = (
    code: string,
    severity: BillingDqIssue["severity"],
    count: number,
    message: string,
  ) => {
    if (count > 0) issues.push({ code, severity, count, message });
  };

  push(
    "subscription_without_workspace",
    "critical",
    input.subscriptionsWithoutWorkspace,
    "Subscriptions missing workspace_id",
  );
  push(
    "multiple_live_subscriptions",
    "critical",
    input.multipleLiveSubscriptions,
    "Workspaces with more than one live subscription",
  );
  push(
    "duplicate_provider_customer",
    "warning",
    input.duplicateProviderCustomers,
    "Duplicate provider customer mappings",
  );
  push(
    "duplicate_provider_event",
    "warning",
    input.duplicateProviderEvents,
    "Duplicate provider event ids (should be blocked by unique constraint)",
  );
  push(
    "unprocessed_billing_event",
    "warning",
    input.unprocessedBillingEvents,
    "Billing events stuck in received/processing/failed",
  );
  push(
    "paid_entitlement_without_subscription",
    "critical",
    input.paidEntitlementWithoutSubscription,
    "Workspace plan is paid but no valid subscription row",
  );
  push(
    "canceled_still_paid_plan",
    "critical",
    input.canceledStillPaidPlan,
    "Canceled subscription but workspace.plan still paid",
  );
  push(
    "transaction_without_amount",
    "warning",
    input.transactionsWithoutAmount,
    "Transactions with non-positive amount",
  );
  push(
    "unsupported_currency",
    "info",
    input.unsupportedCurrency,
    "Transactions with empty/unsupported currency",
  );
  push(
    "impossible_timestamps",
    "warning",
    input.impossibleTimestamps,
    "Billing rows with future or inverted timestamps",
  );
  push(
    "duplicate_product_events",
    "info",
    input.duplicateProductEvents,
    "Duplicate deterministic product events detected",
  );

  return issues;
}
