import { describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  commandAddFaqItem,
  commandAddProduct,
  commandDeleteFaqItem,
  commandDeleteProduct,
  commandDuplicateFaqItem,
  commandReorderFaqItem,
  commandReorderProduct,
  commandSetBrandLogo,
  commandSetGalleryImages,
  commandSetSectionVariant,
  commandSetSeoKeywords,
  commandToggleGalleryImage,
  commandUpdateFaqItem,
  commandUpdateProduct,
  commandUpdateSiteSettings,
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
      faq: {
        title: "FAQ",
        items: [
          { question: "Q1", answer: "A1" },
          { question: "Q2", answer: "A2" },
        ],
      },
      gallery: {
        title: "Gallery",
        imageIds: ["m1"],
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
      { id: "hero-1", type: "hero", visible: true, variant: "fan" },
      { id: "footer-1", type: "footer", visible: true },
    ],
    media: {
      m1: { url: "https://cdn.example/a.jpg", alt: "A", type: "image" },
      m2: { url: "https://cdn.example/b.jpg", alt: "B", type: "image" },
    },
  };
}

describe("atomic product imageIds", () => {
  it("updates imageIds in a single command without partial primary-only write", () => {
    const result = commandUpdateProduct(baseConfig(), "p1", {
      imageIds: ["m2", "m1"],
      name: "Bag Plus",
    });
    const item = result?.config.content.products?.items[0];
    expect(item?.name).toBe("Bag Plus");
    expect(item?.imageIds).toEqual(["m2", "m1"]);
  });

  it("rejects unknown media in imageIds", () => {
    expect(
      commandUpdateProduct(baseConfig(), "p1", { imageIds: ["missing"] }),
    ).toBeNull();
  });

  it("adds, reorders, and deletes products", () => {
    const added = commandAddProduct(baseConfig(), { name: "New" });
    expect(added?.config.content.products?.items).toHaveLength(2);
    const id = added!.config.content.products!.items[1]!.id!;
    const reordered = commandReorderProduct(added!.config, 1, 0);
    expect(reordered?.config.content.products?.items[0]?.id).toBe(id);
    const deleted = commandDeleteProduct(reordered!.config, id);
    expect(deleted?.config.content.products?.items).toHaveLength(1);
  });
});

describe("FAQ collection commands", () => {
  it("adds, updates, duplicates, reorders, deletes", () => {
    const added = commandAddFaqItem(baseConfig());
    expect(added?.config.content.faq?.items).toHaveLength(3);
    const updated = commandUpdateFaqItem(added!.config, 2, {
      question: "Q3",
      answer: "A3",
    });
    expect(updated?.config.content.faq?.items[2]?.question).toBe("Q3");
    const dup = commandDuplicateFaqItem(updated!.config, 0);
    expect(dup?.config.content.faq?.items).toHaveLength(4);
    const reordered = commandReorderFaqItem(dup!.config, 0, 2);
    expect(reordered?.config.content.faq?.items[2]?.question).toBe("Q1");
    const deleted = commandDeleteFaqItem(reordered!.config, 0);
    expect(deleted?.config.content.faq?.items.length).toBe(3);
  });
});

describe("gallery + variant registry", () => {
  it("toggles gallery images and rejects invalid ids", () => {
    const toggled = commandToggleGalleryImage(baseConfig(), "m2");
    expect(toggled?.config.content.gallery?.imageIds).toEqual(["m1", "m2"]);
    expect(commandSetGalleryImages(baseConfig(), ["nope"])).toBeNull();
  });

  it("only allows registered hero variants", () => {
    expect(commandSetSectionVariant(baseConfig(), "hero-1", "split")?.config.content.hero.style).toBe(
      "split",
    );
    expect(commandSetSectionVariant(baseConfig(), "hero-1", "menu")).toBeNull();
  });

  it("falls back safely for invalid hero style via content path reject of unregistered menu sync", () => {
    const invalid = commandSetSectionVariant(baseConfig(), "hero-1", "does-not-exist");
    expect(invalid).toBeNull();
    const fan = commandSetSectionVariant(baseConfig(), "hero-1", "fan");
    expect(fan?.config.sections.find((s) => s.id === "hero-1")?.variant).toBe("fan");
  });
});

describe("brand logo + site settings commands", () => {
  it("sets and clears brand logo from media", () => {
    const set = commandSetBrandLogo(baseConfig(), "m1");
    expect(set?.config.brand.logo).toBe("https://cdn.example/a.jpg");
    expect(commandSetBrandLogo(baseConfig(), "missing")).toBeNull();
    const cleared = commandSetBrandLogo(set!.config, null);
    expect(cleared?.config.brand.logo).toBeUndefined();
    const settings = commandUpdateSiteSettings(baseConfig(), { language: "fa" });
    expect(settings.config.settings.direction).toBe("rtl");
    const keys = commandSetSeoKeywords(baseConfig(), ["a", " b ", ""]);
    expect(keys.config.seo.keywords).toEqual(["a", "b"]);
  });
});
