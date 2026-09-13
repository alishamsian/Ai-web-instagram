import { describe, expect, it, beforeEach } from "vitest";
import {
  normalizeBusinessProfile,
  safeParseBusinessProfile,
  classifyBusiness,
  generateWebsiteFromBusinessProfileSync,
  generateWebsiteFromBusinessProfile,
  generateDeterministicContent,
  applyGeneratedContent,
  CONFIDENCE,
} from "@/lib/business";
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

describe("BusinessProfile normalization", () => {
  it("accepts valid partial input immutably", () => {
    const raw = {
      displayName: "Glow Lab",
      bio: "Clean skincare serum and moisturizer",
      products: [{ name: "Serum", price: 12, currency: "USD" }],
    };
    const before = structuredClone(raw);
    const profile = normalizeBusinessProfile(raw);
    expect(raw).toEqual(before);
    expect(profile.brand?.name).toBe("Glow Lab");
    expect(profile.products?.[0]?.price).toBe(12);
  });

  it("handles malformed input without crashing", () => {
    expect(normalizeBusinessProfile(null).source).toBe("unknown");
    expect(normalizeBusinessProfile("bad").brand?.name).toBeNull();
    // Invalid URLs coerce to null rather than crashing the pipeline
    expect(safeParseBusinessProfile({ website: "not-a-url" }).ok).toBe(true);
    expect(safeParseBusinessProfile({ website: "not-a-url" }).data?.website).toBeNull();
    const coerced = normalizeBusinessProfile({
      website: "ftp://evil",
      displayName: "X",
    });
    expect(coerced.website).toBeNull();
    expect(coerced.displayName).toBe("X");
  });
});

describe("deterministic classification", () => {
  it("classifies beauty / fashion / coffee / jewelry / furniture", () => {
    expect(
      classifyBusiness(
        normalizeBusinessProfile({
          bio: "skincare serum moisturizer retinol",
          category: "beauty",
        }),
      ).vertical,
    ).toBe("beauty");

    expect(
      classifyBusiness(
        normalizeBusinessProfile({
          bio: "fashion dress lookbook collection apparel",
        }),
      ).vertical,
    ).toBe("fashion");

    expect(
      classifyBusiness(
        normalizeBusinessProfile({
          bio: "specialty coffee roastery beans espresso roast",
        }),
      ).vertical,
    ).toBe("coffee");

    expect(
      classifyBusiness(
        normalizeBusinessProfile({
          bio: "jewelry gold necklace ring diamond",
        }),
      ).vertical,
    ).toBe("jewelry");

    expect(
      classifyBusiness(
        normalizeBusinessProfile({
          bio: "furniture sofa chair wooden table interior",
        }),
      ).vertical,
    ).toBe("furniture");
  });

  it("falls back to generic for empty / ambiguous", () => {
    const empty = classifyBusiness(normalizeBusinessProfile({}));
    expect(empty.vertical).toBe("generic");
    expect(empty.confidenceBand).toBe("low");

    const ambiguous = classifyBusiness(
      normalizeBusinessProfile({ bio: "hello world shop" }),
    );
    expect(ambiguous.vertical).toBe("generic");
  });

  it("detects subVertical when pack supports it", () => {
    const analysis = classifyBusiness(
      normalizeBusinessProfile({
        bio: "skincare serum moisturizer retinol barrier",
        category: "beauty",
      }),
    );
    expect(analysis.vertical).toBe("beauty");
    expect(analysis.subVertical).toBe("skincare");
  });

  it("only recommends registered modules", () => {
    const analysis = classifyBusiness(
      normalizeBusinessProfile({
        bio: "coffee beans roast espresso brew",
      }),
    );
    for (const sectionType of analysis.recommendedModules) {
      expect(hasSection(sectionType)).toBe(true);
    }
  });
});

