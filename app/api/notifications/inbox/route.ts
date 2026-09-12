import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  listInboxNotifications,
  markInboxRead,
} from "@/lib/notifications/inbox";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const items = await listInboxNotifications(session.workspace.id);
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };
  await markInboxRead(session.workspace.id, body.ids);
  return NextResponse.json({ ok: true });
}
