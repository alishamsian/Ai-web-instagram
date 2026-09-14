/**
 * Typed Admin Dashboard contracts.
 * Prefer MetricResult — never invent numbers when source data is missing.
 */

import type { DateRange, ComparisonPeriod } from "@/lib/admin/dates";

export type MetricAvailability =
  | "available"
  | "unavailable"
  | "partial";

export type MetricResult<T> =
  | {
      status: "available";
      value: T;
      source: string;
    }
  | {
      status: "unavailable";
      reason: string;
      source?: string;
    }
  | {
      status: "partial";
      value: T;
      source: string;
      warning: string;
    };

export type ComparableMetric<T extends number = number> = {
  current: MetricResult<T>;
  previous: MetricResult<T>;
  /** (current - previous) / previous when both available and previous ≠ 0 */
  deltaRatio: MetricResult<number>;
};

export type DashboardKpis = {
  range: DateRange;
  comparison: ComparisonPeriod;
  newUsers: ComparableMetric;
  activeUsers: ComparableMetric;
  websitesCreated: ComparableMetric;
  websitesPublished: ComparableMetric;
  imports: ComparableMetric;
  successfulImports: ComparableMetric;
  failedImports: ComparableMetric;
  aiRequests: ComparableMetric;
  aiCost: ComparableMetric;
  orders: ComparableMetric;
  /** Explicitly unavailable until billing provider is wired. */
  mrr: MetricResult<number>;
  /** Explicitly unavailable — store_orders has no monetary amount column. */
  revenue: MetricResult<number>;
  pageViews: ComparableMetric;
  subscriptionsStarted: ComparableMetric;
};

export type RevenueMetrics = {
  range: DateRange;
  mrr: MetricResult<number>;
  revenue: MetricResult<number>;
  orders: ComparableMetric;
  paidOrders: MetricResult<number>;
};

export type UserMetrics = {
  range: DateRange;
  newUsers: ComparableMetric;
  activeUsers: ComparableMetric;
  totalUsers: MetricResult<number>;
};

export type WebsiteMetrics = {
  range: DateRange;
  created: ComparableMetric;
  published: ComparableMetric;
  totalLive: MetricResult<number>;
  softDeleted: MetricResult<number>;
};

export type ImportMetrics = {
  range: DateRange;
  started: ComparableMetric;
  successful: ComparableMetric;
  failed: ComparableMetric;
  successRate: MetricResult<number>;
};

export type AIMetrics = {
  range: DateRange;
  requests: ComparableMetric;
  completed: MetricResult<number>;
  failed: MetricResult<number>;
  estimatedCost: ComparableMetric;
  avgLatencyMs: MetricResult<number>;
};

export type SystemHealthMetrics = {
  openAlerts: MetricResult<number>;
  criticalAlerts: MetricResult<number>;
  recentSystemEvents: MetricResult<number>;
  failedJobs24h: MetricResult<number>;
  queueDepth: MetricResult<number>;
};

export type ActivityItem = {
  id: string;
  kind: "audit" | "product" | "system";
  action: string;
  actorUserId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  workspaceId?: string | null;
  occurredAt: string;
  summary?: string | null;
};

export type AlertSummary = {
  id: string;
  metric: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  value?: number | null;
  threshold?: number | null;
  message?: string | null;
  createdAt: string;
};

/** Documented source map for Phase 2 UI (no fake KPIs). */
export const DASHBOARD_METRIC_SOURCES = {
  newUsers: {
    primary: "daily_metrics.new_users",
    fallback: "profiles.created_at count",
    notes: "Prefer daily_metrics when populated by cron/aggregation.",
  },
  activeUsers: {
    primary: "daily_metrics.active_users",
    fallback: "unavailable until session/activity events exist",
    notes: "Not faked from page_views alone.",
  },
  websitesCreated: {
    primary: "daily_metrics.websites_created",
    fallback: "websites.created_at (deleted_at is null)",
  },
  websitesPublished: {
    primary: "daily_metrics.websites_published",
    fallback: "websites.published_at / status=published",
  },
  imports: {
    primary: "daily_metrics.imports + product_events.import_*",
    fallback: "import_jobs.created_at",
  },
  aiRequests: {
    primary: "daily_metrics.ai_requests + ai_usage_logs",
    fallback: "ai_usage_logs.status counts",
  },
  orders: {
    primary: "daily_metrics.orders",
    fallback: "store_orders.created_at",
  },
  mrr: {
    primary: "unavailable",
    fallback: "none",
    notes: "subscriptions table unused; no Stripe integration.",
  },
  revenue: {
    primary: "unavailable",
    fallback: "none",
    notes: "store_orders has no amount/currency columns.",
  },
  pageViews: {
    primary: "daily_metrics.page_views",
    fallback: "page_views.created_at",
  },
} as const;
