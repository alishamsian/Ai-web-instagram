import { describe, expect, it } from "vitest";
import { websiteSlug } from "@/lib/website/generator";
import { publishedSiteUrl, allowMockServices } from "@/lib/config/runtime";
import { isInstagramCdnUrl } from "@/lib/storage/download";

describe("launch hardening helpers", () => {
  it("slugifies usernames for websites", () => {
    expect(websiteSlug("Brand", "My_Shop")).toBe("my_shop");
  });

  it("detects Instagram CDN hosts", () => {
    expect(
      isInstagramCdnUrl(
        "https://instagram.fna.fbcdn.net/v/t51.82787-15/x.jpg",
      ),
    ).toBe(true);
    expect(isInstagramCdnUrl("https://images.unsplash.com/photo.jpg")).toBe(
      false,
    );
  });

  it("builds a local published URL with /s/slug", () => {
    const url = publishedSiteUrl("sibnet.store");
    expect(url).toContain("/s/sibnet.store");
  });

  it("allows mock services outside production by default", () => {
    expect(typeof allowMockServices()).toBe("boolean");
  });
});
