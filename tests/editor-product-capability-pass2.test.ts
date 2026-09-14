import { afterEach, describe, expect, it } from "vitest";
import type { WebsiteConfig } from "@/types/website";
import {
  commandAddFaqItem,
  commandAddProduct,
  commandAddService,
  commandDeleteFaqItem,
  commandDeleteProduct,
  commandDeleteService,
  commandDuplicateFaqItem,
  commandEnsureTestimonials,
  commandReorderFaqItem,
  commandReorderProduct,
  commandReorderService,
  commandSetGalleryImages,
  commandSetSectionVariant,
  commandToggleGalleryImage,
  commandUpdateFaqItem,
  commandUpdateProduct,
  createSequentialIdFactory,
  normalizeCollectionIdentities,
  normalizeLegacyHeroVariant,
  resolveResponsiveColumns,
  resolveResponsiveValue,
  setEntityIdFactory,
  setResponsiveOverride,
} from "@/lib/editor";
import { getSectionDefinition, getSectionVariants, resetRegistryForTests } from "@/lib/store/registry";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";

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
      services: {
        title: "Services",
        items: [
          {
            id: "s1",
            name: "Consult",
            description: "Talk",
            imageIds: [],
            confidence: 1,
          },
        ],
      },
      faq: {
        title: "FAQ",
        items: [
          { id: "f1", question: "Q1", answer: "A1" },
          { id: "f2", question: "Q2", answer: "A2" },
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
      {
        id: "products-1",
        type: "products",
        visible: true,
        settings: { columns: { mobile: 2, tablet: 3, desktop: 4 } },
      },
      { id: "footer-1", type: "footer", visible: true },
    ],
    media: {
      m1: { url: "https://cdn.example/a.jpg", alt: "A", type: "image" },
      m2: { url: "https://cdn.example/b.jpg", alt: "B", type: "image" },
    },
  };
}

afterEach(() => {
  setEntityIdFactory(null);
  resetRegistryForTests(CORE_SECTION_DEFINITIONS);
});

describe("pass 2.1 — atomic product + identity", () => {
  it("updates imageIds atomically and rejects invalid media", () => {
    const result = commandUpdateProduct(baseConfig(), "p1", {
      imageIds: ["m2", "m1"],
      name: "Bag Plus",
      hidden: true,
    });
    const item = result?.config.content.products?.items[0];
    expect(item?.name).toBe("Bag Plus");
    expect(item?.imageIds).toEqual(["m2", "m1"]);
    expect(item?.hidden).toBe(true);
    expect(
      commandUpdateProduct(baseConfig(), "p1", { imageIds: ["missing"] }),
    ).toBeNull();
    expect(commandUpdateProduct(baseConfig(), "nope", { name: "x" })).toBeNull();
  });

  it("uses explicit ids for deterministic creates", () => {
    const added = commandAddProduct(baseConfig(), {
      id: "fixed-product",
      name: "Fixed",
    });
    expect(added?.config.content.products?.items.at(-1)?.id).toBe(
      "fixed-product",
    );
    const svc = commandAddService(baseConfig(), { id: "fixed-service" });
    expect(svc?.config.content.services?.items.at(-1)?.id).toBe(
      "fixed-service",
    );
  });

  it("rejects invalid collection ids safely", () => {
    expect(commandDeleteService(baseConfig(), "missing")).toBeNull();
    expect(commandUpdateFaqItem(baseConfig(), "missing", { question: "x" })).toBeNull();
    expect(commandReorderProduct(baseConfig(), "missing", 0)).toBeNull();
  });
});

describe("pass 2.1 — FAQ/services id ops", () => {
  it("adds/updates/duplicates/reorders/deletes FAQ by id", () => {
    setEntityIdFactory(createSequentialIdFactory());
    const added = commandAddFaqItem(baseConfig(), { id: "f3" });
    expect(added?.config.content.faq?.items).toHaveLength(3);
    const updated = commandUpdateFaqItem(added!.config, "f3", {
      question: "Q3",
      answer: "A3",
    });
    expect(updated?.config.content.faq?.items.find((i) => i.id === "f3")?.question).toBe(
      "Q3",
    );
    const dup = commandDuplicateFaqItem(updated!.config, "f1", "f1-copy");
    expect(dup?.config.content.faq?.items.find((i) => i.id === "f1-copy")).toBeTruthy();
    const reordered = commandReorderFaqItem(dup!.config, "f1", 2);
    expect(reordered?.config.content.faq?.items[2]?.id).toBe("f1");
    const deleted = commandDeleteFaqItem(reordered!.config, "f2");
    expect(deleted?.config.content.faq?.items.some((i) => i.id === "f2")).toBe(
      false,
    );
  });

  it("reorders and deletes services by id", () => {
    const added = commandAddService(baseConfig(), { id: "s2", name: "B" });
    const reordered = commandReorderService(added!.config, "s2", 0);
    expect(reordered?.config.content.services?.items[0]?.id).toBe("s2");
    const deleted = commandDeleteService(reordered!.config, "s1");
    expect(deleted?.config.content.services?.items).toHaveLength(1);
  });

  it("ensures testimonials via command", () => {
    const result = commandEnsureTestimonials(baseConfig());
    expect(result.config.content.testimonials?.items).toEqual([]);
    const again = commandEnsureTestimonials(result.config);
    expect(again.config).toEqual(result.config);
  });
});

