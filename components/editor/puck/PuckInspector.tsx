"use client";

import { useMemo, useState } from "react";
import { usePuck } from "@puckeditor/core";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import type { ElementSchemaGroup } from "@/lib/store/registry/element-schema";
import { getSectionSchema, getSectionVariants } from "@/lib/store/registry";
import { SchemaInspectorPanel } from "@/components/editor/SchemaInspectorPanel";
import {
  BrandPanel,
  ColorsPanel,
  TypographyPanel,
} from "@/components/editor/EditorPanels";
import { SeoPanel } from "@/components/editor/ExtraPanels";
import { getDictionary } from "@/lib/i18n/dictionary";
import {
  bindSetSectionVariant,
  bindToggleSectionVisibility,
  bindUpdateSiteSettings,
  findSection,
  humanSectionLabel,
} from "@/lib/puck/binding";
import { getSectionDefinition } from "@/lib/store/registry";
import type { ViewportBucket } from "@/lib/editor/responsive";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const SCHEMA_GROUPS: ElementSchemaGroup[] = [
  "content",
  "layout",
  "typography",
  "media",
  "style",
  "actions",
  "data",
  "visibility",
  "responsive",
];

type InspectorTab = "section" | "brand" | "seo" | "site";

function viewportFromWidth(width: number | "100%"): ViewportBucket {
  if (width === "100%" || typeof width !== "number") return "desktop";
  if (width <= 480) return "mobile";
  if (width <= 900) return "tablet";
  return "desktop";
}

export function PuckInspector({
  locale,
  config,
  onConfigChange,
}: {
  locale: Locale;
  config: WebsiteConfig;
  onConfigChange: (next: WebsiteConfig) => void;
}) {
  const isFa = locale === "fa";
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const { selectedItem, appState } = usePuck();
  const [tab, setTab] = useState<InspectorTab>("section");
  const [query, setQuery] = useState("");

  const sectionId =
    (selectedItem?.props?.sectionId as string | undefined) ||
    (selectedItem?.props?.id as string | undefined) ||
    null;
  const section = findSection(config, sectionId);
  const schema = section ? getSectionSchema(section.type) : null;
  const def = section ? getSectionDefinition(section.type) : null;
  const variants = section ? getSectionVariants(section.type) : [];
  const viewport = viewportFromWidth(appState.ui.viewports.current.width);

  const tabs: { id: InspectorTab; fa: string; en: string }[] = [
    { id: "section", fa: "سکشن", en: "Section" },
    { id: "brand", fa: "برند", en: "Brand" },
    { id: "seo", fa: "سئو", en: "SEO" },
    { id: "site", fa: "سایت", en: "Site" },
  ];

  return (
    <aside
      className="flex h-full w-[320px] shrink-0 flex-col border-s border-zinc-200 bg-white"
      aria-label={isFa ? "بازرس" : "Inspector"}
    >
      <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-200 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition",
              tab === t.id
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100",
            )}
          >
            {isFa ? t.fa : t.en}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "section" ? (
          !section ? (
            <EmptyState
              locale={locale}
              title={isFa ? "سکشنی انتخاب نشده" : "No section selected"}
              body={
                isFa
                  ? "یک سکشن را در بوم یا لایه‌ها انتخاب کنید، یا تنظیمات برند/سایت را باز کنید."
                  : "Select a section on the canvas or layers, or open Brand/Site settings."
              }
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {humanSectionLabel(section, locale, def?.label ?? null)}
                </p>
                <p className="font-mono text-[10px] text-zinc-400">
                  {section.type}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium hover:bg-zinc-50"
                  onClick={() =>
                    bindToggleSectionVisibility({
                      config,
                      sectionId: section.id,
                      onChange: onConfigChange,
                    })
                  }
                >
                  {section.visible
                    ? isFa
                      ? "مخفی کردن"
                      : "Hide"
                    : isFa
                      ? "نمایش"
                      : "Show"}
                </button>
              </div>

              {variants.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-zinc-500">
                    {isFa ? "واریانت" : "Variant"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {variants.map((v) => {
                      const active = (section.variant ?? "") === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() =>
                            bindSetSectionVariant({
                              config,
                              sectionId: section.id,
                              variantId: v.id,
                              onChange: onConfigChange,
                            })
                          }
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium",
                            active
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                          )}
                        >
                          {v.label[locale] ?? v.label.en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {schema ? (
                <>
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isFa ? "جستجوی فیلد…" : "Search fields…"}
                    className="h-8 text-xs"
                  />
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50/40 p-2 [--ed-muted:#71717a] [--ed-subtle:#a1a1aa]">
                    <SchemaInspectorPanel
                      config={config}
                      section={section}
                      schema={schema}
                      groups={SCHEMA_GROUPS}
                      locale={locale}
                      viewport={viewport}
                      query={query}
                      onChange={onConfigChange}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    {isFa
                      ? `ریسپانسیو فعال: ${viewport}`
                      : `Responsive viewport: ${viewport}`}
                  </p>
                </>
              ) : (
                <EmptyState
                  locale={locale}
                  title={
                    isFa
                      ? "اسکیمای اختصاصی ندارد"
                      : "No dedicated schema"
                  }
                  body={
                    isFa
                      ? "visibility و variant در بالا در دسترس است. محتوای این سکشن از WebsiteConfig حفظ می‌شود."
                      : "Visibility and variant are available above. Section content is preserved in WebsiteConfig."
                  }
                />
              )}
            </div>
          )
        ) : null}

        {tab === "brand" ? (
          <div className="space-y-6">
            <BrandPanel
              config={config}
              dict={dict}
              onChange={onConfigChange}
            />
            <ColorsPanel
              config={config}
              dict={dict}
              locale={locale}
              onChange={onConfigChange}
            />
            <TypographyPanel
              config={config}
              dict={dict}
              onChange={onConfigChange}
            />
          </div>
        ) : null}

        {tab === "seo" ? (
          <SeoPanel config={config} dict={dict} onChange={onConfigChange} />
        ) : null}

        {tab === "site" ? (
          <div className="space-y-4">
            <Field label={isFa ? "زبان" : "Language"}>
              <select
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
                value={config.settings.language}
                onChange={(e) =>
                  bindUpdateSiteSettings({
                    config,
                    patch: {
                      language: e.target.value as "fa" | "en",
                    },
                    onChange: onConfigChange,
                  })
                }
              >
                <option value="fa">فارسی</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field label={isFa ? "جهت" : "Direction"}>
              <select
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
                value={config.settings.direction}
                onChange={(e) =>
                  bindUpdateSiteSettings({
                    config,
                    patch: {
                      direction: e.target.value as "rtl" | "ltr",
                    },
                    onChange: onConfigChange,
                  })
                }
              >
                <option value="rtl">RTL</option>
                <option value="ltr">LTR</option>
              </select>
            </Field>
            <Field label={isFa ? "حالت تم" : "Theme mode"}>
              <select
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm"
                value={config.settings.themeMode ?? "light"}
                onChange={(e) =>
                  bindUpdateSiteSettings({
                    config,
                    patch: {
                      themeMode: e.target.value as
                        | "light"
                        | "dark"
                        | "system",
                    },
                    onChange: onConfigChange,
                  })
                }
              >
                <option value="light">{isFa ? "روشن" : "Light"}</option>
                <option value="dark">{isFa ? "تیره" : "Dark"}</option>
                <option value="system">{isFa ? "سیستم" : "System"}</option>
              </select>
            </Field>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({
  locale,
  title,
  body,
}: {
  locale: Locale;
  title: string;
  body: string;
}) {
  void locale;
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}
