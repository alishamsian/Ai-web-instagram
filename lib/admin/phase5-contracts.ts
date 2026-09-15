import type { MetricResult } from "@/lib/admin/contracts";

export type ErrorGroupRow = {
  id: string;
  fingerprint: string;
  source: string;
  errorCode: string | null;
  normalizedMessage: string | null;
  severity: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastCorrelationId: string | null;
  lastResourceType: string | null;
  lastResourceId: string | null;
  status: string;
  linkedIncidentId: string | null;
  sampleMessage: string | null;
};

export type SecurityOverview = {
  activeAdmins: MetricResult<number>;
  inactiveAdmins: MetricResult<number>;
  recentSecurityEvents: MetricResult<number>;
  recentDenied: MetricResult<number>;
  recentSensitiveActions: MetricResult<number>;
  roles: Array<{ role: string; count: number }>;
  sensitivePermissions: Array<{
    id: string;
    permission: string;
    roles: string[];
  }>;
  recentEvents: Array<{
    id: string;
    eventName: string;
    severity: string;
    actorUserId: string | null;
    actorRole: string | null;
    message: string | null;
    occurredAt: string;
  }>;
  unavailableReason: string | null;
};

export type AuditLogRow = {
  id: string;
  action: string;
  actorUserId: string | null;
  actorRole: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
  reason: string | null;
};

export type CronRunSummary = {
  id: string;
  jobName: string;
  path: string;
  configuredSchedule: string;
  lastStatus: MetricResult<string>;
  lastStartedAt: MetricResult<string>;
  lastDurationMs: MetricResult<number>;
  success24h: MetricResult<number>;
  failed24h: MetricResult<number>;
};

export type OpsDashboardSignals = {
  openIncidents: MetricResult<number>;
  criticalErrorGroups: MetricResult<number>;
  securityEvents24h: MetricResult<number>;
  cronFailures24h: MetricResult<number>;
};
