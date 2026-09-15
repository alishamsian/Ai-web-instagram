import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detectAiAnomalies,
  percentileSorted,
  DEFAULT_ANOMALY_THRESHOLDS,
  type AnomalyWindowStats,
} from "@/lib/admin/phase4-anomalies";
import {
  categorizeAiError,
  sanitizeAiErrorMessage,
  staleThresholdForJob,
  STALE_JOB_THRESHOLDS_MS,
} from "@/lib/admin/phase4-queries";
import {
  estimateCostFromTokens,
  isAiPricingConfigured,
  AI_PRICING_UNAVAILABLE_REASON,
} from "@/lib/admin/ai-pricing";
import { evaluateAlertThreshold } from "@/lib/admin/alerts";
import { metricDisplay } from "@/components/admin/format";
import type { MetricResult } from "@/lib/admin/contracts";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function baseStats(over: Partial<AnomalyWindowStats> = {}): AnomalyWindowStats {
  return {
    recentRequests: 100,
    recentFailures: 5,
    recentErrorRate: 0.05,
    recentP95: 400,
    recentTokens: 1000,
    recentCost: null,
    baselineRequests: 100,
    baselineFailures: 5,
    baselineErrorRate: 0.05,
    baselineP95: 400,
    baselineTokens: 1000,
    baselineCost: null,
    modelFailureShare: [],
    featureVolume: [],
    windowLabel: "test",
    detectedAt: "2026-09-16T00:00:00.000Z",
    ...over,
  };
}

