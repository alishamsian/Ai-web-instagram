import { describe, expect, it } from "vitest";
import { expandStoreCatalog } from "@/lib/website/product";
import { planLimits } from "@/lib/config/plans";

describe("honest catalog", () => {
  it("does not invent duplicate products", () => {
    const catalog = expandStoreCatalog(
      [
        {
          name: "A",
          description: "d",
          category: "x",
          price: null,
          currency: null,
          imageIds: ["1"],
          confidence: 0.9,
        },
      ],
      "fa",
      9,
    );
    expect(catalog).toHaveLength(1);
  });
});

describe("plan limits", () => {
  it("free plan is capped to one site", () => {
    expect(planLimits("free").maxWebsites).toBe(1);
    expect(planLimits("free").customDomain).toBe(false);
    expect(planLimits("pro").customDomain).toBe(true);
  });
});
