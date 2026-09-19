"use client";

/**
 * Custom Puck fields bound to WebsiteConfig (content/brand/media paths).
 * Settings.* stay on native Puck `settings` object fields.
 */

import { usePuck } from "@puckeditor/core";
import type { ElementFieldSchema } from "@/lib/store/registry/element-schema";
import {
  getSchemaValue,
  setSchemaValue,
} from "@/lib/store/registry/element-schema";
import { usePuckWebsiteOptional } from "@/lib/puck/website-context";
import { findSection } from "@/lib/puck/binding";
import { cn } from "@/lib/utils";
import { MediaPicker } from "@/components/editor/MediaPicker";

export function PuckBoundSchemaField({
  field,
  locale,
}: {
  field: ElementFieldSchema;
  locale: "fa" | "en";
}) {
  const ctx = usePuckWebsiteOptional();
  const { selectedItem } = usePuck();
  const sectionId =
    (selectedItem?.props?.sectionId as string | undefined) ||
    (selectedItem?.props?.id as string | undefined) ||
    null;

  if (!ctx?.onSchemaFieldChange || !sectionId) {
    return (
      <p className="px-1 text-[11px] text-[var(--puck-color-text-muted,#767676)]">
        {locale === "fa" ? "سکشن را انتخاب کنید" : "Select a section"}
      </p>
    );
  }

  const section = findSection(ctx.config, sectionId);
  if (!section) return null;

  const value = getSchemaValue({
    section,
    field,
    config: ctx.config,
  });
  const label = field.label?.[locale] ?? field.label?.en ?? field.key;

  const commit = (next: unknown) => {
    const patch = ctx.onSchemaFieldChange;
    if (!patch) return;
    const result = setSchemaValue({
      section,
      field,
      value: next,
      config: ctx.config,
    });
    if (result.config) {
      patch(result.config, `Edit ${label}`);
      return;
    }
    const nextConfig = {
      ...ctx.config,
      sections: ctx.config.sections.map((s) =>
        s.id === result.section.id ? result.section : s,
      ),
    };
    patch(nextConfig, `Edit ${label}`);
  };

  if (field.kind === "textarea" || field.kind === "richText") {
    return (
      <label className="flex flex-col gap-1 px-1 pb-2">
        <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
          {label}
        </span>
        <textarea
          className="min-h-20 w-full rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white px-2 py-1.5 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => commit(e.target.value)}
        />
      </label>
    );
  }

  if (field.kind === "boolean") {
    return (
      <label className="flex items-center justify-between gap-2 px-1 py-2">
        <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
          {label}
        </span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => commit(e.target.checked)}
        />
      </label>
    );
  }

  if (
    field.kind === "select" ||
    field.kind === "alignment" ||
    field.kind === "spacing" ||
    field.kind === "radius" ||
    field.kind === "typography" ||
    (field.options && field.options.length > 0)
  ) {
    return (
      <label className="flex flex-col gap-1 px-1 pb-2">
        <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
          {label}
        </span>
        <select
          className="h-8 w-full rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white px-2 text-sm"
          value={String(value ?? "")}
          onChange={(e) => commit(e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label[locale] ?? opt.label.en}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "color") {
    const color = typeof value === "string" ? value : "#000000";
    return (
      <label className="flex items-center justify-between gap-2 px-1 py-2">
        <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
          {label}
        </span>
        <input
          type="color"
          className="h-8 w-12 cursor-pointer rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white"
          value={color.startsWith("#") ? color : "#000000"}
          onChange={(e) => commit(e.target.value)}
        />
      </label>
    );
  }

  if (field.kind === "media") {
    return (
      <label className="flex flex-col gap-1 px-1 pb-2">
        <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
          {label}
        </span>
        <MediaPicker
          config={ctx.config}
          value={typeof value === "string" ? value : undefined}
          onPick={(id) => commit(id)}
          onClear={() => commit("")}
          clearLabel={locale === "fa" ? "پاک کردن" : "Clear"}
          emptyLabel={
            locale === "fa"
              ? "هنوز رسانه‌ای نیست — از تب رسانه اضافه کنید"
              : "No media yet — add some in the Media tab"
          }
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 px-1 pb-2">
      <span className="text-[11px] font-medium text-[var(--puck-color-text-muted,#767676)]">
        {label}
      </span>
      <input
        className={cn(
          "h-8 w-full rounded-[2px] border border-[var(--puck-color-border,#dcdcdc)] bg-white px-2 text-sm",
        )}
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) => commit(e.target.value)}
      />
    </label>
  );
}