describe("confidence bands", () => {
  it("maps high / medium / low", () => {
    const high = classifyBusiness(
      normalizeBusinessProfile({
        category: "beauty",
        bio: "skincare serum moisturizer retinol cleanser toner makeup cosmetics beauty clean beauty",
        products: [
          { name: "Retinol serum", description: "skincare moisturizer" },
          { name: "Cleanser", description: "skin care" },
        ],
        signals: { productSignals: ["serum", "retinol"] },
      }),
    );
    expect(high.confidence).toBeGreaterThanOrEqual(CONFIDENCE.MEDIUM);
    expect(["high", "medium"]).toContain(high.confidenceBand);

    const low = classifyBusiness(normalizeBusinessProfile({}));
    expect(low.confidenceBand).toBe("low");
  });
});

describe("website generation", () => {
  it("generates valid WebsiteConfig without AI", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Bean Co",
        bio: "specialty coffee roastery beans origin roast",
        locale: "en",
        products: [{ name: "Ethiopia Natural", description: "light roast" }],
      },
      locale: "en",
    });

    expect(result.mode).toBe("deterministic");
    expect(result.analysis.source).toBe("rules");
    expect(result.config.settings.vertical).toBe("coffee");
    expect(getRecipe(result.config.settings.recipeId!)).toBeTruthy();
    expect(result.config.sections.every((s) => hasSection(s.type))).toBe(true);
    expect(getSectionRenderer(result.config.sections[0]!.type)).toBeTypeOf(
      "function",
    );
    expect(result.config.content.products?.items?.[0]?.name).toBe(
      "Ethiopia Natural",
    );
  });

  it("Persian empty profile still yields valid config", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {},
      locale: "fa",
    });
    expect(result.config.settings.language).toBe("fa");
    expect(result.config.settings.direction).toBe("rtl");
    expect(result.config.settings.vertical).toBe("generic");
    expect(result.config.sections.length).toBeGreaterThan(0);
    expect(result.content.brandName).toBe("فروشگاه");
  });

  it("does not hallucinate commercial facts", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Plain Shop",
        bio: "fashion dress collection lookbook",
        products: [{ name: "Dress" }],
      },
    });
    const blob = JSON.stringify(result.content) + JSON.stringify(result.config);
    expect(blob).not.toMatch(/award|certified|rating|review|ships in|guarantee/i);
    expect(result.config.content.products?.items?.[0]?.price).toBeNull();
  });

  it("applyGeneratedContent is immutable and path-safe", () => {
    const base = generateWebsiteFromBusinessProfileSync({
      profile: { displayName: "A" },
    }).config;
    const before = structuredClone(base);
    const content = generateDeterministicContent({
      profile: normalizeBusinessProfile({ displayName: "B" }),
      analysis: classifyBusiness(
        normalizeBusinessProfile({ displayName: "B", bio: "coffee beans" }),
      ),
      locale: "en",
    });
    const next = applyGeneratedContent(base, content);
    expect(base).toEqual(before);
    expect(next).not.toBe(base);
    expect(next.brand.name).toBe("B");
  });

  it("AI unavailable falls back to deterministic in hybrid mode", async () => {
    const result = await generateWebsiteFromBusinessProfile({
      profile: {
        bio: "jewelry gold necklace ring",
        displayName: "Aura",
      },
      mode: "hybrid",
      aiProvider: new UnavailableBusinessIntelligence(),
    });
    expect(result.analysis.source).toBe("rules");
    expect(result.config.settings.vertical).toBe("jewelry");
  });

  it("beauty/fashion recipes resolve through existing catalog", () => {
    const beauty = generateWebsiteFromBusinessProfileSync({
      profile: {
        category: "beauty",
        bio: "skincare serum moisturizer retinol",
      },
    });
    expect(beauty.config.settings.recipeId).not.toBe("generic-store");
    expect(
      beauty.config.sections.some((s) => s.type === "shop-by-concern" || s.type === "routine"),
    ).toBe(true);

    const fashion = generateWebsiteFromBusinessProfileSync({
      profile: { bio: "fashion clothing lookbook dress apparel" },
    });
    expect(
      fashion.config.sections.some(
        (s) => s.type === "lookbook" || s.type === "shop-the-look",
      ),
    ).toBe(true);
  });
});
