import { isAIConfigured } from "@/lib/config/env";
import { allowMockServices } from "@/lib/config/runtime";
import { MockAIAnalyzer } from "@/lib/ai/mock";
import { OpenAIAnalyzer } from "@/lib/ai/analyzer";
import { isDemoUsername } from "@/lib/instagram/url";

export function getAIAnalyzer(username?: string) {
  if (username && isDemoUsername(username)) {
    return new MockAIAnalyzer();
  }
  if (isAIConfigured()) {
    return new OpenAIAnalyzer();
  }
  if (!allowMockServices()) {
    throw new Error(
      "AI_API_KEY is required in production. Set ALLOW_MOCK=true to override.",
    );
  }
  return new MockAIAnalyzer();
}

export { validateAnalysis, buildAnalysisPrompt } from "./prompts";
export { MockAIAnalyzer } from "./mock";
export type { BusinessIntelligenceProvider } from "@/lib/ai/business-intelligence";
export { UnavailableBusinessIntelligence } from "@/lib/ai/business-intelligence";
