import { describe, expect, it, beforeEach } from "vitest";
import {
  normalizeBusinessProfile,
  coerceBusinessProfile,
  classifyBusiness,
  confidenceBand,
  CONFIDENCE,
  generateWebsiteFromBusinessProfileSync,
  generateWebsiteFromBusinessProfile,
  generateDeterministicContent,
  applyGeneratedContent,
  mapBusinessProductsToCatalog,
  isGeneratedContentPathAllowed,
  mergeHybridAnalysis,
  sanitizeHttpUrl,
} from "@/lib/business";
import type { BusinessAnalysis } from "@/lib/business";
import { UnavailableBusinessIntelligence } from "@/lib/ai/business-intelligence";
import {
  resetRegistryForTests,
  ALL_SECTION_DEFINITIONS,
  hasSection,
} from "@/lib/store/registry";
import {
  resetVerticalRegistryForTests,
  CORE_VERTICAL_PACKS,
} from "@/lib/store/verticals";
import {
  resetRecipeRegistryForTests,
  CORE_TEMPLATE_RECIPES,
  getRecipe,
} from "@/lib/store/recipes";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { getSectionRenderer } from "@/lib/store/registry/catalog";

beforeEach(() => {
  resetRegistryForTests(ALL_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
  ensureStoreSectionRenderersBound();
});

describe("normalization resilience", () => {
  it("keeps valid products when one product is malformed", () => {
    const raw = {
      displayName: "Glow",
      bio: "skincare serum",
      products: [
        { name: "Serum", price: 12 },
        { name: 123, price: "bad" },
        { name: "Cream", description: "moist" },
        null,
        "garbage",
      ],
    };
    const before = structuredClone(raw);
    const profile = normalizeBusinessProfile(raw);
    expect(raw).toEqual(before);
    expect(profile.displayName).toBe("Glow");
    expect(profile.products?.map((p) => p.name)).toEqual(["Serum", "Cream"]);
    expect(profile.products?.[0]?.price).toBe(12);
  });

  it("does not invent product names or forced confidence", () => {
    const profile = normalizeBusinessProfile({
      products: [
        { description: "only description", imageUrl: "https://cdn.example/a.jpg" },
        { name: "Named", confidence: 0.4 },
      ],
    });
    expect(profile.products?.[0]?.name).toBeNull();
    expect(profile.products?.[1]?.name).toBe("Named");
    expect(profile.products?.[1]?.confidence).toBe(0.4);

    const catalog = mapBusinessProductsToCatalog(profile);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.name).toBe("Named");
    expect(catalog[0]?.confidence).toBe(0.4);
    expect(catalog.some((p) => /Product \d/.test(p.name))).toBe(false);
  });

  it("sanitizes unsafe URLs and keeps profile", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl("data:text/html,x")).toBeNull();
    expect(sanitizeHttpUrl("https://ok.example/a.png")).toContain("https://");

    const profile = coerceBusinessProfile({
      displayName: "Safe",
      website: "javascript:evil",
      media: { images: ["ftp://bad", "https://cdn.example/ok.jpg"] },
    });
    expect(profile.displayName).toBe("Safe");
    expect(profile.website).toBeNull();
    expect(profile.media?.images).toHaveLength(1);
  });
});

describe("confidence bands", () => {
  it("uses exact boundaries", () => {
    expect(confidenceBand(0.599999)).toBe("low");
    expect(confidenceBand(0.6)).toBe("medium");
    expect(confidenceBand(0.84)).toBe("medium");
    expect(confidenceBand(0.849999)).toBe("medium");
    expect(confidenceBand(0.85)).toBe("high");
    expect(confidenceBand(0.9)).toBe("high");
    expect(CONFIDENCE.HIGH).toBe(0.85);
    expect(CONFIDENCE.MEDIUM).toBe(0.6);
  });
});

describe("classification", () => {
  it("classifies known verticals with evidence", () => {
    const cases = [
      ["beauty", "skincare serum moisturizer retinol"],
      ["fashion", "fashion dress lookbook apparel clothing"],
      ["coffee", "specialty coffee roastery beans espresso roast"],
      ["jewelry", "jewelry gold necklace ring diamond"],
      ["furniture", "furniture sofa wooden chair table interior"],
    ] as const;

    for (const [vertical, bio] of cases) {
      const analysis = classifyBusiness(
        normalizeBusinessProfile({ bio, category: vertical }),
      );
      expect(analysis.vertical).toBe(vertical);
      expect(analysis.evidence?.length).toBeGreaterThan(0);
      expect(analysis.source).toBe("rules");
      for (const sectionType of analysis.recommendedModules) {
        expect(hasSection(sectionType)).toBe(true);
      }
    }
  });

  it("falls back to generic on weak / empty signals", () => {
    expect(classifyBusiness(normalizeBusinessProfile({})).vertical).toBe(
      "generic",
    );
    expect(
      classifyBusiness(normalizeBusinessProfile({ bio: "hello shop" })).vertical,
    ).toBe("generic");
  });

  it("is deterministic", () => {
    const profile = normalizeBusinessProfile({
      bio: "coffee beans roast espresso",
    });
    expect(classifyBusiness(profile)).toEqual(classifyBusiness(profile));
  });

  it("keeps subVertical conservative", () => {
    const weak = classifyBusiness(
      normalizeBusinessProfile({ bio: "beauty" }),
    );
    // weak beauty signal should not invent skincare subVertical
    if (weak.vertical === "beauty") {
      expect(weak.subVertical == null || weak.confidence >= CONFIDENCE.MEDIUM).toBe(
        true,
      );
    }
    const strong = classifyBusiness(
      normalizeBusinessProfile({
        category: "beauty",
        bio: "skincare serum moisturizer retinol cleanser toner barrier",
        products: [
          { name: "Serum", description: "retinol skincare" },
          { name: "Moisturizer", description: "skin care cream" },
        ],
      }),
    );
    expect(strong.vertical).toBe("beauty");
  });
});

