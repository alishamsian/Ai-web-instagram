import type { WebsiteAIAnalysis } from "@/types/ai";
import type { InstagramPost, InstagramProfile } from "@/types/instagram";
import { websiteAIAnalysisSchema } from "@/schemas/ai";

export function buildAnalysisPrompt(input: {
  profile: InstagramProfile;
  posts: InstagramPost[];
  locale: "fa" | "en";
}) {
  const captions = input.posts
    .slice(0, 3)
    .map((post, index) => `${index + 1}. [${post.type}] ${post.caption ?? ""}`)
    .join("\n");

  return `
You are an expert brand strategist. Analyze this public Instagram presence and return JSON only.
Do not invent prices. If a price is not clearly present, use null.
Do not invent customer testimonials.
Language for copy fields: ${input.locale === "fa" ? "Persian" : "English"}.

Profile:
${JSON.stringify({
  username: input.profile.username,
  fullName: input.profile.fullName,
  biography: input.profile.biography,
  businessCategory: input.profile.businessCategory,
  followersCount: input.profile.followersCount,
  externalUrl: input.profile.externalUrl,
})}

Recent posts:
${captions}

Return a WebsiteAIAnalysis object.
`.trim();
}

export function validateAnalysis(data: unknown): WebsiteAIAnalysis {
  const parsed = websiteAIAnalysisSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("AI analysis failed validation.");
  }

  const analysis = parsed.data;
  analysis.products = analysis.products.map((product) => ({
    ...product,
    price: product.price ?? null,
    currency: product.price ? product.currency : null,
  }));

  return analysis;
}
