import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireAdminPermission, AdminAuthError } from "@/lib/admin/rbac";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import type { AdminPermission } from "@/lib/admin/permissions";

const EXPORT_LIMIT = 500;

const ENTITY_PERMISSION: Record<string, AdminPermission> = {
  users: "users.read",
  workspaces: "workspaces.read",
  websites: "websites.read",
  orders: "orders.read",
  jobs: "jobs.read",
  imports: "imports.read",
};

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") ?? "";
  const permission = ENTITY_PERMISSION[entity];
  if (!permission) {
    return NextResponse.json({ error: "INVALID_ENTITY" }, { status: 400 });
  }

  try {
    const actor = await requireAdminPermission(session.user.id, permission);
    if (!supabaseConfigured()) {
      return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
    }
    const db = getSupabaseAdmin();
    let headers: string[] = [];
    let rows: Record<string, unknown>[] = [];

    if (entity === "users") {
      headers = ["id", "email", "name", "created_at"];
      const { data } = await db
        .from("profiles")
        .select("id, email, name, created_at")
        .order("created_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (entity === "workspaces") {
      headers = ["id", "name", "plan", "owner_user_id", "created_at"];
      const { data } = await db
        .from("workspaces")
        .select("id, name, plan, owner_user_id, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (entity === "websites") {
      headers = ["id", "slug", "status", "workspace_id", "created_at"];
      const { data } = await db
        .from("websites")
        .select("id, slug, status, workspace_id, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (entity === "orders") {
      headers = ["id", "status", "channel", "workspace_id", "created_at"];
      const { data } = await db
        .from("store_orders")
        .select("id, status, channel, workspace_id, created_at")
        .order("created_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (entity === "jobs") {
      headers = ["id", "status", "stage", "retry_count", "created_at"];
      const { data } = await db
        .from("import_jobs")
        .select("id, status, stage, retry_count, created_at")
        .order("created_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (entity === "imports") {
      headers = ["id", "username", "scrape_status", "collector", "updated_at"];
      const { data } = await db
        .from("instagram_imports")
        .select("id, username, scrape_status, collector, updated_at")
        .order("updated_at", { ascending: false })
        .limit(EXPORT_LIMIT);
      rows = (data ?? []) as Record<string, unknown>[];
    }

    await writeAdminAuditLog({
      actor,
      action: "SETTING_CHANGED",
      resourceType: "export",
      resourceId: entity,
      afterState: { rows: rows.length, limit: EXPORT_LIMIT },
      reason: "admin_csv_export",
    });

    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vitrin-admin-${entity}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    return NextResponse.json({ error: "ERROR" }, { status: 500 });
  }
}
