import { isSupabaseConfigured } from "@/lib/config/env";
import { isSupabaseSchemaReady } from "@/lib/database/supabase-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ActivityItem } from "@/lib/dashboard/ops";

export type InboxKind =
  | "order_new"
  | "publish_failed"
  | "publish_ok"
  | "channel_disconnected"
  | "schedule_due"
  | "onboarding"
  | "system";

export type InboxNotification = {
  id: string;
  workspaceId: string;
  kind: InboxKind;
  title: string;
  body?: string;
  href?: string;
  tone: ActivityItem["tone"];
  readAt?: string | null;
  createdAt: string;
  meta?: Record<string, unknown>;
};

async function ready() {
  return isSupabaseConfigured() && (await isSupabaseSchemaReady());
}

export async function createInboxNotification(input: {
  workspaceId: string;
  kind: InboxKind;
  title: string;
  body?: string;
  href?: string;
  tone?: ActivityItem["tone"];
  meta?: Record<string, unknown>;
}): Promise<InboxNotification | null> {
  if (!(await ready())) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("workspace_notifications")
    .insert({
      workspace_id: input.workspaceId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      tone: input.tone ?? "neutral",
      meta: input.meta ?? {},
    })
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

export async function listInboxNotifications(
  workspaceId: string,
  limit = 30,
): Promise<InboxNotification[]> {
  if (!(await ready())) return [];
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("workspace_notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function markInboxRead(
  workspaceId: string,
  ids?: string[],
): Promise<void> {
  if (!(await ready())) return;
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  let q = db
    .from("workspace_notifications")
    .update({ read_at: now })
    .eq("workspace_id", workspaceId)
    .is("read_at", null);
  if (ids?.length) q = q.in("id", ids);
  await q;
}

export async function trackOnboardingEvent(
  workspaceId: string,
  event: "view" | "step_done" | "complete" | "dismiss",
  stepId?: string,
): Promise<void> {
  if (!(await ready())) return;
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("workspaces")
    .select("onboarding_metrics")
    .eq("id", workspaceId)
    .maybeSingle();

  const current =
    (data?.onboarding_metrics as Record<string, unknown> | null) ?? {};
  const events = Array.isArray(current.events) ? [...current.events] : [];
  events.push({
    event,
    stepId: stepId ?? null,
    at: new Date().toISOString(),
  });
  const next = {
    ...current,
    events: events.slice(-40),
    lastEvent: event,
    lastAt: new Date().toISOString(),
    completedAt:
      event === "complete"
        ? new Date().toISOString()
        : (current.completedAt as string | undefined) ?? null,
    dismissedAt:
      event === "dismiss"
        ? new Date().toISOString()
        : (current.dismissedAt as string | undefined) ?? null,
  };

  await db
    .from("workspaces")
    .update({ onboarding_metrics: next })
    .eq("id", workspaceId);

  if (event === "complete") {
    await createInboxNotification({
      workspaceId,
      kind: "onboarding",
      title: "Setup complete",
      body: "Your three-step onboarding is done.",
      href: "dashboard",
      tone: "success",
    });
  }
}

function mapRow(row: Record<string, unknown>): InboxNotification {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    kind: row.kind as InboxKind,
    title: String(row.title),
    body: (row.body as string) || undefined,
    href: (row.href as string) || undefined,
    tone: (row.tone as ActivityItem["tone"]) || "neutral",
    readAt: (row.read_at as string) || null,
    createdAt: String(row.created_at),
    meta: (row.meta as Record<string, unknown>) || {},
  };
}

export function inboxToActivityItems(
  items: InboxNotification[],
  locale: "fa" | "en",
): ActivityItem[] {
  void locale;
  return items.map((item) => ({
    id: `inbox-${item.id}`,
    tone: item.tone,
    title: item.title,
    detail: item.body || "",
    at: item.createdAt,
    href: item.href || "dashboard",
  }));
}
