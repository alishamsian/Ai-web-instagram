import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  commandAddSection,
  commandAssignMedia,
  commandSetContactInfo,
  commandSetContentPath,
  commandSetSectionVariant,
  commandUpdateProduct,
  normalizeEditorHref,
  resolveEditorHref,
} from "@/lib/editor";

function baseConfig(): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Vitrin",
      colors: {
        primary: "#111",
        secondary: "#222",
        accent: "#f00",
        background: "#fff",
        foreground: "#111",
        muted: "#999",
      },
      typography: { heading: "sans", body: "sans", scale: "compact" },
    },
    content: {
      hero: {
        style: "fan",
        headline: "Hello",
        subheadline: "Sub",
        cta: "Shop",
      },
      about: {
        title: "About",
        body: "Story",
      },
      products: {
        title: "Products",
        items: [
          {
            id: "p1",
            slug: "p1",
            name: "Bag",
            description: "Desc",
            category: "General",
            price: 10,
            currency: "USD",
            imageIds: ["m1"],
            confidence: 1,
          },
        ],
      },
      contact: {
        title: "Contact",
        body: "",
        info: {
          phone: null,
          email: null,
          website: null,
          instagram: null,
          telegram: null,
          whatsapp: null,
          address: null,
          location: null,
        },
      },
    },
    seo: { title: "T", description: "D", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    sections: [
      { id: "hero-1", type: "hero", visible: true },
      { id: "about-1", type: "about", visible: true },
      { id: "footer-1", type: "footer", visible: true },
    ],
    media: {
      m1: { url: "https://cdn.example/a.jpg", alt: "A", type: "image" },
      m2: { url: "https://cdn.example/b.jpg", alt: "B", type: "image" },
    },
  };
}

describe("editor href normalization", () => {
  it("accepts relative, http(s), tel, mailto and rejects unsafe", () => {
    expect(normalizeEditorHref("#shop").ok).toBe(true);
    expect(normalizeEditorHref("/about").ok).toBe(true);
    expect(normalizeEditorHref("https://instagram.com/x").ok).toBe(true);
    expect(normalizeEditorHref("tel:+98912").ok).toBe(true);
    expect(normalizeEditorHref("mailto:a@b.com").ok).toBe(true);
    expect(normalizeEditorHref("javascript:alert(1)").ok).toBe(false);
    expect(normalizeEditorHref("data:text/html,x").ok).toBe(false);
    expect(resolveEditorHref(undefined, "#shop")).toBe("#shop");
  });
});

describe("content / CTA commands", () => {
  it("updates hero text via field alias and content path", () => {
    const a = commandSetContentPath(baseConfig(), "hero.headline", "Lux");
    expect(a?.config.content.hero.headline).toBe("Lux");
    const b = commandSetContentPath(
      a!.config,
      "content.hero.ctaHref",
      "https://shop.example/sale",
    );
    expect(b?.config.content.hero.ctaHref).toContain("https://");
  });

  it("rejects unsafe CTA href", () => {
    expect(
      commandSetContentPath(baseConfig(), "content.hero.ctaHref", "javascript:x"),
    ).toBeNull();
  });

  it("updates services/gallery/contact titles", () => {
    const cfg = baseConfig();
    cfg.content.services = { title: "S", items: [] };
    cfg.content.gallery = { title: "G", imageIds: [] };
    expect(
      commandSetContentPath(cfg, "services.title", "Services")?.config.content
        .services?.title,
    ).toBe("Services");
    expect(
      commandSetContentPath(cfg, "gallery.title", "Lookbook")?.config.content
        .gallery?.title,
    ).toBe("Lookbook");
    expect(
      commandSetContentPath(cfg, "contact.title", "Reach us")?.config.content
        .contact?.title,
    ).toBe("Reach us");
  });
});

describe("media assign", () => {
  it("replaces hero image with an existing asset", () => {
    const result = commandAssignMedia(
      baseConfig(),
      "content.hero.imageId",
      "m2",
    );
    expect(result?.config.content.hero.imageId).toBe("m2");
  });

  it("rejects unknown media ids and clears safely", () => {
    expect(
      commandAssignMedia(baseConfig(), "content.hero.imageId", "missing"),
    ).toBeNull();
    const cleared = commandAssignMedia(
      {
        ...baseConfig(),
        content: {
          ...baseConfig().content,
          hero: { ...baseConfig().content.hero, imageId: "m1" },
        },
      },
      "content.hero.imageId",
      null,
    );
    expect(cleared?.config.content.hero.imageId).toBeUndefined();
  });
});

describe("section variant + insert defaults", () => {
  it("sets only registered variants and syncs hero style", () => {
    const ok = commandSetSectionVariant(baseConfig(), "hero-1", "split");
    expect(ok?.config.sections.find((s) => s.id === "hero-1")?.variant).toBe(
      "split",
    );
    expect(ok?.config.content.hero.style).toBe("split");
    expect(commandSetSectionVariant(baseConfig(), "hero-1", "nope")).toBeNull();
  });

  it("adds section with a default registered variant", () => {
    const result = commandAddSection(baseConfig(), "gallery", {
      afterSectionId: "hero-1",
    });
    const gallery = result?.config.sections.find((s) => s.type === "gallery");
    expect(gallery?.visible).toBe(true);
    expect(gallery?.variant).toBeTruthy();
  });
});

describe("product + contact commands", () => {
  it("updates product fields without inventing data", () => {
    const result = commandUpdateProduct(baseConfig(), "p1", {
      name: "Silk Bag",
      price: 42,
      imageId: "m2",
    });
    const item = result?.config.content.products?.items[0];
    expect(item?.name).toBe("Silk Bag");
    expect(item?.price).toBe(42);
    expect(item?.imageIds[0]).toBe("m2");
  });

  it("updates contact info with URL normalization", () => {
    const result = commandSetContactInfo(
      baseConfig(),
      "website",
      "example.com",
    );
    expect(result?.config.content.contact?.info.website).toContain("https://");
    expect(
      commandSetContactInfo(baseConfig(), "email", "not-an-email"),
    ).toBeNull();
  });
});
