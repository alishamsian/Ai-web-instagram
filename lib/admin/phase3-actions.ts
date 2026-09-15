"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import {
  buildImportJobObservabilityUpdate,
} from "@/lib/admin/jobs";

export type AdminActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): AdminActionResult {
  return { ok: false, code, message };
}

export async function createAdminSupportNote(input: {
  body: string;
  targetUserId?: string | null;
  workspaceId?: string | null;
  websiteId?: string | null;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  const body = input.body.trim();
  if (!body || body.length > 4000) {
    return fail("INVALID", "Note body required (max 4000 chars).");
  }
  try {
    const actor = await requireAdminPermission(session.user.id, "support.write");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("admin_support_notes")
      .insert({
        author_user_id: actor.userId,
        target_user_id: input.targetUserId ?? null,
        workspace_id: input.workspaceId ?? null,
        website_id: input.websiteId ?? null,
        body,
      })
      .select("id")
      .single();
    if (error) return fail("DB_ERROR", "Could not save note.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "support_note",
      resourceId: data.id as string,
      targetUserId: input.targetUserId,
      workspaceId: input.workspaceId,
      afterState: { body: body.slice(0, 120) },
      reason: "create_support_note",
    });
    revalidatePath("/admin");
    return { ok: true, id: data.id as string };
  } catch (error) {
    if (error instanceof AdminAuthError) return fail(error.code, error.message);
    return fail("ERROR", "Unexpected error.");
  }
}

export async function createAdminIncident(input: {
  title: string;
  severity: "info" | "warning" | "critical";
  affectedSystem?: string;
  summary?: string;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("admin_incidents")
      .insert({
        title: input.title.trim().slice(0, 200),
        severity: input.severity,
        affected_system: input.affectedSystem ?? null,
        summary: input.summary ?? null,
        created_by: actor.userId,
        owner_user_id: actor.userId,
        timeline: [
          {
            at: new Date().toISOString(),
            actor: actor.userId,
            text: "Incident opened",
          },
        ],
      })
      .select("id")
      .single();
    if (error) return fail("DB_ERROR", "Could not create incident.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "incident",
      resourceId: data.id as string,
      afterState: { title: input.title, severity: input.severity },
      reason: "create_incident",
    });
    revalidatePath("/admin/incidents");
    return { ok: true, id: data.id as string };
  } catch (error) {
    if (error instanceof AdminAuthError) return fail(error.code, error.message);
    return fail("ERROR", "Unexpected error.");
  }
}

export async function updateAdminIncidentStatus(input: {
  incidentId: string;
  status: "open" | "investigating" | "monitoring" | "resolved";
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
    };
    if (input.status === "resolved") {
      patch.resolved_at = new Date().toISOString();
    }
    const { error } = await db
      .from("admin_incidents")
      .update(patch)
      .eq("id", input.incidentId);
    if (error) return fail("DB_ERROR", "Could not update incident.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "incident",
      resourceId: input.incidentId,
      afterState: { status: input.status },
      reason: "update_incident_status",
    });
    revalidatePath("/admin/incidents");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) return fail(error.code, error.message);
    return fail("ERROR", "Unexpected error.");
  }
}

export async function retryAdminImportJob(input: {
  jobId: string;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "jobs.retry");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data: job, error: readError } = await db
      .from("import_jobs")
      .select("id, status, retry_count, max_attempts")
      .eq("id", input.jobId)
      .maybeSingle();
    if (readError) return fail("DB_ERROR", "Could not read job.");
    if (!job) return fail("NOT_FOUND", "Job not found.");
    if (job.status !== "failed") {
      return fail("INVALID", "Only failed jobs can be retried.");
    }

    const retryCount = Math.max(0, Number(job.retry_count ?? 0));
    const maxAttempts = Math.max(1, Number(job.max_attempts ?? 1));
    if (retryCount >= maxAttempts) {
      return fail("INVALID", "Job has reached its maximum retry attempts.");
    }

    const patch = buildImportJobObservabilityUpdate({
      status: "queued",
      stage: "retry_requested",
      attempt: retryCount + 1,
      errorCode: null,
      errorMessage: null,
      metadata: { retriedBy: actor.userId },
    });

    // Keep the transition conditional on the observed failed state so two
    // concurrent admin clicks cannot both move the same failed job to queued.
    const { data: updated, error } = await db
      .from("import_jobs")
      .update(patch)
      .eq("id", input.jobId)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (error) return fail("DB_ERROR", "Could not retry job.");
    if (!updated) return fail("CONFLICT", "Job changed before retry could be applied.");

    await writeAdminAuditLog({
      actor,
      action: "JOB_RETRIED",
      resourceType: "import_job",
      resourceId: input.jobId,
      beforeState: { status: job.status, retryCount, maxAttempts },
      afterState: { status: "queued", attempt: retryCount + 1 },
      reason: "admin_retry",
    });
    revalidatePath("/admin/jobs");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) return fail(error.code, error.message);
    return fail("ERROR", "Unexpected error.");
  }
}
