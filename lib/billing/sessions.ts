import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { recordProductEvent } from "@/lib/admin/events";

/**
 * Privacy-conscious session telemetry.
 * session_key is a hash — never store raw cookies or PII in this table.
 */
export async function startUserSession(input: {
  userId: string;
  workspaceId?: string | null;
  userAgent?: string | null;
}): Promise<{ sessionKey: string } | null> {
  const sessionKey = randomUUID();
  const uaHash = input.userAgent
    ? createHash("sha256").update(input.userAgent).digest("hex").slice(0, 32)
    : null;

  void recordProductEvent({
    eventName: "session_started",
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    resourceType: "session",
    resourceId: sessionKey,
    metadata: { ua_hash: uaHash },
  });

  if (!supabaseConfigured()) {
    return { sessionKey };
  }

  try {
    const db = getSupabaseAdmin();
    await db.from("user_sessions").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      session_key: sessionKey,
      user_agent_hash: uaHash,
    });
  } catch {
    // Telemetry must not break auth
  }

  return { sessionKey };
}

export async function touchUserSession(sessionKey: string): Promise<void> {
  if (!supabaseConfigured() || !sessionKey) return;
  try {
    const db = getSupabaseAdmin();
    await db
      .from("user_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("session_key", sessionKey)
      .is("ended_at", null);
  } catch {
    // ignore
  }
}

export async function endUserSession(sessionKey: string | null | undefined): Promise<void> {
  if (!supabaseConfigured() || !sessionKey) return;
  try {
    const db = getSupabaseAdmin();
    await db
      .from("user_sessions")
      .update({
        ended_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq("session_key", sessionKey)
      .is("ended_at", null);
  } catch {
    // ignore
  }
}
