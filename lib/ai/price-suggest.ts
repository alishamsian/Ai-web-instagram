import { isAIConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import {
  extractPriceFromText,
  type PriceHint,
} from "@/components/dashboard/content/catalog-utils";

type SuggestItem = {
  index: number;
  name: string;
  description: string;
};

export async function suggestProductPrices(
  items: SuggestItem[],
  locale: "fa" | "en",
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
    const aiHints = await askAiForPrices(needsAi, locale);
    results.push(...aiHints);
  } catch {
    // Heuristic-only fallback — never invent prices client-side.
  }

  return results;
}

async function askAiForPrices(
  items: SuggestItem[],
  locale: "fa" | "en",
): Promise<Array<{ index: number } & PriceHint>> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return [];

  const response = await fetch(
    `${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4.1-mini",
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

  if (!response.ok) return [];
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return [];

  const parsed = JSON.parse(content) as {
    items?: Array<{
      index?: number;
      price?: number | null;
      currency?: string | null;
    }>;
  };

  return (parsed.items ?? [])
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
}
