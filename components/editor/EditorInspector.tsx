"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { Product } from "@/types/ai";
import { Input, Textarea } from "@/components/ui/input";
import {
  BrandPanel,
  ColorsPanel,
  TypographyPanel,
} from "@/components/editor/EditorPanels";
import { ContentPanel } from "@/components/editor/ContentSections";
import {
  MediaPanel,
  SeoPanel,
  SettingsPanel,
  TemplatePanel,
  VersionsPanel,
} from "@/components/editor/ExtraPanels";
import {
  DESIGN_PRESETS,
  applyDesignPreset,
  type DesignPresetId,
} from "@/components/editor/editor-presets";
import { sectionLabel } from "@/components/editor/editor-utils";
import { MediaPicker } from "@/components/editor/MediaPicker";
import { SchemaInspectorPanel } from "@/components/editor/SchemaInspectorPanel";
import { getSectionSchema } from "@/lib/store/registry";
import type { ElementSchemaGroup } from "@/lib/store/registry/element-schema";
import {
  readSectionSetting,
  type ProductSource,
  type SectionSpacing,
  type SectionWidth,
} from "@/components/editor/editor-selection";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Palette,
  Settings2,
  Type,
} from "lucide-react";

type SiteGroup = "style" | "content" | "site";
type SectionTab = "content" | "layout" | "style";

