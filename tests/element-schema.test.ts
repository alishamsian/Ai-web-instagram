import { describe, expect, it, beforeEach } from "vitest";
import {
  validateSectionSchema,
  validateSectionDefinition,
  validateElementField,
  validateFieldValue,
  getSchemaValue,
  setSchemaValue,
  applySchemaFieldUpdate,
  resolveFieldDefault,
  isKnownToken,
  isSchemaFieldActive,
  flattenElementFields,
  TOKEN_CATALOG,
} from "@/lib/store/registry/element-schema";
import {
  getSectionSchema,
  getSectionDefinition,
  resetRegistryForTests,
  registerSections,
} from "@/lib/store/registry/catalog";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { normalizeStoreSections } from "@/lib/store/registry/normalize";
import { schemaToLegacyInspectorFields } from "@/lib/store/registry/schema-adapter";
import type { ElementSchema } from "@/lib/store/registry/element-schema";
import type { SectionConfig, WebsiteConfig } from "@/types/website";

function baseConfig(sections: SectionConfig[]): WebsiteConfig {
  return {
    template: "store",
    brand: {
      name: "Demo",
      colors: {
        primary: "#111",
        secondary: "#fff",
        accent: "#333",
        background: "#fff",
        foreground: "#111",
        muted: "#eee",
      },
      typography: { heading: "serif", body: "sans", scale: "editorial" },
    },
    content: {
      hero: {
        style: "overlay",
        headline: "Hello",
        subheadline: "World",
        cta: "Shop",
      },
      products: { title: "Products", items: [] },
    },
    sections,
    seo: { title: "", description: "", keywords: [] },
    settings: {
      language: "en",
      direction: "ltr",
      showBranding: true,
      published: false,
    },
    media: {},
  };
}

describe("element schema validation", () => {
  it("accepts a valid field", () => {
    const issues = validateElementField({
      key: "title",
      kind: "text",
      path: "content.hero.headline",
      token: "typography.h1",
    });
    expect(issues).toEqual([]);
  });

  it("rejects invalid kind", () => {
    const issues = validateElementField({
      key: "x",
      kind: "css" as never,
      path: "settings.x",
    });
    expect(issues.some((i) => i.code === "FIELD_KIND")).toBe(true);
  });

  it("rejects duplicate keys and invalid tokens/options", () => {
    const schema: ElementSchema = {
      content: {
        a: { key: "dup", kind: "text", path: "settings.a" },
      },
      layout: {
        b: { key: "dup", kind: "text", path: "settings.b" },
        badToken: {
          key: "badToken",
          kind: "color",
          path: "settings.c",
          token: "color.notARealToken",
        },
        sel: {
          key: "sel",
          kind: "select",
          path: "settings.d",
          options: [{ value: "a", label: { fa: "ا", en: "A" } }],
          defaultValue: "z",
        },
      },
    };
    const result = validateSectionSchema(schema);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "DUP_KEY")).toBe(true);
    expect(result.issues.some((i) => i.code === "FIELD_TOKEN")).toBe(true);
    expect(result.issues.some((i) => i.code === "FIELD_DEFAULT_OPTION")).toBe(
      true,
    );
  });

  it("validates number range and responsive breakpoints", () => {
    expect(
      validateFieldValue(
        { key: "n", kind: "number", min: 2, max: 5, path: "settings.n" },
        9,
      ).ok,
    ).toBe(false);

    expect(
      validateFieldValue(
        {
          key: "cols",
          kind: "number",
          responsive: true,
          path: "settings.columns",
        },
        { mobile: 2, weird: 3 },
      ).issues.some((i) => i.code === "RESPONSIVE"),
    ).toBe(true);

    expect(isKnownToken("color.surface")).toBe(true);
    expect(TOKEN_CATALOG["radius.md"]).toBeTruthy();
  });

  it("rejects raw css paths", () => {
    const issues = validateElementField({
      key: "hack",
      kind: "text",
      path: "css.marginLeft",
    });
    expect(issues.some((i) => i.code === "FIELD_PATH")).toBe(true);
  });
});

describe("element schema path + defaults", () => {
  it("reads and writes without mutating inputs", () => {
    const section: SectionConfig = {
      id: "p1",
      type: "products",
      visible: true,
      settings: { columns: 3 },
    };
    const config = baseConfig([section]);
    const field = {
      key: "columns",
      kind: "number" as const,
      path: "settings.columns",
      defaultValue: 4,
    };
    expect(getSchemaValue({ section, field })).toBe(3);

    const next = setSchemaValue({ section, field, value: 5, config });
    expect(section.settings?.columns).toBe(3);
    expect(next.section.settings?.columns).toBe(5);
    expect(config.content.hero.headline).toBe("Hello");

    const titleField = {
      key: "title",
      kind: "text" as const,
      path: "content.hero.headline",
    };
    const titled = setSchemaValue({
      section,
      field: titleField,
      value: "New",
      config,
    });
    expect(config.content.hero.headline).toBe("Hello");
    expect(titled.config?.content.hero.headline).toBe("New");
  });

  it("defaults are runtime fallbacks only", () => {
    const field = {
      key: "gap",
      kind: "spacing" as const,
      path: "settings.gap",
      token: "spacing.card",
      defaultValue: "spacing.card",
    };
    const section: SectionConfig = {
      id: "g",
      type: "gallery",
      visible: true,
    };
    expect(getSchemaValue({ section, field })).toBe("spacing.card");
    expect(resolveFieldDefault(field)).toBe("spacing.card");
    expect(section.settings).toBeUndefined();
  });
});

describe("applySchemaFieldUpdate + inspector path", () => {
  it("writes nested values immutably and rejects invalid values", () => {
    const section: SectionConfig = {
      id: "h1",
      type: "hero",
      visible: true,
      settings: {},
    };
    const config = baseConfig([section]);
    const before = structuredClone(config);
    const field = {
      key: "title",
      kind: "text" as const,
      path: "content.hero.headline",
    };
    const ok = applySchemaFieldUpdate({
      config,
      sectionId: "h1",
      field,
      value: "Updated",
    });
    expect(config).toEqual(before);
    expect("config" in ok && ok.config.content.hero.headline).toBe("Updated");
    expect("config" in ok && ok.config).not.toBe(config);

    const bad = applySchemaFieldUpdate({
      config,
      sectionId: "h1",
      field: {
        key: "columns",
        kind: "number",
        path: "settings.columns",
        min: 1,
        max: 6,
        responsive: true,
      },
      value: { mobile: 2, tablet: 4, desktop: 8 },
    });
    expect("error" in bad).toBe(true);
  });

  it("validates each responsive breakpoint against min/max", () => {
    const field = {
      key: "columns",
      kind: "number" as const,
      path: "settings.columns",
      min: 1,
      max: 6,
      responsive: true,
    };
    expect(
      validateFieldValue(field, { mobile: 2, tablet: 4, desktop: 6 }).ok,
    ).toBe(true);
    expect(
      validateFieldValue(field, { mobile: 2, tablet: 4, desktop: 8 }).ok,
    ).toBe(false);
  });

  it("maps schema fields to legacy inspector metadata", () => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
    const fields = schemaToLegacyInspectorFields(getSectionSchema("hero"));
    expect(fields.some((f) => f.key === "title" && f.path?.includes("hero"))).toBe(
      true,
    );
  });
});

describe("registry schema ownership", () => {
  beforeEach(() => {
    resetRegistryForTests(CORE_SECTION_DEFINITIONS);
  });

  it("exposes schemas for hero, products, gallery", () => {
    const hero = getSectionSchema("hero");
    const products = getSectionSchema("products");
    const gallery = getSectionSchema("gallery");
    expect(hero?.content?.title?.path).toBe("content.hero.headline");
    expect(products?.data?.source?.kind).toBe("dataSource");
    expect(products?.layout?.columns?.responsive).toBe(true);
    expect(gallery?.media?.aspectRatio?.token).toBe("imageAspect.portrait");
    expect(getSectionDefinition("hero")?.schema).toBe(hero);
    expect(validateSectionSchema(hero).ok).toBe(true);
    expect(validateSectionSchema(products).ok).toBe(true);
    expect(validateSectionSchema(gallery).ok).toBe(true);
  });

  it("rejects invalid definitions at registry boundary", () => {
    const bad = {
      type: "hero" as const,
      label: { fa: "بد", en: "Bad" },
      category: "hero" as const,
      schema: {
        content: {
          hack: {
            key: "hack",
            kind: "css" as never,
            path: "settings.x",
          },
        },
      },
    };
    expect(validateSectionDefinition(bad).ok).toBe(false);
    const before = getSectionDefinition("hero");
    registerSections([bad as never]);
    expect(getSectionDefinition("hero")).toBe(before);
  });

  it("unknown section schema is undefined and adapter is empty", () => {
    expect(getSectionSchema("shopByConcern" as never)).toBeUndefined();
    expect(schemaToLegacyInspectorFields(undefined)).toEqual([]);
    expect(
      flattenElementFields(getSectionSchema("hero")!).some(
        (f) => f.key === "title",
      ),
    ).toBe(true);
  });

  it("normalization still does not mutate legacy configs", () => {
    const config = baseConfig([
      { id: "h", type: "hero", visible: true },
      { id: "p", type: "products", visible: true },
    ]);
    const before = structuredClone(config.sections);
    normalizeStoreSections(config);
    expect(config.sections).toEqual(before);
  });

  it("hides dependent fields without deleting stored values", () => {
    const button = {
      key: "buttonLabel",
      kind: "text" as const,
      path: "settings.buttonLabel",
      dependsOn: "showButton",
    };
    expect(isSchemaFieldActive(button, { showButton: false })).toBe(false);
    expect(isSchemaFieldActive(button, { showButton: true })).toBe(true);
  });
});