describe("pass 2.1 — normalize identity + legacy hero", () => {
  it("assigns missing collection ids without changing existing ones", () => {
    setEntityIdFactory(createSequentialIdFactory(10));
    const raw = baseConfig();
    raw.content.faq!.items = [{ question: "old", answer: "a" }];
    raw.content.services!.items = [
      { name: "S", description: "", imageIds: [], confidence: 1 },
    ];
    const next = normalizeCollectionIdentities(raw);
    expect(next.content.faq?.items[0]?.id).toMatch(/^faq-/);
    expect(next.content.services?.items[0]?.id).toMatch(/^service-/);
    expect(next.content.products?.items[0]?.id).toBe("p1");
  });

  it("legacy identity normalization is deterministic and idempotent", () => {
    const raw = baseConfig();
    raw.content.products!.items = [
      { ...raw.content.products!.items[0]!, id: undefined, slug: undefined },
    ];
    raw.content.services!.items = [
      { ...raw.content.services!.items[0]!, id: undefined },
    ];
    raw.content.faq!.items = [{ question: "Q", answer: "A" }];
    raw.content.testimonials = {
      title: "Testimonials",
      items: [{ quote: "Great", author: "A" }],
    };

    const first = normalizeCollectionIdentities(raw);
    const second = normalizeCollectionIdentities(raw);
    expect(second).toEqual(first);
    expect(normalizeCollectionIdentities(first)).toEqual(first);
    expect(first.content.products?.items[0]?.id).toBe(
      second.content.products?.items[0]?.id,
    );
  });

  it("normalizes legacy hero menu to editorial", () => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    const raw = baseConfig();
    raw.content.hero.style = "menu";
    raw.sections[0]!.variant = "menu";
    const next = normalizeLegacyHeroVariant(raw);
    expect(next.content.hero.style).toBe("editorial");
    expect(next.sections[0]?.variant).toBe("editorial");
  });
});

describe("pass 2.1 — variant registry/schema parity", () => {
  it("schema heroStyle options match registry variants exactly", () => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    const def = getSectionDefinition("hero");
    const registryIds = getSectionVariants("hero").map((v) => v.id);
    const schemaIds = def?.schema?.layout?.heroStyle?.options?.map(
      (o) => o.value,
    );
    expect(schemaIds).toEqual(registryIds);
    expect(commandSetSectionVariant(baseConfig(), "hero-1", "menu")?.config.sections[0]?.variant).toBe(
      "editorial",
    );
    expect(
      commandSetSectionVariant(baseConfig(), "hero-1", "split")?.config.content
        .hero.style,
    ).toBe("split");
  });

  it("product cardVariant options match products variants", () => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    const def = getSectionDefinition("products");
    const registryIds = getSectionVariants("products").map((v) => v.id);
    const schemaIds = def?.schema?.style?.cardVariant?.options?.map(
      (o) => o.value,
    );
    expect(schemaIds).toEqual(registryIds);
  });
});

describe("pass 2.1 — responsive columns", () => {
  it("resolves desktop key and inherits correctly", () => {
    const value = { mobile: 2, tablet: 3, desktop: 5 };
    expect(resolveResponsiveValue(value, "desktop").value).toBe(5);
    expect(resolveResponsiveValue(value, "tablet").value).toBe(3);
    expect(resolveResponsiveValue(value, "mobile").value).toBe(2);
    const overridden = setResponsiveOverride(value, "desktop", 4);
    expect(overridden.desktop).toBe(4);
    expect(overridden.base).toBeUndefined();
    expect(resolveResponsiveColumns(value).desktop).toBe(5);
    expect(resolveResponsiveColumns(3).desktop).toBe(3);
  });
});

describe("pass 2.1 — gallery media validation", () => {
  it("rejects invalid gallery ids and reorders products by id", () => {
    expect(commandSetGalleryImages(baseConfig(), ["nope"])).toBeNull();
    const toggled = commandToggleGalleryImage(baseConfig(), "m2");
    expect(toggled?.config.content.gallery?.imageIds).toEqual(["m1", "m2"]);
    const added = commandAddProduct(baseConfig(), { id: "p2", name: "New" });
    const reordered = commandReorderProduct(added!.config, "p2", 0);
    expect(reordered?.config.content.products?.items[0]?.id).toBe("p2");
    const deleted = commandDeleteProduct(reordered!.config, "p2");
    expect(deleted?.config.content.products?.items).toHaveLength(1);
  });
});
