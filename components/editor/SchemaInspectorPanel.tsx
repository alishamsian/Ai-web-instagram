"use client";

import { useEffect, useMemo } from "react";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type {
  ElementFieldSchema,
  ElementSchema,
  ElementSchemaGroup,
  ResponsiveBreakpoint,
  ResponsiveValue,
} from "@/lib/store/registry/element-schema";
import {
  applySchemaFieldUpdate,
  flattenElementFields,
  getSchemaValue,
  isSchemaFieldActive,
} from "@/lib/store/registry/element-schema";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import { schemaFieldMatchesEditorPath, matchesInspectorQuery } from "@/lib/editor";
import {
  resolveResponsiveValue,
  resetResponsiveOverride,
  setResponsiveOverride,
  type ViewportBucket,
} from "@/lib/editor/responsive";
import { Input, Textarea } from "@/components/ui/input";
import { MediaPicker } from "@/components/editor/MediaPicker";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<ElementSchemaGroup, { fa: string; en: string }> = {
  content: { fa: "محتوا", en: "Content" },
  layout: { fa: "چیدمان", en: "Layout" },
  typography: { fa: "تایپوگرافی", en: "Typography" },
  media: { fa: "رسانه", en: "Media" },
  style: { fa: "استایل", en: "Style" },
  actions: { fa: "اقدام‌ها", en: "Actions" },
  data: { fa: "داده", en: "Data" },
  visibility: { fa: "نمایش", en: "Visibility" },
  responsive: { fa: "ریسپانسیو", en: "Responsive" },
};

function labelOf(
  field: ElementFieldSchema,
  locale: Locale,
): string {
  return field.label?.[locale] ?? field.key;
}

function asResponsive(
  value: unknown,
): ResponsiveValue<number | string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as ResponsiveValue<number | string>;
  }
  if (typeof value === "number" || typeof value === "string") {
    return { base: value };
  }
  return {};
}

