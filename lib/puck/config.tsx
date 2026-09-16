"use client";

import type { Config } from "@puckeditor/core";
import type { ComponentConfig } from "@puckeditor/core";
import type { WebsiteSectionType } from "@/types/website";
import type { PuckSectionProps } from "@/lib/puck/types";
import {
  getLibrarySections,
  getSectionDefinition,
  getSectionVariants,
  ALL_SECTION_DEFINITIONS,
  type SectionDefinition,
} from "@/lib/store/registry";
import { SECTION_CATEGORIES } from "@/lib/store/registry/categories";
import { renderRegisteredStoreSection } from "@/components/store/section-renderers";
import { PuckUnsupportedSection } from "@/components/editor/puck/PuckUnsupportedSection";
import {
  buildStoreSectionContext,
  usePuckWebsiteOptional,
} from "@/lib/puck/website-context";
import { cn } from "@/lib/utils";
import { hasSectionRenderer, resolveSectionRenderer } from "@/lib/store/registry";

function SectionCanvasPreview(props: PuckSectionProps) {
  const ctx = usePuckWebsiteOptional();
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
  const label = def?.label[ctx.locale] ?? merged.type;
  const hasRenderer =
    hasSectionRenderer(merged.type) ||
    Boolean(resolveSectionRenderer(merged.type, merged.variant));

  return (
    <div
      className={cn(
        "relative",
        !merged.visible && "opacity-40 grayscale",
      )}
      data-puck-section={merged.id}
      data-section-type={merged.type}
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

function buildComponentConfig(
  def: SectionDefinition,
): ComponentConfig<PuckSectionProps> {
  const variantOptions = variantFieldOptions(def.type);
  return {
    label: def.label.en,
    defaultProps: {
      id: `${def.type}-new`,
      sectionId: `${def.type}-new`,
      sectionType: def.type as WebsiteSectionType,
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
      ...(variantOptions
        ? {
            variant: {
              type: "select" as const,
              label: "Variant",
              options: variantOptions,
            },
          }
        : {}),
      // Settings bag is preserved by the adapter; rich inspector lands in Phase 2.
    },
    resolveData: async ({ props }: { props: PuckSectionProps }) => ({
      props: {
        ...props,
        sectionType: def.type as WebsiteSectionType,
        sectionId: props.sectionId || props.id,
      },
    }),
    render: (props: PuckSectionProps) => <SectionCanvasPreview {...props} />,
  } as unknown as ComponentConfig<PuckSectionProps>;
}

export type VitrinPuckConfig = Config;

/**
 * Build Puck Config from the existing Section Registry.
 * Does not invent sections — registry is the source of truth.
 */
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

export function buildPuckConfig(options?: {
  vertical?: string | null;
  locale?: "fa" | "en";
  /** Extra section types present in WebsiteConfig but missing from registry. */
  extraSectionTypes?: string[];
}): VitrinPuckConfig {
  const locale = options?.locale ?? "en";
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
    components[def.type] = buildComponentConfig(def) as ComponentConfig;
  }

  for (const type of options?.extraSectionTypes ?? []) {
    if (!type || components[type]) continue;
    components[type] = buildUnsupportedComponentConfig(type) as ComponentConfig;
  }

  const categories: NonNullable<Config["categories"]> = {};
  for (const cat of SECTION_CATEGORIES) {
    const types = allDefs
      .filter((d) => d.category === cat.id && d.library !== false)
      .map((d) => d.type);
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
      label: "Site",
      fields: {
        adapterVersion: {
          type: "text",
          label: "Adapter version",
        },
      },
    },
  };
}
