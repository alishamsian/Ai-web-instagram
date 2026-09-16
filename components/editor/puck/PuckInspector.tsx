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
  DesignSystemPanel,
} from "@/components/editor/EditorPanels";
import {
  SeoPanel,
  MediaPanel,
  SettingsPanel,
  TemplatePanel,
  VersionsPanel,
} from "@/components/editor/ExtraPanels";
import { ContentPanel } from "@/components/editor/ContentSections";
import { SectionVariantLibrary } from "@/components/editor/variant-library/SectionVariantLibrary";
import { getDictionary } from "@/lib/i18n/dictionary";
import {
  bindSetSectionVariant,
  bindToggleSectionVisibility,
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

type InspectorTab =
  | "section"
  | "content"
  | "brand"
  | "media"
  | "seo"
  | "site";

function viewportFromWidth(width: number | "100%"): ViewportBucket {
  if (width === "100%" || typeof width !== "number") return "desktop";
  if (width <= 480) return "mobile";
  if (width <= 900) return "tablet";
  return "desktop";
}

export function PuckInspector({
  locale,
  config,
  websiteId,
  onConfigChange,
  canRemoveBranding = false,
}: {
  locale: Locale;
  config: WebsiteConfig;
  websiteId: string;
  onConfigChange: (next: WebsiteConfig, label?: string) => void;
  canRemoveBranding?: boolean;
}) {
  const isFa = locale === "fa";
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const { selectedItem, appState } = usePuck();
  const [tab, setTab] = useState<InspectorTab>("section");
  const [query, setQuery] = useState("");
  const [siteSub, setSiteSub] = useState<"settings" | "templates" | "versions">(
    "settings",
  );

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
    { id: "content", fa: "محتوا", en: "Content" },
    { id: "brand", fa: "برند", en: "Brand" },
    { id: "media", fa: "رسانه", en: "Media" },
    { id: "seo", fa: "سئو", en: "SEO" },
    { id: "site", fa: "سایت", en: "Site" },
  ];

  const change = (next: WebsiteConfig) => onConfigChange(next);

  return (
    <aside
      className="flex h-full w-[340px] shrink-0 flex-col border-s border-zinc-800/80 bg-[#18181b] text-zinc-100"
      aria-label={isFa ? "بازرس" : "Inspector"}
    >
      <div className="flex gap-0.5 overflow-x-auto border-b border-zinc-800 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-2 py-1.5 text-[11px] font-medium transition",
              tab === t.id
                ? "bg-white text-zinc-900"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
            )}
          >
            {isFa ? t.fa : t.en}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-3 text-zinc-900">
        {tab === "section" ? (
          !section ? (
            <EmptyState
              title={isFa ? "سکشنی انتخاب نشده" : "No section selected"}
              body={
                isFa
                  ? "یک سکشن را در بوم یا لایه‌ها انتخاب کنید، یا تب محتوا/برند را باز کنید."
                  : "Select a section on the canvas or layers, or open Content/Brand."
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
                  className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-800 hover:bg-zinc-50"
                  onClick={() =>
                    bindToggleSectionVisibility({
                      config,
                      sectionId: section.id,
                      onChange: change,
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
                              onChange: change,
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
                  <SectionVariantLibrary
                    config={config}
                    sectionId={section.id}
                    sectionType={section.type}
                    currentVariant={section.variant}
                    locale={locale}
                    onChange={onConfigChange}
                  />
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
                      onChange={change}
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
                  title={
                    isFa ? "اسکیمای اختصاصی ندارد" : "No dedicated schema"
                  }
                  body={
                    isFa
                      ? "از تب محتوا برای ویرایش محصولات و متن‌ها استفاده کنید."
                      : "Use the Content tab to edit products and copy."
                  }
                />
              )}
            </div>
          )
        ) : null}

        {tab === "content" ? (
          <ContentPanel config={config} dict={dict} onChange={change} />
        ) : null}

        {tab === "brand" ? (
          <div className="space-y-6">
            <BrandPanel config={config} dict={dict} onChange={change} />
            <ColorsPanel
              config={config}
              dict={dict}
              locale={locale}
              onChange={change}
            />
            <TypographyPanel config={config} dict={dict} onChange={change} />
            <DesignSystemPanel
              config={config}
              dict={dict}
              onChange={change}
            />
          </div>
        ) : null}

        {tab === "media" ? (
          <MediaPanel config={config} dict={dict} onChange={change} />
        ) : null}

        {tab === "seo" ? (
          <SeoPanel config={config} dict={dict} onChange={change} />
        ) : null}

        {tab === "site" ? (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5">
              {(
                [
                  { id: "settings" as const, fa: "تنظیمات", en: "Settings" },
                  { id: "templates" as const, fa: "قالب", en: "Template" },
                  { id: "versions" as const, fa: "نسخه‌ها", en: "Versions" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSiteSub(s.id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium",
                    siteSub === s.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100",
                  )}
                >
                  {isFa ? s.fa : s.en}
                </button>
              ))}
            </div>
            {siteSub === "settings" ? (
              <SettingsPanel
                config={config}
                dict={dict}
                onChange={change}
                canRemoveBranding={canRemoveBranding}
              />
            ) : null}
            {siteSub === "templates" ? (
              <TemplatePanel
                config={config}
                dict={dict}
                locale={locale}
                onChange={change}
              />
            ) : null}
            {siteSub === "versions" ? (
              <VersionsPanel
                websiteId={websiteId}
                dict={dict}
                onRestored={(restored) =>
                  onConfigChange(restored, "Restore version")
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">{body}</p>
    </div>
  );
}