function ResponsiveNumberControl({
  field,
  value,
  locale,
  disabled,
  viewport,
  onChange,
}: {
  field: ElementFieldSchema;
  value: unknown;
  locale: Locale;
  disabled?: boolean;
  viewport: ViewportBucket;
  onChange: (next: unknown) => void;
}) {
  const current = asResponsive(value);
  const resolved = resolveResponsiveValue<number | string>(current, viewport);
  const display =
    resolved.value == null ? "" : String(resolved.value);
  const hasOverride =
    viewport === "desktop"
      ? current.base !== undefined
      : current[viewport] !== undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium capitalize text-[color:var(--ed-muted)]">
          {viewport}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            resolved.inherited
              ? "bg-[color:var(--ed-bg-soft)] text-[color:var(--ed-subtle)]"
              : "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]",
          )}
        >
          {resolved.inherited
            ? locale === "fa"
              ? `ارث‌بری${resolved.source && resolved.source !== "none" ? ` · ${resolved.source === "base" ? "desktop" : resolved.source}` : ""}`
              : `Inherited${resolved.source && resolved.source !== "none" ? ` · ${resolved.source === "base" ? "desktop" : resolved.source}` : ""}`
            : locale === "fa"
              ? "بازنویسی"
              : "Override"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          disabled={disabled}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          className="h-9 flex-1 rounded-lg"
          value={display}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onChange(resetResponsiveOverride(current, viewport));
              return;
            }
            const n = Number(raw);
            if (!Number.isFinite(n)) return;
            onChange(setResponsiveOverride(current, viewport, n));
          }}
        />
        {hasOverride && viewport !== "desktop" ? (
          <button
            type="button"
            disabled={disabled}
            title={locale === "fa" ? "بازنشانی به مقدار ارث‌برده" : "Reset to inherited"}
            aria-label={locale === "fa" ? "بازنشانی به مقدار ارث‌برده" : "Reset to inherited"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--ed-border)] text-[13px] text-[color:var(--ed-muted)] hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]"
            onClick={() => onChange(resetResponsiveOverride(current, viewport))}
          >
            ↺
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SchemaFieldControl({
  field,
  value,
  config,
  locale,
  disabled,
  viewport = "desktop",
  onChange,
}: {
  field: ElementFieldSchema;
  value: unknown;
  config: WebsiteConfig;
  locale: Locale;
  disabled?: boolean;
  viewport?: ViewportBucket;
  onChange: (next: unknown) => void;
}) {
  const kind = field.kind === "richText" ? "textarea" : field.kind;
  const options = field.options ?? [];

  if (field.responsive && (kind === "number" || kind === "responsive")) {
    return (
      <ResponsiveNumberControl
        field={field}
        value={value}
        locale={locale}
        disabled={disabled}
        viewport={viewport}
        onChange={onChange}
      />
    );
  }

  if (kind === "textarea") {
    return (
      <Textarea
        className="min-h-24 rounded-xl"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (kind === "boolean") {
    return (
      <label className="flex min-h-11 items-center justify-between gap-3 text-[13px]">
        <span className="text-muted-foreground">
          {locale === "fa" ? "فعال" : "Enabled"}
        </span>
        <input
          type="checkbox"
          className="size-4"
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }

  if (
    kind === "select" ||
    kind === "alignment" ||
    kind === "radius" ||
    kind === "shadow" ||
    kind === "spacing" ||
    kind === "typography" ||
    kind === "dataSource"
  ) {
    if (options.length === 0) {
      return (
        <Input
          disabled={disabled}
          className="h-10 rounded-xl font-mono text-[12px]"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.token ?? field.key}
        />
      );
    }
    if (options.length <= 5) {
      return (
        <div className="flex flex-wrap gap-1 rounded-xl bg-black/[0.04] p-1">
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "min-h-9 flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition",
                  active
                    ? "bg-white text-ink shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label[locale]}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <select
        className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px]"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label[locale]}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "number") {
    return (
      <Input
        type="number"
        disabled={disabled}
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        className="h-10 rounded-xl"
        value={typeof value === "number" ? String(value) : ""}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(undefined);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    );
  }

  if (kind === "media") {
    return (
      <MediaPicker
        config={config}
        value={typeof value === "string" ? value : undefined}
        clearLabel={locale === "fa" ? "حذف" : "Clear"}
        emptyLabel={locale === "fa" ? "بدون رسانه" : "No media"}
        onPick={(id) => onChange(id)}
        onClear={() => onChange(undefined)}
      />
    );
  }

  if (kind === "color") {
    const color = typeof value === "string" ? value : "#111111";
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          disabled={disabled}
          value={color.startsWith("#") ? color : "#111111"}
          onChange={(event) => onChange(event.target.value)}
          className="size-10 cursor-pointer rounded-lg border border-black/10 bg-white p-1"
        />
        <Input
          disabled={disabled}
          className="h-10 rounded-xl font-mono text-[12px]"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  // text | link | icon | default
  return (
    <Input
      disabled={disabled}
      className="h-10 rounded-xl"
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function SchemaInspectorPanel({
  config,
  section,
  schema,
  groups,
  locale,
  selectedField,
  viewport = "desktop",
  query = "",
  onChange,
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  schema: ElementSchema;
  groups: ElementSchemaGroup[];
  locale: Locale;
  selectedField?: EditorFieldPath;
  viewport?: ViewportBucket;
  query?: string;
  onChange: (next: WebsiteConfig) => void;
}) {
  const fields = useMemo(() => flattenElementFields(schema), [schema]);
  const values = useMemo(() => {
    const map: Record<string, unknown> = {};
    for (const field of fields) {
      map[field.key] = getSchemaValue({ section, field, config });
    }
    return map;
  }, [fields, section, config]);

  const byGroup = useMemo(() => {
    const map = new Map<ElementSchemaGroup, ElementFieldSchema[]>();
    for (const group of groups) map.set(group, []);
    for (const field of fields) {
      const group = (field.group ?? "content") as ElementSchemaGroup;
      if (!map.has(group)) continue;
      if (!isSchemaFieldActive(field, values)) continue;
      const groupLabel = GROUP_LABELS[group][locale];
      if (
        !matchesInspectorQuery(query, [
          field.key,
          field.path,
          labelOf(field, locale),
          field.description?.[locale],
          groupLabel,
          group,
        ])
      ) {
        continue;
      }
      map.get(group)!.push(field);
    }
    return map;
  }, [fields, groups, values, query, locale]);

  useEffect(() => {
    if (!selectedField) return;
    const node = document.querySelector(
      `[data-editor-schema-field="${CSS.escape(selectedField)}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedField, section.id]);

  const visibleCount = [...byGroup.values()].reduce(
    (sum, list) => sum + list.length,
    0,
  );

  return (
    <div className="space-y-4">
      {query.trim() && visibleCount === 0 ? (
        <p className="py-6 text-center text-[12px] text-[color:var(--ed-muted)]">
          {locale === "fa" ? "ویژگی‌ای پیدا نشد" : "No properties match"}
        </p>
      ) : null}
      {[...byGroup.entries()].map(([group, groupFields]) => {
        if (!groupFields.length) return null;
        return (
          <div
            key={group}
            className="border-b border-[color:var(--ed-border)] last:border-b-0"
          >
            <div className="px-0 py-2">
              <p className="text-[10px] font-semibold tracking-wide text-[color:var(--ed-subtle)] uppercase">
                {GROUP_LABELS[group][locale]}
              </p>
            </div>
            <div className="space-y-2.5 pb-3">
              {groupFields.map((field) => {
                const active = schemaFieldMatchesEditorPath(
                  field.path,
                  field.key,
                  selectedField,
                );
                return (
                  <label
                    key={field.key}
                    data-editor-schema-field={
                      active && selectedField ? selectedField : undefined
                    }
                    data-active={active || undefined}
                    className={cn(
                      "editor-schema-field block space-y-1.5 rounded-lg p-1.5 -m-1.5 transition",
                      active && "editor-schema-field-active",
                    )}
                  >
                    <span className="text-[12px] font-medium text-[color:var(--ed-fg)]">
                      {labelOf(field, locale)}
                    </span>
                    {field.description ? (
                      <span className="block text-[11px] text-[color:var(--ed-muted)]">
                        {field.description[locale]}
                      </span>
                    ) : null}
                    <SchemaFieldControl
                      field={field}
                      value={values[field.key]}
                      config={config}
                      locale={locale}
                      viewport={viewport}
                      onChange={(nextValue) => {
                        const result = applySchemaFieldUpdate({
                          config,
                          sectionId: section.id,
                          field,
                          value: nextValue,
                        });
                        if ("error" in result) return;
                        onChange(result.config);
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { ResponsiveBreakpoint };
