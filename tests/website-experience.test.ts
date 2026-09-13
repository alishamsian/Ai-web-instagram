import { describe, expect, it, beforeEach } from "vitest";
import {
  generateWebsiteFromBusinessProfileSync,
  resolveRecipeId,
  classifyBusiness,
  normalizeBusinessProfile,
  businessProfileFromInstagram,
  confidenceBand,
  CONFIDENCE,
} from "@/lib/business";
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
import { normalizeStoreSections } from "@/lib/store/registry/normalize";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { generateWebsiteConfig } from "@/lib/website/generator";
import { DEMO_POSTS, DEMO_PROFILE } from "@/lib/demo/store";
import { demoAnalysis } from "@/lib/ai/mock";
import { mergeInstagramData } from "@/lib/instagram/merger";

beforeEach(() => {
  resetRegistryForTests(ALL_SECTION_DEFINITIONS);
  resetVerticalRegistryForTests([...CORE_VERTICAL_PACKS]);
  resetRecipeRegistryForTests([...CORE_TEMPLATE_RECIPES]);
  ensureStoreSectionRenderersBound();
});

const FABRICATION =
  /Product 0|Product 1|محصول 0|قطعه 0|Piece 0|Nationwide shipping|100% organic|10,?000 customers|award-winning|certified organic/i;

describe("P5 recipe selection by confidence", () => {
  it("low → generic-store", () => {
    const analysis = classifyBusiness(normalizeBusinessProfile({ bio: "shop" }));
    expect(analysis.confidenceBand).toBe("low");
    expect(resolveRecipeId(analysis)).toBe("generic-store");
  });

  it("high beauty → beauty recipe", () => {
    const analysis = classifyBusiness(
      normalizeBusinessProfile({
        category: "beauty",
        bio: "skincare serum moisturizer retinol cleanser toner",
        products: [
          { name: "Serum", description: "retinol skincare", attributes: { concerns: "acne" } },
          { name: "Cream", description: "moisturizer skin" },
        ],
      }),
    );
    expect(analysis.confidence).toBeGreaterThanOrEqual(CONFIDENCE.MEDIUM);
    const recipeId = resolveRecipeId(analysis, normalizeBusinessProfile({
      category: "beauty",
      bio: "skincare serum moisturizer retinol cleanser toner",
      products: [
        { name: "Serum", description: "retinol skincare" },
        { name: "Cream", description: "moisturizer skin" },
      ],
    }));
    expect(recipeId).not.toBe("generic-store");
    expect(getRecipe(recipeId)?.vertical).toBe("beauty");
  });

  it("medium prefers commerce recipe when available", () => {
    const profile = normalizeBusinessProfile({
      category: "coffee",
      bio: "coffee beans roast",
      products: [{ name: "Blend" }],
    });
    const analysis = classifyBusiness(profile);
    // Force medium band for selection test
    const medium = {
      ...analysis,
      confidence: 0.7,
      confidenceBand: confidenceBand(0.7),
      vertical: "coffee" as const,
      recommendedTemplate: "coffee-story",
    };
    const recipeId = resolveRecipeId(medium, profile);
    expect(recipeId).toBe("coffee-commerce");
  });
});

