"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { createAlertRule } from "@/lib/admin/alerts";

export type Phase4ActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): Phase4ActionResult {
  return { ok: false, code, message };
}

function revalidateAdmin(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
    revalidatePath(`/fa${path}`);
    revalidatePath(`/en${path}`);
  }
}

const PROMPT_STATUSES = new Set(["draft", "active", "retired"]);

/** Prompt metadata only — never stores raw prompt bodies. */
export async function upsertAdminPromptRegistry(input: {
  feature: string;
  version: string;
  status: string;
  notes?: string | null;
}): Promise<Phase4ActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  const feature = input.feature.trim().slice(0, 120);
  const version = input.version.trim().slice(0, 120);
  const status = input.status.trim();
  const notes = (input.notes ?? "").trim().slice(0, 2000) || null;
  if (!feature || !version) return fail("INVALID", "feature and version required.");
  if (!PROMPT_STATUSES.has(status)) {
    return fail("INVALID", "status must be draft|active|retired.");
  }
  try {
    const actor = await requireAdminPermission(session.user.id, "ai.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("ai_prompt_registry")
      .upsert(
        {
          feature,
          version,
          status,
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "feature,version" },
      )
      .select("id")
      .single();
    if (error) {
      return fail(
        "DB",
        /schema cache|does not exist/i.test(error.message)
          ? "ai_prompt_registry missing — apply Phase 3 migration"
          : "Update failed",
      );
    }
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "ai_prompt_registry",
      resourceId: data?.id ?? `${feature}:${version}`,
      afterState: { feature, version, status },
      reason: "Prompt metadata registry upsert",
    });
    revalidateAdmin("/admin/ai/prompts");
    return { ok: true, id: data?.id };
  } catch (e) {
    if (e instanceof AdminAuthError) return fail(e.code, e.message);
    return fail("ERROR", "Unexpected failure.");
  }
}

export async function createAdminAlertRuleAction(input: {
  name: string;
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  threshold: number;
  severity: "info" | "warning" | "critical";
}): Promise<Phase4ActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  const name = input.name.trim().slice(0, 120);
  const metric = input.metric.trim().slice(0, 120);
  if (!name || !metric) return fail("INVALID", "name and metric required.");
  if (!Number.isFinite(input.threshold)) return fail("INVALID", "threshold required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    const { id } = await createAlertRule({
      name,
      metric,
      operator: input.operator,
      threshold: input.threshold,
      severity: input.severity,
      createdBy: actor.userId,
    });
    if (!id) return fail("DB", "Could not create alert rule.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "alert_rules",
      resourceId: id,
      afterState: { name, metric, threshold: input.threshold, severity: input.severity },
      reason: "Alert rule created",
    });
    revalidateAdmin("/admin/errors", "/admin/system");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof AdminAuthError) return fail(e.code, e.message);
    return fail("ERROR", "Unexpected failure.");
  }
}

export async function setAdminAlertInvestigating(alertId: string): Promise<Phase4ActionResult> {
  const session = await getSession();
  if (!session) return fail("UNAUTHORIZED", "Sign in required.");
  if (!alertId) return fail("INVALID", "alertId required.");
  try {
    const actor = await requireAdminPermission(session.user.id, "system.manage");
    if (!supabaseConfigured()) return fail("UNAVAILABLE", "Supabase not configured.");
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from("alerts")
      .update({ status: "investigating" })
      .eq("id", alertId)
      .in("status", ["open", "acknowledged"])
      .select("id")
      .maybeSingle();
    if (error) {
      // investigating may not be in CHECK yet
      if (/investigating|check/i.test(error.message)) {
        return fail(
          "SCHEMA",
          "alerts.status does not allow investigating — apply Phase 4 migration",
        );
      }
      return fail("DB", "Update failed");
    }
    if (!data) return fail("NOT_FOUND", "Alert not found or not open/acknowledged.");
    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "alerts",
      resourceId: alertId,
      afterState: { status: "investigating" },
    });
    revalidateAdmin("/admin/errors");
    return { ok: true, id: alertId };
  } catch (e) {
    if (e instanceof AdminAuthError) return fail(e.code, e.message);
    return fail("ERROR", "Unexpected failure.");
  }
}
