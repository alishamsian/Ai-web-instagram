/**
 * Centralized workspace entitlements.
 * Existing callers of planLimits() remain compatible.
 */

export type PlanId = "free" | "pro" | "business";

export type EntitlementLimits = {
  maxWebsites: number;
  maxImports: number;
  /** @deprecated use maxImports — kept for existing planLimits callers */
  maxImportPosts: number;
  maxAiGenerations: number;
  maxStorageBytes: number;
  maxDomains: number;
  customDomain: boolean;
  removeBranding: boolean;
  analytics: boolean;
  smartSync: boolean;
  instagramSync: boolean;
  advancedPublishing: boolean;
  ecommerce: boolean;
  maxVersionsKept: number;
};

export type EntitlementFeature =
  | "max_websites"
  | "max_imports"
  | "max_ai_generations"
  | "max_storage"
  | "max_domains"
  | "analytics"
  | "custom_domains"
  | "remove_branding"
  | "instagram_sync"
  | "advanced_publishing"
  | "ecommerce"
  | "smart_sync";

export const PLAN_ENTITLEMENTS: Record<PlanId, EntitlementLimits> = {
  free: {
    maxWebsites: 4,
    maxImports: 12,
    maxImportPosts: 12,
    maxAiGenerations: 20,
    maxStorageBytes: 500 * 1024 * 1024,
    maxDomains: 0,
    customDomain: false,
    removeBranding: false,
    analytics: true,
    smartSync: false,
    instagramSync: true,
    advancedPublishing: false,
    ecommerce: true,
    maxVersionsKept: 20,
  },
  pro: {
    maxWebsites: 25,
    maxImports: 50,
    maxImportPosts: 50,
    maxAiGenerations: 500,
    maxStorageBytes: 5 * 1024 * 1024 * 1024,
    maxDomains: 5,
    customDomain: true,
    removeBranding: true,
    analytics: true,
    smartSync: true,
    instagramSync: true,
    advancedPublishing: true,
    ecommerce: true,
    maxVersionsKept: 100,
  },
  business: {
    maxWebsites: 100,
    maxImports: 200,
    maxImportPosts: 200,
    maxAiGenerations: 5000,
    maxStorageBytes: 50 * 1024 * 1024 * 1024,
    maxDomains: 25,
    customDomain: true,
    removeBranding: true,
    analytics: true,
    smartSync: true,
    instagramSync: true,
    advancedPublishing: true,
    ecommerce: true,
    maxVersionsKept: 500,
  },
};

export function normalizePlanId(plan: string | null | undefined): PlanId {
  if (plan === "pro" || plan === "business") return plan;
  return "free";
}

export function getWorkspaceEntitlements(
  plan: string | null | undefined,
): EntitlementLimits {
  return PLAN_ENTITLEMENTS[normalizePlanId(plan)];
}

export function canUseFeature(
  plan: string | null | undefined,
  feature: EntitlementFeature,
): boolean {
  const e = getWorkspaceEntitlements(plan);
  switch (feature) {
    case "analytics":
      return e.analytics;
    case "custom_domains":
      return e.customDomain;
    case "remove_branding":
      return e.removeBranding;
    case "instagram_sync":
      return e.instagramSync;
    case "advanced_publishing":
      return e.advancedPublishing;
    case "ecommerce":
      return e.ecommerce;
    case "smart_sync":
      return e.smartSync;
    case "max_websites":
    case "max_imports":
    case "max_ai_generations":
    case "max_storage":
    case "max_domains":
      return getUsageLimit(plan, feature) > 0;
    default:
      return false;
  }
}

export function getUsageLimit(
  plan: string | null | undefined,
  feature: EntitlementFeature,
): number {
  const e = getWorkspaceEntitlements(plan);
  switch (feature) {
    case "max_websites":
      return e.maxWebsites;
    case "max_imports":
      return e.maxImports;
    case "max_ai_generations":
      return e.maxAiGenerations;
    case "max_storage":
      return e.maxStorageBytes;
    case "max_domains":
      return e.maxDomains;
    default:
      return canUseFeature(plan, feature) ? 1 : 0;
  }
}

export function getRemainingUsage(params: {
  plan: string | null | undefined;
  feature: EntitlementFeature;
  used: number;
}): number {
  const limit = getUsageLimit(params.plan, params.feature);
  if (!Number.isFinite(limit)) return 0;
  return Math.max(0, limit - Math.max(0, params.used));
}

/** Paid tiers (Pro + Business). */
export function isPaidPlan(plan: string | null | undefined): boolean {
  const id = normalizePlanId(plan);
  return id === "pro" || id === "business";
}
