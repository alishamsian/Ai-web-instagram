"use client";

import type { Config, Fields } from "@puckeditor/core";
import type { ComponentConfig } from "@puckeditor/core";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { PuckSectionProps } from "@/lib/puck/types";
import {
  getLibrarySections,
  getSectionDefinition,
  getSectionVariants,
  getSectionSchema,
  ALL_SECTION_DEFINITIONS,
  type SectionDefinition,
} from "@/lib/store/registry";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import { renderRegisteredStoreSection } from "@/components/store/section-renderers";
import { PuckUnsupportedSection } from "@/components/editor/puck/PuckUnsupportedSection";
import { EditorSectionFrame } from "@/components/editor/EditorSectionFrame";
import { useEditorEdit } from "@/components/editor/EditContext";
import {
  buildStoreSectionContext,
  usePuckWebsiteOptional,
} from "@/lib/puck/website-context";
import { cn } from "@/lib/utils";
import { hasSectionRenderer, resolveSectionRenderer } from "@/lib/store/registry";
import { sectionLabel } from "@/components/editor/editor-utils";
import {
  schemaToSettingsObjectFields,
  schemaContentBoundFieldKeys,
} from "@/lib/puck/schema-to-fields";
import { PuckBoundSchemaField } from "@/components/editor/puck/PuckBoundField";
import { sectionPresentationProps } from "@/lib/store/section-presentation";
import { createElement } from "react";
import { createEntityId } from "@/lib/editor/ids";
import { isSchemaFieldActive } from "@/lib/store/registry/element-schema";
import {
  buildMediaExternalField,
  faqArrayFields,
  galleryImageArrayFields,
  permissionsForSectionType,
  testimonialArrayFields,
  trustItemsArrayFields,
  type FaqItemProp,
  type TestimonialItemProp,
} from "@/lib/puck/advanced";
import { buildColumnsComponent } from "@/lib/puck/columns";

/** Content paths handled by native Puck fields (not bound custom). */
const NATIVE_BOUND_SKIP = new Set([
  "content.about.body",
  "content.hero.imageId",
  "content.about.imageId",
  "content.gallery.imageIds",
  "content.faq.items",
  "content.testimonials.items",
  "content.trust.items",
]);

function SectionCanvasPreview(props: PuckSectionProps) {
  const ctx = usePuckWebsiteOptional();
  const edit = useEditorEdit();
  const sectionType = props.sectionType || (props.id?.split("-")[0] as WebsiteSectionType);
  const section = {
    id: props.sectionId || props.id,
    type: sectionType,
    visible: props.visible !== false,
    variant: props.variant?.trim() ? props.variant.trim() : undefined,
    settings:
      props.settings && Object.keys(props.settings).length > 0
        ? props.settings
        : undefined,
  };

  if (!ctx) {
    return (
      <div className="border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Section preview unavailable (missing website context)
      </div>
    );
  }

  // Prefer live WebsiteConfig as source of truth (content + structure).
  const live =
    ctx.config.sections.find((s) => s.id === section.id) ?? section;
  const merged = {
    id: live.id,
    type: live.type,
    visible: live.visible !== false,
    variant: live.variant,
    settings: live.settings,
  };

  const storeCtx = buildStoreSectionContext(ctx.config, merged);
  const def = getSectionDefinition(merged.type);
  const label =
    def?.label[ctx.locale] ??
    sectionLabel(merged.type as never, ctx.locale) ??
    merged.type;
  const hasRenderer =
    hasSectionRenderer(merged.type) ||
    Boolean(resolveSectionRenderer(merged.type, merged.variant));

  const body = (
    <div
      className={cn(
        "relative store-section-present",
        !merged.visible && "opacity-40 grayscale",
      )}
      data-puck-section={merged.id}
      data-section-type={merged.type}
      {...sectionPresentationProps(merged.settings)}
    >
      {!merged.visible ? (
        <div className="pointer-events-none absolute start-3 top-3 z-10 rounded bg-ink/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          Hidden · {label}
        </div>
      ) : null}
      {hasRenderer ? (
        renderRegisteredStoreSection(storeCtx)
      ) : (
        <PuckUnsupportedSection section={merged} locale={ctx.locale} />
      )}
    </div>
  );

  // Classic chrome + inline EditableText when EditorEditProvider is present.
  if (edit?.enabled && edit.mode === "editor") {
    return (
      <EditorSectionFrame
        sectionId={merged.id}
        label={label}
        settings={merged.settings}
      >
        {body}
      </EditorSectionFrame>
    );
  }

  return body;
}

function variantFieldOptions(type: string) {
  const variants = getSectionVariants(type);
  if (!variants.length) return null;
  return [
    { label: "Default", value: "" },
    ...variants.map((v) => ({
      label: v.label.en,
      value: v.id,
    })),
  ];
}

