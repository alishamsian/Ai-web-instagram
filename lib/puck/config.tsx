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
import {
  buildStoreSectionContext,
  usePuckWebsiteOptional,
} from "@/lib/puck/website-context";
import { cn } from "@/lib/utils";

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

  // Prefer live section from config (keeps content.* binding) when id matches
  const live =
    ctx.config.sections.find((s) => s.id === section.id) ?? section;
  const merged = {
    ...live,
    visible: section.visible,
    variant: section.variant ?? live.variant,
    settings: section.settings ?? live.settings,
  };

  const storeCtx = buildStoreSectionContext(ctx.config, merged);
  const def = getSectionDefinition(merged.type);
  const label = def?.label[ctx.locale] ?? merged.type;

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
      {renderRegisteredStoreSection(storeCtx)}
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
export function buildPuckConfig(options?: {
  vertical?: string | null;
  locale?: "fa" | "en";
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
