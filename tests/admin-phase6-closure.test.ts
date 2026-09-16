import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  median,
  conversionRate,
  retentionPercent,
  isRetainedOnDay,
  isRetainedInWeek,
  ACTIVATION_DEFINITION,
  isValidActivationTimestamp,
  firstValidActivationAt,
  computeActivationCohort,
  addUtcDaysIso,
  computeCausalFunnel,
  funnelStageConversion,
  isRetentionDayMature,
  computeRetentionDayCell,
} from "@/lib/admin/intelligence/metrics";
import { metricDisplay } from "@/components/admin/format";
import type { MetricResult } from "@/lib/admin/contracts";
import { computeHealthScore, HEALTH_WEIGHTS } from "@/lib/admin/intelligence/health-score";
import { resolveLifecycle } from "@/lib/admin/intelligence/lifecycle";
import { detectAtRisk } from "@/lib/admin/intelligence/at-risk";
import { generateFounderInsights } from "@/lib/admin/intelligence/founder-insights";
import { assessDataQuality } from "@/lib/admin/intelligence/data-quality";
import { adoptionRate } from "@/lib/admin/intelligence/features";
import {
  MAX_ANALYTICS_DAYS,
  MIN_COHORT_SIZE,
  ANALYTICS_SAMPLE_CAP,
  FOUNDER_INSIGHTS_CAP,
  ACTIVATION_WINDOW_DAYS,
  clampAnalyticsPreset,
} from "@/lib/admin/intelligence/limits";
import { roleHasPermission } from "@/lib/admin/permissions";
import { detectAiAnomalies, percentileSorted } from "@/lib/admin/phase4-anomalies";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Phase 6 — activation / funnel math", () => {
  it("defines activation from real tables with a window", () => {
    expect(ACTIVATION_DEFINITION.id).toBe(
      "v1_publish_or_successful_import_within_window",
    );
    expect(ACTIVATION_DEFINITION.windowDays).toBe(ACTIVATION_WINDOW_DAYS);
    expect(ACTIVATION_DEFINITION.description).toMatch(/import_jobs/);
    expect(ACTIVATION_DEFINITION.description).toMatch(
      new RegExp(String(ACTIVATION_WINDOW_DAYS)),
    );
  });

  it("computes conversion and median honestly", () => {
    expect(conversionRate(2, 10)).toBe(0.2);
    expect(conversionRate(1, 0)).toBeNull();
    expect(median([])).toBeNull();
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("Phase 6 — activation temporal integrity", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";

  it("Case A: import before signup is rejected", () => {
    expect(
      isValidActivationTimestamp({
        signupAt: "2026-01-01T00:00:00.000Z",
        activationAt: "2025-12-31T00:00:00.000Z",
        cutoffAt: cutoff,
      }),
    ).toBe(false);
  });

  it("Case B: import after window is rejected", () => {
    expect(
      isValidActivationTimestamp({
        signupAt: "2026-01-01T00:00:00.000Z",
        activationAt: "2026-02-15T00:00:00.000Z", // 45 days
        cutoffAt: cutoff,
      }),
    ).toBe(false);
  });

  it("Case C: import within window is accepted", () => {
    expect(
      isValidActivationTimestamp({
        signupAt: "2026-01-01T00:00:00.000Z",
        activationAt: "2026-01-15T00:00:00.000Z",
        cutoffAt: cutoff,
      }),
    ).toBe(true);
  });

  it("Case D: activation after analysis cutoff is rejected", () => {
    expect(
      isValidActivationTimestamp({
        signupAt: "2026-01-01T00:00:00.000Z",
        activationAt: "2026-01-10T00:00:00.000Z",
        cutoffAt: "2026-01-05T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("Case E: cohort compute ignores historical leakage and O(n) maps", () => {
    const workspacesByOwner = new Map<string, string[]>([
      ["u1", ["ws1"]],
      ["u2", ["ws2"]],
    ]);
    const activationCandidatesByWorkspace = new Map<string, string[]>([
      // before signup — must not activate u1
      ["ws1", ["2025-12-01T00:00:00.000Z", "2026-01-10T00:00:00.000Z"]],
      // after window — must not activate u2
      ["ws2", ["2026-03-01T00:00:00.000Z"]],
    ]);
    const result = computeActivationCohort({
      profiles: [
        { id: "u1", created_at: "2026-01-01T00:00:00.000Z" },
        { id: "u2", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      workspacesByOwner,
      activationCandidatesByWorkspace,
      cutoffAt: cutoff,
    });
    expect(result.activatedUserIds.has("u1")).toBe(true);
    expect(result.activatedUserIds.has("u2")).toBe(false);
    expect(result.activatedWorkspaceIds.has("ws1")).toBe(true);
    expect(result.hoursToActivation).toHaveLength(1);
  });

  it("firstValidActivationAt picks earliest valid candidate", () => {
    expect(
      firstValidActivationAt({
        signupAt: "2026-01-01T00:00:00.000Z",
        candidates: [
          "2025-12-31T00:00:00.000Z",
          "2026-01-20T00:00:00.000Z",
          "2026-01-05T00:00:00.000Z",
        ],
        cutoffAt: cutoff,
      }),
    ).toBe("2026-01-05T00:00:00.000Z");
  });

  it("exact window boundary is inclusive; +1ms is rejected", () => {
    const signup = "2026-01-01T00:00:00.000Z";
    const exact = addUtcDaysIso(signup, ACTIVATION_WINDOW_DAYS);
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: exact,
        cutoffAt: "2027-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
    const over = new Date(Date.parse(exact) + 1).toISOString();
    expect(
      isValidActivationTimestamp({
        signupAt: signup,
        activationAt: over,
        cutoffAt: "2027-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});

describe("Phase 6 — causal funnel", () => {
  const cutoff = "2026-06-01T00:00:00.000Z";
  const base = {
    workspaceId: "ws1",
    createdAt: "2026-01-01T00:00:00.000Z",
    importCompletedAt: null as string | null,
    websiteGeneratedAt: null as string | null,
    previewProxyAt: null as string | null,
    publishedAt: null as string | null,
  };

  it("rejects import before workspace creation", () => {
    const r = computeCausalFunnel({
      workspaces: [
        {
          ...base,
          importCompletedAt: "2025-12-31T00:00:00.000Z",
          websiteGeneratedAt: "2026-01-02T00:00:00.000Z",
          publishedAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      cutoffAt: cutoff,
    });
    expect(r.imported).toBe(0);
    expect(r.generated).toBe(0);
    expect(r.published).toBe(0);
  });

  it("requires generation ≥ import and publish ≥ generation", () => {
    const valid = computeCausalFunnel({
      workspaces: [
        {
          ...base,
          importCompletedAt: "2026-01-02T00:00:00.000Z",
          websiteGeneratedAt: "2026-01-03T00:00:00.000Z",
          publishedAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      cutoffAt: cutoff,
    });
    expect(valid).toEqual({
      signup: 1,
      imported: 1,
      generated: 1,
      previewProxy: 0,
      published: 1,
    });

    const publishBeforeGen = computeCausalFunnel({
      workspaces: [
        {
          ...base,
          importCompletedAt: "2026-01-02T00:00:00.000Z",
          websiteGeneratedAt: "2026-01-05T00:00:00.000Z",
          publishedAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      cutoffAt: cutoff,
    });
    expect(publishBeforeGen.generated).toBe(1);
    expect(publishBeforeGen.published).toBe(0);
  });

  it("does not count generation without successful import", () => {
    const r = computeCausalFunnel({
      workspaces: [
        {
          ...base,
          importCompletedAt: null,
          websiteGeneratedAt: "2026-01-02T00:00:00.000Z",
          publishedAt: "2026-01-03T00:00:00.000Z",
        },
      ],
      cutoffAt: cutoff,
    });
    expect(r.imported).toBe(0);
    expect(r.generated).toBe(0);
    expect(r.published).toBe(0);
  });

  it("conversion uses previous stage; zero previous → insufficient_data", () => {
    expect(funnelStageConversion(5, 10).rate).toBe(0.5);
    const zero = funnelStageConversion(0, 0);
    expect(zero.status).toBe("insufficient_data");
    expect(zero.rate).toBeNull();
  });

  it("preview proxy is counted separately and labeled partial in source code", () => {
    const r = computeCausalFunnel({
      workspaces: [
        {
          ...base,
          importCompletedAt: "2026-01-02T00:00:00.000Z",
          websiteGeneratedAt: "2026-01-03T00:00:00.000Z",
          previewProxyAt: "2026-01-03T12:00:00.000Z",
          publishedAt: "2026-01-04T00:00:00.000Z",
        },
      ],
      cutoffAt: cutoff,
    });
    expect(r.previewProxy).toBe(1);
    expect(r.published).toBe(1);
    const funnelSrc = read("lib/admin/phase6-queries.ts");
    expect(funnelSrc).toMatch(/Preview proxy based on website_edited/);
  });
});

describe("Phase 6 — retention maturity", () => {
  it("marks immature day cohorts as pending, never 0%", () => {
    expect(
      isRetentionDayMature(
        "2026-09-10T00:00:00.000Z",
        7,
        "2026-09-16T00:00:00.000Z",
      ),
    ).toBe(false);
    expect(
      isRetentionDayMature(
        "2026-09-10T00:00:00.000Z",
        1,
        "2026-09-16T00:00:00.000Z",
      ),
    ).toBe(true);

    const cell = computeRetentionDayCell({
      profiles: [
        { id: "a", created_at: "2026-09-10T00:00:00.000Z" },
        { id: "b", created_at: "2026-09-10T00:00:00.000Z" },
        { id: "c", created_at: "2026-09-10T00:00:00.000Z" },
        { id: "d", created_at: "2026-09-10T00:00:00.000Z" },
        { id: "e", created_at: "2026-09-10T00:00:00.000Z" },
      ],
      activitiesByUser: new Map(),
      dayOffset: 30,
      cutoffAt: "2026-09-16T00:00:00.000Z",
    });
    expect(cell.status).toBe("pending");
    expect(cell.rate).toBeNull();
  });

  it("computes D1 only on mature members", () => {
    const profiles = Array.from({ length: 5 }, (_, i) => ({
      id: `u${i}`,
      created_at: "2026-09-01T00:00:00.000Z",
    }));
    const acts = new Map<string, string[]>([
      ["u0", ["2026-09-02T12:00:00.000Z"]],
      ["u1", ["2026-09-02T12:00:00.000Z"]],
    ]);
    const cell = computeRetentionDayCell({
      profiles,
      activitiesByUser: acts,
      dayOffset: 1,
      cutoffAt: "2026-09-16T00:00:00.000Z",
    });
    expect(cell.status).toBe("available");
    expect(cell.matureSize).toBe(5);
    expect(cell.retained).toBe(2);
    expect(cell.rate).toBe(0.4);
  });
});

describe("Phase 6 — permission_denied vs zero", () => {
  it("metricDisplay distinguishes permission_denied from zero", () => {
    const denied: MetricResult<number> = {
      status: "permission_denied",
      reason: "workspaces.read required",
    };
    const zero: MetricResult<number> = {
      status: "available",
      value: 0,
      source: "t",
    };
    expect(metricDisplay(denied).kind).toBe("permission_denied");
    const z = metricDisplay(zero);
    expect(z.kind).toBe("value");
    if (z.kind === "value") expect(z.text).toMatch(/0/);
  });
});

describe("Phase 6 — retention / cohorts", () => {
  it("requires minimum cohort size before showing retention %", () => {
    const small = retentionPercent(1, MIN_COHORT_SIZE - 1);
    expect(small.status).toBe("insufficient_data");
    expect(small.value).toBeNull();
    const ok = retentionPercent(3, MIN_COHORT_SIZE);
    expect(ok.status).toBe("available");
    expect(ok.value).toBe(3 / MIN_COHORT_SIZE);
  });

  it("day/week retention matching is UTC calendar based", () => {
    expect(
      isRetainedOnDay("2026-01-01T10:00:00Z", "2026-01-02T08:00:00Z", 1),
    ).toBe(true);
    expect(
      isRetainedOnDay("2026-01-01T10:00:00Z", "2026-01-03T08:00:00Z", 1),
    ).toBe(false);
    expect(
      isRetainedInWeek("2026-01-01T00:00:00Z", "2026-01-10T00:00:00Z", 1),
    ).toBe(true);
  });
});

describe("Phase 6 — feature adoption", () => {
  it("adoption rate null when eligible is zero", () => {
    expect(adoptionRate(5, 0)).toBeNull();
    expect(adoptionRate(5, 10)).toBe(0.5);
  });
});

describe("Phase 6 — health / lifecycle / risk", () => {
  it("health score is explainable with central weights", () => {
    expect(HEALTH_WEIGHTS.publishedWebsite).toBeGreaterThan(0);
    const healthy = computeHealthScore({
      daysSinceActivity: 1,
      hasPublishedWebsite: true,
      hasWebsite: true,
      successfulImports: 2,
      failedJobsRecent: 0,
      aiRequestsRecent: 3,
      publicationCount: 1,
    });
    expect(healthy.category).toBe("healthy");
    expect(healthy.score).not.toBeNull();
    expect(healthy.breakdown.length).toBeGreaterThan(0);

    const insufficient = computeHealthScore({
      daysSinceActivity: null,
      hasPublishedWebsite: false,
      hasWebsite: false,
      successfulImports: 0,
      failedJobsRecent: 0,
      aiRequestsRecent: 0,
      publicationCount: 0,
      insufficientSignals: true,
    });
    expect(insufficient.category).toBe("insufficient_data");
    expect(insufficient.score).toBeNull();
  });

  it("lifecycle and at-risk rules are deterministic", () => {
    const life = resolveLifecycle({
      ageDays: 40,
      hasWebsite: true,
      hasPublishedWebsite: true,
      successfulImports: 1,
      daysSinceActivity: 35,
      aiRequestsRecent: 0,
      publicationCount: 0,
      websiteCount: 1,
      healthCategory: "neutral",
    });
    expect(life.stage).toBe("dormant");
    expect(life.reasons[0]).toMatch(/inactive/);

    const flags = detectAtRisk({
      daysSinceActivity: 20,
      lastActivityAt: "2026-01-01T00:00:00Z",
      hasPublishedWebsite: true,
      hasWebsite: true,
      successfulImports: 0,
      failedImports: 4,
      failedJobsRecent: 4,
      publishingFailuresRecent: 0,
      ageDays: 30,
      activityRecent: 1,
      activityPrevious: 10,
    });
    expect(flags.some((f) => f.code === "published_then_inactive")).toBe(true);
    expect(flags.some((f) => f.code === "repeated_import_failure")).toBe(true);
    expect(flags.every((f) => f.reason && f.evidence)).toBe(true);
  });
});

describe("Phase 6 — AI anomalies / percentiles", () => {
  it("reuses phase4 deterministic anomaly detection", () => {
    const anomalies = detectAiAnomalies({
      recentRequests: 50,
      recentFailures: 20,
      recentErrorRate: 0.4,
      recentP95: 2000,
      recentTokens: 1000,
      recentCost: 5,
      baselineRequests: 50,
      baselineFailures: 2,
      baselineErrorRate: 0.04,
      baselineP95: 500,
      baselineTokens: 1000,
      baselineCost: 2,
      modelFailureShare: [],
      featureVolume: [],
      windowLabel: "24h",
      detectedAt: new Date().toISOString(),
    });
    expect(anomalies.some((a) => a.kind === "error_spike")).toBe(true);
    expect(percentileSorted([1, 2, 3, 4, 5], 50)).toBe(3);
  });
});

describe("Phase 6 — founder insights", () => {
  it("is deterministic, capped, and skips fake deltas", () => {
    const insights = generateFounderInsights({
      generatedAt: "2026-09-16T00:00:00Z",
      activationRate: 0.5,
      previousActivationRate: null,
      day7Retention: null,
      previousDay7Retention: null,
      failedJobs24h: 30,
      previousFailedJobs24h: 10,
      queueDepth: 25,
      aiErrorRate: null,
      previousAiErrorRate: null,
      atRiskCount: 8,
      publishingFailures24h: null,
      previousPublishingFailures24h: null,
    });
    expect(insights.length).toBeLessThanOrEqual(FOUNDER_INSIGHTS_CAP);
    expect(insights.some((i) => i.type === "error_spike")).toBe(true);
    expect(insights.some((i) => i.type === "queue_backlog")).toBe(true);
    expect(insights.some((i) => i.type === "activation_drop")).toBe(false);
  });
});

describe("Phase 6 — data quality separate from metrics", () => {
  it("flags missing billing as DQ, not $0 revenue", () => {
    const issues = assessDataQuality({
      eventsMissingTimestamp: 0,
      eventsInvalidUserRef: 0,
      eventsDuplicateFingerprints: 0,
      staleTelemetryHours: 48,
      aiUsageMissingCost: 3,
      billingAmountMissing: true,
      productEventsSampleSize: 10,
    });
    expect(issues.some((i) => i.code === "missing_billing_data")).toBe(true);
    expect(issues.some((i) => i.code === "stale_telemetry")).toBe(true);
  });
});

describe("Phase 6 — performance bounds", () => {
  it("clamps long presets and documents caps", () => {
    expect(clampAnalyticsPreset("12m")).toBe("90d");
    expect(clampAnalyticsPreset("6m")).toBe("90d");
    expect(clampAnalyticsPreset("30d")).toBe("30d");
    expect(MAX_ANALYTICS_DAYS).toBe(90);
    expect(ANALYTICS_SAMPLE_CAP).toBe(5000);
    const src = read("lib/admin/phase6-queries.ts");
    expect(src).toMatch(/ANALYTICS_SAMPLE_CAP/);
    expect(src).toMatch(/assertRangeBounded/);
    expect(src).not.toMatch(/select\("\*"\)/);
  });
});

describe("Phase 6 — security / instrumentation", () => {
  it("ANALYST remains read-only for mutations", () => {
    expect(roleHasPermission("ANALYST", "system.read")).toBe(true);
    expect(roleHasPermission("ANALYST", "system.manage")).toBe(false);
    expect(roleHasPermission("ANALYST", "jobs.retry")).toBe(false);
  });

  it("instruments signup/publish/edit/domain without PII in metadata", () => {
    const auth = read("app/api/auth/route.ts");
    expect(auth).toMatch(/recordProductEvent/);
    expect(auth).toMatch(/signup/);
    expect(auth).not.toMatch(/metadata:.*email/);

    const publish = read("app/api/websites/[id]/publish/route.ts");
    expect(publish).toMatch(/website_published/);

    const edit = read("app/api/websites/[id]/route.ts");
    expect(edit).toMatch(/website_edited/);

    const domain = read("app/api/websites/[id]/domain/route.ts");
    expect(domain).toMatch(/domain_connected/);
    expect(domain).toMatch(/hostLength/);
    expect(domain).not.toMatch(/metadata:.*host:/);
  });

  it("migration is additive with indexes", () => {
    expect(
      existsSync(join(root, "supabase/migrations/20260916120000_admin_phase6.sql")),
    ).toBe(true);
    const mig = read("supabase/migrations/20260916120000_admin_phase6.sql");
    expect(mig).toMatch(/create index if not exists/);
    expect(mig).not.toMatch(/drop table/i);
  });

  it("activation query uses temporal bounds and completed jobs, not full-table imports", () => {
    const src = read("lib/admin/phase6-queries.ts");
    expect(src).toMatch(/ACTIVATION_WINDOW_DAYS/);
    expect(src).toMatch(/computeActivationCohort/);
    expect(src).toMatch(/workspacesByOwner/);
    expect(src).toMatch(/\.eq\("status", "completed"\)/);
    expect(src).toMatch(/allActivationError|metricError/);
    expect(src).toMatch(
      /getActivationIntelligence[\s\S]*import_jobs[\s\S]*completed/,
    );
  });

  it("dashboard stays lite and docs exist", () => {
    const page = read("app/[locale]/admin/dashboard/page.tsx");
    expect(page).toMatch(/getAdminDashboardKpisLite/);
    expect(page).toMatch(/getFounderInsightsLite/);
    expect(page).not.toMatch(/getAdminAiOverview/);
    expect(existsSync(join(root, "docs/admin-phase6.md"))).toBe(true);
    const docs = read("docs/admin-phase6.md");
    expect(docs).toMatch(/ACTIVATION_WINDOW_DAYS|30 days/);
  });
});