describe("Admin Phase 4 — metrics & anomalies", () => {
  it("percentileSorted returns null on empty and correct p95", () => {
    expect(percentileSorted([], 95)).toBeNull();
    expect(percentileSorted([10, 20, 30, 40, 50], 50)).toBe(30);
  });

  it("metricDisplay maps error and insufficient_sample to unavailable UI", () => {
    const err: MetricResult<number> = {
      status: "error",
      reason: "boom",
      source: "x",
    };
    const ins: MetricResult<number> = {
      status: "insufficient_sample",
      reason: "Need ≥20",
      sampleSize: 3,
    };
    expect(metricDisplay(err).kind).toBe("unavailable");
    const d = metricDisplay(ins);
    expect(d.kind).toBe("unavailable");
    if (d.kind === "unavailable") expect(d.reason).toMatch(/n=3/);
  });

  it("detects error spike and suppresses when below threshold / low sample", () => {
    const spike = detectAiAnomalies(
      baseStats({
        recentErrorRate: 0.4,
        baselineErrorRate: 0.05,
        recentFailures: 40,
      }),
    );
    expect(spike.some((a) => a.kind === "error_spike")).toBe(true);

    const quiet = detectAiAnomalies(baseStats());
    expect(quiet.some((a) => a.kind === "error_spike")).toBe(false);

    const tiny = detectAiAnomalies(
      baseStats({
        recentRequests: 5,
        recentErrorRate: 1,
        baselineErrorRate: 0,
      }),
    );
    expect(tiny).toEqual([]);
  });

  it("detects latency spike and model failure concentration", () => {
    const latency = detectAiAnomalies(
      baseStats({ recentP95: 2000, baselineP95: 400 }),
    );
    expect(latency.some((a) => a.kind === "latency_spike")).toBe(true);

    const model = detectAiAnomalies(
      baseStats({
        recentFailures: 20,
        modelFailureShare: [{ model: "gpt-x", share: 0.85, failures: 17 }],
      }),
    );
    expect(model.some((a) => a.kind === "model_failure_concentration")).toBe(
      true,
    );
  });

  it("does not invent cost spikes without verified cost", () => {
    const anomalies = detectAiAnomalies(
      baseStats({
        recentCost: null,
        baselineCost: null,
        recentTokens: 50000,
        baselineTokens: 1000,
      }),
    );
    expect(anomalies.some((a) => a.kind === "cost_spike")).toBe(false);
    expect(anomalies.some((a) => a.kind === "token_spike")).toBe(true);
  });

  it("deduplicates anomalies by id", () => {
    const a = detectAiAnomalies(
      baseStats({
        recentErrorRate: 0.5,
        baselineErrorRate: 0.01,
        recentFailures: 50,
      }),
    );
    const ids = a.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("pricing adapter never invents rates", () => {
    expect(isAiPricingConfigured()).toBe(false);
    const est = estimateCostFromTokens({
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(est.status).toBe("unavailable");
    if (est.status === "unavailable") {
      expect(est.reason).toBe(AI_PRICING_UNAVAILABLE_REASON);
    }
  });

  it("uses logged verified cost when present", () => {
    const est = estimateCostFromTokens({ loggedCost: 0.42 });
    expect(est.status).toBe("available");
    if (est.status === "available") expect(est.value).toBe(0.42);
  });

  it("categorizes and sanitizes AI errors without leaking secrets", () => {
    expect(categorizeAiError("429", "rate limit")).toBe("rate_limit");
    expect(categorizeAiError(null, "timeout")).toBe("timeout");
    const msg = sanitizeAiErrorMessage(
      "fail sk-abcdefghijklmnopqrstuvwxyz Bearer tok.en.here",
    );
    expect(msg).not.toMatch(/sk-abc/);
    expect(msg).toMatch(/redacted/i);
  });

  it("stale thresholds are explicit and documented", () => {
    expect(staleThresholdForJob(null, "queued")).toBe(
      STALE_JOB_THRESHOLDS_MS.defaultQueued,
    );
    expect(staleThresholdForJob("instagram_import", "running")).toBe(
      STALE_JOB_THRESHOLDS_MS.importAnalyze,
    );
    expect(DEFAULT_ANOMALY_THRESHOLDS.minRecentRequests).toBeGreaterThan(0);
  });

  it("alert threshold evaluation is deterministic", () => {
    expect(
      evaluateAlertThreshold({
        metric: "ai_error_rate",
        value: 0.3,
        operator: "gt",
        threshold: 0.2,
      }),
    ).toBe(true);
    expect(
      evaluateAlertThreshold({
        metric: "ai_error_rate",
        value: 0.1,
        operator: "gt",
        threshold: 0.2,
      }),
    ).toBe(false);
  });

  it("nav includes Phase 4 AI and Operations routes", () => {
    const nav = read("components/admin/nav.ts");
    expect(nav).toMatch(/\/ai\/requests/);
    expect(nav).toMatch(/\/ai\/providers/);
    expect(nav).toMatch(/\/ai\/latency/);
    expect(nav).toMatch(/\/ai\/anomalies/);
    expect(nav).toMatch(/href: "\/ops"/);
  });

  it("Phase 4 migration is additive with correlation_id and indexes", () => {
    const sql = read("supabase/migrations/20260916030000_admin_phase4.sql");
    expect(sql).toMatch(/add column if not exists correlation_id/);
    expect(sql).toMatch(/ai_usage_logs_provider_time_idx/);
    expect(sql).toMatch(/investigating/);
    expect(sql).not.toMatch(/drop table/i);
  });

  it("prompt registry mutations require ai.manage and audit", () => {
    const src = read("lib/admin/phase4-actions.ts");
    expect(src).toMatch(/ai\.manage/);
    expect(src).toMatch(/writeAdminAuditLog/);
    expect(src).toMatch(/upsertAdminPromptRegistry/);
    expect(src).not.toMatch(/prompt_body|raw_prompt/i);
  });

  it("Phase 4 pages exist for required routes", () => {
    const paths = [
      "app/[locale]/admin/ai/requests/page.tsx",
      "app/[locale]/admin/ai/providers/page.tsx",
      "app/[locale]/admin/ai/latency/page.tsx",
      "app/[locale]/admin/ai/anomalies/page.tsx",
      "app/[locale]/admin/ops/page.tsx",
    ];
    for (const p of paths) {
      expect(read(p).length).toBeGreaterThan(100);
    }
  });
});
