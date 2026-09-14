"use client";

import { useEffect, useMemo, useState } from "react";
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
  flattenElementFields,
  getSchemaValue,
  isSchemaFieldActive,
} from "@/lib/store/registry/element-schema";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import {
  schemaFieldMatchesEditorPath,
  matchesInspectorQuery,
  schemaGroupPriority,
  commandSetSchemaValue,
  commandAssignMedia,
} from "@/lib/editor";
import { normalizeEditorHref } from "@/lib/editor/links";
import {
  resolveResponsiveValue,
  resetResponsiveOverride,
  setResponsiveOverride,
  type ViewportBucket,
} from "@/lib/editor/responsive";
import { Input, Textarea } from "@/components/ui/input";
import { MediaPicker } from "@/components/editor/MediaPicker";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
      ? current.desktop !== undefined || current.base !== undefined
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
        <div className="relative min-w-0 flex-1">
          <Input
            type="number"
            disabled={disabled}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            className={cn(
              "editor-prop-control h-8 w-full rounded-md pe-8",
              resolved.inherited && "editor-prop-inherited",
            )}
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
          {resolved.inherited ? (
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--ed-subtle)]">
              ↳
            </span>
          ) : null}
        </div>
        {hasOverride && viewport !== "desktop" ? (
          <button
            type="button"
            disabled={disabled}
            title={locale === "fa" ? "بازنشانی به مقدار ارث‌برده" : "Reset to inherited"}
            aria-label={locale === "fa" ? "بازنشانی به مقدار ارث‌برده" : "Reset to inherited"}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[color:var(--ed-border)] text-[12px] text-[color:var(--ed-muted)] transition hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]"
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
        className="editor-prop-control min-h-20 rounded-md"
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (kind === "boolean") {
    return (
      <label className="flex min-h-8 items-center justify-between gap-3 text-[12px]">
        <span className="text-[color:var(--ed-muted)]">
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
          className="editor-prop-control h-8 rounded-md font-mono text-[12px]"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.token ?? field.key}
        />
      );
    }
    if (options.length <= 5) {
      return (
        <div
          className={cn(
            "flex flex-wrap gap-0.5 rounded-md bg-black/[0.04] p-0.5",
            kind === "alignment" && "editor-align-group",
          )}
          role="group"
        >
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className={cn(
                  "min-h-8 flex-1 rounded px-2 text-[11px] font-medium transition",
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
        className="editor-prop-control h-8 w-full rounded-md border border-black/10 bg-white px-2.5 text-[12px]"
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
        className="editor-prop-control h-8 rounded-md"
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
        onClear={() => onChange(null)}
      />
    );
  }

  if (kind === "link") {
    return (
      <LinkFieldControl
        value={typeof value === "string" ? value : ""}
        locale={locale}
        disabled={disabled}
        onCommit={onChange}
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
          className="size-8 cursor-pointer rounded-md border border-black/10 bg-white p-0.5"
          aria-label={labelOf(field, locale)}
        />
        <Input
          disabled={disabled}
          className="editor-prop-control h-8 rounded-md font-mono text-[12px]"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }

  // text | icon | default
  return (
    <Input
      disabled={disabled}
      className="editor-prop-control h-8 rounded-md"
      value={
        typeof value === "string" ? value : value == null ? "" : String(value)
      }
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function LinkFieldControl({
  value,
  locale,
  disabled,
  onCommit,
}: {
  value: string;
  locale: Locale;
  disabled?: boolean;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setError(null);
  }, [value]);

  function commit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(null);
      onCommit("");
      return;
    }
    const normalized = normalizeEditorHref(trimmed);
    if (!normalized.ok) {
      setError(
        locale === "fa"
          ? "لینک نامعتبر است (http، #، /، tel، mailto)"
          : "Invalid link (http, #, /, tel, mailto)",
      );
      return;
    }
    setError(null);
    setDraft(normalized.href);
    onCommit(normalized.href);
  }

  return (
    <div className="space-y-1">
      <Input
        disabled={disabled}
        className="editor-prop-control h-8 rounded-md font-mono text-[12px]"
        value={draft}
        placeholder="https:// · #shop · /page · tel: · mailto:"
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(null);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
      {error ? (
        <p className="text-[10.5px] text-red-300/90">{error}</p>
      ) : (
        <p className="text-[10px] text-[color:var(--ed-subtle)]">
          {locale === "fa"
            ? "لینک نسبی، http(s)، tel و mailto پشتیبانی می‌شود"
            : "Supports relative, http(s), tel, and mailto"}
        </p>
      )}
    </div>
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

  const rankedGroups = useMemo(() => {
    return [...byGroup.entries()]
      .filter(([, list]) => list.length > 0)
      .sort(
        ([a], [b]) => schemaGroupPriority(a) - schemaGroupPriority(b),
      );
  }, [byGroup]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!rankedGroups.length) return;
    const searching = Boolean(query.trim());
    if (searching) {
      setOpenGroups((prev) => {
        const next: Record<string, boolean> = {};
        let changed = false;
        for (const [group] of rankedGroups) {
          next[group] = true;
          if (!prev[group]) changed = true;
        }
        for (const key of Object.keys(prev)) {
          if (!(key in next)) changed = true;
        }
        return changed ? next : prev;
      });
      return;
    }
    const preferred =
      rankedGroups.find(([, list]) =>
        list.some((field) =>
          schemaFieldMatchesEditorPath(field.path, field.key, selectedField),
        ),
      )?.[0] ?? rankedGroups[0]?.[0];
    if (!preferred) return;
    setOpenGroups((prev) => {
      if (prev[preferred] === true && Object.keys(prev).length === 1) {
        return prev;
      }
      return { [preferred]: true };
    });
  }, [section.id, selectedField, query, rankedGroups]);

  useEffect(() => {
    if (!selectedField) return;
    const node = document.querySelector(
      `[data-editor-schema-field="${CSS.escape(selectedField)}"]`,
    );
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedField, section.id]);

  const visibleCount = rankedGroups.reduce(
    (sum, [, list]) => sum + list.length,
    0,
  );

  return (
    <div className="space-y-1">
      {query.trim() && visibleCount === 0 ? (
        <div className="editor-prop-empty py-8 text-center">
          <p className="text-[12px] font-medium text-[color:var(--ed-fg)]">
            {locale === "fa" ? "ویژگی منطبقی نیست" : "No matching properties"}
          </p>
          <p className="mt-1 text-[11px] text-[color:var(--ed-muted)]">
            {locale === "fa" ? "جستجوی دیگری امتحان کنید" : "Try another search"}
          </p>
        </div>
      ) : null}
      {rankedGroups.map(([group, groupFields]) => {
        const open = openGroups[group] ?? false;
        return (
          <div key={group} className="editor-schema-group">
            <button
              type="button"
              className="editor-schema-group-toggle"
              aria-expanded={open}
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [group]: !open,
                }))
              }
            >
              <span>{GROUP_LABELS[group][locale]}</span>
              <ChevronDown
                size={13}
                className={cn(
                  "text-[color:var(--ed-subtle)] transition-transform",
                  open ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {open ? (
              <div className="editor-schema-group-body space-y-2 pb-2.5">
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
                        "editor-schema-field block space-y-1 rounded-md p-1 -m-1 transition",
                        active && "editor-schema-field-active",
                      )}
                    >
                      <span className="text-[11.5px] font-medium text-[color:var(--ed-fg)]">
                        {labelOf(field, locale)}
                      </span>
                      {field.description && !query.trim() ? (
                        <span className="block text-[10.5px] text-[color:var(--ed-muted)]">
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
                          if (
                            field.kind === "media" &&
                            (field.path === "content.hero.imageId" ||
                              field.path === "content.about.imageId")
                          ) {
                            const result = commandAssignMedia(
                              config,
                              field.path,
                              typeof nextValue === "string" ? nextValue : null,
                            );
                            if (!result) return;
                            onChange(result.config);
                            return;
                          }
                          const result = commandSetSchemaValue({
                            config,
                            sectionId: section.id,
                            field,
                            value: nextValue,
                          });
                          if (!result) return;
                          onChange(result.config);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export type { ResponsiveBreakpoint };
