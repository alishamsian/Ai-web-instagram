import { describe, expect, it } from "vitest";
import { validateAnalysis } from "@/lib/ai/prompts";

const base = {
  businessType: "store",
  businessName: "نوران",
  summary: "brand",
  targetAudience: "women",
  brandTone: ["modern"],
  visualStyle: ["minimal"],
  suggestedColors: ["#111111"],
  products: [
    {
      name: "Coat",
      description: "Linen",
      category: "coats",
      price: null,
      currency: null,
      imageIds: [],
      confidence: 0.8,
    },
  ],
  services: [],
  contactInfo: {
    phone: null,
    email: null,
    website: null,
    instagram: "demo",
    telegram: null,
    whatsapp: null,
    address: null,
    location: null,
  },
  recommendedSections: ["hero", "about", "contact"],
  suggestedCTA: "Shop",
  seo: { title: "نوران", description: "store", keywords: [] },
  template: "store",
  heroCopy: { headline: "Hello", subheadline: "There" },
  aboutCopy: "About the brand",
};

describe("AI schema validation", () => {
  it("accepts a complete analysis and keeps missing prices null", () => {
    const result = validateAnalysis(base);
    expect(result.products[0].price).toBeNull();
  });

  it("rejects invalid AI output", () => {
    expect(() => validateAnalysis({ businessName: "x" })).toThrow();
  });

  it("does not invent a price from missing fields", () => {
    const result = validateAnalysis({
      ...base,
      products: [{ name: "Bag", description: "", category: "acc", imageIds: [], confidence: 0.4 }],
    });
    expect(result.products[0].price).toBeNull();
  });
});
