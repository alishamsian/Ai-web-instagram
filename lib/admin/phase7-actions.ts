"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { recordSecurityEvent } from "@/lib/admin/observability";
import { normalizePlanId, type PlanId } from "@/lib/admin/entitlements";

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

/**
 * Create an audited entitlement override for a workspace.
 * Requires billing.override. Reason is mandatory; expiresAt strongly preferred.
 */
export async function createEntitlementOverride(input: {
  workspaceId: string;
  plan: PlanId | string;
  reason: string;
  expiresAt?: string | null;
}): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  if (!UUID_RE.test(input.workspaceId)) {
    return fail("INVALID", "Invalid workspace id.");
  }
  const reason = (input.reason || "").trim();
  if (reason.length < 3) {
    return fail("INVALID", "A reason is required (min 3 characters).");
  }
  if (reason.length > 2000) {
    return fail("INVALID", "Reason too long.");
  }

  const plan = normalizePlanId(input.plan);
  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const ms = Date.parse(input.expiresAt);
    if (!Number.isFinite(ms)) {
      return fail("INVALID", "Invalid expiresAt.");
    }
    if (ms <= Date.now()) {
      return fail("INVALID", "expiresAt must be in the future.");
    }
    expiresAt = new Date(ms).toISOString();
  }

  try {
    const actor = await requireAdminPermission(
      session.user.id,
      "billing.override",
    );
    if (!supabaseConfigured()) {
      return fail("UNAVAILABLE", "Supabase not configured.");
    }
    const db = getSupabaseAdmin();

    const { data: workspace, error: wsError } = await db
      .from("workspaces")
      .select("id, plan")
      .eq("id", input.workspaceId)
      .maybeSingle();
    if (wsError) return fail("DB_ERROR", "Could not read workspace.");
    if (!workspace) return fail("NOT_FOUND", "Workspace not found.");

    const previousPlan = normalizePlanId(workspace.plan as string);

    const { data: inserted, error: insertError } = await db
      .from("entitlement_overrides")
      .insert({
        workspace_id: input.workspaceId,
        plan,
        reason: reason.slice(0, 2000),
        created_by: actor.userId,
        previous_plan: previousPlan,
        expires_at: expiresAt,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      return fail(
        "DB_ERROR",
        insertError?.message?.includes("does not exist")
          ? "entitlement_overrides table missing — apply Phase 7 migration"
          : "Could not create entitlement override.",
      );
    }

    await writeAdminAuditLog({
      actor,
      action: "SUBSCRIPTION_CHANGED",
      resourceType: "entitlement_override",
      resourceId: inserted.id as string,
      workspaceId: input.workspaceId,
      beforeState: { plan: previousPlan },
      afterState: {
        plan,
        overrideId: inserted.id,
        expiresAt,
        kind: "ENTITLEMENT_OVERRIDE",
      },
      reason: `ENTITLEMENT_OVERRIDE: ${reason.slice(0, 400)}`,
    });

    void recordSecurityEvent({
      eventName: "sensitive_action",
      severity: "warning",
      actorUserId: actor.userId,
      actorRole: actor.role,
      resourceType: "entitlement_override",
      resourceId: inserted.id as string,
      message: `Entitlement override → ${plan}${expiresAt ? ` until ${expiresAt}` : " (no expiry — prefer expiresAt)"}`,
    });

    revalidateAdmin(
      "/admin/billing",
      "/admin/subscriptions",
      "/admin/workspaces",
      "/admin/revenue",
    );
    return { ok: true, id: inserted.id as string };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      void recordSecurityEvent({
        eventName: "permission_denied",
        severity: "warning",
        actorUserId: session.user.id,
        resourceType: "entitlement_override",
        resourceId: input.workspaceId,
        message: error.code,
      });
      return fail(error.code, error.message);
    }
    return fail("ERROR", "Unexpected error.");
  }
}
