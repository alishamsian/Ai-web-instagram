/**
 * Provider pricing adapter — verified pricing only.
 * Never invents USD rates from model memory.
 */

export type PricingQuote = {
  provider: string;
  model: string;
  inputPer1k: number;
  outputPer1k: number;
  currency: "USD";
  source: string;
};

export type CostEstimate =
  | {
      status: "available";
      value: number;
      currency: "USD";
      source: string;
    }
  | {
      status: "unavailable";
      reason: string;
    };

/**
 * Registry of verified pricing. Empty until ops configures real rates
 * (env or DB). Do not hard-code provider list prices here.
 */
const VERIFIED_PRICING: PricingQuote[] = [];

export function isAiPricingConfigured(): boolean {
  return VERIFIED_PRICING.length > 0 || Boolean(process.env.AI_PRICING_JSON?.trim());
}

function loadEnvPricing(): PricingQuote[] {
  const raw = process.env.AI_PRICING_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PricingQuote =>
        Boolean(
          p &&
            typeof p === "object" &&
            typeof (p as PricingQuote).provider === "string" &&
            typeof (p as PricingQuote).model === "string" &&
            typeof (p as PricingQuote).inputPer1k === "number" &&
            typeof (p as PricingQuote).outputPer1k === "number",
        ),
    );
  } catch {
    return [];
  }
}

export function getVerifiedPricing(
  provider: string | null | undefined,
  model: string | null | undefined,
): PricingQuote | null {
  const all = [...VERIFIED_PRICING, ...loadEnvPricing()];
  if (!provider || !model || !all.length) return null;
  const p = provider.toLowerCase();
  const m = model.toLowerCase();
  return (
    all.find(
      (q) => q.provider.toLowerCase() === p && q.model.toLowerCase() === m,
    ) ?? null
  );
}

export function estimateCostFromTokens(input: {
  provider?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  /** Prefer logged estimated_cost when already present from a verified path. */
  loggedCost?: number | null;
}): CostEstimate {
  if (input.loggedCost != null && Number.isFinite(input.loggedCost) && input.loggedCost >= 0) {
    return {
      status: "available",
      value: input.loggedCost,
      currency: "USD",
      source: "ai_usage_logs.estimated_cost",
    };
  }

  const quote = getVerifiedPricing(input.provider, input.model);
  if (!quote) {
    return {
      status: "unavailable",
      reason:
        "No verified provider pricing telemetry is currently configured.",
    };
  }

  const inTok = input.inputTokens ?? 0;
  const outTok = input.outputTokens ?? 0;
  if (!Number.isFinite(inTok) || !Number.isFinite(outTok)) {
    return {
      status: "unavailable",
      reason: "Token counts missing — cannot apply verified pricing.",
    };
  }

  const value =
    (inTok / 1000) * quote.inputPer1k + (outTok / 1000) * quote.outputPer1k;
  return {
    status: "available",
    value,
    currency: "USD",
    source: quote.source,
  };
}

export const AI_PRICING_UNAVAILABLE_REASON =
  "No verified provider pricing telemetry is currently configured.";
