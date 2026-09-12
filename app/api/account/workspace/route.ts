import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { writeStore } from "@/lib/database/store";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  if (isSupabaseConfigured() && (await isSupabaseSchemaReady())) {
    const db = getSupabaseAdmin();
    const { error } = await db
      .from("workspaces")
      .update({ name })
      .eq("id", session.workspace.id)
      .eq("owner_id", session.user.id);
    if (error) {
      return NextResponse.json({ error: "STORE_FAILED" }, { status: 500 });
    }
    const { revalidateTag } = await import("next/cache");
    revalidateTag(`session-workspace-${session.user.id}`, "max");
  } else {
    await writeStore((store) => {
      const ws = store.workspaces.find((item) => item.id === session.workspace.id);
      if (ws) ws.name = name;
    });
  }

  return NextResponse.json({ ok: true, name });
}
