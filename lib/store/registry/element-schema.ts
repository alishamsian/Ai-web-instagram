/**
 * Element Schema — customization contract for Store sections.
 * Schema ≠ UI ≠ Renderer ≠ Theme ≠ Vertical.
 * Values stay Design-System-safe (no raw CSS properties).
 */

import type { SectionConfig, WebsiteConfig } from "@/types/website";
import { spacing } from "@/lib/design-system/spacing";
import { typographyScale } from "@/lib/design-system/typography";
import { radius, shadows, imageAspect, sectionRhythm } from "@/lib/design-system/foundation";
import { viewportBuckets } from "@/lib/design-system/layout";
import { primitiveColor, primitiveSpace } from "@/lib/design-system/primitives";

/** Canonical field kinds for Inspector generation (Phase 2B.2). */
export type ElementFieldKind =
  | "text"
  | "textarea"
  | "richText"
  | "boolean"
  | "select"
  | "number"
  | "color"
  | "media"
  | "icon"
  | "spacing"
  | "alignment"
  | "radius"
  | "shadow"
  | "typography"
  | "responsive"
  | "link"
  | "dataSource";

export const ELEMENT_FIELD_KINDS: readonly ElementFieldKind[] = [
  "text",
  "textarea",
  "richText",
  "boolean",
  "select",
  "number",
  "color",
  "media",
  "icon",
  "spacing",
  "alignment",
  "radius",
  "shadow",
  "typography",
  "responsive",
  "link",
  "dataSource",
] as const;

export type LocaleLabel = { fa: string; en: string };

export type ElementFieldOption = {
  value: string;
  label: LocaleLabel;
};

/**
 * Semantic field metadata.
 * `path` maps to WebsiteConfig / SectionConfig (legacy EditorFieldPath compatible).
 * Prefer `token` over free-form visual values.
 */
export type ElementFieldSchema = {
  key: string;
  kind: ElementFieldKind;
  label?: LocaleLabel;
  description?: LocaleLabel;
  /** Dot path into section or website config (e.g. settings.columns, content.hero.headline) */
  path?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: ElementFieldOption[];
  /** Design-system token id — validated against TOKEN_CATALOG */
  token?: string;
  /** When true, value may be ResponsiveValue */
  responsive?: boolean;
  min?: number;
  max?: number;
  step?: number;
  dependsOn?: string;
  hidden?: boolean;
  group?: ElementSchemaGroup;
};

export type ElementSchemaGroup =
  | "content"
  | "layout"
  | "typography"
  | "media"
  | "style"
  | "actions"
  | "data"
  | "visibility"
  | "responsive";

export type ElementSchema = {
  content?: Record<string, ElementFieldSchema>;
  layout?: Record<string, ElementFieldSchema>;
  typography?: Record<string, ElementFieldSchema>;
  media?: Record<string, ElementFieldSchema>;
  style?: Record<string, ElementFieldSchema>;
  actions?: ElementFieldSchema[] | Record<string, ElementFieldSchema>;
  data?: Record<string, ElementFieldSchema>;
  visibility?: Record<string, ElementFieldSchema>;
  responsive?: Record<string, ElementFieldSchema>;
};

/** Viewport buckets from Design System — do not invent parallel names. */
export type ResponsiveBreakpoint = keyof typeof viewportBuckets;

export type ResponsiveValue<T = unknown> = Partial<
  Record<ResponsiveBreakpoint, T>
> & {
  /** Optional base / desktop-first fallback */
  base?: T;
};

export const RESPONSIVE_BREAKPOINTS = Object.keys(
  viewportBuckets,
) as ResponsiveBreakpoint[];