export function EditorInspector({
  config,
  dict,
  locale,
  websiteId,
  canRemoveBranding,
  selectedSectionId,
  activePage,
  productSlug,
  compactChrome = false,
  onChange,
  onRestored,
  onOpenSections,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  websiteId: string;
  canRemoveBranding: boolean;
  selectedSectionId?: string;
  activePage: string;
  productSlug?: string | null;
  /** Hide duplicate title chrome when parent already shows a header (phone/tablet). */
  compactChrome?: boolean;
  onChange: (next: WebsiteConfig) => void;
  onRestored: (next: WebsiteConfig) => void;
  onOpenSections?: () => void;
}) {
  const selected = useMemo(
    () => config.sections.find((s) => s.id === selectedSectionId),
    [config.sections, selectedSectionId],
  );
  const [siteGroup, setSiteGroup] = useState<SiteGroup>("style");
  const [siteSub, setSiteSub] = useState<string>("presets");
  const [sectionTab, setSectionTab] = useState<SectionTab>("content");

  if (activePage === "product" && productSlug) {
    return (
      <InspectorShell
        compactChrome={compactChrome}
        eyebrow={dict.editor.inspectorTab}
        title={dict.editor.productPage}
        hint={dict.editor.inspectorHintSection}
      >
        <ProductPageInspector
          config={config}
          dict={dict}
          productSlug={productSlug}
          onChange={onChange}
        />
      </InspectorShell>
    );
  }

  if (selected) {
    return (
      <InspectorShell
        compactChrome={compactChrome}
        eyebrow={dict.editor.inspectorTab}
        title={sectionLabel(selected.type as WebsiteSectionType, locale)}
        hint={dict.editor.inspectorHintSection}
      >
        <div className="mb-4 flex gap-1 rounded-xl bg-black/[0.04] p-1">
          {(
            [
              ["content", dict.editor.sectionTabContent],
              ["layout", dict.editor.sectionTabLayout],
              ["style", dict.editor.sectionTabStyle],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSectionTab(id)}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-[12px] font-medium transition",
                sectionTab === id
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <SectionInspector
          config={config}
          sectionId={selected.id}
          sectionType={selected.type}
          dict={dict}
          locale={locale}
          tab={sectionTab}
          onChange={onChange}
        />
      </InspectorShell>
    );
  }

  const styleSubs = [
    { id: "presets", label: dict.editor.designPresets },
    { id: "colors", label: dict.editor.colors },
    { id: "type", label: dict.editor.typography },
  ];
  const contentSubs = [
    { id: "brand", label: dict.editor.brand },
    { id: "content", label: dict.editor.content },
    { id: "media", label: dict.editor.media },
  ];
  const siteSubs = [
    { id: "seo", label: dict.editor.seo },
    { id: "settings", label: dict.editor.settings },
    { id: "template", label: dict.editor.template },
    { id: "versions", label: dict.editor.versions },
  ];

  const subs =
    siteGroup === "style"
      ? styleSubs
      : siteGroup === "content"
        ? contentSubs
        : siteSubs;

  return (
    <InspectorShell
      compactChrome={compactChrome}
      eyebrow={dict.editor.inspectorTab}
      title={config.brand.name || dict.editor.website}
      hint={dict.editor.inspectorHintSite}
    >
      <div className="space-y-4">
        <SiteIdentityCard config={config} dict={dict} locale={locale} />

        <div className="editor-site-hint">
          <p className="min-w-0 flex-1">{dict.editor.inspectorHintEmpty}</p>
          {onOpenSections ? (
            <button
              type="button"
              onClick={onOpenSections}
              className="shrink-0 rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium text-white"
            >
              {dict.editor.pickSectionCta}
            </button>
          ) : null}
        </div>

        <div className="editor-site-group" role="tablist" aria-label={dict.editor.website}>
          {(
            [
              ["style", dict.editor.editGroupStyle, Palette],
              ["content", dict.editor.editGroupContent, Type],
              ["site", dict.editor.editGroupSite, Settings2],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={siteGroup === id}
              data-active={siteGroup === id}
              onClick={() => {
                setSiteGroup(id);
                setSiteSub(
                  id === "style"
                    ? "presets"
                    : id === "content"
                      ? "brand"
                      : "seo",
                );
              }}
              className="editor-site-group-btn"
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="editor-site-subnav" role="tablist">
          {subs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={siteSub === item.id}
              data-active={siteSub === item.id}
              onClick={() => setSiteSub(item.id)}
              className="editor-site-subnav-btn"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-1">
          {siteGroup === "style" && siteSub === "presets" ? (
            <WebsiteQuickSettings
              config={config}
              dict={dict}
              locale={locale}
              onChange={onChange}
              presetsOnly
            />
          ) : null}
          {siteGroup === "style" && siteSub === "colors" ? (
            <ColorsPanel
              config={config}
              dict={dict}
              locale={locale}
              onChange={onChange}
            />
          ) : null}
          {siteGroup === "style" && siteSub === "type" ? (
            <TypographyPanel config={config} dict={dict} onChange={onChange} />
          ) : null}
          {siteGroup === "content" && siteSub === "brand" ? (
            <BrandPanel config={config} dict={dict} onChange={onChange} />
          ) : null}
          {siteGroup === "content" && siteSub === "content" ? (
            <ContentPanel config={config} dict={dict} onChange={onChange} />
          ) : null}
          {siteGroup === "content" && siteSub === "media" ? (
            <MediaPanel config={config} dict={dict} onChange={onChange} />
          ) : null}
          {siteGroup === "site" && siteSub === "seo" ? (
            <SeoPanel config={config} dict={dict} onChange={onChange} />
          ) : null}
          {siteGroup === "site" && siteSub === "settings" ? (
            <SettingsPanel
              config={config}
              dict={dict}
              onChange={onChange}
              canRemoveBranding={canRemoveBranding}
            />
          ) : null}
          {siteGroup === "site" && siteSub === "template" ? (
            <TemplatePanel
              config={config}
              dict={dict}
              locale={locale}
              onChange={onChange}
            />
          ) : null}
          {siteGroup === "site" && siteSub === "versions" ? (
            <VersionsPanel
              websiteId={websiteId}
              dict={dict}
              onRestored={onRestored}
            />
          ) : null}
        </div>
      </div>
    </InspectorShell>
  );
}

function InspectorShell({
  compactChrome,
  eyebrow,
  title,
  hint,
  children,
}: {
  compactChrome: boolean;
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      {!compactChrome ? (
        <div className="border-b border-[color:var(--ed-border)] px-4 py-3.5">
          <p className="text-[10px] font-medium tracking-[0.14em] text-[color:var(--ed-muted)] uppercase">
            {eyebrow}
          </p>
          <p className="mt-1 truncate text-[15px] font-medium tracking-tight text-[color:var(--ed-fg)]">
            {title}
          </p>
          <p className="mt-1 text-[11.5px] leading-5 text-[color:var(--ed-muted)]">
            {hint}
          </p>
        </div>
      ) : (
        <div className="border-b border-black/6 bg-[#FAFAF8] px-4 py-2.5">
          <p className="text-[12px] leading-5 text-muted-foreground">{hint}</p>
        </div>
      )}
      <div className="editor-inspector-light min-h-0 flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

function SiteIdentityCard({
  config,
  dict,
  locale,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
}) {
  const colors = config.brand.colors;
  const langLabel = config.settings.language === "fa" ? "فارسی" : "English";
  const dirLabel = config.settings.direction.toUpperCase();

  return (
    <div className="editor-site-identity">
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 text-[13px] font-semibold tracking-tight text-white shadow-sm"
          style={{
            background: `linear-gradient(145deg, ${colors.accent}, ${colors.primary})`,
          }}
        >
          {config.brand.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.brand.logo}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            (config.brand.name || "V").slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight text-ink">
            {config.brand.name || dict.editor.website}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
            {config.brand.tagline || dict.editor.siteIdentity}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {(
                [
                  colors.background,
                  colors.foreground,
                  colors.accent,
                  colors.primary,
                ] as const
              ).map((swatch, i) => (
                <span
                  key={`${swatch}-${i}`}
                  className="editor-site-swatch"
                  style={{ background: swatch }}
                />
              ))}
            </div>
            <span className="text-[10px] text-black/20" aria-hidden>
              ·
            </span>
            <span className="text-[10.5px] font-medium text-muted-foreground">
              {langLabel} · {dirLabel}
            </span>
            {config.settings.mood ? (
              <>
                <span className="text-[10px] text-black/20" aria-hidden>
                  ·
                </span>
                <span className="text-[10.5px] capitalize text-muted-foreground">
                  {config.settings.mood}
                </span>
              </>
            ) : null}
            <span className="text-[10px] text-black/20" aria-hidden>
              ·
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              {locale === "fa" ? "قالب" : "Template"} · {config.template}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebsiteQuickSettings({
  config,
  dict,
  locale,
  onChange,
  presetsOnly = false,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  onChange: (next: WebsiteConfig) => void;
  presetsOnly?: boolean;
}) {
  return (
    <div className="space-y-5">
      <InspectorGroup title={dict.editor.designPresets} defaultOpen>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DESIGN_PRESETS.map((preset) => {
            const active =
              config.settings.mood === preset.id ||
              (preset.colors.background === config.brand.colors.background &&
                preset.colors.accent === config.brand.colors.accent &&
                preset.colors.foreground === config.brand.colors.foreground);
            return (
              <button
                key={preset.id}
                type="button"
                data-active={active}
                onClick={() =>
                  onChange(
                    applyDesignPreset(config, preset.id as DesignPresetId),
                  )
                }
                className="editor-preset-card"
              >
                <div className="editor-preset-strip">
                  <span style={{ background: preset.colors.background }} />
                  <span style={{ background: preset.colors.foreground }} />
                  <span style={{ background: preset.colors.accent }} />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[12px] font-semibold text-ink">
                    {preset.label[locale]}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {preset.description[locale]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </InspectorGroup>

      {!presetsOnly ? (
        <InspectorGroup title={dict.editor.brand} defaultOpen>
          <BrandPanel config={config} dict={dict} onChange={onChange} />
        </InspectorGroup>
      ) : null}
    </div>
  );
}
function patchSectionSettings(
  config: WebsiteConfig,
  sectionId: string,
  patch: Record<string, unknown>,
): WebsiteConfig {
  return {
    ...config,
    sections: config.sections.map((s) =>
      s.id === sectionId
        ? { ...s, settings: { ...(s.settings ?? {}), ...patch } }
        : s,
    ),
  };
}

function SmartLayoutControls({
  config,
  sectionId,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  sectionId: string;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const spacing = readSectionSetting<SectionSpacing>(
    section.settings,
    "spacing",
    "comfortable",
  );
  const width = readSectionSetting<SectionWidth>(
    section.settings,
    "width",
    "full",
  );

  return (
    <InspectorGroup title={dict.editor.smartLayout} defaultOpen>
      <Field label={dict.editor.spacing}>
        <Segmented
          value={spacing}
          options={[
            { id: "compact", label: dict.editor.spacingCompact },
            { id: "comfortable", label: dict.editor.spacingComfortable },
            { id: "spacious", label: dict.editor.spacingSpacious },
          ]}
          onChange={(value) =>
            onChange(patchSectionSettings(config, sectionId, { spacing: value }))
          }
        />
      </Field>
      <Field label={dict.editor.width}>
        <Segmented
          value={width}
          options={[
            { id: "narrow", label: dict.editor.widthNarrow },
            { id: "medium", label: dict.editor.widthMedium },
            { id: "full", label: dict.editor.widthFull },
          ]}
          onChange={(value) =>
            onChange(patchSectionSettings(config, sectionId, { width: value }))
          }
        />
      </Field>
    </InspectorGroup>
  );
}

function SectionInspector({
  config,
  sectionId,
  sectionType,
  dict,
  locale,
  tab,
  onChange,
}: {
  config: WebsiteConfig;
  sectionId: string;
  sectionType: WebsiteSectionType;
  dict: Dictionary;
  locale: Locale;
  tab: SectionTab;
  onChange: (next: WebsiteConfig) => void;
}) {
  const section = config.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  const showContent = tab === "content";
  const showLayout = tab === "layout";
  const showStyle = tab === "style";

  const schema = getSectionSchema(sectionType);
  const schemaDriven = Boolean(
    schema && Object.keys(schema).some((key) => {
      const block = schema[key as keyof typeof schema];
      if (!block) return false;
      if (Array.isArray(block)) return block.length > 0;
      return Object.keys(block).length > 0;
    }),
  );

  const schemaGroups: ElementSchemaGroup[] =
    tab === "content"
      ? ["content", "actions", "media", "data"]
      : tab === "layout"
        ? ["layout", "responsive"]
        : ["style", "typography", "visibility"];

  return (
    <div className="space-y-4">
      {schemaDriven && schema ? (
        <SchemaInspectorPanel
          config={config}
          section={section}
          schema={schema}
          groups={schemaGroups}
          locale={locale}
          onChange={onChange}
        />
      ) : null}

      {/* Legacy controls — skipped for schema-driven hero/gallery content/layout */}
      {!schemaDriven && showContent && sectionType === "hero" ? (
        <>
          <InspectorGroup title={dict.editor.content} defaultOpen>
            <Field label={dict.editor.heroHeadline}>
              <Input
                value={config.content.hero.headline}
                onChange={(event) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      hero: {
                        ...config.content.hero,
                        headline: event.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
            <Field label={dict.editor.heroSub}>
              <Textarea
                className="min-h-24 rounded-xl"
                value={config.content.hero.subheadline}
                onChange={(event) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      hero: {
                        ...config.content.hero,
                        subheadline: event.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
            <Field label={dict.editor.heroCta}>
              <Input
                value={config.content.hero.cta}
                onChange={(event) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      hero: {
                        ...config.content.hero,
                        cta: event.target.value,
                      },
                    },
                  })
                }
              />
            </Field>
          </InspectorGroup>

          <InspectorGroup title={dict.editor.media} defaultOpen>
            <Field label={dict.editor.heroImage}>
              <MediaPicker
                config={config}
                value={config.content.hero.imageId}
                clearLabel={dict.editor.clearMedia}
                emptyLabel={dict.editor.noMedia}
                onPick={(imageId) =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      hero: { ...config.content.hero, imageId },
                    },
                  })
                }
                onClear={() =>
                  onChange({
                    ...config,
                    content: {
                      ...config.content,
                      hero: { ...config.content.hero, imageId: undefined },
                    },
                  })
                }
              />
            </Field>
          </InspectorGroup>
        </>
      ) : null}

      {!schemaDriven && showLayout && sectionType === "hero" ? (
        <InspectorGroup title={dict.editor.layout} defaultOpen>
          <Field label={dict.editor.heroStyle}>
            <Segmented
              value={config.content.hero.style}
              options={(
                [
                  ["overlay", dict.editor.styleOverlay],
                  ["split", dict.editor.styleSplit],
                  ["minimal", dict.editor.styleMinimal],
                  ["editorial", dict.editor.styleEditorial],
                  ["menu", dict.editor.styleMenu],
                ] as const
              ).map(([id, label]) => ({ id, label }))}
              onChange={(style) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    hero: { ...config.content.hero, style },
                  },
                  sections: config.sections.map((s) =>
                    s.id === sectionId ? { ...s, variant: style } : s,
                  ),
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      {showContent && sectionType === "about" && config.content.about ? (
        <InspectorGroup title={dict.editor.content} defaultOpen>
          <Field label={dict.editor.aboutTitle}>
            <Input
              value={config.content.about.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    about: {
                      ...config.content.about!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
          <Field label={dict.editor.aboutBody}>
            <Textarea
              className="min-h-28 rounded-xl"
              value={config.content.about.body}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    about: {
                      ...config.content.about!,
                      body: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      {showContent && sectionType === "products" ? (
        <ProductsSectionInspector
          config={config}
          sectionId={sectionId}
          dict={dict}
          onChange={onChange}
          mode="content"
          listOnly={schemaDriven}
        />
      ) : null}

      {!schemaDriven && showLayout && sectionType === "products" ? (
        <ProductsSectionInspector
          config={config}
          sectionId={sectionId}
          dict={dict}
          onChange={onChange}
          mode="layout"
        />
      ) : null}

      {!schemaDriven &&
      showContent &&
      sectionType === "gallery" &&
      config.content.gallery ? (
        <InspectorGroup title={dict.editor.content} defaultOpen>
          <Field label={dict.editor.galleryTitle}>
            <Input
              value={config.content.gallery.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    gallery: {
                      ...config.content.gallery!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      {showContent && sectionType === "faq" && config.content.faq ? (
        <InspectorGroup title={dict.editor.content} defaultOpen>
          <Field label={dict.editor.faqTitle}>
            <Input
              value={config.content.faq.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    faq: {
                      ...config.content.faq!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      {showContent && sectionType === "contact" && config.content.contact ? (
        <InspectorGroup title={dict.editor.content} defaultOpen>
          <Field label={dict.editor.contactTitle}>
            <Input
              value={config.content.contact.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    contact: {
                      ...config.content.contact!,
                      title: event.target.value,
                    },
                  },
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      {showContent &&
      !schemaDriven &&
      !["hero", "about", "products", "gallery", "faq", "contact"].includes(
        sectionType,
      ) ? (
        <p className="text-[12px] leading-5 text-muted-foreground">
          {dict.editor.sectionGenericHint}
        </p>
      ) : null}

      {showLayout ? (
        <SmartLayoutControls
          config={config}
          sectionId={sectionId}
          dict={dict}
          onChange={onChange}
        />
      ) : null}

      {showStyle && !schemaDriven ? (
        <InspectorGroup title={dict.editor.advanced} defaultOpen>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span>{dict.editor.sectionVisible}</span>
            <input
              type="checkbox"
              checked={section.visible}
              onChange={(event) =>
                onChange({
                  ...config,
                  sections: config.sections.map((s) =>
                    s.id === sectionId
                      ? { ...s, visible: event.target.checked }
                      : s,
                  ),
                })
              }
            />
          </label>
        </InspectorGroup>
      ) : null}
    </div>
  );
}

function productKey(item: Product, index: number) {
  return item.id ?? item.slug ?? `idx-${index}`;
}

function ProductsSectionInspector({
  config,
  sectionId,
  dict,
  onChange,
  mode = "content",
  listOnly = false,
}: {
  config: WebsiteConfig;
  sectionId: string;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
  mode?: "content" | "layout";
  /** When schema panel owns source/columns, only render product list. */
  listOnly?: boolean;
}) {
  const products = config.content.products;
  const section = config.sections.find((s) => s.id === sectionId);
  const [query, setQuery] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (!products) {
    return (
      <div className="rounded-xl border border-dashed border-black/10 px-3 py-6 text-center">
        <p className="text-[13px] text-ink">{dict.editor.emptyProducts}</p>
      </div>
    );
  }

  const source = readSectionSetting<ProductSource>(
    section?.settings,
    "productSource",
    "all",
  );
  const categories = Array.from(
    new Set(
      products.items
        .map((item) => item.category?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const filtered = products.items.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function updateItems(items: Product[]) {
    onChange({
      ...config,
      content: {
        ...config.content,
        products: { ...products!, items },
      },
    });
  }

  if (mode === "layout") {
    const columns = Number(section?.settings?.columns ?? 4);
    return (
      <div className="space-y-4">
        <InspectorGroup title={dict.editor.productSource} defaultOpen>
          <Segmented
            value={source}
            options={[
              { id: "all", label: dict.editor.sourceAll },
              { id: "manual", label: dict.editor.sourceManual },
              { id: "category", label: dict.editor.sourceCategory },
            ]}
            onChange={(value) =>
              onChange(
                patchSectionSettings(config, sectionId, {
                  productSource: value,
                }),
              )
            }
          />
          {source === "category" ? (
            <Field label={dict.editor.productCategory}>
              <select
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px]"
                value={String(section?.settings?.category ?? "")}
                onChange={(event) =>
                  onChange(
                    patchSectionSettings(config, sectionId, {
                      category: event.target.value,
                    }),
                  )
                }
              >
                <option value="">{dict.editor.pickCategory}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </InspectorGroup>
        <InspectorGroup title={dict.editor.layout} defaultOpen>
          <Field label="Columns">
            <Segmented
              value={String([2, 3, 4, 5].includes(columns) ? columns : 4)}
              options={[
                { id: "2", label: "2" },
                { id: "3", label: "3" },
                { id: "4", label: "4" },
                { id: "5", label: "5" },
              ]}
              onChange={(value) =>
                onChange(
                  patchSectionSettings(config, sectionId, {
                    columns: Number(value),
                  }),
                )
              }
            />
          </Field>
        </InspectorGroup>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!listOnly ? (
        <InspectorGroup title={dict.editor.content} defaultOpen>
          <Field label={dict.editor.productsTitle}>
            <Input
              value={products.title}
              onChange={(event) =>
                onChange({
                  ...config,
                  content: {
                    ...config.content,
                    products: { ...products, title: event.target.value },
                  },
                })
              }
            />
          </Field>
        </InspectorGroup>
      ) : null}

      <InspectorGroup title={dict.editor.productPicker} defaultOpen>
        <Input
          placeholder={dict.editor.searchProducts}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center text-[12px] text-muted-foreground">
              {dict.editor.emptyProducts}
            </li>
          ) : (
            filtered.map((item) => {
              const realIndex = products.items.indexOf(item);
              const key = productKey(item, realIndex);
              const manualIds = Array.isArray(section?.settings?.manualIds)
                ? (section!.settings!.manualIds as string[])
                : [];
              const selectedManual = manualIds.includes(key);

              return (
                <li
                  key={key}
                  draggable
                  onDragStart={() => setDragIndex(realIndex)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex == null || dragIndex === realIndex) return;
                    const items = [...products.items];
                    const [moved] = items.splice(dragIndex, 1);
                    items.splice(realIndex, 0, moved!);
                    updateItems(items);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={cn(
                    "rounded-lg border border-black/8 bg-white px-2 py-2",
                    dragIndex === realIndex && "opacity-50",
                    item.hidden && "opacity-60",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 cursor-grab text-muted-foreground">
                      <GripVertical size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {item.name || dict.editor.productName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.price == null
                          ? dict.editor.priceOnRequest
                          : `${item.price}${item.currency ? ` ${item.currency}` : ""}`}
                      </p>
                    </div>
                    {source === "manual" ? (
                      <input
                        type="checkbox"
                        checked={selectedManual}
                        title={dict.editor.sourceManual}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...manualIds, key]
                            : manualIds.filter((id) => id !== key);
                          onChange(
                            patchSectionSettings(config, sectionId, {
                              manualIds: next,
                            }),
                          );
                        }}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      title={
                        item.hidden
                          ? dict.editor.showProduct
                          : dict.editor.hideProduct
                      }
                      onClick={() => {
                        const items = [...products.items];
                        items[realIndex] = {
                          ...item,
                          hidden: !item.hidden,
                        };
                        updateItems(items);
                      }}
                    >
                      {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </InspectorGroup>
    </div>
  );
}

function ProductPageInspector({
  config,
  dict,
  productSlug,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  productSlug: string;
  onChange: (next: WebsiteConfig) => void;
}) {
  const products = config.content.products;
  if (!products) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {dict.editor.emptyProducts}
      </p>
    );
  }

  const index = products.items.findIndex(
    (item) => (item.slug ?? item.id) === productSlug,
  );
  const product = index >= 0 ? products.items[index] : undefined;

  if (!product) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {dict.editor.productNotFound}
      </p>
    );
  }

  function patch(next: Partial<Product>) {
    const items = [...products!.items];
    items[index] = { ...product!, ...next };
    onChange({
      ...config,
      content: {
        ...config.content,
        products: { ...products!, items },
      },
    });
  }

  return (
    <div className="space-y-4 editor-inspector-light">
      <InspectorGroup title={dict.editor.content} defaultOpen>
        <Field label={dict.editor.productName}>
          <Input
            value={product.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </Field>
        <Field label={dict.editor.productDesc}>
          <Textarea
            className="min-h-28 rounded-xl"
            value={product.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <Field label={dict.editor.productCategory}>
          <Input
            value={product.category}
            onChange={(event) => patch({ category: event.target.value })}
          />
        </Field>
        <Field label={dict.editor.productPrice}>
          <Input
            inputMode="decimal"
            placeholder={dict.editor.priceOnRequest}
            value={product.price == null ? "" : String(product.price)}
            onChange={(event) => {
              const raw = event.target.value.trim();
              if (!raw) {
                patch({ price: null });
                return;
              }
              const parsed = Number(raw);
              if (Number.isFinite(parsed)) patch({ price: parsed });
            }}
          />
        </Field>
      </InspectorGroup>

      <InspectorGroup title={dict.editor.media} defaultOpen>
        <Field label={dict.editor.productImage}>
          <MediaPicker
            config={config}
            multi
            values={product.imageIds}
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
            onPick={(id) => {
              const imageIds = product.imageIds.includes(id)
                ? product.imageIds.filter((item) => item !== id)
                : [...product.imageIds, id];
              patch({ imageIds });
            }}
            onClear={() => patch({ imageIds: [] })}
          />
        </Field>
      </InspectorGroup>

      <InspectorGroup title={dict.editor.advanced}>
        <label className="flex items-center justify-between gap-3 text-[13px]">
          <span>{dict.editor.hideProduct}</span>
          <input
            type="checkbox"
            checked={Boolean(product.hidden)}
            onChange={(event) => patch({ hidden: event.target.checked })}
          />
        </label>
      </InspectorGroup>
    </div>
  );
}

function InspectorGroup({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-black/8 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-start"
      >
        <span className="text-[11px] font-semibold tracking-wide text-ink uppercase">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-black/6 px-3 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
            value === option.id
              ? "bg-ink text-white"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
