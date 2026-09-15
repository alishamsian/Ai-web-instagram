/**
 * Transparent rule-based customer / website health.
 * No ML churn scores — only evidence-backed signals from real data.
 */

export type HealthLevel =
  | "healthy"
  | "needs_attention"
  | "blocked"
  | "at_risk";

export type HealthSignal = {
  code: string;
  level: HealthLevel;
  reason: string;
  evidence: string;
  recommendedAction: string;
};

export type HealthAssessment = {
  level: HealthLevel;
  framework: "rule-based";
  signals: HealthSignal[];
  summary: string;
};

const LEVEL_RANK: Record<HealthLevel, number> = {
  healthy: 0,
  needs_attention: 1,
  blocked: 2,
  at_risk: 3,
};

function worstLevel(signals: HealthSignal[]): HealthLevel {
  let worst: HealthLevel = "healthy";
  for (const s of signals) {
    if (LEVEL_RANK[s.level] > LEVEL_RANK[worst]) worst = s.level;
  }
  return worst;
}

export type WorkspaceHealthInput = {
  websiteCount: number;
  publishedCount: number;
  failedImportJobs: number;
  successfulImports: number;
  domainCount: number;
  plan: string;
};

export function assessWorkspaceHealth(
  input: WorkspaceHealthInput,
): HealthAssessment {
  const signals: HealthSignal[] = [];

  if (input.websiteCount === 0) {
    signals.push({
      code: "no_website",
      level: "needs_attention",
      reason: "No website created",
      evidence: "website_count=0",
      recommendedAction: "Guide user through first Instagram import",
    });
  }

  if (input.websiteCount > 0 && input.publishedCount === 0) {
    signals.push({
      code: "never_published",
      level: "needs_attention",
      reason: "Website created but never published",
      evidence: `websites=${input.websiteCount}, published=0`,
      recommendedAction: "Help complete first publish",
    });
  }

  if (input.failedImportJobs > 0 && input.successfulImports === 0) {
    signals.push({
      code: "import_blocked",
      level: "blocked",
      reason: "Imports failing with no successful completion",
      evidence: `failed_jobs=${input.failedImportJobs}, successful_imports=0`,
      recommendedAction: "Inspect import jobs and Instagram collector errors",
    });
  } else if (input.failedImportJobs >= 3) {
    signals.push({
      code: "repeated_import_failures",
      level: "at_risk",
      reason: "Repeated import job failures",
      evidence: `failed_jobs=${input.failedImportJobs}`,
      recommendedAction: "Review job errors and retry eligible jobs",
    });
  }

  if (input.publishedCount > 0 && input.domainCount === 0) {
    signals.push({
      code: "no_custom_domain",
      level: "needs_attention",
      reason: "Published without custom domain",
      evidence: `published=${input.publishedCount}, domains=0`,
      recommendedAction: "Offer domain setup if on paid plan",
    });
  }

  const level = signals.length === 0 ? "healthy" : worstLevel(signals);
  return {
    level,
    framework: "rule-based",
    signals,
    summary:
      signals.length === 0
        ? "No adverse rule-based signals detected"
        : `${signals.length} signal(s); worst=${level}`,
  };
}

export type WebsiteHealthInput = {
  status: string;
  hasDomain: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export function assessWebsiteHealth(
  input: WebsiteHealthInput,
): HealthAssessment {
  const signals: HealthSignal[] = [];

  if (input.status !== "published") {
    signals.push({
      code: "unpublished",
      level: "needs_attention",
      reason: "Website is not published",
      evidence: `status=${input.status}`,
      recommendedAction: "Review draft readiness and publish",
    });
  }

  if (input.status === "published" && !input.hasDomain) {
    signals.push({
      code: "published_no_domain",
      level: "needs_attention",
      reason: "Published site has no custom domain row",
      evidence: "domains=0",
      recommendedAction: "Check subdomain-only vs custom domain intent",
    });
  }

  const level = signals.length === 0 ? "healthy" : worstLevel(signals);
  return {
    level,
    framework: "rule-based",
    signals,
    summary:
      signals.length === 0
        ? "No adverse website signals"
        : `${signals.length} signal(s); worst=${level}`,
  };
}
