import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ORDER_STATUSES, normalizeOrderStatus } from "@/lib/orders/status";

const ALLOWED = new Set<string>([
  ...ORDER_STATUSES,
  "seen", // legacy
  "done", // legacy
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const raw = body.status?.trim();
  if (!raw || !ALLOWED.has(raw)) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  const status = normalizeOrderStatus(raw);

  if (!(isSupabaseConfigured() && (await isSupabaseSchemaReady()))) {
    return NextResponse.json({ error: "STORE_UNAVAILABLE" }, { status: 503 });
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("store_orders")
    .update({ status })
    .eq("id", id)
    .eq("workspace_id", session.workspace.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "STORE_FAILED" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}