describe("content + allowlist", () => {
  it("blocks non-allowlisted paths", () => {
    expect(isGeneratedContentPathAllowed("content.hero.headline")).toBe(true);
    expect(isGeneratedContentPathAllowed("settings.vertical")).toBe(false);
    expect(isGeneratedContentPathAllowed("content.products.items")).toBe(false);
  });

  it("does not hallucinate commercial facts", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Plain",
        bio: "fashion dress collection",
        products: [{ name: "Dress" }],
      },
    });
    const blob = JSON.stringify(result.content) + JSON.stringify(result.config);
    expect(blob).not.toMatch(
      /award|certified|rating|review|ships in|guarantee|10,?000 customers|100% organic/i,
    );
    expect(result.config.content.products?.items?.[0]?.price).toBeNull();
  });

  it("applyGeneratedContent is immutable", () => {
    const base = generateWebsiteFromBusinessProfileSync({
      profile: { displayName: "A" },
    }).config;
    const before = structuredClone(base);
    const content = generateDeterministicContent({
      profile: normalizeBusinessProfile({ displayName: "B" }),
      analysis: classifyBusiness(
        normalizeBusinessProfile({ displayName: "B", bio: "coffee beans roast" }),
      ),
      locale: "en",
    });
    const next = applyGeneratedContent(base, content);
    expect(base).toEqual(before);
    expect(next.brand.name).toBe("B");
  });
});

describe("AI optionality + hybrid", () => {
  it("works without AI provider", async () => {
    const result = await generateWebsiteFromBusinessProfile({
      profile: { bio: "jewelry gold necklace", displayName: "Aura" },
      mode: "deterministic",
    });
    expect(result.analysis.source).toBe("rules");
    expect(result.config.settings.vertical).toBe("jewelry");
  });

  it("hybrid falls back when AI unavailable", async () => {
    const result = await generateWebsiteFromBusinessProfile({
      profile: { bio: "coffee beans roast espresso", displayName: "Bean" },
      mode: "hybrid",
      aiProvider: new UnavailableBusinessIntelligence(),
    });
    expect(result.analysis.source).toBe("rules");
  });

  it("hybrid merge does not overwrite protected fields blindly", () => {
    const baseline = classifyBusiness(
      normalizeBusinessProfile({ bio: "coffee beans roast espresso" }),
    );
    const malicious: BusinessAnalysis = {
      ...baseline,
      vertical: "beauty",
      confidence: 0.9,
      confidenceBand: "high",
      productAttributes: ["skinType"],
      productSignals: ["injected"],
      recommendedModules: ["not-a-real-section", "hero"],
      source: "ai",
    };
    // Without registry vertical beauty + high confidence AI could switch —
    // protected: productSignals stay from baseline
    const merged = mergeHybridAnalysis(baseline, malicious);
    expect(merged.productSignals).toEqual(baseline.productSignals);
    expect(merged.productAttributes).toEqual(baseline.productAttributes);
    expect(merged.recommendedModules.every((t) => hasSection(t))).toBe(true);
    expect(merged.recommendedModules).not.toContain("not-a-real-section");
  });
});

describe("end-to-end pipeline", () => {
  it("BusinessProfile → WebsiteConfig → Registry renderers", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Bean Co",
        bio: "specialty coffee roastery beans origin roast",
        locale: "en",
        products: [
          { name: "Ethiopia", description: "light roast", price: null },
          { description: "unnamed skip me" },
        ],
      },
    });

    expect(result.mode).toBe("deterministic");
    expect(getRecipe(result.config.settings.recipeId!)).toBeTruthy();
    expect(result.config.sections.every((s) => hasSection(s.type))).toBe(true);
    expect(getSectionRenderer(result.config.sections[0]!.type)).toBeTypeOf(
      "function",
    );
    expect(result.config.content.products?.items).toHaveLength(1);
    expect(result.config.content.products?.items?.[0]?.name).toBe("Ethiopia");
  });

  it("Persian empty profile remains valid", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {},
      locale: "fa",
    });
    expect(result.config.settings.language).toBe("fa");
    expect(result.config.settings.direction).toBe("rtl");
    expect(result.config.settings.vertical).toBe("generic");
    expect(result.config.sections.length).toBeGreaterThan(0);
  });
});