function advancedFieldsForType(
  type: string,
  locale: "fa" | "en",
  getConfig: () => WebsiteConfig,
): Fields {
  const fields: Fields = {};
  if (type === "faq") {
    fields.items = faqArrayFields(locale);
  }
  if (type === "testimonials") {
    fields.items = testimonialArrayFields(locale);
  }
  if (type === "gallery") {
    fields.images = galleryImageArrayFields(locale, getConfig);
  }
  if (type === "trust") {
    fields.trustItems = trustItemsArrayFields(locale);
  }
  if (type === "about") {
    fields.richBody = {
      type: "richtext",
      label: locale === "fa" ? "متن" : "Body",
      contentEditable: true,
      initialHeight: 160,
    };
    fields.imageId = buildMediaExternalField(locale, getConfig);
  }
  if (type === "hero") {
    fields.imageId = buildMediaExternalField(locale, getConfig);
  }
  return fields;
}

function buildComponentConfig(
  def: SectionDefinition,
  locale: "fa" | "en",
  getConfig: () => WebsiteConfig,
): ComponentConfig<PuckSectionProps> {
  const variantOptions = variantFieldOptions(def.type);
  const schema = getSectionSchema(def.type as never) ?? def.schema;
  const settingsFields = schemaToSettingsObjectFields(schema, locale);
  const boundFields = schemaContentBoundFieldKeys(schema).filter(
    (field) => !field.path || !NATIVE_BOUND_SKIP.has(field.path),
  );

  const contentFields: Fields = {};
  for (const field of boundFields) {
    if (field.path === "visible" || field.path === "variant") continue;
    if (field.kind === "media") continue;
    const key = `__bound_${field.key}`;
    contentFields[key] = {
      type: "custom",
      label: field.label?.[locale] ?? field.label?.en ?? field.key,
      render: () =>
        createElement(PuckBoundSchemaField, { field, locale }),
    };
  }

  const advanced = advancedFieldsForType(def.type, locale, getConfig);
  const basePermissions = permissionsForSectionType(def.type);

  return {
    label: locale === "fa" ? def.label.fa : def.label.en,
    defaultProps: {
      id: `${def.type}-new`,
      sectionId: `${def.type}-new`,
      sectionType: def.type as WebsiteSectionType,
      visible: true,
      variant: "",
      settings: {},
      ...(def.type === "faq" ? { items: [] } : {}),
      ...(def.type === "testimonials" ? { items: [] } : {}),
      ...(def.type === "gallery" ? { images: [] } : {}),
      ...(def.type === "trust" ? { trustItems: [] } : {}),
      ...(def.type === "about" ? { richBody: "", imageId: "" } : {}),
      ...(def.type === "hero" ? { imageId: "" } : {}),
    },
    fields: {
      visible: {
        type: "radio",
        label: locale === "fa" ? "نمایش" : "Visibility",
        options: [
          { label: locale === "fa" ? "نمایان" : "Visible", value: true },
          { label: locale === "fa" ? "مخفی" : "Hidden", value: false },
        ],
      },
      ...(variantOptions
        ? {
            variant: {
              type: "select" as const,
              label: locale === "fa" ? "واریانت" : "Variant",
              options: variantOptions,
            },
          }
        : {}),
      ...(Object.keys(settingsFields).length > 0
        ? {
            settings: {
              type: "object" as const,
              label: locale === "fa" ? "تنظیمات ظاهری" : "Appearance",
              objectFields: settingsFields,
            },
          }
        : {}),
      ...advanced,
      ...contentFields,
    },
    resolveFields: async (
      data: { props: PuckSectionProps },
      { fields }: { fields: Fields },
    ) => {
      const next = { ...fields } as Fields;
      delete next.sectionId;
      delete next.sectionType;

      const props = data.props ?? ({} as PuckSectionProps);
      const values: Record<string, unknown> = {
        variant: props.variant ?? "",
        visible: props.visible !== false,
        ...(props.settings ?? {}),
      };

      // Hide bound fields whose dependsOn is inactive
      for (const field of boundFields) {
        if (!isSchemaFieldActive(field, values)) {
          delete next[`__bound_${field.key}`];
        }
      }

      // Variant-aware: overlay controls only for overlay hero
      if (def.type === "hero") {
        const variant = String(props.variant || "").trim();
        if (variant && variant !== "overlay" && next.settings?.type === "object") {
          const settingsField = next.settings;
          const objectFields = {
            ...(settingsField.objectFields ?? {}),
          };
          delete objectFields.overlay;
          next.settings = {
            ...settingsField,
            type: "object",
            objectFields,
          };
        }
      }

      return next;
    },
    resolveData: async ({ props }: { props: PuckSectionProps }) => {
      const next: Record<string, unknown> = {
        ...props,
        sectionType: def.type as WebsiteSectionType,
        sectionId: props.sectionId || props.id,
      };

      if (def.type === "faq" && Array.isArray((props as { items?: unknown }).items)) {
        next.items = (
          (props as unknown as { items: FaqItemProp[] }).items
        ).map((item) => ({
          ...item,
          id: item.id || createEntityId("faq"),
        }));
      }
      if (
        def.type === "testimonials" &&
        Array.isArray((props as { items?: unknown }).items)
      ) {
        next.items = (
          (props as unknown as { items: TestimonialItemProp[] }).items
        ).map((item) => ({
          ...item,
          id: item.id || createEntityId("tst"),
        }));
      }

      return { props: next as unknown as PuckSectionProps };
    },
    resolvePermissions: basePermissions
      ? async () => basePermissions
      : undefined,
    render: (props: PuckSectionProps) => <SectionCanvasPreview {...props} />,
  } as unknown as ComponentConfig<PuckSectionProps>;
}

