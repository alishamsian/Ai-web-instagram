import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getWorkspaceNotificationSettings,
  parseNotificationSettings,
  saveWorkspaceNotificationSettings,
  type NotificationSettings,
} from "@/lib/orders/notify";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const settings = await getWorkspaceNotificationSettings(session.workspace.id);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Partial<NotificationSettings>;
  const current = await getWorkspaceNotificationSettings(session.workspace.id);
  const next = parseNotificationSettings({
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...current,
    ...body,
  });
  const ok = await saveWorkspaceNotificationSettings(session.workspace.id, next);
  if (!ok) {
    return NextResponse.json(
      { error: "STORE_UNAVAILABLE", settings: next },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, settings: next });
}
