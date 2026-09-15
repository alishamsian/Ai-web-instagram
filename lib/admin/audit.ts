import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/admin/permissions";
import type { AdminActor } from "@/lib/admin/rbac";

export type AuditAction =
  | "USER_SUSPENDED"
  | "USER_RESTORED"
  | "WEBSITE_RESTORED"
  | "WEBSITE_PUBLISHED"
  | "WEBSITE_UNPUBLISHED"
  | "IMPORT_RETRIED"
  | "JOB_CANCELLED"
  | "JOB_RETRIED"
  | "SUBSCRIPTION_CHANGED"
  | "REFUND_CREATED"
  | "ADMIN_IMPERSONATION_STARTED"
  | "ADMIN_IMPERSONATION_ENDED"
  | "FEATURE_FLAG_CHANGED"
  | "SETTING_CHANGED"
  | "ADMIN_ROLE_GRANTED"
  | "ADMIN_ROLE_REVOKED"
  | "SOFT_DELETE"
  | "SOFT_RESTORE"
  | "DATA_EXPORTED"
  | "SUPPORT_NOTE_CREATED"
  | "INCIDENT_CREATED"
  | "INCIDENT_UPDATED";

export type AuditEntryInput = {
  actor: AdminActor;
  action: AuditAction | (string & {});
  resourceType: string;
  resourceId?: string | null;
  workspaceId?: string | null;
  targetUserId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
};

const memoryAudit: AuditEntryInput[] = [];

export function __getMemoryAuditForTests() {
  return memoryAudit;
}

export function __clearMemoryAuditForTests() {
  memoryAudit.length = 0;
}

/** Append-only audit write. Application code must never UPDATE/DELETE rows. */
export async function writeAdminAuditLog(
  input: AuditEntryInput,
): Promise<{ id: string | null }> {
  memoryAudit.push(input);

  if (!supabaseConfigured()) {
    return { id: `mem-audit-${memoryAudit.length}` };
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("admin_audit_logs")
      .insert({
        actor_user_id: input.actor.userId,
        actor_role: input.actor.role as AdminRole,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId ?? null,
        workspace_id: input.workspaceId ?? null,
        target_user_id: input.targetUserId ?? null,
        before_state: input.beforeState ?? null,
        after_state: input.afterState ?? null,
        reason: input.reason ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        session_id: input.sessionId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[admin-audit] insert failed", error.message);
      return { id: null };
    }
    return { id: data?.id ?? null };
  } catch (error) {
    console.error("[admin-audit] unexpected", error);
    return { id: null };
  }
}
