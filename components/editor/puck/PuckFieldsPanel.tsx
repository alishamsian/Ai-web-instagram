"use client";

/**
 * Right-rail fields: Puck's native section fields + Classic product surfaces.
 */

import { useMemo, useState, type ReactNode } from "react";
import { usePuck } from "@puckeditor/core";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig } from "@/types/website";
import { getDictionary } from "@/lib/i18n/dictionary";
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
import { SchemaInspectorPanel } from "@/components/editor/SchemaInspectorPanel";
import { SectionVariantLibrary } from "@/components/editor/variant-library/SectionVariantLibrary";
import {
  findSection,
  humanSectionLabel,
  bindToggleSectionVisibility,
} from "@/lib/puck/binding";
import { getSectionDefinition, getSectionSchema } from "@/lib/store/registry";
import type { ElementSchemaGroup } from "@/lib/store/registry/element-schema";
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

type Tab = "section" | "content" | "brand" | "media" | "seo" | "site";

function viewportFromWidth(width: number | "100%"): ViewportBucket {
  if (width === "100%" || typeof width !== "number") return "desktop";
  if (width <= 480) return "mobile";
  if (width <= 900) return "tablet";
  return "desktop";
}

export function PuckFieldsPanel({
  locale,
  config,
  websiteId,
  onConfigChange,
  canRemoveBranding,
  isLoading,
  children,
}: {
  locale: Locale;
  config: WebsiteConfig;
  websiteId: string;
  onConfigChange: (next: WebsiteConfig, label?: string) => void;
  canRemoveBranding: boolean;
  isLoading: boolean;
  children: ReactNode;
}) {
  const isFa = locale === "fa";
  const dict = useMemo(() => getDictionary(locale), [locale]);
  const { selectedItem, appState } = usePuck();
  const [tab, setTab] = useState<Tab>("section");
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
  const viewport = viewportFromWidth(appState.ui.viewports.current.width);
  const change = (next: WebsiteConfig) => onConfigChange(next);

  const tabs: { id: Tab; fa: string; en: string }[] = [
    { id: "section", fa: "سکشن", en: "Section" },
    { id: "content", fa: "محتوا", en: "Content" },
    { id: "brand", fa: "برند", en: "Brand" },
    { id: "media", fa: "رسانه", en: "Media" },
    { id: "seo", fa: "سئو", en: "SEO" },
    { id: "site", fa: "سایت", en: "Site" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--puck-color-surface,#fff)] text-[var(--puck-color-text,#181818)]">
      <div className="shrink-0 border-b border-[var(--puck-color-border,#dcdcdc)] px-3 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-[var(--puck-color-interactive-subtle,#e7eef7)] text-[var(--puck-color-interactive,#0158ad)]"
                  : "text-[var(--puck-color-text-muted,#767676)] hover:bg-[var(--puck-color-grey-11,#f5f5f5)] hover:text-[var(--puck-color-text,#181818)]",
              )}
            >
              {isFa ? t.fa : t.en}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "section" ? (
          <div className="space-y-4 p-3">
            {section ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-[var(--puck-color-border,#dcdcdc)] px-1 pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {humanSectionLabel(section, locale, def?.label ?? null)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--puck-color-text-muted,#767676)]">
                      {section.type}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-[var(--puck-color-border,#dcdcdc)] bg-[var(--puck-color-surface,#fff)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--puck-color-grey-11,#f5f5f5)]"
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
                        ? "مخفی"
                        : "Hide"
                      : isFa
                        ? "نمایش"
                        : "Show"}
                  </button>
                </div>

                <SectionVariantLibrary
                  config={config}
                  sectionId={section.id}
                  sectionType={section.type}
                  currentVariant={section.variant}
                  locale={locale}
                  onChange={onConfigChange}
                />

                {schema ? (
                  <>
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={isFa ? "جستجوی فیلد…" : "Search fields…"}
                      className="h-8 text-xs"
                    />
                    <div className="pt-1">
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
                  </>
                ) : null}

                <div className="border-t border-[var(--puck-color-border,#dcdcdc)] pt-3">
                  <div className={cn(isLoading && "opacity-60")}>{children}</div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    {isFa ? "سکشنی انتخاب نشده" : "No section selected"}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    {isFa
                      ? "یک بلوک را روی بوم انتخاب کنید، یا از تب‌های محتوا/برند استفاده کنید."
                      : "Select a block on the canvas, or use Content / Brand tabs."}
                  </p>
                </div>
                <div className={cn(isLoading && "opacity-60")}>{children}</div>
              </div>
            )}
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="p-3">
            <ContentPanel config={config} dict={dict} onChange={change} />
          </div>
        ) : null}

        {tab === "brand" ? (
          <div className="space-y-6 p-3">
            <BrandPanel config={config} dict={dict} onChange={change} />
            <ColorsPanel
              config={config}
              dict={dict}
              locale={locale}
              onChange={change}
            />
            <TypographyPanel config={config} dict={dict} onChange={change} />
            <DesignSystemPanel config={config} dict={dict} onChange={change} />
          </div>
        ) : null}

        {tab === "media" ? (
          <div className="p-3">
            <MediaPanel config={config} dict={dict} onChange={change} />
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="p-3">
            <SeoPanel config={config} dict={dict} onChange={change} />
          </div>
        ) : null}

        {tab === "site" ? (
          <div className="space-y-3 p-3">
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
    </div>
  );
}
