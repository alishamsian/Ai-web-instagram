/**
 * Pure WebsiteConfig ↔ Puck Data adapter.
 * Lossless for: sections (id/type/visible/variant/settings/order),
 * brand, content, seo, settings, media, template.
 *
 * Puck is NOT the backend source of truth.
 */

import type { WebsiteConfig, SectionConfig, WebsiteSectionType } from "@/types/website";
import type {
  AdapterDiff,
  PuckRootProps,
  PuckSectionProps,
  PuckWebsiteData,
} from "@/lib/puck/types";
import { hasSection } from "@/lib/store/registry/catalog";

const ADAPTER_VERSION = 1 as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asSectionType(type: string): WebsiteSectionType {
  return type as WebsiteSectionType;
}

function normalizeVariant(variant: unknown): string | undefined {
  if (typeof variant !== "string") return undefined;
  const trimmed = variant.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSettings(
  settings: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(settings)) return undefined;
  return Object.keys(settings).length > 0 ? cloneJson(settings) : undefined;
}

function sectionToPuckProps(section: SectionConfig): PuckSectionProps {
  return {
    id: section.id,
    sectionId: section.id,
    sectionType: section.type,
    visible: section.visible !== false,
    variant: section.variant ?? "",
    settings: cloneJson(section.settings ?? {}),
  };
}

function puckPropsToSection(
  type: string,
  props: Record<string, unknown>,
): SectionConfig {
  const sectionId =
    (typeof props.sectionId === "string" && props.sectionId) ||
    (typeof props.id === "string" && props.id) ||
    `${type}-${Math.random().toString(36).slice(2, 9)}`;

  const section: SectionConfig = {
    id: sectionId,
    type: asSectionType(
      typeof props.sectionType === "string" ? props.sectionType : type,
    ),
    visible: props.visible !== false,
  };

  const variant = normalizeVariant(props.variant);
  if (variant) section.variant = variant;

  const settings = normalizeSettings(props.settings);
  if (settings) section.settings = settings;

  return section;
}

function rootFromConfig(config: WebsiteConfig): PuckRootProps {
  return {
    template: config.template,
    brand: cloneJson(config.brand),
    content: cloneJson(config.content),
    seo: cloneJson(config.seo),
    settings: cloneJson(config.settings),
    media: cloneJson(config.media),
    adapterVersion: ADAPTER_VERSION,
  };
}

/**
 * Project WebsiteConfig into Puck Data for the visual editor.
 * Unknown registry types are still preserved (type string kept).
 */
export function websiteConfigToPuck(config: WebsiteConfig): PuckWebsiteData {
  return {
    root: {
      props: rootFromConfig(config) as unknown as { title?: string },
    },
    content: config.sections.map((section) => ({
      type: section.type,
      props: sectionToPuckProps(section),
    })),
    zones: {},
  };
}

/**
 * Convert Puck Data back into canonical WebsiteConfig.
 *
 * Structure (section order / add / remove) comes from Puck `content`.
 * When `fallback` is provided (live editor WebsiteConfig), brand / content /
 * seo / settings / media prefer fallback — inspector owns those fields and
 * must not be clobbered by a stale Puck root projection.
 */
export function puckToWebsiteConfig(
  data: PuckWebsiteData,
  fallback?: WebsiteConfig,
): WebsiteConfig {
  const rootProps = (data.root?.props ?? {}) as Partial<PuckRootProps>;

  const sections: SectionConfig[] = (data.content ?? []).map((item) => {
    const props = (item.props ?? {}) as Record<string, unknown>;
    return puckPropsToSection(String(item.type), props);
  });

  // Pin footer last — product invariant shared with classic editor
  const body = sections.filter((s) => s.type !== "footer");
  const footers = sections.filter((s) => s.type === "footer");
  const ordered = [...body, ...footers];

  return {
    template: fallback?.template ?? rootProps.template ?? "store",
    brand: cloneJson(fallback?.brand ?? rootProps.brand ?? emptyBrand()),
    content: cloneJson(
      fallback?.content ?? rootProps.content ?? emptyContent(),
    ),
    sections: ordered,
    seo: cloneJson(
      fallback?.seo ??
        rootProps.seo ?? { title: "", description: "", keywords: [] },
    ),
    settings: cloneJson(
      fallback?.settings ??
        rootProps.settings ?? {
          language: "fa",
          direction: "rtl",
          showBranding: true,
          published: false,
        },
    ),
    media: cloneJson(fallback?.media ?? rootProps.media ?? {}),
  };
}

function emptyBrand(): WebsiteConfig["brand"] {
  return {
    name: "",
    colors: {
      primary: "#111111",
      secondary: "#FFFFFF",
      accent: "#888888",
      background: "#FFFFFF",
      foreground: "#111111",
      muted: "#F5F5F5",
    },
    typography: { heading: "sans", body: "sans", scale: "compact" },
  };
}

