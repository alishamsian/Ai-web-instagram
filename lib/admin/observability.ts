import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import {
  recordSystemEvent,
  sanitizeEventMetadata,
} from "@/lib/admin/events";
import { logAdminFailure } from "@/lib/admin/safe";

export type ObservabilitySeverity = "info" | "warning" | "critical";

export type SystemFailureInput = {
  source: string;
  eventName?: string;
  errorCode?: string | null;
  message?: string | null;
  severity?: ObservabilitySeverity;
  correlationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
  openIncidentIfCritical?: boolean;
};

export type SystemSuccessInput = {
  source: string;
  eventName?: string;
  correlationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CronRunInput = {
  jobName: string;
  path: string;
  status: "started" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
  runId?: string | null;
};

export type SecurityEventInput = {
  eventName: string;
  severity?: ObservabilitySeverity;
  actorUserId?: string | null;
  actorRole?: string | null;
  targetUserId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  correlationId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
};

export function newCorrelationId(): string {
  return randomUUID();
}

export function buildErrorFingerprint(input: {
  source: string;
  errorCode?: string | null;
  message?: string | null;
}): string {
  const source = (input.source || "unknown").trim().toLowerCase().slice(0, 80);
  const code = (input.errorCode || "unknown").trim().toLowerCase().slice(0, 80);
  const normalized = normalizeMessage(input.message);
  return createHash("sha256")
    .update(`${source}|${code}|${normalized}`)
    .digest("hex")
    .slice(0, 32);
}

function normalizeMessage(message: string | null | undefined): string {
  if (!message) return "";
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b\d+\b/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function safeClientMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  return message
    .replace(/Bearer\s+[^\s]+/gi, "[redacted]")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]")
    .slice(0, 300);
}

/** Record failure telemetry. Error-group aggregation is atomic in PostgreSQL. */
export async function recordSystemFailure(
  input: SystemFailureInput,
): Promise<{ fingerprint: string; correlationId: string }> {
  const correlationId = input.correlationId ?? newCorrelationId();
  const fingerprint = buildErrorFingerprint(input);
  const severity = input.severity ?? "warning";
  const sampleMessage = safeClientMessage(input.message);

  try {
    await recordSystemEvent({
      eventName: input.eventName ?? `${input.source}.failed`,
      severity,
      source: input.source,
      errorCode: input.errorCode ?? null,
      message: sampleMessage,
      occurredAt: new Date().toISOString(),
      correlationId,
      fingerprint,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      workspaceId: input.workspaceId ?? null,
      userId: input.userId ?? null,
      metadata: sanitizeEventMetadata(input.metadata),
    });

    if (supabaseConfigured()) {
      const db = getSupabaseAdmin();
      const now = new Date().toISOString();
      const { data, error } = await db.rpc("upsert_admin_error_group", {
        p_fingerprint: fingerprint,
        p_source: input.source,
        p_error_code: input.errorCode ?? null,
        p_normalized_message: normalizeMessage(input.message) || null,
        p_severity: severity,
        p_now: now,
        p_correlation_id: correlationId,
        p_resource_type: input.resourceType ?? null,
        p_resource_id: input.resourceId ?? null,
        p_workspace_id: input.workspaceId ?? null,
        p_sample_message: sampleMessage,
      });

      if (error) {
        if (!/upsert_admin_error_group|schema cache|does not exist/i.test(error.message)) {
          logAdminFailure("observability.error_groups.upsert", error.message);
        }
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        const count = Number(row?.occurrence_count ?? 1);
        if (
          input.openIncidentIfCritical &&
          severity === "critical" &&
          count >= 5
        ) {
          await maybeOpenIncidentForFingerprint({
            fingerprint,
            source: input.source,
            errorCode: input.errorCode,
            message: sampleMessage,
            correlationId,
            severity,
          });
        }
      }
    }
  } catch (error) {
    logAdminFailure("observability.recordSystemFailure", error, {
      source: input.source,
    });
  }

  return { fingerprint, correlationId };
}