function buildUnsupportedComponentConfig(
  type: string,
): ComponentConfig<PuckSectionProps> {
  return {
    label: `Unsupported: ${type}`,
    defaultProps: {
      id: `${type}-unknown`,
      sectionId: `${type}-unknown`,
      sectionType: type as WebsiteSectionType,
      visible: true,
      variant: "",
      settings: {},
    },
    fields: {
      sectionId: { type: "text", label: "Section ID" },
      sectionType: { type: "text", label: "Type" },
      visible: {
        type: "select",
        label: "Visibility",
        options: [
          { label: "Visible", value: true },
          { label: "Hidden", value: false },
        ],
      },
    },
    render: (props: PuckSectionProps) => <SectionCanvasPreview {...props} />,
  } as unknown as ComponentConfig<PuckSectionProps>;
}

export type VitrinPuckConfig = Config;

/**
 * Build Puck Config from the existing Section Registry.
 * Does not invent sections — registry is the source of truth.
 */
export function buildPuckConfig(options?: {
  vertical?: string | null;
  locale?: "fa" | "en";
  /** Extra section types present in WebsiteConfig but missing from registry. */
  extraSectionTypes?: string[];
  /** Live WebsiteConfig reader for media external fields. */
  getWebsiteConfig?: () => WebsiteConfig;
}): VitrinPuckConfig {
  const locale = options?.locale ?? "en";
  const getConfig =
    options?.getWebsiteConfig ??
    (() =>
      ({
        media: {},
        content: { hero: { style: "minimal", headline: "", subheadline: "", cta: "" } },
        brand: { name: "", colors: {} },
        sections: [],
        seo: { title: "", description: "", keywords: [] },
        settings: { language: "fa", direction: "rtl", showBranding: true, published: false },
        template: "store",
      }) as unknown as WebsiteConfig);

  const defs =
    options?.vertical != null && options.vertical !== ""
      ? getLibrarySections() /* filtered further below */
      : ALL_SECTION_DEFINITIONS.length
        ? ALL_SECTION_DEFINITIONS
        : getLibrarySections();

  // Prefer full catalog so round-trip never drops vertical sections mid-edit
  const allDefs =
    defs.length >= ALL_SECTION_DEFINITIONS.length
      ? defs
      : ALL_SECTION_DEFINITIONS;

  const components: Record<string, ComponentConfig> = {};
  for (const def of allDefs) {
    if (def.type === "columns") continue;
    components[def.type] = buildComponentConfig(
      def,
      locale,
      getConfig,
    ) as ComponentConfig;
  }

  components.columns = buildColumnsComponent(locale);

  for (const type of options?.extraSectionTypes ?? []) {
    if (!type || components[type]) continue;
    if (type === "columns") {
      components.columns = buildColumnsComponent(locale);
      continue;
    }
    components[type] = buildUnsupportedComponentConfig(type) as ComponentConfig;
  }

  const categories: NonNullable<Config["categories"]> = {};
  for (const cat of SECTION_CATEGORIES) {
    const types = allDefs
      .filter((d) => d.category === cat.id && d.library !== false)
      .map((d) => d.type);
    if (cat.id === "content" && !types.includes("columns")) {
      types.push("columns");
    }
    if (!types.length) continue;
    categories[cat.id] = {
      title: locale === "fa" ? cat.fa : cat.en,
      components: types,
      defaultExpanded: cat.id === "featured" || cat.id === "commerce",
    };
  }

  return {
    components,
    categories,
    root: {
      label: locale === "fa" ? "سایت" : "Site",
      fields: {
        brand: {
          type: "object",
          label: locale === "fa" ? "برند" : "Brand",
          objectFields: {
            name: {
              type: "text",
              label: locale === "fa" ? "نام" : "Name",
              contentEditable: true,
            },
            tagline: {
              type: "text",
              label: locale === "fa" ? "شعار" : "Tagline",
              contentEditable: true,
            },
          },
        },
        seo: {
          type: "object",
          label: "SEO",
          objectFields: {
            title: {
              type: "text",
              label: locale === "fa" ? "عنوان" : "Title",
            },
            description: {
              type: "textarea",
              label: locale === "fa" ? "توضیحات" : "Description",
            },
          },
        },
      },
    },
  };
}
