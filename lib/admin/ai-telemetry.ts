import "server-only";

import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";
import { sanitizeEventMetadata, recordProductEvent } from "@/lib/admin/events";
import { recordUsageEvent } from "@/lib/admin/usage";

export type AiUsageStatus = "started" | "completed" | "failed";

export type AiUsageInput = {
  workspaceId?: string | null;
  userId?: string | null;
  feature: string;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  rendererVersion?: string | null;
  schemaVersion?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  latencyMs?: number | null;
  estimatedCost?: number | null;
  status: AiUsageStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Optional correlation / request id for cross-system tracing. */
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
};

const memoryAi: AiUsageInput[] = [];

export function __getMemoryAiUsageForTests() {
  return memoryAi;
}

export function __clearMemoryAiUsageForTests() {
  memoryAi.length = 0;
}

export async function recordAiUsage(input: AiUsageInput): Promise<{ id: string | null }> {
  memoryAi.push(input);

  if (input.status === "started") {
    void recordProductEvent({
      eventName: "ai_generation_started",
      userId: input.userId,
      workspaceId: input.workspaceId,
      metadata: { feature: input.feature, provider: input.provider },
    });
  } else if (input.status === "completed") {
    void recordProductEvent({
      eventName: "ai_generation_completed",
      userId: input.userId,
      workspaceId: input.workspaceId,
      metadata: { feature: input.feature, tokens: input.totalTokens },
    });
    if (input.workspaceId) {
      void recordUsageEvent({
        feature: "ai_generations",
        workspaceId: input.workspaceId,
        userId: input.userId,
        quantity: 1,
        metadata: { feature: input.feature },
      });
    }
  } else if (input.status === "failed") {
    void recordProductEvent({
      eventName: "ai_generation_failed",
      userId: input.userId,
      workspaceId: input.workspaceId,
      metadata: { feature: input.feature, errorCode: input.errorCode },
    });
  }

  if (!supabaseConfigured()) {
    return { id: `mem-ai-${memoryAi.length}` };
  }

  try {
    const admin = getSupabaseAdmin();
    const total =
      input.totalTokens ??
      (input.inputTokens != null || input.outputTokens != null
        ? (input.inputTokens ?? 0) + (input.outputTokens ?? 0)
        : null);

    const payload: Record<string, unknown> = {
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId ?? null,
        feature: input.feature,
        provider: input.provider ?? null,
        model: input.model ?? null,
        prompt_version: input.promptVersion ?? null,
        renderer_version: input.rendererVersion ?? null,
        schema_version: input.schemaVersion ?? null,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        total_tokens: total,
        latency_ms: input.latencyMs ?? null,
        estimated_cost: input.estimatedCost ?? null,
        status: input.status,
        error_code: input.errorCode ?? null,
        error_message: input.errorMessage ?? null,
        metadata: sanitizeEventMetadata({
          ...input.metadata,
          ...(input.correlationId
            ? { correlationId: input.correlationId }
            : {}),
        }),
      };
    if (input.correlationId) {
      payload.correlation_id = input.correlationId;
    }

    let { data, error } = await admin
      .from("ai_usage_logs")
      .insert(payload)
      .select("id")
      .single();

    // Pre-migration environments: retry without correlation_id column.
    if (error && /correlation_id/i.test(error.message)) {
      delete payload.correlation_id;
      const retry = await admin
        .from("ai_usage_logs")
        .insert(payload)
        .select("id")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[ai-usage]", error.message);
      return { id: null };
    }
    return { id: data?.id ?? null };
  } catch (error) {
    console.error("[ai-usage] unexpected", error);
    return { id: null };
  }
}