/** Known Design System tokens that schemas may reference. */
export const TOKEN_CATALOG: Record<string, string> = {
  "color.background": primitiveColor.warmBg,
  "color.backgroundSubtle": primitiveColor.warmBgSubtle,
  "color.surface": primitiveColor.warmSurface,
  "color.foreground": primitiveColor.warmFg,
  "color.muted": primitiveColor.warmFgMuted,
  "color.accent": primitiveColor.warmAccent,
  "color.accentForeground": primitiveColor.warmAccentFg,
  "color.success": primitiveColor.success,
  "color.warning": primitiveColor.warning,
  "color.error": primitiveColor.error,

  "spacing.micro": spacing.micro,
  "spacing.tight": spacing.tight,
  "spacing.compact": spacing.compact,
  "spacing.component": spacing.component,
  "spacing.comfortable": spacing.comfortable,
  "spacing.card": spacing.card,
  "spacing.sectionGap": spacing.sectionGap,
  "spacing.section": spacing.section,
  "spacing.page": spacing.page,

  "radius.none": radius.none,
  "radius.sm": radius.sm,
  "radius.md": radius.md,
  "radius.lg": radius.lg,
  "radius.xl": radius.xl,
  "radius.full": radius.full,

  "shadow.none": shadows.none,
  "shadow.subtle": shadows.subtle,
  "shadow.card": shadows.card,
  "shadow.elevated": shadows.elevated,
  "shadow.overlay": shadows.overlay,

  "imageAspect.square": imageAspect.square,
  "imageAspect.portrait": imageAspect.portrait,
  "imageAspect.landscape": imageAspect.landscape,
  "imageAspect.editorial": imageAspect.editorial,
  "imageAspect.wide": imageAspect.wide,

  "sectionRhythm.small": sectionRhythm.small,
  "sectionRhythm.medium": sectionRhythm.medium,
  "sectionRhythm.large": sectionRhythm.large,
  "sectionRhythm.editorial": sectionRhythm.editorial,

  "typography.display": typographyScale.display.fontSize,
  "typography.h1": typographyScale.h1.fontSize,
  "typography.h2": typographyScale.h2.fontSize,
  "typography.h3": typographyScale.h3.fontSize,
  "typography.body": typographyScale.body.fontSize,
  "typography.eyebrow": typographyScale.eyebrow.fontSize,
  "typography.productTitle": typographyScale.productTitle.fontSize,
  "typography.price": typographyScale.price.fontSize,

  "space.1": primitiveSpace[1],
  "space.2": primitiveSpace[2],
  "space.4": primitiveSpace[4],
  "space.6": primitiveSpace[6],
  "space.8": primitiveSpace[8],
};

export function isKnownToken(token: string): boolean {
  return Object.prototype.hasOwnProperty.call(TOKEN_CATALOG, token);
}

export function isElementFieldKind(value: string): value is ElementFieldKind {
  return (ELEMENT_FIELD_KINDS as readonly string[]).includes(value);
}

export function isResponsiveBreakpoint(
  value: string,
): value is ResponsiveBreakpoint {
  return RESPONSIVE_BREAKPOINTS.includes(value as ResponsiveBreakpoint);
}

export type SchemaIssue = {
  code: string;
  message: string;
  path?: string;
};

export type SchemaValidationResult = {
  ok: boolean;
  issues: SchemaIssue[];
};

function issue(code: string, message: string, path?: string): SchemaIssue {
  return { code, message, path };
}

/** Flatten all fields in a schema (actions may be array or record). */
export function flattenElementFields(
  schema: ElementSchema,
): ElementFieldSchema[] {
  const out: ElementFieldSchema[] = [];
  const groups: ElementSchemaGroup[] = [
    "content",
    "layout",
    "typography",
    "media",
    "style",
    "data",
    "visibility",
    "responsive",
  ];
  for (const group of groups) {
    const block = schema[group];
    if (!block || Array.isArray(block)) continue;
    for (const field of Object.values(block)) {
      out.push({ ...field, group: field.group ?? group });
    }
  }
  if (schema.actions) {
    const actions = Array.isArray(schema.actions)
      ? schema.actions
      : Object.values(schema.actions);
    for (const field of actions) {
      out.push({ ...field, group: field.group ?? "actions" });
    }
  }
  return out;
}

