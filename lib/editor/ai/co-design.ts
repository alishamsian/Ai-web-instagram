/**
 * Server-side AI co-designer orchestrator.
 * Deterministic first → LLM only when needed.
 */

import type { WebsiteConfig } from "@/types/website";
import { isAIConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import { recordAiUsage } from "@/lib/admin/ai-telemetry";
import {
  proposeEditorActions,
  type AiCoDesignerRequest,
} from "@/lib/editor/ai";
import { buildAiEditorContext, type AiEditorContext } from "@/lib/editor/ai/context";
import { routePromptToIntent } from "@/lib/editor/ai/intents";
import {
  buildCoDesignSystemPrompt,
  buildCoDesignUserPrompt,
  CO_DESIGN_PROMPT_VERSION,
} from "@/lib/editor/ai/prompt";
import { parseAiActionsPayload } from "@/lib/editor/ai/schema";
import {
  summarizeActionsForUi,
  validateEditorActions,
} from "@/lib/editor/ai/validator";
import type { EditorAction } from "@/lib/editor/actions";
import { assertAiGenerationAllowed } from "@/lib/billing/ai-quota";
import type { ViewportBucket } from "@/lib/editor/responsive";

export type CoDesignProposeInput = {
  config: WebsiteConfig;
  prompt: string;
  locale: "fa" | "en";
  selectedSectionId?: string | null;
  viewport?: ViewportBucket;
  workspaceId?: string | null;
  userId?: string | null;
  workspacePlan?: string | null;
};

export type CoDesignProposeResult =
  | {
      ok: true;
      mode: "deterministic" | "llm";
      actions: EditorAction[];
      summaries: string[];
      summary: string;
      proposedConfig: WebsiteConfig;
      context: AiEditorContext;
    }
  | {
      ok: false;
      code:
        | "clarify"
        | "unsafe"
        | "empty"
        | "ai_unavailable"
        | "ai_failed"
        | "invalid"
        | "quota";
      messageFa: string;
      messageEn: string;
    };

function fail(
  code: Extract<CoDesignProposeResult, { ok: false }>["code"],
  messageFa: string,
  messageEn: string,
): CoDesignProposeResult {
  return { ok: false, code, messageFa, messageEn };
}

function finalizeActions(
  config: WebsiteConfig,
  actions: EditorAction[],
  summary: string,
  mode: "deterministic" | "llm",
  context: AiEditorContext,
  locale: "fa" | "en",
): CoDesignProposeResult {
  const validated = validateEditorActions(config, actions);
  if (!validated.ok) {
    return fail(
      "unsafe",
      "AI نتوانست این تغییر را به‌صورت امن اعمال کند.",
      "AI could not safely apply this change.",
    );
  }
  return {
    ok: true,
    mode,
    actions: validated.actions,
    summaries: summarizeActionsForUi(validated.actions, locale),
    summary,
    proposedConfig: validated.proposedConfig,
    context,
  };
}

export async function proposeCoDesign(
  input: CoDesignProposeInput,
): Promise<CoDesignProposeResult> {
  const context = buildAiEditorContext({
    config: input.config,
    selectedSectionId: input.selectedSectionId,
    viewport: input.viewport,
    locale: input.locale,
  });

  const selectedType =
    input.selectedSectionId != null
      ? (input.config.sections.find((s) => s.id === input.selectedSectionId)
          ?.type ?? null)
      : null;

  const routed = routePromptToIntent({
    prompt: input.prompt,
    locale: input.locale,
    hasSelection: Boolean(input.selectedSectionId && selectedType),
    selectedSectionType: selectedType,
  });

  if (routed.kind === "clarify") {
    return fail("clarify", routed.messageFa, routed.messageEn);
  }

  if (routed.kind === "deterministic") {
    const request: AiCoDesignerRequest = {
      ...routed.request,
      selectedSectionId: input.selectedSectionId,
    };
    const actions = proposeEditorActions(input.config, request);
    if (!actions.length) {
      return fail(
        "empty",
        "تغییر قابل‌اعمالی پیدا نشد.",
        "No applicable changes were found.",
      );
    }
    const summary =
      input.locale === "fa"
        ? `پیشنهاد قطعی: ${request.intent}`
        : `Deterministic: ${request.intent}`;
    return finalizeActions(
      input.config,
      actions,
      summary,
      "deterministic",
      context,
      input.locale,
    );
  }

  // LLM path — enforce quota only when a provider call is required ($0 deterministic stays free).
  if (input.workspaceId) {
    const quota = await assertAiGenerationAllowed({
      workspaceId: input.workspaceId,
      workspacePlan: input.workspacePlan,
    });
    if (!quota.ok) {
      return fail("quota", quota.messageFa, quota.messageEn);
    }
  }

  if (!isAIConfigured()) {
    if (!allowMockServices()) {
      return fail(
        "ai_unavailable",
        "سرویس AI پیکربندی نشده است.",
        "AI is not configured.",
      );
    }
    // Mock: restyle editorial as safe demo when ALLOW_MOCK
    const actions = proposeEditorActions(input.config, {
      intent: "restyle",
      direction: "editorial",
      locale: input.locale,
    });
    return finalizeActions(
      input.config,
      actions,
      input.locale === "fa" ? "پیشنهاد آزمایشی (mock)" : "Mock proposal",
      "deterministic",
      context,
      input.locale,
    );
  }

  return askLlmForActions(input, context);
}

async function askLlmForActions(
  input: CoDesignProposeInput,
  context: AiEditorContext,
): Promise<CoDesignProposeResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return fail(
      "ai_unavailable",
      "سرویس AI پیکربندی نشده است.",
      "AI is not configured.",
    );
  }

  const model = process.env.AI_MODEL ?? "gpt-4.1-mini";
  const provider = "openai";
  const feature = "editor_co_design";
  const startedAt = Date.now();

  void recordAiUsage({
    feature,
    status: "started",
    workspaceId: input.workspaceId,
    userId: input.userId,
    provider,
    model,
    promptVersion: CO_DESIGN_PROMPT_VERSION,
    metadata: {
      viewport: input.viewport ?? "desktop",
      hasSelection: Boolean(input.selectedSectionId),
    },
  });

  try {
    const response = await fetch(
      `${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: buildCoDesignSystemPrompt(input.locale),
            },
            {
              role: "user",
              content: buildCoDesignUserPrompt({
                prompt: input.prompt,
                context,
              }),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      void recordAiUsage({
        feature,
        status: "failed",
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider,
        model,
        promptVersion: CO_DESIGN_PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
        errorCode: `http_${response.status}`,
        errorMessage: "Co-design provider request failed",
      });
      return fail(
        "ai_failed",
        "درخواست AI ناموفق بود. دوباره تلاش کنید.",
        "AI request failed. Please try again.",
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      void recordAiUsage({
        feature,
        status: "failed",
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider,
        model,
        promptVersion: CO_DESIGN_PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
        errorCode: "empty_response",
        errorMessage: "Co-design returned empty content",
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
        totalTokens: payload.usage?.total_tokens ?? null,
      });
      return fail(
        "ai_failed",
        "پاسخ AI خالی بود.",
        "AI returned an empty response.",
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content);
    } catch {
      return fail(
        "invalid",
        "پاسخ AI قابل‌پردازش نبود.",
        "AI response was not valid JSON.",
      );
    }

    const parsed = parseAiActionsPayload(parsedJson, input.config);
    if (!parsed.ok) {
      void recordAiUsage({
        feature,
        status: "failed",
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider,
        model,
        promptVersion: CO_DESIGN_PROMPT_VERSION,
        latencyMs: Date.now() - startedAt,
        errorCode: parsed.reason,
        errorMessage: "Co-design schema validation failed",
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
        totalTokens: payload.usage?.total_tokens ?? null,
      });
      return fail(
        "unsafe",
        "AI نتوانست این تغییر را به‌صورت امن اعمال کند.",
        "AI could not safely apply this change.",
      );
    }

    const result = finalizeActions(
      input.config,
      parsed.actions,
      parsed.summary,
      "llm",
      context,
      input.locale,
    );

    void recordAiUsage({
      feature,
      status: result.ok ? "completed" : "failed",
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider,
      model,
      promptVersion: CO_DESIGN_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      totalTokens: payload.usage?.total_tokens ?? null,
      metadata: {
        actionCount: result.ok ? result.actions.length : 0,
      },
    });

    return result;
  } catch {
    void recordAiUsage({
      feature,
      status: "failed",
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider,
      model,
      promptVersion: CO_DESIGN_PROMPT_VERSION,
      latencyMs: Date.now() - startedAt,
      errorCode: "network",
      errorMessage: "Co-design network error",
    });
    return fail(
      "ai_failed",
      "خطای شبکه هنگام تماس با AI.",
      "Network error while contacting AI.",
    );
  }
}
