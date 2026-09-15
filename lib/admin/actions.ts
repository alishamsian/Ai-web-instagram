"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): AdminActionResult {
  return { ok: false, code, message };
}

export async function acknowledgeAdminAlert(
  alertId: string,
): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) {
      return fail("UNAVAILABLE", "Supabase not configured.");
    }
    const db = getSupabaseAdmin();
    const { data: before } = await db
      .from("alerts")
      .select("id, status, metric, severity")
      .eq("id", alertId)
      .maybeSingle();
    if (!before) return fail("NOT_FOUND", "Alert not found.");

    const { error } = await db
      .from("alerts")
      .update({ status: "acknowledged" })
      .eq("id", alertId);
    if (error) return fail("DB_ERROR", "Could not update alert.");

    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "alert",
      resourceId: alertId,
      beforeState: before,
      afterState: { ...before, status: "acknowledged" },
      reason: "acknowledge_alert",
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return fail(error.code, error.message);
    }
    return fail("ERROR", "Unexpected error.");
  }
}

export async function resolveAdminAlert(
  alertId: string,
): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) {
      return fail("UNAVAILABLE", "Supabase not configured.");
    }
    const db = getSupabaseAdmin();
    const { data: before } = await db
      .from("alerts")
      .select("id, status, metric, severity")
      .eq("id", alertId)
      .maybeSingle();
    if (!before) return fail("NOT_FOUND", "Alert not found.");

    const { error } = await db
      .from("alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);
    if (error) return fail("DB_ERROR", "Could not resolve alert.");

    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "alert",
      resourceId: alertId,
      beforeState: before,
      afterState: { ...before, status: "resolved" },
      reason: "resolve_alert",
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return fail(error.code, error.message);
    }
    return fail("ERROR", "Unexpected error.");
  }
}
