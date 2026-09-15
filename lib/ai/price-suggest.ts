import { isAIConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import {
  extractPriceFromText,
  type PriceHint,
} from "@/components/dashboard/content/catalog-utils";
import { recordAiUsage } from "@/lib/admin/ai-telemetry";

type SuggestItem = {
  index: number;
  name: string;
  description: string;
};

export type SuggestProductPricesContext = {
  workspaceId?: string | null;
  userId?: string | null;
};

export async function suggestProductPrices(
  items: SuggestItem[],
  locale: "fa" | "en",
  context?: SuggestProductPricesContext,
): Promise<Array<{ index: number } & PriceHint>> {
  const results: Array<{ index: number } & PriceHint> = [];
  const needsAi: SuggestItem[] = [];

  for (const item of items) {
    const text = `${item.name}\n${item.description}`;
    const hint = extractPriceFromText(text, locale);
    if (hint) {
      results.push({ index: item.index, ...hint });
    } else if (item.description.trim().length >= 12) {
      needsAi.push(item);
    }
  }

  if (!needsAi.length) return results;

  if (!isAIConfigured()) {
    if (!allowMockServices()) return results;
    return results;
  }

  try {
    const aiHints = await askAiForPrices(needsAi, locale, context);
    results.push(...aiHints);
  } catch {
    // Heuristic-only fallback — never invent prices client-side.
  }

  return results;
}

async function askAiForPrices(
  items: SuggestItem[],
  locale: "fa" | "en",
  context?: SuggestProductPricesContext,
): Promise<Array<{ index: number } & PriceHint>> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return [];

  const model = process.env.AI_MODEL ?? "gpt-4.1-mini";
  const provider = "openai";
  const feature = "price_suggest";
  const startedAt = Date.now();

  void recordAiUsage({
    feature,
    status: "started",
    workspaceId: context?.workspaceId,
    userId: context?.userId,
    provider,
    model,
    promptVersion: "price_suggest.v1",
    metadata: { itemCount: items.length },
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
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Extract product prices ONLY when explicitly stated in the text. Never invent or guess. Return JSON {\"items\":[{\"index\":number,\"price\":number|null,\"currency\":string|null}]}. Use IRT for تومان/تومن, USD for $, EUR for €.",
            },
            {
              role: "user",
              content: JSON.stringify({
                locale,
                products: items.map((item) => ({
                  index: item.index,
                  name: item.name,
                  description: item.description.slice(0, 500),
                })),
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
        workspaceId: context?.workspaceId,
        userId: context?.userId,
        provider,
        model,
        promptVersion: "price_suggest.v1",
        latencyMs: Date.now() - startedAt,
        errorCode: `http_${response.status}`,
        errorMessage: "Price suggest provider request failed",
        metadata: { itemCount: items.length },
      });
      return [];
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
        workspaceId: context?.workspaceId,
        userId: context?.userId,
        provider,
        model,
        promptVersion: "price_suggest.v1",
        latencyMs: Date.now() - startedAt,
        errorCode: "empty_response",
        errorMessage: "Price suggest returned empty content",
        inputTokens: payload.usage?.prompt_tokens ?? null,
        outputTokens: payload.usage?.completion_tokens ?? null,
        totalTokens: payload.usage?.total_tokens ?? null,
        metadata: { itemCount: items.length },
      });
      return [];
    }

    const parsed = JSON.parse(content) as {
      items?: Array<{
        index?: number;
        price?: number | null;
        currency?: string | null;
      }>;
    };

    const hints = (parsed.items ?? [])
      .filter(
        (row) =>
          typeof row.index === "number" &&
          typeof row.price === "number" &&
          Number.isFinite(row.price) &&
          row.price > 0,
      )
      .map((row) => ({
        index: row.index!,
        price: Math.round(row.price!),
        currency: row.currency?.trim() || (locale === "fa" ? "IRT" : "USD"),
        source: "ai" as const,
      }));

    void recordAiUsage({
      feature,
      status: "completed",
      workspaceId: context?.workspaceId,
      userId: context?.userId,
      provider,
      model,
      promptVersion: "price_suggest.v1",
      latencyMs: Date.now() - startedAt,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
      totalTokens: payload.usage?.total_tokens ?? null,
      metadata: { itemCount: items.length, hintCount: hints.length },
    });

    return hints;
  } catch (error) {
    void recordAiUsage({
      feature,
      status: "failed",
      workspaceId: context?.workspaceId,
      userId: context?.userId,
      provider,
      model,
      promptVersion: "price_suggest.v1",
      latencyMs: Date.now() - startedAt,
      errorCode: "exception",
      errorMessage: "Price suggest failed",
      metadata: {
        itemCount: items.length,
        errorName: error instanceof Error ? error.name : "unknown",
      },
    });
    throw error;
  }
}
