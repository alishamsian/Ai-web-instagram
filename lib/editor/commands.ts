import type {
  SectionConfig,
  TemplateType,
  WebsiteConfig,
  WebsiteSectionType,
} from "@/types/website";
import type { ContactInfo } from "@/types/ai";
import { cloneWebsiteConfig, type EditorCommandResult } from "@/lib/editor/types";
import {
  getSectionVariants,
  hasSection,
} from "@/lib/store/registry/catalog";
import {
  getDefaultVariant,
  isVariantSupported,
  resolveSectionVariant,
} from "@/lib/store/registry/variant-api";
import {
  addOrShowSection,
  applyTemplate,
} from "@/components/editor/editor-utils";
import {
  applySchemaFieldUpdate,
  type ElementFieldSchema,
} from "@/lib/store/registry/element-schema";
import { applyDesignPreset, type DesignPresetId } from "@/components/editor/editor-presets";
import {
  EDITOR_FIELD_CONTENT_PATH,
  normalizeEditorHref,
} from "@/lib/editor/links";
import { createEntityId } from "@/lib/editor/ids";

/** Keep footer sections pinned to the end after any reorder/move. */
export function pinFooterLast(sections: SectionConfig[]): SectionConfig[] {
  const footers = sections.filter((s) => s.type === "footer");
  if (footers.length === 0) return sections;
  const rest = sections.filter((s) => s.type !== "footer");
  return [...rest, ...footers];
}

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
  if (section.type === "footer") return null;
  const copy = {
    ...cloneWebsiteConfig({ ...config, sections: [section] }).sections[0]!,
    id: createEntityId(section.type),
  };
  const sections = [...config.sections];
  sections.splice(index + 1, 0, copy);
  return {
    config: { ...config, sections: pinFooterLast(sections) },
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
  const section = config.sections[index];
  if (!section || section.type === "footer") return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= config.sections.length) return null;
  // Don't swap past/into the final footer slot in a way that leaves footer mid-page
  if (config.sections[target]?.type === "footer" && direction === "down") {
    return null;
  }
  const sections = [...config.sections];
  const [item] = sections.splice(index, 1);
  sections.splice(target, 0, item!);
  return {
    config: { ...config, sections: pinFooterLast(sections) },
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
  if (config.sections[fromIndex]?.type === "footer") return null;
  const sections = [...config.sections];
  const [item] = sections.splice(fromIndex, 1);
  sections.splice(toIndex, 0, item!);
  return {
    config: { ...config, sections: pinFooterLast(sections) },
    label: `Reorder ${item!.type}`,
  };
}

/** Canvas drag: place `fromId` before/after `toId` using existing section order. */
export function commandReorderSectionRelative(
  config: WebsiteConfig,
  fromId: string,
  toId: string,
  place: "before" | "after",
): EditorCommandResult | null {
  if (fromId === toId) return null;
  const fromSection = config.sections.find((s) => s.id === fromId);
  if (!fromSection || fromSection.type === "footer") return null;
  const sections = [...config.sections];
  const fromIndex = sections.findIndex((s) => s.id === fromId);
  if (fromIndex < 0) return null;
  const [item] = sections.splice(fromIndex, 1);
  if (!item) return null;
  let insertAt = sections.findIndex((s) => s.id === toId);
  if (insertAt < 0) return null;
  if (place === "after") insertAt += 1;
  sections.splice(insertAt, 0, item);
  return {
    config: { ...config, sections: pinFooterLast(sections) },
    label: `Reorder ${item.type}`,
    selectedSectionId: fromId,
  };
}