export function validateElementField(
  field: ElementFieldSchema,
  pathPrefix = "",
): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const path = pathPrefix ? `${pathPrefix}.${field.key}` : field.key;

  if (!field.key || typeof field.key !== "string") {
    issues.push(issue("FIELD_KEY", "Field key is required", path));
  }
  if (!isElementFieldKind(field.kind)) {
    issues.push(
      issue("FIELD_KIND", `Invalid field kind: ${String(field.kind)}`, path),
    );
  }
  if (field.token && !isKnownToken(field.token)) {
    issues.push(
      issue("FIELD_TOKEN", `Unknown design token: ${field.token}`, path),
    );
  }
  if (field.kind === "select") {
    if (!field.options?.length) {
      issues.push(
        issue("FIELD_OPTIONS", "Select fields require options", path),
      );
    } else {
      const values = new Set<string>();
      for (const opt of field.options) {
        if (!opt.value) {
          issues.push(issue("FIELD_OPTION", "Option value required", path));
        }
        if (values.has(opt.value)) {
          issues.push(
            issue(
              "FIELD_OPTION_DUP",
              `Duplicate option value: ${opt.value}`,
              path,
            ),
          );
        }
        values.add(opt.value);
      }
      if (
        field.defaultValue != null &&
        typeof field.defaultValue === "string" &&
        !values.has(field.defaultValue)
      ) {
        issues.push(
          issue(
            "FIELD_DEFAULT_OPTION",
            `Default is not a valid option: ${String(field.defaultValue)}`,
            path,
          ),
        );
      }
    }
  }
  if (field.kind === "number" || typeof field.defaultValue === "number") {
    const n =
      typeof field.defaultValue === "number" ? field.defaultValue : undefined;
    if (n != null) {
      if (field.min != null && n < field.min) {
        issues.push(issue("FIELD_MIN", `Default below min ${field.min}`, path));
      }
      if (field.max != null && n > field.max) {
        issues.push(issue("FIELD_MAX", `Default above max ${field.max}`, path));
      }
    }
  }
  if (field.responsive && field.defaultValue && isPlainObject(field.defaultValue)) {
    for (const key of Object.keys(field.defaultValue as object)) {
      if (key === "base") continue;
      if (!isResponsiveBreakpoint(key)) {
        issues.push(
          issue(
            "FIELD_RESPONSIVE",
            `Invalid responsive breakpoint: ${key}`,
            path,
          ),
        );
      }
    }
  }
  if (field.path && !isAllowedSchemaPath(field.path)) {
    issues.push(
      issue("FIELD_PATH", `Disallowed schema path: ${field.path}`, path),
    );
  }
  return issues;
}

/** Paths must stay within WebsiteConfig / SectionConfig — no raw CSS bags. */
export function isAllowedSchemaPath(path: string): boolean {
  if (!path || path.includes("..")) return false;
  if (/^css(\.|$)/i.test(path)) return false;
  if (/style\.(margin|padding|transform|boxShadow|borderRadius)/i.test(path)) {
    return false;
  }
  return (
    path.startsWith("settings.") ||
    path.startsWith("content.") ||
    path.startsWith("brand.") ||
    path === "variant" ||
    path === "visible"
  );
}

