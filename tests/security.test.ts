import { describe, expect, it } from "vitest";
import { websiteAIAnalysisSchema } from "@/schemas/ai";

describe("security validation", () => {
  it("rejects arbitrary code-like AI payloads missing required fields", () => {
    const result = websiteAIAnalysisSchema.safeParse({
      html: "<script>alert(1)</script>",
      businessName: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects colors that are not hex values", () => {
    const result = websiteAIAnalysisSchema.safeParse({
      businessType: "store",
      businessName: "x",
      summary: "s",
      targetAudience: "t",
      brandTone: ["a"],
      visualStyle: ["b"],
      suggestedColors: ["red"],
      products: [],
      services: [],
      contactInfo: {
        phone: null,
        email: null,
        website: null,
        instagram: "x",
        telegram: null,
        whatsapp: null,
        address: null,
        location: null,
      },
      recommendedSections: ["hero", "about", "contact"],
      suggestedCTA: "go",
      seo: { title: "t", description: "d", keywords: [] },
      template: "store",
      heroCopy: { headline: "h", subheadline: "s" },
      aboutCopy: "a",
    });
    expect(result.success).toBe(false);
  });
});
