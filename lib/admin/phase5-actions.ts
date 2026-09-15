"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { recordSecurityEvent } from "@/lib/admin/observability";
import {
  buildImportJobObservabilityUpdate,
} from "@/lib/admin/jobs";

export type AdminActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): AdminActionResult {
  return { ok: false, code, message };
}

function revalidateAdmin(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
    revalidatePath(`/fa${path}`);
    revalidatePath(`/en${path}`);
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type IncidentStatus =
  | "open"
  | "acknowledged"
  | "investigating"
  | "monitoring"
  | "resolved";

export async function transitionAdminIncident(input: {
  incidentId: string;
  status: IncidentStatus;
  note?: string;
  assignTo?: string | null;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  if (!UUID_RE.test(input.incidentId)) return fail("INVALID", "Invalid incident id.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data: current, error: readErr } = await db
      .from("admin_incidents")
      .select("id, status, timeline, title")
      .eq("id", input.incidentId)
      .maybeSingle();
    if (readErr) return fail("DB_ERROR", "Could not read incident.");
    if (!current) return fail("NOT_FOUND", "Incident not found.");

    const now = new Date().toISOString();
    const timeline = Array.isArray(current.timeline) ? [...current.timeline] : [];
    timeline.push({
      at: now,
      actor: actor.userId,
      text: `Status → ${input.status}${input.note ? `: ${input.note.slice(0, 200)}` : ""}`,
    });

    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: now,
      timeline,
    };
    if (input.status === "acknowledged") {
      patch.acknowledged_at = now;
      patch.acknowledged_by = actor.userId;
    }
    if (input.status === "resolved") {
      patch.resolved_at = now;
      if (input.note) patch.resolution_note = input.note.slice(0, 2000);
    }
    if (input.status === "open") {
      patch.resolved_at = null;
    }
    if (input.assignTo) {
      if (!UUID_RE.test(input.assignTo)) return fail("INVALID", "Invalid assignee.");
      patch.assigned_to = input.assignTo;
    }

    const { error } = await db
      .from("admin_incidents")
      .update(patch)
      .eq("id", input.incidentId);
    if (error) return fail("DB_ERROR", "Could not update incident.");

    await writeAdminAuditLog({
      actor,
      action: "INCIDENT_UPDATED",
      resourceType: "incident",
      resourceId: input.incidentId,
      beforeState: { status: current.status },
      afterState: { status: input.status },
      reason: "incident_transition",
    });
    void recordSecurityEvent({
      eventName: "sensitive_action",
      severity: "info",
      actorUserId: actor.userId,
      actorRole: actor.role,
      resourceType: "incident",
      resourceId: input.incidentId,
      message: `Incident transitioned to ${input.status}`,
    });

    revalidateAdmin("/admin/incidents", "/admin/dashboard", "/admin/ops");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      void recordSecurityEvent({
        eventName: "permission_denied",
        severity: "warning",
        actorUserId: session.user.id,
        resourceType: "incident",
        resourceId: input.incidentId,
        message: error.code,
      });
      return fail(error.code, error.message);
    }
    return fail("ERROR", "Unexpected error.");
  }
}

export async function resolveAdminErrorGroup(input: {
  groupId: string;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  if (!UUID_RE.test(input.groupId)) return fail("INVALID", "Invalid group id.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { error } = await db
      .from("admin_error_groups")
      .update({
        status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.groupId);
    if (error) return fail("DB_ERROR", "Could not resolve error group.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "error_group",
      resourceId: input.groupId,
      afterState: { status: "resolved" },
      reason: "resolve_error_group",
    });
    revalidateAdmin("/admin/errors", "/admin/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) return fail(error.code, error.message);
    return fail("ERROR", "Unexpected error.");
  }
}

/**
 * Cancel a queued/retrying import job safely.
 * Does not cancel terminal jobs. Does not invent cancel for in-flight scrapes
 * that lack a cooperative cancel signal — only queued/retrying are cancelled.
 */
export async function cancelAdminImportJob(input: {
  jobId: string;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  if (!UUID_RE.test(input.jobId)) return fail("INVALID", "Invalid job id.");
  try {
    const actor = await requireAdminPermission(session.user.id, "jobs.cancel");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data: job, error: readError } = await db
      .from("import_jobs")
      .select("id, status, retry_count")
      .eq("id", input.jobId)
      .maybeSingle();
    if (readError) return fail("DB_ERROR", "Could not read job.");
    if (!job) return fail("NOT_FOUND", "Job not found.");
    const status = String(job.status);
    if (status !== "queued" && status !== "retrying") {
      return fail(
        "INVALID",
        "Only queued or retrying jobs can be cancelled safely.",
      );
    }

    const patch = buildImportJobObservabilityUpdate({
      status: "cancelled",
      stage: "cancelled",
      errorCode: "CANCELLED",
      errorMessage: "Cancelled by admin",
      completedAt: new Date().toISOString(),
      metadata: { cancelledBy: actor.userId },
    });

    const { data: updated, error } = await db
      .from("import_jobs")
      .update(patch)
      .eq("id", input.jobId)
      .in("status", ["queued", "retrying"])
      .select("id")
      .maybeSingle();
    if (error) {
      // Legacy DBs may not allow status=cancelled — fall back to failed.
      if (/check|status/i.test(error.message)) {
        const fallback = buildImportJobObservabilityUpdate({
          status: "failed",
          stage: "cancelled",
          errorCode: "CANCELLED",
          errorMessage: "Cancelled by admin",
          completedAt: new Date().toISOString(),
          metadata: { cancelledBy: actor.userId },
        });
        const retry = await db
          .from("import_jobs")
          .update(fallback)
          .eq("id", input.jobId)
          .in("status", ["queued", "retrying"])
          .select("id")
          .maybeSingle();
        if (retry.error) return fail("DB_ERROR", "Could not cancel job.");
        if (!retry.data) return fail("CONFLICT", "Job changed before cancel could be applied.");
      } else {
        return fail("DB_ERROR", "Could not cancel job.");
      }
    } else if (!updated) {
      return fail("CONFLICT", "Job changed before cancel could be applied.");
    }

    await writeAdminAuditLog({
      actor,
      action: "JOB_CANCELLED",
      resourceType: "import_job",
      resourceId: input.jobId,
      beforeState: { status },
      afterState: { status: "cancelled", stage: "cancelled" },
      reason: "admin_cancel",
    });
    void recordSecurityEvent({
      eventName: "sensitive_action",
      severity: "warning",
      actorUserId: actor.userId,
      actorRole: actor.role,
      resourceType: "import_job",
      resourceId: input.jobId,
      message: "Job cancelled by admin",
    });

    revalidateAdmin("/admin/jobs", "/admin/queues", "/admin");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      void recordSecurityEvent({
        eventName: "permission_denied",
        severity: "warning",
        actorUserId: session.user.id,
        resourceType: "import_job",
        resourceId: input.jobId,
        message: error.code,
      });
      return fail(error.code, error.message);
    }
    return fail("ERROR", "Unexpected error.");
  }
}
