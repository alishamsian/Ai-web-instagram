import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

/**
 * Canonical product event names.
 * Prefer these over parallel aliases — Phase 6 reuses existing taxonomy.
 * Aliases (documented only): signup_completed→signup, editor_saved→website_edited,
 * ai_request_*→ai_generation_*, publication_*→content_published / system publishing tables.
 */
export const PRODUCT_EVENT_NAMES = [
  "signup",
  "signup_started",
  "login",
  "logout",
  "dashboard_viewed",
  "instagram_connected",
  "import_started",
  "import_completed",
  "import_failed",
  "website_created",
  "website_edited",
  "website_previewed",
  "website_published",
  "website_unpublished",
  "website_updated",
  "domain_connected",
  "domain_verified",
  "editor_opened",
  "content_created",
  "content_published",
  "publication_created",
  "publication_scheduled",
  "publication_published",
  "publication_failed",
  "ai_generation_started",
  "ai_generation_completed",
  "ai_generation_failed",
  "plan_viewed",
  "checkout_started",
  "checkout_completed",
  "subscription_started",
  "subscription_upgraded",
  "subscription_downgraded",
  "subscription_canceled",
  "subscription_changed",
  "payment_succeeded",
  "payment_failed",
  "refund_created",
  "session_started",
  "domain_connection_started",
  "domain_connection_failed",
  "publish_flow_started",
  "publish_flow_completed",
  "editor_saved",
  "order_created",
  "order_paid",
  "order_refunded",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export type ProductEventInput = {
  eventName: ProductEventName | (string & {});
  userId?: string | null;
  workspaceId?: string | null;
  websiteId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string | Date;
};

export type SystemEventInput = {
  eventName: string;
  severity?: "info" | "warning" | "critical";
  source?: string | null;
  errorCode?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt?: string | Date;
  correlationId?: string | null;
  fingerprint?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
};

const memoryProduct: ProductEventInput[] = [];
const memorySystem: SystemEventInput[] = [];

export function __getMemoryProductEventsForTests() {
  return memoryProduct;
}

export function __getMemorySystemEventsForTests() {
  return memorySystem;
}

export function __clearMemoryEventsForTests() {
  memoryProduct.length = 0;
  memorySystem.length = 0;
}

function toIso(value?: string | Date) {
  if (!value) return new Date().toISOString();
  return typeof value === "string" ? value : value.toISOString();
}

/** Strip keys that look secret-like from metadata. */
export function sanitizeEventMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};
  const blocked = /secret|password|token|apikey|api_key|authorization|cookie/i;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (blocked.test(key)) continue;
    if (typeof value === "string" && value.length > 2000) {
      out[key] = `${value.slice(0, 2000)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Central product event recorder — prefer this over ad-hoc inserts.
 */
export async function recordProductEvent(
  input: ProductEventInput,
): Promise<void> {
  memoryProduct.push(input);
  if (!supabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("product_events").insert({
      event_name: input.eventName,
      user_id: input.userId ?? null,
      workspace_id: input.workspaceId ?? null,
      website_id: input.websiteId ?? null,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: sanitizeEventMetadata(input.metadata),
      occurred_at: toIso(input.occurredAt),
    });
    if (error) console.error("[product-events]", error.message);
  } catch (error) {
    console.error("[product-events] unexpected", error);
  }
}

export async function recordSystemEvent(input: SystemEventInput): Promise<void> {
  memorySystem.push(input);
  if (!supabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    const payload: Record<string, unknown> = {
      event_name: input.eventName,
      severity: input.severity ?? "info",
      source: input.source ?? null,
      error_code: input.errorCode ?? null,
      message: input.message ?? null,
      metadata: sanitizeEventMetadata({
        ...input.metadata,
        ...(input.correlationId ? { correlationId: input.correlationId } : {}),
        ...(input.fingerprint ? { fingerprint: input.fingerprint } : {}),
      }),
      occurred_at: toIso(input.occurredAt),
    };
    if (input.correlationId) payload.correlation_id = input.correlationId;
    if (input.fingerprint) payload.fingerprint = input.fingerprint;
    if (input.resourceType) payload.resource_type = input.resourceType;
    if (input.resourceId) payload.resource_id = input.resourceId;
    if (input.workspaceId) payload.workspace_id = input.workspaceId;
    if (input.userId) payload.user_id = input.userId;

    let { error } = await admin.from("system_events").insert(payload);
    // Pre-migration: retry without Phase 5 columns.
    if (
      error &&
      /correlation_id|fingerprint|resource_type|workspace_id|user_id/i.test(
        error.message,
      )
    ) {
      delete payload.correlation_id;
      delete payload.fingerprint;
      delete payload.resource_type;
      delete payload.resource_id;
      delete payload.workspace_id;
      delete payload.user_id;
      const retry = await admin.from("system_events").insert(payload);
      error = retry.error;
    }
    if (error) console.error("[system-events]", error.message);
  } catch (error) {
    console.error("[system-events] unexpected", error);
  }
}