export function commandAddSection(
  config: WebsiteConfig,
  type: WebsiteSectionType,
  options?: { afterSectionId?: string | null; variant?: string },
): EditorCommandResult | null {
  if (!hasSection(type)) return null;
  const requested = options?.variant;
  if (requested && !isVariantSupported(type, requested)) return null;

  const existed = config.sections.some((s) => s.type === type);
  const next = addOrShowSection(config, type, options);
  const added = next.sections.find((s) => s.type === type && s.visible);
  if (!existed && added) {
    const resolved = resolveSectionVariant(
      type,
      requested ?? added.variant ?? defaultVariantForType(type),
    );
    if (resolved.id && added.variant !== resolved.id) {
      const withVariant = commandSetSectionVariant(next, added.id, resolved.id);
      if (withVariant) {
        return {
          ...withVariant,
          label: `Add ${type}`,
          selectedSectionId: added.id,
        };
      }
    }
  }
  return {
    config: next,
    label: `Add ${type}`,
    selectedSectionId: added?.id ?? null,
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

export function commandSetBrandTypography(
  config: WebsiteConfig,
  patch: Partial<WebsiteConfig["brand"]["typography"]>,
): EditorCommandResult {
  return {
    config: {
      ...config,
      brand: {
        ...config.brand,
        typography: { ...config.brand.typography, ...patch },
      },
    },
    label: "Change typography",
  };
}

export function commandSetBrandDesign(
  config: WebsiteConfig,
  patch: Partial<NonNullable<WebsiteConfig["brand"]["design"]>>,
): EditorCommandResult {
  return {
    config: {
      ...config,
      brand: {
        ...config.brand,
        design: { ...(config.brand.design ?? {}), ...patch },
      },
    },
    label: "Change design",
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

export function commandApplyTemplate(
  config: WebsiteConfig,
  templateId: TemplateType,
): EditorCommandResult {
  return {
    config: applyTemplate(config, templateId),
    label: `Apply template ${templateId}`,
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
    "content.hero.ctaHref",
    "content.hero.style",
    "content.hero.imageId",
    "content.hero.eyebrow",
    "content.about.title",
    "content.about.body",
    "content.about.imageId",
    "content.products.title",
    "content.products.description",
    "content.services.title",
    "content.gallery.title",
    "content.faq.title",
    "content.contact.title",
    "content.contact.body",
    "content.testimonials.title",
    "content.promo.kicker",
    "content.promo.title",
    "content.promo.cta",
    "content.promo.ctaHref",
    "content.trust.title",
    "brand.name",
    "brand.tagline",
    "seo.title",
    "seo.description",
  ]);
  // Allow EditorFieldPath aliases
  const resolved = EDITOR_FIELD_CONTENT_PATH[path] ?? path;
  if (!allowed.has(resolved)) return null;

  let writeValue: string = value;
  if (resolved.endsWith("Href") || resolved.endsWith(".website")) {
    const normalized = normalizeEditorHref(value);
    if (value.trim() && !normalized.ok) return null;
    writeValue = normalized.ok ? normalized.href : "";
  }

  const next = cloneWebsiteConfig(config) as unknown as Record<string, unknown>;
  const parts = resolved.split(".");
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
  cursor[parts[parts.length - 1]!] = writeValue;
  return {
    config: next as unknown as WebsiteConfig,
    label: `Edit ${resolved}`,
  };
}

export function readContentPath(
  config: WebsiteConfig,
  path: string,
): unknown {
  const resolved = EDITOR_FIELD_CONTENT_PATH[path] ?? path;
  const parts = resolved.split(".");
  let cursor: unknown = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

const MEDIA_PATHS = new Set([
  "content.hero.imageId",
  "content.about.imageId",
]);

/** Assign or clear an imported media id on an allowlisted path. */
export function commandAssignMedia(
  config: WebsiteConfig,
  path: string,
  mediaId: string | null,
): EditorCommandResult | null {
  if (!MEDIA_PATHS.has(path)) return null;
  if (mediaId != null && !config.media[mediaId]) return null;

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
  const leaf = parts[parts.length - 1]!;
  if (mediaId == null) {
    delete cursor[leaf];
  } else {
    cursor[leaf] = mediaId;
  }
  return {
    config: next as unknown as WebsiteConfig,
    label: mediaId ? `Assign media ${mediaId}` : `Clear media ${path}`,
  };
}

/** Change section visual variant using registered variants only. */
export function commandSetSectionVariant(
  config: WebsiteConfig,
  sectionId: string,
  variantId: string,
): EditorCommandResult | null {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  if (!isVariantSupported(section.type, variantId)) return null;

  const resolved = resolveSectionVariant(section.type, variantId);
  if (!resolved.id) return null;
  const canonicalId = resolved.id;

  let next: WebsiteConfig = {
    ...config,
    sections: config.sections.map((s) =>
      s.id === sectionId ? { ...s, variant: canonicalId } : s,
    ),
  };

  // Keep hero.style in sync when variant matches a known hero style.
  // Source of truth: registry variants for hero (fan/overlay/editorial/split/minimal).
  if (section.type === "hero") {
    const styles = new Set(
      getSectionVariants("hero").map((variant) => variant.id),
    );
    if (styles.has(canonicalId)) {
      const synced = commandSetContentPath(
        next,
        "content.hero.style",
        canonicalId,
      );
      if (synced) next = synced.config;
    }
  }

  return {
    config: next,
    label: `Variant ${section.type}.${canonicalId}`,
    selectedSectionId: sectionId,
  };
}

const CONTACT_LINK_KEYS = new Set<keyof ContactInfo>([
  "website",
  "instagram",
  "telegram",
  "whatsapp",
]);

export function commandSetContactInfo(
  config: WebsiteConfig,
  key: keyof ContactInfo,
  value: string | null,
): EditorCommandResult | null {
  if (!config.content.contact) return null;
  let nextValue = value?.trim() || null;
  if (nextValue && CONTACT_LINK_KEYS.has(key)) {
    if (key === "whatsapp" || key === "instagram" || key === "telegram") {
      // allow @handles and numbers without forcing full URL
      if (key === "whatsapp" && /^[\d+\s()-]+$/.test(nextValue)) {
        nextValue = nextValue.replace(/\s+/g, "");
      } else if (!nextValue.startsWith("@") && !nextValue.includes("://")) {
        const normalized = normalizeEditorHref(nextValue);
        if (normalized.ok) nextValue = normalized.href;
      }
    } else {
      const normalized = normalizeEditorHref(nextValue);
      if (!normalized.ok) return null;
      nextValue = normalized.href;
    }
  }
  if (key === "email" && nextValue && !nextValue.includes("@")) return null;
  if (key === "phone" && nextValue) {
    nextValue = nextValue.trim();
  }

  return {
    config: {
      ...config,
      content: {
        ...config.content,
        contact: {
          ...config.content.contact,
          info: {
            ...config.content.contact.info,
            [key]: nextValue,
          },
        },
      },
    },
    label: `Edit contact.${key}`,
  };
}

/** Patch allowlisted section settings (productSource, columns, chrome layout, etc.). */
export function commandPatchSectionSettings(
  config: WebsiteConfig,
  sectionId: string,
  patch: Record<string, unknown>,
): EditorCommandResult | null {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  return {
    config: {
      ...config,
      sections: config.sections.map((s) =>
        s.id === sectionId
          ? { ...s, settings: { ...(s.settings ?? {}), ...patch } }
          : s,
      ),
    },
    label: `Update ${section.type} settings`,
    selectedSectionId: sectionId,
  };
}

/** Assign brand logo from an imported media asset (stores resolved URL). */
export function commandSetBrandLogo(
  config: WebsiteConfig,
  mediaId: string | null,
): EditorCommandResult | null {
  if (mediaId != null && !config.media[mediaId]) return null;
  return {
    config: {
      ...config,
      brand: {
        ...config.brand,
        logo: mediaId ? config.media[mediaId]!.url : undefined,
      },
    },
    label: mediaId ? `Set brand logo` : "Clear brand logo",
  };
}

export function commandSetBrandColors(
  config: WebsiteConfig,
  colors: WebsiteConfig["brand"]["colors"],
): EditorCommandResult {
  return {
    config: {
      ...config,
      brand: { ...config.brand, colors: { ...colors } },
    },
    label: "Change brand colors",
  };
}

export function commandSetSeoKeywords(
  config: WebsiteConfig,
  keywords: string[],
): EditorCommandResult {
  return {
    config: {
      ...config,
      seo: {
        ...config.seo,
        keywords: keywords.map((k) => k.trim()).filter(Boolean).slice(0, 40),
      },
    },
    label: "Edit SEO keywords",
  };
}

export function commandUpdateSiteSettings(
  config: WebsiteConfig,
  patch: Partial<WebsiteConfig["settings"]>,
): EditorCommandResult {
  const next = { ...config.settings, ...patch };
  if (patch.language === "fa") next.direction = patch.direction ?? "rtl";
  if (patch.language === "en") next.direction = patch.direction ?? "ltr";
  return {
    config: { ...config, settings: next },
    label: "Update site settings",
  };
}

/** Default variant from registry when inserting a new section. */
export function defaultVariantForType(
  type: WebsiteSectionType,
): string | undefined {
  return getDefaultVariant(type)?.id;
}