describe("P5 data-aware composition", () => {
  it("omits attribute taxonomy sections without product attributes", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Glow",
        bio: "skincare serum moisturizer retinol beauty",
        category: "beauty",
        products: [
          { name: "Serum", description: "daily serum" },
          { name: "Cream", description: "face cream" },
        ],
      },
    });
    const types = result.config.sections.map((s) => s.type);
    expect(types).not.toContain("shop-by-concern");
    expect(types).not.toContain("ingredient-story");
    expect(types.every((t) => hasSection(t))).toBe(true);
  });

  it("keeps concern section when concerns attributes exist", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Glow Lab",
        bio: "skincare serum moisturizer retinol beauty cleanser",
        category: "beauty",
        products: [
          {
            name: "Acne Serum",
            description: "skincare treatment",
            attributes: { concerns: ["acne", "barrier"] },
          },
          {
            name: "Hydra Cream",
            description: "moisturizer",
            attributes: { concerns: "hydration" },
          },
        ],
      },
    });
    expect(result.config.settings.vertical).toBe("beauty");
    expect(result.config.sections.some((s) => s.type === "shop-by-concern")).toBe(
      true,
    );
  });

  it("omits gallery/lookbook when no media", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Atelier",
        bio: "fashion dress apparel clothing lookbook",
        products: [{ name: "Dress" }],
      },
    });
    const types = result.config.sections.map((s) => s.type);
    expect(types).not.toContain("gallery");
    expect(types).not.toContain("lookbook");
  });

  it("omits products section when no named products", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Quiet",
        bio: "hello world",
        products: [{ description: "no name" }],
      },
    });
    expect(result.config.content.products?.items ?? []).toHaveLength(0);
    expect(result.config.sections.some((s) => s.type === "products")).toBe(
      false,
    );
  });
});

describe("P5 products + media", () => {
  it("maps product images by source id/url, not random attachment", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Bean",
        bio: "coffee beans roast espresso origin",
        media: {
          images: [
            { url: "https://cdn.example/gallery-a.jpg", source: "g1" },
            { url: "https://cdn.example/gallery-b.jpg", source: "g2" },
          ],
        },
        products: [
          {
            id: "p-ethiopia",
            name: "Ethiopia",
            imageUrl: "https://cdn.example/ethiopia.jpg",
            price: 18,
            currency: "USD",
          },
          {
            id: "p-brazil",
            name: "Brazil",
            imageUrl: "https://cdn.example/gallery-a.jpg",
          },
        ],
      },
    });

    const items = result.config.content.products?.items ?? [];
    expect(items).toHaveLength(2);
    const ethiopia = items.find((p) => p.name === "Ethiopia")!;
    const brazil = items.find((p) => p.name === "Brazil")!;
    expect(ethiopia.price).toBe(18);
    expect(ethiopia.currency).toBe("USD");
    expect(ethiopia.imageIds).toHaveLength(1);
    expect(result.config.media[ethiopia.imageIds[0]!]?.url).toBe(
      "https://cdn.example/ethiopia.jpg",
    );
    // Shared gallery URL reuses same media id
    expect(brazil.imageIds[0]).toBe("g1");
    expect(result.config.content.hero.imageId).toBeTruthy();
    expect(result.config.content.gallery?.imageIds.length).toBeGreaterThan(0);
  });

  it("never fabricates product identity or commercial claims", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Plain",
        bio: "furniture sofa wooden chair table",
        products: [
          { name: "Chair", price: null },
          { description: "unnamed" },
        ],
      },
    });
    const blob = JSON.stringify(result.config);
    expect(blob).not.toMatch(FABRICATION);
    expect(result.config.content.products?.items).toHaveLength(1);
    expect(result.config.content.products?.items?.[0]?.name).toBe("Chair");
    expect(result.config.content.products?.items?.[0]?.price).toBeNull();
  });
});

describe("P5 vertical differentiation", () => {
  const cases = [
    ["beauty", "skincare serum moisturizer retinol beauty", "beauty"],
    ["fashion", "fashion dress apparel clothing lookbook", "fashion"],
    ["jewelry", "jewelry gold necklace ring diamond", "jewelry"],
    ["coffee", "specialty coffee roastery beans roast espresso", "coffee"],
    ["furniture", "furniture sofa wooden chair table interior", "furniture"],
  ] as const;

  for (const [label, bio, vertical] of cases) {
    it(`${label} produces vertical recipe sections`, () => {
      const result = generateWebsiteFromBusinessProfileSync({
        profile: {
          displayName: `${label} Co`,
          category: vertical,
          bio,
          products: [
            { name: "Item A", description: bio },
            { name: "Item B", description: bio },
          ],
          media: {
            images: [{ url: `https://cdn.example/${label}.jpg` }],
          },
        },
      });
      expect(result.config.settings.vertical).toBe(vertical);
      expect(result.config.settings.recipeId).toBeTruthy();
      expect(getRecipe(result.config.settings.recipeId!)?.vertical).toBe(
        vertical,
      );
      expect(result.config.sections.length).toBeGreaterThan(3);
      expect(result.config.sections.every((s) => hasSection(s.type))).toBe(true);
      expect(
        getSectionRenderer(result.config.sections[0]!.type),
      ).toBeTypeOf("function");
    });
  }
});

