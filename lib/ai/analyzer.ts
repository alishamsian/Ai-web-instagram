import type { AIAnalyzer } from "@/types/ai";
import { buildAnalysisPrompt, validateAnalysis } from "@/lib/ai/prompts";

export class OpenAIAnalyzer implements AIAnalyzer {
  async analyzeImport(input: Parameters<AIAnalyzer["analyzeImport"]>[0]) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI provider is not configured.");
    }

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
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You return only valid JSON for WebsiteAIAnalysis. Never invent prices. Never invent reviews.",
            },
            { role: "user", content: buildAnalysisPrompt(input) },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error("AI analysis request failed.");
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("AI analysis returned an empty response.");
    }

    return validateAnalysis(JSON.parse(content));
  }
}
