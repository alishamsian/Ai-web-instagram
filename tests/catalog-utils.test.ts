import { describe, expect, it } from "vitest";
import {
  extractPriceFromText,
  findDuplicateGroups,
  namesAreSimilar,
} from "@/components/dashboard/content/catalog-utils";

describe("extractPriceFromText", () => {
  it("parses toman labels", () => {
    expect(extractPriceFromText("قیمت: ۴۵۰ هزار تومان")?.price).toBe(450000);
    expect(extractPriceFromText("price 120000 تومان")?.currency).toBe("IRT");
  });

  it("parses usd", () => {
    expect(extractPriceFromText("Only $49.5 today")?.price).toBe(49.5);
  });

  it("does not invent", () => {
    expect(extractPriceFromText("beautiful dress for summer")).toBeNull();
  });
});

describe("duplicates", () => {
  it("detects similar names", () => {
    expect(namesAreSimilar("مانتو کرم", "مانتو کرم")).toBe(true);
    expect(namesAreSimilar("مانتو کرم بلند", "مانتو کرم")).toBe(true);
  });

  it("groups shared images", () => {
    const groups = findDuplicateGroups([
      {
        name: "A",
        description: "",
        category: "",
        price: null,
        currency: "IRT",
        imageIds: ["img1"],
        confidence: 1,
      },
      {
        name: "B",
        description: "",
        category: "",
        price: 10,
        currency: "IRT",
        imageIds: ["img1"],
        confidence: 1,
      },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.reason).toBe("image");
  });
});
