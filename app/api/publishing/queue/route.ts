import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  cancelScheduledPublication,
  listQueueEntries,
} from "@/lib/publishing/persist";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const entries = await listQueueEntries(session.workspace.id);
  return NextResponse.json({ entries, source: "db" });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }
  const ok = await cancelScheduledPublication(session.workspace.id, id);
  if (!ok) {
    return NextResponse.json({ error: "CANCEL_FAILED" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
