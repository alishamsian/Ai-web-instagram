/**
 * Pure MRR / revenue helpers — amounts must originate from provider records.
 * Monthly: unit_amount as-is. Annual: unit_amount / 12.
 * One-time charges are NEVER counted as MRR.
 */

export type MrrLineInput = {
  status: string;
  billingInterval: "month" | "year" | "week" | "day" | null;
  unitAmountCents: number | null;
  quantity: number;
  currency: string | null;
  cancelAtPeriodEnd?: boolean;
};

export type MrrBreakdown = {
  currency: string;
  mrrCents: number;
  activePaidCount: number;
  definition: string;
};

const MRR_DEFINITION =
  "MRR = sum of recurring unit_amount_cents × quantity for active|trialing subscriptions. " +
  "Annual prices contribute amount/12. Week/day intervals excluded from MRR. " +
  "One-time charges excluded. Unpaid invoices are not collected revenue.";

/** Convert a single subscription line into monthly recurring cents, or null if not MRR-eligible. */
export function subscriptionToMrrCents(line: MrrLineInput): number | null {
  if (line.status !== "active" && line.status !== "trialing") return null;
  if (line.unitAmountCents == null || line.unitAmountCents < 0) return null;
  const qty = Math.max(1, line.quantity || 1);
  const amount = line.unitAmountCents * qty;
  if (line.billingInterval === "month") return amount;
  if (line.billingInterval === "year") return Math.round(amount / 12);
  // week/day/unknown — do not invent MRR
  return null;
}

export function computeMrrFromSubscriptions(
  lines: MrrLineInput[],
): {
  byCurrency: MrrBreakdown[];
  totalCurrencies: number;
  mixedCurrency: boolean;
  definition: string;
} {
  const map = new Map<string, { mrr: number; count: number }>();
  for (const line of lines) {
    const mrr = subscriptionToMrrCents(line);
    if (mrr == null) continue;
    const currency = (line.currency || "").toUpperCase();
    if (!currency) continue;
    const cur = map.get(currency) ?? { mrr: 0, count: 0 };
    cur.mrr += mrr;
    cur.count += 1;
    map.set(currency, cur);
  }
  const byCurrency: MrrBreakdown[] = [...map.entries()].map(
    ([currency, v]) => ({
      currency,
      mrrCents: v.mrr,
      activePaidCount: v.count,
      definition: MRR_DEFINITION,
    }),
  );
  return {
    byCurrency,
    totalCurrencies: byCurrency.length,
    mixedCurrency: byCurrency.length > 1,
    definition: MRR_DEFINITION,
  };
}

export function arrFromMrrCents(mrrCents: number): number {
  return mrrCents * 12;
}

export type TransactionLine = {
  transactionType: string;
  status: string;
  amountCents: number;
  refundedAmountCents: number;
  currency: string;
  occurredAt: string;
};

export function computeRevenueFromTransactions(
  lines: TransactionLine[],
  range: { start: string; end: string },
): {
  byCurrency: Array<{
    currency: string;
    grossCents: number;
    refundsCents: number;
    netCents: number;
  }>;
  mixedCurrency: boolean;
  definition: string;
} {
  const map = new Map<
    string,
    { gross: number; refunds: number }
  >();
  for (const t of lines) {
    if (t.occurredAt < range.start || t.occurredAt >= range.end) continue;
    const currency = t.currency.toUpperCase();
    if (!currency) continue;
    const cur = map.get(currency) ?? { gross: 0, refunds: 0 };
    if (
      (t.transactionType === "invoice_payment" || t.transactionType === "charge") &&
      t.status === "succeeded"
    ) {
      cur.gross += Math.max(0, t.amountCents);
    }
    if (t.transactionType === "refund" && t.status === "succeeded") {
      cur.refunds += Math.max(0, t.amountCents);
    } else if (t.refundedAmountCents > 0) {
      cur.refunds += Math.max(0, t.refundedAmountCents);
    }
    map.set(currency, cur);
  }
  const byCurrency = [...map.entries()].map(([currency, v]) => ({
    currency,
    grossCents: v.gross,
    refundsCents: v.refunds,
    netCents: v.gross - v.refunds,
  }));
  return {
    byCurrency,
    mixedCurrency: byCurrency.length > 1,
    definition:
      "Gross = succeeded invoice_payment|charge in range. Refunds = succeeded refunds + refunded_amount_cents. Net = gross − refunds. Collected cash ≠ booked MRR.",
  };
}

export { MRR_DEFINITION };
