/**
 * Admin Foundation — server-side platform control plane.
 * No UI in Phase 1. All privileged access is deny-by-default + service_role.
 */

export * from "@/lib/admin/permissions";
export {
  AdminAuthError,
  getAdminProfile,
  resolveAdminActor,
  requireAdminPermission,
  assertAdminPermission,
  __resetAdminMemoryForTests,
  __setAdminMemoryForTests,
} from "@/lib/admin/rbac";
export {
  writeAdminAuditLog,
  __getMemoryAuditForTests,
  __clearMemoryAuditForTests,
  type AuditAction,
  type AuditEntryInput,
} from "@/lib/admin/audit";
export {
  PRODUCT_EVENT_NAMES,
  recordProductEvent,
  recordSystemEvent,
  sanitizeEventMetadata,
  __getMemoryProductEventsForTests,
  __getMemorySystemEventsForTests,
  __clearMemoryEventsForTests,
  type ProductEventName,
  type ProductEventInput,
  type SystemEventInput,
} from "@/lib/admin/events";
export {
  recordUsageEvent,
  getUsageCounter,
  currentMonthPeriodKey,
  currentDayPeriodKey,
  __clearMemoryUsageForTests,
  __getMemoryUsageForTests,
  type UsageFeature,
  type UsageEventInput,
} from "@/lib/admin/usage";
export {
  PLAN_ENTITLEMENTS,
  normalizePlanId,
  getWorkspaceEntitlements,
  canUseFeature,
  getUsageLimit,
  getRemainingUsage,
  isPaidPlan,
  type PlanId as EntitlementPlanId,
  type EntitlementLimits,
  type EntitlementFeature,
} from "@/lib/admin/entitlements";
export {
  recordAiUsage,
  __getMemoryAiUsageForTests,
  __clearMemoryAiUsageForTests,
  type AiUsageStatus,
  type AiUsageInput,
} from "@/lib/admin/ai-telemetry";
export {
  JOB_STATUSES,
  normalizeJobStatus,
  isTerminalJobStatus,
  computeJobDurationMs,
  buildImportJobObservabilityUpdate,
  type JobStatus,
  type JobObservabilityPatch,
} from "@/lib/admin/jobs";
export {
  createSoftDeleteMeta,
  softDeleteColumns,
  restoreSoftDeleteColumns,
  isSoftDeleted,
  excludeSoftDeleted,
  SOFT_DELETE_ENTITIES,
  type SoftDeleteMeta,
  type SoftDeleteEntity,
} from "@/lib/admin/soft-delete";
export {
  evaluateAlertThreshold,
  createAlertRule,
  openAlert,
  __clearMemoryAlertsForTests,
  __getMemoryAlertsForTests,
  type AlertSeverity,
  type AlertOperator,
  type AlertRuleInput,
} from "@/lib/admin/alerts";
export {
  incrementDailyMetrics,
  utcDateKey,
  __clearMemoryMetricsForTests,
  __getMemoryMetricsForTests,
  type DailyMetricKey,
  type DailyMetricIncrement,
} from "@/lib/admin/metrics";
export {
  resolveDateRange,
  resolveComparisonPeriod,
  dateKeysInRange,
  type DateRange,
  type DateRangePreset,
  type ComparisonPeriod,
} from "@/lib/admin/dates";
export type {
  MetricResult,
  ComparableMetric,
  DashboardKpis,
  RevenueMetrics,
  UserMetrics,
  WebsiteMetrics,
  ImportMetrics,
  AIMetrics,
  SystemHealthMetrics,
  ActivityItem,
  AlertSummary,
} from "@/lib/admin/contracts";
export { DASHBOARD_METRIC_SOURCES } from "@/lib/admin/contracts";
export {
  getAdminDashboardMetrics,
  getAdminUsers,
  getAdminWorkspaces,
  getAdminWebsites,
  getAdminImports,
  getAdminJobs,
  getAdminRevenue,
  getAdminOrders,
  getAdminAIUsage,
  getAdminSystemHealth,
  getAdminAlerts,
  getAdminActivity,
  getAdminUserMetrics,
  getAdminWebsiteMetrics,
  getAdminImportMetrics,
  getAdminMetricSeries,
} from "@/lib/admin/queries";
export { requireAdminPage, getAdminPageActor } from "@/lib/admin/gate";