function emptyContent(): WebsiteConfig["content"] {
  return {
    hero: {
      style: "minimal",
      headline: "",
      subheadline: "",
      cta: "",
    },
  };
}

/** Deep equality via JSON for adapter verification (order-sensitive for sections). */
export function websiteConfigsEqualForAdapter(
  a: WebsiteConfig,
  b: WebsiteConfig,
): boolean {
  return (
    JSON.stringify(normalizeForCompare(a)) ===
    JSON.stringify(normalizeForCompare(b))
  );
}

function normalizeForCompare(config: WebsiteConfig): unknown {
  return {
    template: config.template,
    brand: config.brand,
    content: config.content,
    sections: config.sections.map((s) => ({
      id: s.id,
      type: s.type,
      visible: s.visible !== false,
      variant: s.variant ?? null,
      settings: s.settings ?? {},
    })),
    seo: config.seo,
    settings: config.settings,
    media: config.media,
  };
}

/**
 * Round-trip: WebsiteConfig → Puck → WebsiteConfig and report diffs.
 */
export function assertRoundTrip(
  config: WebsiteConfig,
): { config: WebsiteConfig; diff: AdapterDiff } {
  const puck = websiteConfigToPuck(config);
  const restored = puckToWebsiteConfig(puck, config);
  const diff = diffConfigs(config, restored);
  return { config: restored, diff };
}

export function diffConfigs(
  original: WebsiteConfig,
  restored: WebsiteConfig,
): AdapterDiff {
  const messages: string[] = [];
  const originalIds = original.sections.map((s) => s.id);
  const restoredIds = restored.sections.map((s) => s.id);
  const originalSet = new Set(originalIds);
  const restoredSet = new Set(restoredIds);

  const lostSectionIds = originalIds.filter((id) => !restoredSet.has(id));
  const addedSectionIds = restoredIds.filter((id) => !originalSet.has(id));
  const orderChanged =
    originalIds.length === restoredIds.length &&
    originalIds.some((id, i) => restoredIds[i] !== id);

  if (lostSectionIds.length) {
    messages.push(`Lost section ids: ${lostSectionIds.join(", ")}`);
  }
  if (addedSectionIds.length) {
    messages.push(`Added section ids: ${addedSectionIds.join(", ")}`);
  }
  if (orderChanged) {
    messages.push("Section order changed");
  }

  // Per-section field checks
  for (const section of original.sections) {
    const match = restored.sections.find((s) => s.id === section.id);
    if (!match) continue;
    if (match.type !== section.type) {
      messages.push(`Section ${section.id} type changed`);
    }
    if ((match.visible !== false) !== (section.visible !== false)) {
      messages.push(`Section ${section.id} visibility changed`);
    }
    if ((match.variant ?? "") !== (section.variant ?? "")) {
      messages.push(`Section ${section.id} variant changed`);
    }
    if (
      JSON.stringify(match.settings ?? {}) !==
      JSON.stringify(section.settings ?? {})
    ) {
      messages.push(`Section ${section.id} settings changed`);
    }
  }

  const rootFieldsEqual =
    JSON.stringify({
      template: original.template,
      brand: original.brand,
      content: original.content,
      seo: original.seo,
      settings: original.settings,
      media: original.media,
    }) ===
    JSON.stringify({
      template: restored.template,
      brand: restored.brand,
      content: restored.content,
      seo: restored.seo,
      settings: restored.settings,
      media: restored.media,
    });

  if (!rootFieldsEqual) {
    messages.push("Root site fields (brand/content/seo/settings/media/template) differ");
  }

  return {
    ok: messages.length === 0,
    lostSectionIds,
    addedSectionIds,
    orderChanged,
    rootFieldsEqual,
    messages,
  };
}

/** Warn about section types not registered (still preserved by adapter). */
export function listUnregisteredSectionTypes(
  config: WebsiteConfig,
): string[] {
  const unknown = new Set<string>();
  for (const section of config.sections) {
    if (!hasSection(section.type)) unknown.add(section.type);
  }
  return [...unknown];
}

export function updateRootContentInPuck(
  data: PuckWebsiteData,
  content: WebsiteConfig["content"],
): PuckWebsiteData {
  const prev = (data.root?.props ?? {}) as unknown as PuckRootProps;
  const rootProps = {
    ...prev,
    content: cloneJson(content),
  };
  return {
    ...data,
    root: {
      ...(data.root ?? {}),
      props: rootProps as unknown as { title?: string },
    },
  };
}

export function updateRootBrandInPuck(
  data: PuckWebsiteData,
  brand: WebsiteConfig["brand"],
): PuckWebsiteData {
  const prev = (data.root?.props ?? {}) as unknown as PuckRootProps;
  const rootProps = {
    ...prev,
    brand: cloneJson(brand),
  };
  return {
    ...data,
    root: {
      ...(data.root ?? {}),
      props: rootProps as unknown as { title?: string },
    },
  };
}
