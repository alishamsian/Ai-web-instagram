/**
 * Customer health scoring — deterministic, explainable weights.
 *
 * Semantics (not arbitrary):
 * - recentActivity: evidence the workspace is still using the product
 * - publishedWebsite: completed core activation outcome
 * - contentActivity: products/content exist (store_orders / products proxy via website)
 * - publishingActivity: outbound publishing channels used
 * - aiUsage: AI feature engagement (positive signal, capped)
 * - importSuccess: Instagram → website path succeeded
 * - inactivityPenalty: days since last known activity
 * - errorPenalty: recent failed jobs / high error rate
 *
 * Score is 0–100. Category thresholds are documented in docs/admin-phase6.md.
 * This is NOT predictive ML.
 */

export const HEALTH_WEIGHTS = {
  recentActivity: 20,
  publishedWebsite: 25,
  contentActivity: 10,
  publishingActivity: 10,
  aiUsage: 10,
  importSuccess: 15,
  /** Subtracted per inactivity band (see scoreInactivity). */
  inactivityPenalty: 25,
  /** Subtracted when recent failures exceed threshold. */
  errorPenalty: 20,
} as const;

export type HealthCategory =
  | "healthy"
  | "neutral"
  | "at_risk"
  | "insufficient_data";

export type HealthScoreInput = {
  /** Days since last activity (product event, website update, or import). null = unknown */
  daysSinceActivity: number | null;
  hasPublishedWebsite: boolean;
  hasWebsite: boolean;
  successfulImports: number;
  failedJobsRecent: number;
  aiRequestsRecent: number;
  publicationCount: number;
  /** True when we lack enough signals to score honestly */
  insufficientSignals?: boolean;
};

export type HealthScoreResult = {
  score: number | null;
  category: HealthCategory;
  framework: "rule-based-weighted";
  breakdown: Array<{
    code: string;
    points: number;
    maxPoints: number;
    evidence: string;
  }>;
  summary: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scoreInactivity(days: number | null): { points: number; evidence: string } {
  if (days == null) {
    return { points: 0, evidence: "days_since_activity=unknown" };
  }
  if (days <= 3) return { points: 0, evidence: `days_since_activity=${days}` };
  if (days <= 7) return { points: -8, evidence: `days_since_activity=${days}` };
  if (days <= 14) return { points: -15, evidence: `days_since_activity=${days}` };
  if (days <= 30) return { points: -20, evidence: `days_since_activity=${days}` };
  return {
    points: -HEALTH_WEIGHTS.inactivityPenalty,
    evidence: `days_since_activity=${days}`,
  };
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  if (input.insufficientSignals) {
    return {
      score: null,
      category: "insufficient_data",
      framework: "rule-based-weighted",
      breakdown: [],
      summary: "Insufficient telemetry to compute health score",
    };
  }

  const breakdown: HealthScoreResult["breakdown"] = [];
  let score = 0;

  // Baseline: having any website is weak positive
  if (input.hasWebsite) {
    breakdown.push({
      code: "has_website",
      points: 5,
      maxPoints: 5,
      evidence: "website_count>0",
    });
    score += 5;
  }

  if (input.hasPublishedWebsite) {
    breakdown.push({
      code: "published_website",
      points: HEALTH_WEIGHTS.publishedWebsite,
      maxPoints: HEALTH_WEIGHTS.publishedWebsite,
      evidence: "status=published or published_at set",
    });
    score += HEALTH_WEIGHTS.publishedWebsite;
  }

  if (input.successfulImports > 0) {
    const pts = Math.min(
      HEALTH_WEIGHTS.importSuccess,
      5 + input.successfulImports * 5,
    );
    breakdown.push({
      code: "import_success",
      points: pts,
      maxPoints: HEALTH_WEIGHTS.importSuccess,
      evidence: `successful_imports=${input.successfulImports}`,
    });
    score += pts;
  }

  if (input.daysSinceActivity != null && input.daysSinceActivity <= 7) {
    breakdown.push({
      code: "recent_activity",
      points: HEALTH_WEIGHTS.recentActivity,
      maxPoints: HEALTH_WEIGHTS.recentActivity,
      evidence: `days_since_activity=${input.daysSinceActivity}`,
    });
    score += HEALTH_WEIGHTS.recentActivity;
  }

  if (input.aiRequestsRecent > 0) {
    const pts = Math.min(HEALTH_WEIGHTS.aiUsage, 5 + input.aiRequestsRecent);
    breakdown.push({
      code: "ai_usage",
      points: pts,
      maxPoints: HEALTH_WEIGHTS.aiUsage,
      evidence: `ai_requests_recent=${input.aiRequestsRecent}`,
    });
    score += pts;
  }

  if (input.publicationCount > 0) {
    const pts = Math.min(
      HEALTH_WEIGHTS.publishingActivity,
      5 + input.publicationCount * 3,
    );
    breakdown.push({
      code: "publishing_activity",
      points: pts,
      maxPoints: HEALTH_WEIGHTS.publishingActivity,
      evidence: `publications=${input.publicationCount}`,
    });
    score += pts;
  }

  const inactivity = scoreInactivity(input.daysSinceActivity);
  if (inactivity.points < 0) {
    breakdown.push({
      code: "inactivity_penalty",
      points: inactivity.points,
      maxPoints: HEALTH_WEIGHTS.inactivityPenalty,
      evidence: inactivity.evidence,
    });
    score += inactivity.points;
  }

  if (input.failedJobsRecent >= 3) {
    breakdown.push({
      code: "error_penalty",
      points: -HEALTH_WEIGHTS.errorPenalty,
      maxPoints: HEALTH_WEIGHTS.errorPenalty,
      evidence: `failed_jobs_recent=${input.failedJobsRecent}`,
    });
    score -= HEALTH_WEIGHTS.errorPenalty;
  } else if (input.failedJobsRecent > 0) {
    breakdown.push({
      code: "error_penalty",
      points: -10,
      maxPoints: HEALTH_WEIGHTS.errorPenalty,
      evidence: `failed_jobs_recent=${input.failedJobsRecent}`,
    });
    score -= 10;
  }

  score = clamp(score, 0, 100);

  let category: HealthCategory;
  if (score >= 70) category = "healthy";
  else if (score >= 40) category = "neutral";
  else category = "at_risk";

  return {
    score,
    category,
    framework: "rule-based-weighted",
    breakdown,
    summary: `score=${score}; category=${category}; signals=${breakdown.length}`,
  };
}