export async function recordSystemSuccess(
  input: SystemSuccessInput,
): Promise<void> {
  try {
    await recordSystemEvent({
      eventName: input.eventName ?? `${input.source}.succeeded`,
      severity: "info",
      source: input.source,
      message: null,
      metadata: {
        ...sanitizeEventMetadata(input.metadata),
        correlationId: input.correlationId ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        workspaceId: input.workspaceId ?? null,
        userId: input.userId ?? null,
      },
    });
  } catch (error) {
    logAdminFailure("observability.recordSystemSuccess", error, {
      source: input.source,
    });
  }
}

async function maybeOpenIncidentForFingerprint(input: {
  fingerprint: string;
  source: string;
  errorCode?: string | null;
  message?: string | null;
  correlationId: string;
  severity: ObservabilitySeverity;
}): Promise<void> {
  if (!supabaseConfigured()) return;
  const db = getSupabaseAdmin();
  const { data: open } = await db
    .from("admin_incidents")
    .select("id")
    .eq("root_fingerprint", input.fingerprint)
    .in("status", ["open", "acknowledged", "investigating", "monitoring"])
    .limit(1)
    .maybeSingle();
  if (open?.id) return;

  const title = `[${input.source}] ${input.errorCode ?? "critical failure"}`.slice(0, 200);
  await db.from("admin_incidents").insert({
    title,
    severity: input.severity === "critical" ? "critical" : "warning",
    status: "open",
    affected_system: input.source,
    summary: input.message,
    correlation_id: input.correlationId,
    root_fingerprint: input.fingerprint,
    timeline: [{
      at: new Date().toISOString(),
      actor: "system",
      text: "Auto-opened from repeated/critical system failure",
    }],
  });
}

export async function recordCronRun(input: CronRunInput): Promise<{ id: string | null }> {
  if (!supabaseConfigured()) return { id: null };
  try {
    const db = getSupabaseAdmin();
    if (input.runId && input.status !== "started") {
      const { data, error } = await db
        .from("cron_runs")
        .update({
          status: input.status,
          finished_at: input.finishedAt ?? new Date().toISOString(),
          duration_ms: input.durationMs ?? null,
          error_code: input.errorCode ?? null,
          error_message: safeClientMessage(input.errorMessage),
          metadata: sanitizeEventMetadata(input.metadata),
        })
        .eq("id", input.runId)
        .select("id")
        .maybeSingle();
      if (error) {
        logAdminFailure("observability.cron_runs.update", error.message);
        return { id: null };
      }
      return { id: (data?.id as string) ?? input.runId };
    }

    const { data, error } = await db
      .from("cron_runs")
      .insert({
        job_name: input.jobName,
        path: input.path,
        status: input.status,
        started_at: input.startedAt ?? new Date().toISOString(),
        finished_at: input.finishedAt ?? null,
        duration_ms: input.durationMs ?? null,
        error_code: input.errorCode ?? null,
        error_message: safeClientMessage(input.errorMessage),
        correlation_id: input.correlationId ?? newCorrelationId(),
        metadata: sanitizeEventMetadata(input.metadata),
      })
      .select("id")
      .single();
    if (error) {
      if (/cron_runs|schema cache|does not exist/i.test(error.message)) return { id: null };
      logAdminFailure("observability.cron_runs.insert", error.message);
      return { id: null };
    }
    return { id: (data?.id as string) ?? null };
  } catch (error) {
    logAdminFailure("observability.cron_runs", error);
    return { id: null };
  }
}

export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from("security_events").insert({
      event_name: input.eventName,
      severity: input.severity ?? "info",
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? null,
      target_user_id: input.targetUserId ?? null,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      correlation_id: input.correlationId ?? null,
      message: safeClientMessage(input.message),
      metadata: sanitizeEventMetadata(input.metadata),
      occurred_at: new Date().toISOString(),
    });
    if (error) {
      if (/security_events|schema cache|does not exist/i.test(error.message)) return;
      logAdminFailure("observability.security_events", error.message);
    }
  } catch (error) {
    logAdminFailure("observability.security_events", error);
  }
}
