import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import { cloneWebsiteConfig, type EditorCommandResult } from "@/lib/editor/types";
import { hasSection } from "@/lib/store/registry/catalog";
import { addOrShowSection } from "@/components/editor/editor-utils";
import {
  applySchemaFieldUpdate,
  type ElementFieldSchema,
} from "@/lib/store/registry/element-schema";
import { applyDesignPreset, type DesignPresetId } from "@/components/editor/editor-presets";

export function commandToggleSection(
  config: WebsiteConfig,
  sectionId: string,
): EditorCommandResult | null {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const next = {
    ...config,
    sections: config.sections.map((s) =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s,
    ),
  };
  return {
    config: next,
    label: section.visible ? `Hide ${section.type}` : `Show ${section.type}`,
  };
}

export function commandDeleteSection(
  config: WebsiteConfig,
  sectionId: string,
): EditorCommandResult | null {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  if (section.type === "footer") return null;
  return {
    config: {
      ...config,
      sections: config.sections.filter((s) => s.id !== sectionId),
    },
    label: `Delete ${section.type}`,
    selectedSectionId: null,
  };
}

export function commandDuplicateSection(
  config: WebsiteConfig,
  sectionId: string,
): EditorCommandResult | null {
  const index = config.sections.findIndex((s) => s.id === sectionId);
  const section = config.sections[index];
  if (!section) return null;
  const copy = {
    ...cloneWebsiteConfig({ ...config, sections: [section] }).sections[0]!,
    id: `${section.type}-${Date.now().toString(36)}`,
  };
  const sections = [...config.sections];
  sections.splice(index + 1, 0, copy);
  return {
    config: { ...config, sections },
    label: `Duplicate ${section.type}`,
    selectedSectionId: copy.id,
  };
}

export function commandMoveSection(
  config: WebsiteConfig,
  sectionId: string,
  direction: "up" | "down",
): EditorCommandResult | null {
  const index = config.sections.findIndex((s) => s.id === sectionId);
  if (index < 0) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= config.sections.length) return null;
  const sections = [...config.sections];
  const [item] = sections.splice(index, 1);
  sections.splice(target, 0, item!);
  return {
    config: { ...config, sections },
    label: `Move ${item!.type} ${direction}`,
  };
}

export function commandReorderSections(
  config: WebsiteConfig,
  fromIndex: number,
  toIndex: number,
): EditorCommandResult | null {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= config.sections.length ||
    toIndex >= config.sections.length ||
    fromIndex === toIndex
  ) {
    return null;
  }
  const sections = [...config.sections];
  const [item] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, item!);
  return {
    config: { ...config, sections },
    label: `Reorder ${item!.type}`,
  };
}

export function commandAddSection(
  config: WebsiteConfig,
  type: WebsiteSectionType,
): EditorCommandResult | null {
  if (!hasSection(type)) return null;
  const next = addOrShowSection(config, type);
  return {
    config: next,
    label: `Add ${type}`,
  };
}

export function commandSetSchemaValue(params: {
  config: WebsiteConfig;
  sectionId: string;
  field: ElementFieldSchema;
  value: unknown;
}): EditorCommandResult | null {
  const section = params.config.sections.find((s) => s.id === params.sectionId);
  if (!section) return null;
  const result = applySchemaFieldUpdate({
    config: params.config,
    sectionId: params.sectionId,
    field: params.field,
    value: params.value,
  });
  if ("error" in result) return null;
  return {
    config: result.config,
    label: `Edit ${section.type}.${params.field.key}`,
  };
}

export function commandSetBrandColor(
  config: WebsiteConfig,
  key: keyof WebsiteConfig["brand"]["colors"],
  value: string,
): EditorCommandResult {
  return {
    config: {
      ...config,
      brand: {
        ...config.brand,
        colors: { ...config.brand.colors, [key]: value },
      },
    },
    label: `Change brand.${key}`,
  };
}

export function commandApplyThemePreset(
  config: WebsiteConfig,
  presetId: DesignPresetId,
): EditorCommandResult {
  return {
    config: applyDesignPreset(config, presetId),
    label: `Apply theme ${presetId}`,
  };
}

export function commandSetSeoField(
  config: WebsiteConfig,
  field: "title" | "description",
  value: string,
): EditorCommandResult {
  const cleaned = value.trim().slice(0, field === "title" ? 70 : 160);
  return {
    config: {
      ...config,
      seo: { ...config.seo, [field]: cleaned },
    },
    label: `Edit SEO ${field}`,
  };
}

/** Safe path write for allowlisted content paths only (inline edit bridge). */
export function commandSetContentPath(
  config: WebsiteConfig,
  path: string,
  value: string,
): EditorCommandResult | null {
  const allowed = new Set([
    "content.hero.headline",
    "content.hero.subheadline",
    "content.hero.cta",
    "content.about.title",
    "content.about.body",
    "content.products.title",
    "brand.name",
    "brand.tagline",
    "seo.title",
    "seo.description",
  ]);
  if (!allowed.has(path)) return null;

  const next = cloneWebsiteConfig(config) as unknown as Record<string, unknown>;
  const parts = path.split(".");
  let cursor: Record<string, unknown> = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const child = cursor[key];
    if (!child || typeof child !== "object" || Array.isArray(child)) {
      cursor[key] = {};
    } else {
      cursor[key] = { ...(child as Record<string, unknown>) };
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
  return {
    config: next as unknown as WebsiteConfig,
    label: `Edit ${path}`,
  };
}

export function readContentPath(
  config: WebsiteConfig,
  path: string,
): unknown {
  const parts = path.split(".");
  let cursor: unknown = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}
