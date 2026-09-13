import { describe, expect, it } from "vitest";
import {
  InstagramUrlError,
  isDemoUsername,
  normalizeInstagramUrl,
} from "@/lib/instagram/url";

describe("Instagram URL normalization", () => {
  it("accepts common public profile forms", () => {
    expect(normalizeInstagramUrl("instagram.com/demo").username).toBe("demo");
    expect(normalizeInstagramUrl("https://instagram.com/demo.store/").username).toBe(
      "demo.store",
    );
    expect(normalizeInstagramUrl("https://www.instagram.com/nooran").canonical).toBe(
      "instagram.com/nooran",
    );
  });

  it("accepts query params, mobile host, and bare usernames", () => {
    expect(
      normalizeInstagramUrl("https://www.instagram.com/vina_accessory/?hl=fa")
        .username,
    ).toBe("vina_accessory");
    expect(
      normalizeInstagramUrl(
        "https://www.instagram.com/vina_accessory/?hl=fa&igsh=abc",
      ).username,
    ).toBe("vina_accessory");
    expect(
      normalizeInstagramUrl("https://m.instagram.com/vina_accessory/").username,
    ).toBe("vina_accessory");
    expect(normalizeInstagramUrl("@vina_accessory").username).toBe(
      "vina_accessory",
    );
    expect(normalizeInstagramUrl("vina_accessory").username).toBe(
      "vina_accessory",
    );
    expect(
      normalizeInstagramUrl("instagram.com/vina_accessory/reels").username,
    ).toBe("vina_accessory");
  });

  it("rejects other domains and reserved paths", () => {
    expect(() => normalizeInstagramUrl("https://example.com/demo")).toThrow(InstagramUrlError);
    expect(() => normalizeInstagramUrl("instagram.com/p/shortcode")).toThrow(InstagramUrlError);
    expect(() => normalizeInstagramUrl("instagram.com/reel/abc")).toThrow(InstagramUrlError);
    expect(() => normalizeInstagramUrl("not a url")).toThrow(InstagramUrlError);
  });

  it("identifies demo accounts", () => {
    expect(isDemoUsername("demo")).toBe(true);
    expect(isDemoUsername("other")).toBe(false);
  });
});