export function validateSectionSchema(
  schema: ElementSchema | undefined,
): SchemaValidationResult {
  if (!schema) return { ok: true, issues: [] };
  const issues: SchemaIssue[] = [];
  const fields = flattenElementFields(schema);
  const keys = new Set<string>();

  for (const field of fields) {
    if (keys.has(field.key)) {
      issues.push(
        issue("DUP_KEY", `Duplicate field key: ${field.key}`, field.key),
      );
    }
    keys.add(field.key);
    issues.push(...validateElementField(field));
  }

  return { ok: issues.length === 0, issues };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getByPath(root: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: unknown = root;
  for (const part of parts) {
    if (!isPlainObject(cur) && !Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setByPathImmutable(
  root: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const parts = path.split(".");
  if (parts.length === 0) return root;
  const clone: Record<string, unknown> = { ...root };
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cursor[key];
    const child = isPlainObject(next) ? { ...next } : {};
    cursor[key] = child;
    cursor = child;
  }
  cursor[parts[parts.length - 1]!] = value;
  return clone;
}

/**
 * Read a schema field value from section (+ optional website config).
 * Does not invent business data — returns undefined when missing.
 */
export function getSchemaValue(params: {
  section: SectionConfig;
  field: ElementFieldSchema;
  config?: WebsiteConfig;
}): unknown {
  const { section, field, config } = params;
  const path = field.path;
  if (!path) {
    return field.defaultValue;
  }
  if (path === "variant") return section.variant ?? field.defaultValue;
  if (path === "visible") return section.visible;

  if (path.startsWith("settings.")) {
    const rel = path.slice("settings.".length);
    const value = getByPath(section.settings ?? {}, rel);
    return value === undefined ? field.defaultValue : value;
  }

  if (config && (path.startsWith("content.") || path.startsWith("brand."))) {
    const value = getByPath(config, path);
    return value === undefined ? field.defaultValue : value;
  }

  return field.defaultValue;
}

/**
 * Immutable write for a schema field.
 * Section-local paths update section; content/brand paths update config.
 * Never mutates inputs.
 */
export function setSchemaValue(params: {
  section: SectionConfig;
  field: ElementFieldSchema;
  value: unknown;
  config?: WebsiteConfig;
}): { section: SectionConfig; config?: WebsiteConfig } {
  const { section, field, value, config } = params;
  const path = field.path;
  if (!path) {
    return { section: { ...section }, config: config ? { ...config } : config };
  }

  if (path === "variant") {
    return {
      section: { ...section, variant: String(value) },
      config: config ? structuredClone(config) : config,
    };
  }
  if (path === "visible") {
    return {
      section: { ...section, visible: Boolean(value) },
      config: config ? structuredClone(config) : config,
    };
  }

  if (path.startsWith("settings.")) {
    const rel = path.slice("settings.".length);
    const settings = setByPathImmutable(
      { ...(section.settings ?? {}) },
      rel,
      value,
    );
    return {
      section: { ...section, settings },
      config: config ? structuredClone(config) : config,
    };
  }

  if (config && (path.startsWith("content.") || path.startsWith("brand."))) {
    const nextConfig = setByPathImmutable(
      structuredClone(config) as unknown as Record<string, unknown>,
      path,
      value,
    ) as unknown as WebsiteConfig;
    return { section: { ...section }, config: nextConfig };
  }

  return { section: { ...section }, config: config ? { ...config } : config };
}

/**
 * Runtime fallback for a field — does NOT write into WebsiteConfig.
 */
export function resolveFieldDefault(field: ElementFieldSchema): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.token && isKnownToken(field.token)) return TOKEN_CATALOG[field.token];
  return undefined;
}

/** Validate a runtime value against a field (for Inspector writes). */
export function validateFieldValue(
  field: ElementFieldSchema,
  value: unknown,
): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  if (value === undefined || value === null) {
    if (field.required) {
      issues.push(issue("REQUIRED", `Field ${field.key} is required`, field.key));
    }
    return { ok: issues.length === 0, issues };
  }

  const validateScalar = (scalar: unknown, suffix = "") => {
    const path = suffix ? `${field.key}.${suffix}` : field.key;
    if (
      (field.kind === "select" ||
        field.kind === "dataSource" ||
        field.kind === "alignment" ||
        field.kind === "radius" ||
        field.kind === "shadow" ||
        field.kind === "spacing") &&
      field.options
    ) {
      const allowed = new Set(field.options.map((o) => o.value));
      if (typeof scalar === "string" && !allowed.has(scalar)) {
        issues.push(
          issue("OPTION", `Invalid option for ${field.key}: ${String(scalar)}`, path),
        );
      }
    }
    if (
      (field.kind === "number" || field.kind === "responsive") &&
      typeof scalar === "number"
    ) {
      if (field.min != null && scalar < field.min) {
        issues.push(issue("MIN", `Below min ${field.min}`, path));
      }
      if (field.max != null && scalar > field.max) {
        issues.push(issue("MAX", `Above max ${field.max}`, path));
      }
    }
    if (
      (field.kind === "boolean") &&
      typeof scalar !== "boolean"
    ) {
      issues.push(issue("TYPE", "Expected boolean", path));
    }
    if (
      (field.kind === "text" ||
        field.kind === "textarea" ||
        field.kind === "richText" ||
        field.kind === "link" ||
        field.kind === "icon" ||
        field.kind === "media" ||
        field.kind === "color") &&
      typeof scalar !== "string"
    ) {
      // media may be cleared as empty string
      if (scalar !== "") {
        issues.push(issue("TYPE", `Expected string for ${field.kind}`, path));
      }
    }
  };

  if (field.responsive && isPlainObject(value)) {
    for (const [key, entry] of Object.entries(value)) {
      if (key === "base") {
        if (entry != null) validateScalar(entry, "base");
        continue;
      }
      if (!isResponsiveBreakpoint(key)) {
        issues.push(
          issue("RESPONSIVE", `Invalid breakpoint: ${key}`, field.key),
        );
        continue;
      }
      if (entry != null) validateScalar(entry, key);
    }
  } else if (field.responsive && typeof value === "number") {
    // Allow single number as desktop/base shorthand
    validateScalar(value);
  } else {
    validateScalar(value);
  }

  if (field.token && typeof value === "string" && value.startsWith("token:")) {
    const token = value.slice("token:".length);
    if (!isKnownToken(token)) {
      issues.push(issue("TOKEN", `Unknown token: ${token}`, field.key));
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateSectionDefinition(def: {
  type: string;
  schema?: ElementSchema;
  dependsKeys?: string[];
}): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  if (!def.type) {
    issues.push(issue("DEF_TYPE", "Section definition type is required"));
  }
  const schemaResult = validateSectionSchema(def.schema);
  issues.push(...schemaResult.issues);

  if (def.schema) {
    const fields = flattenElementFields(def.schema);
    const keys = new Set(fields.map((f) => f.key));
    for (const field of fields) {
      if (field.dependsOn && !keys.has(field.dependsOn)) {
        issues.push(
          issue(
            "DEPENDS_ON",
            `dependsOn "${field.dependsOn}" not found for ${field.key}`,
            field.key,
          ),
        );
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Whether a dependent field should be shown given current values. */
export function isSchemaFieldActive(
  field: ElementFieldSchema,
  values: Record<string, unknown>,
): boolean {
  if (field.hidden) return false;
  if (!field.dependsOn) return true;
  const dep = values[field.dependsOn];
  if (typeof dep === "boolean") return dep;
  if (dep == null || dep === "" || dep === false) return false;
  return true;
}

/**
 * Apply a validated schema write onto WebsiteConfig without mutating input.
 * Returns null when validation fails.
 */
export function applySchemaFieldUpdate(params: {
  config: WebsiteConfig;
  sectionId: string;
  field: ElementFieldSchema;
  value: unknown;
}): { config: WebsiteConfig } | { error: SchemaIssue[] } {
  const { config, sectionId, field, value } = params;
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) {
    return { error: [issue("SECTION", `Section not found: ${sectionId}`)] };
  }
  const validation = validateFieldValue(field, value);
  if (!validation.ok) return { error: validation.issues };

  const result = setSchemaValue({ section, field, value, config });
  const base = result.config
    ? result.config
    : (structuredClone(config) as WebsiteConfig);

  return {
    config: {
      ...base,
      sections: base.sections.map((s) =>
        s.id === sectionId ? result.section : s,
      ),
    },
  };
}