describe("P5 immutability + determinism + parity", () => {
  it("is deterministic and does not mutate inputs/registries", () => {
    const raw = {
      displayName: "Aura",
      bio: "jewelry gold necklace ring diamond",
      products: [{ name: "Ring", price: 120, currency: "USD" }],
      media: { images: [{ url: "https://cdn.example/ring.jpg" }] },
    };
    const before = structuredClone(raw);
    const recipesBefore = structuredClone(CORE_TEMPLATE_RECIPES);
    const a = generateWebsiteFromBusinessProfileSync({ profile: raw });
    const b = generateWebsiteFromBusinessProfileSync({ profile: raw });
    expect(raw).toEqual(before);
    expect(CORE_TEMPLATE_RECIPES).toEqual(recipesBefore);
    expect(a.config.sections.map((s) => s.type)).toEqual(
      b.config.sections.map((s) => s.type),
    );
    expect(a.config.settings.recipeId).toBe(b.config.settings.recipeId);
  });

  it("recipe-driven config is not expanded by normalizeStoreSections", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Bean",
        bio: "coffee beans roast espresso",
        products: [{ name: "Blend" }],
      },
    });
    const types = result.config.sections.map((s) => s.type);
    const normalized = normalizeStoreSections(result.config).map((s) => s.type);
    expect(normalized).toEqual(types);
  });

  it("polish preserves recipe composition and does not invent Piece N", () => {
    const result = generateWebsiteFromBusinessProfileSync({
      profile: {
        displayName: "Studio",
        bio: "fashion dress apparel",
        products: [{ name: "Coat" }],
      },
    });
    const polished = polishWebsiteConfig(result.config);
    expect(polished.settings.recipeId).toBe(result.config.settings.recipeId);
    expect(JSON.stringify(polished)).not.toMatch(FABRICATION);
    expect(polished.content.products?.items?.[0]?.name).toBe("Coat");
    // editor/preview/published share same section list
    const editor = normalizeStoreSections({
      ...polished,
      settings: { ...polished.settings },
    });
    const published = normalizeStoreSections(polished);
    expect(editor.map((s) => s.type)).toEqual(published.map((s) => s.type));
  });
});

describe("P5 Instagram → WebsiteConfig end-to-end", () => {
  it("Instagram-like data becomes renderable WebsiteConfig", () => {
    const imported = mergeInstagramData({
      workspaceId: "ws",
      sourceUrl: DEMO_PROFILE.profileUrl,
      profile: DEMO_PROFILE,
      posts: DEMO_POSTS,
      requestedLimit: 3,
      collector: "mock",
    });

    const profile = businessProfileFromInstagram({
      imported,
      analysis: demoAnalysis,
      locale: "en",
    });
    expect(profile.source).toBe("instagram");

    const generated = generateWebsiteFromBusinessProfileSync({
      profile,
      locale: "en",
    });
    expect(generated.config.settings.recipeId).toBeTruthy();
    expect(generated.config.sections.every((s) => hasSection(s.type))).toBe(
      true,
    );
    expect(getSectionRenderer(generated.config.sections[0]!.type)).toBeTypeOf(
      "function",
    );

    const viaImportApi = generateWebsiteConfig({
      imported,
      analysis: demoAnalysis,
      locale: "en",
    });
    expect(viaImportApi.settings.recipeId).toBeTruthy();
    expect(viaImportApi.template).toBe("store");
    expect(JSON.stringify(viaImportApi)).not.toMatch(/Product 0|Piece 0|محصول 0/);
    // Real named products from analysis preserved
    const names = viaImportApi.content.products?.items.map((p) => p.name) ?? [];
    expect(names.every((n) => Boolean(n?.trim()))).toBe(true);
  });
});
