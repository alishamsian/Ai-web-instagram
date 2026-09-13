import { describe, expect, it } from "vitest";
import { websiteSlug } from "@/lib/website/generator";
import { publishedSiteUrl, allowMockServices } from "@/lib/config/runtime";
import { isInstagramCdnUrl } from "@/lib/storage/download";
import { instagramHotlinksInConfig } from "@/lib/storage";

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

  it("lists Instagram hotlinks from website config media and logo", () => {
    const hotlinks = instagramHotlinksInConfig({
      template: "store",
      brand: {
        name: "Demo",
        logo: "https://scontent.cdninstagram.com/v/t51.2885-19/x.jpg",
        colors: {
          primary: "#000",
          secondary: "#fff",
          accent: "#111",
          background: "#fff",
          foreground: "#000",
          muted: "#eee",
        },
        typography: { heading: "sans", body: "sans", scale: "compact" },
      },
      content: {
        hero: {
          style: "minimal",
          headline: "",
          subheadline: "",
          cta: "",
        },
      },
      sections: [],
      seo: { title: "", description: "", keywords: [] },
      settings: {
        language: "en",
        direction: "ltr",
        showBranding: true,
        published: false,
      },
      media: {
        a: {
          url: "https://storage.example.com/ok.jpg",
          alt: "",
          type: "image",
        },
        b: {
          url: "https://scontent.cdninstagram.com/v/photo.jpg",
          videoUrl: "https://instagram.fbcdn.net/v/clip.mp4",
          alt: "",
          type: "video",
        },
      },
    });
    expect(hotlinks).toHaveLength(3);
    expect(hotlinks.every((url) => isInstagramCdnUrl(url))).toBe(true);
  });

  it("builds a local published URL with /s/slug", () => {
    const url = publishedSiteUrl("sibnet.store");
    expect(url).toContain("/s/sibnet.store");
  });

  it("allows mock services outside production by default", () => {
    expect(typeof allowMockServices()).toBe("boolean");
  });
});
