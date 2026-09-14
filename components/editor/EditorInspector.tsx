"use client";

import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { Product } from "@/types/ai";
import { Input, Textarea } from "@/components/ui/input";
import {
  BrandPanel,
  ColorsPanel,
  DesignSystemPanel,
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
  type DesignPresetId,
} from "@/components/editor/editor-presets";
import {
  commandApplyThemePreset,
  commandSetSectionVariant,
  commandUpdateProduct,
} from "@/lib/editor/commands";
import { getSectionVariants } from "@/lib/store/registry/catalog";
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
import {
  fieldLabelFromPath,
  type EditorSectionTab,
  type EditorSiteGroup,
} from "@/lib/editor";
import type { EditorFieldPath } from "@/components/editor/EditContext";
import { SECTION_LAYER_BLOCKS } from "@/components/editor/editor-selection";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Palette,
  Plus,
  Search,
  Settings2,
  Trash2,
  Type,
} from "lucide-react";
import { sectionTypeIcon } from "@/components/editor/section-icons";
import type { SectionAction } from "@/components/editor/EditContext";

type SiteGroup = EditorSiteGroup;
type SectionTab = EditorSectionTab;

export function EditorInspector({
  config,
  dict,
  locale,
  websiteId,
  canRemoveBranding,
  selectedSectionId,
  selectedField,
  activePage,
  productSlug,
  compactChrome = false,
  sectionTab,
  siteGroup,
  propertySearchFocus = 0,
  onSectionTabChange,
  onSiteGroupChange,
  onChange,
  onRestored,
  onOpenSections,
  onAddSection,
  onBrowseTemplates,
  onSectionAction,
  onClearField,
  viewport = "desktop",
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  websiteId: string;
  canRemoveBranding: boolean;
  selectedSectionId?: string;
  selectedField?: EditorFieldPath;
  activePage: string;
  productSlug?: string | null;
  /** Hide duplicate title chrome when parent already shows a header (phone/tablet). */
  compactChrome?: boolean;
  sectionTab: SectionTab;
  siteGroup: SiteGroup;
  propertySearchFocus?: number;
  onSectionTabChange: (tab: SectionTab) => void;
  onSiteGroupChange: (group: SiteGroup) => void;
  onChange: (next: WebsiteConfig) => void;
  onRestored: (next: WebsiteConfig) => void;
  onOpenSections?: () => void;
  onAddSection?: () => void;
  onBrowseTemplates?: () => void;
  onSectionAction?: (id: string, action: SectionAction) => void;
  onClearField?: () => void;
  viewport?: "desktop" | "tablet" | "mobile";
}) {
  const selected = useMemo(
    () => config.sections.find((s) => s.id === selectedSectionId),
    [config.sections, selectedSectionId],
  );

  const fieldCrumb = selected
    ? fieldLabelFromPath(
        selectedField,
        SECTION_LAYER_BLOCKS[selected.type] ?? [],
        locale,
      )
    : undefined;

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
    const sectionTitle = sectionLabel(
      selected.type as WebsiteSectionType,
      locale,
    );
    const SectionIcon = sectionTypeIcon(selected.type);
    return (
      <InspectorShell
        compactChrome={compactChrome}
        eyebrow={dict.editor.inspectorTab}
        title={sectionTitle}
        icon={<SectionIcon size={14} />}
        breadcrumb={fieldCrumb ? [sectionTitle, fieldCrumb] : [sectionTitle]}
        onBreadcrumbClick={(index) => {
          if (index === 0) {
            onClearField?.();
          }
        }}
        hint={dict.editor.inspectorHintSection}
        actions={
          selected.type !== "footer" ? (
            <div className="editor-inspector-actions">
              <button
                type="button"
                className="editor-inspector-action"
                title={dict.editor.duplicate}
                aria-label={dict.editor.duplicate}
                onClick={() => onSectionAction?.(selected.id, "duplicate")}
              >
                <Copy size={13} />
              </button>
              <button
                type="button"
                className="editor-inspector-action"
                title={dict.editor.moveUp}
                aria-label={dict.editor.moveUp}
                onClick={() => onSectionAction?.(selected.id, "move-up")}
              >
                <ChevronDown size={13} className="rotate-180" />
              </button>
              <button
                type="button"
                className="editor-inspector-action"
                title={dict.editor.moveDown}
                aria-label={dict.editor.moveDown}
                onClick={() => onSectionAction?.(selected.id, "move-down")}
              >
                <ChevronDown size={13} />
              </button>
              <button
                type="button"
                className="editor-inspector-action"
                title={
                  selected.visible
                    ? dict.editor.sectionVisible
                    : dict.editor.sectionHidden
                }
                aria-label={
                  selected.visible
                    ? dict.editor.sectionVisible
                    : dict.editor.sectionHidden
                }
                onClick={() => onSectionAction?.(selected.id, "toggle")}
              >
                {selected.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button
                type="button"
                className="editor-inspector-action"
                data-danger=""
                title={dict.editor.delete}
                aria-label={dict.editor.delete}
                onClick={() => onSectionAction?.(selected.id, "delete")}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : null
        }
      >
        <div className="editor-site-group mb-3" role="tablist">
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
              role="tab"
              aria-selected={sectionTab === id}
              data-active={sectionTab === id}
              onClick={() => onSectionTabChange(id)}
              className="editor-site-group-btn"
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
          selectedField={selectedField}
          viewport={viewport}
          propertySearchFocus={propertySearchFocus}
          onChange={onChange}
        />
      </InspectorShell>
    );
  }

  return (
    <InspectorShell
      compactChrome={compactChrome}
      eyebrow={dict.editor.inspectorTab}
      title={config.brand.name || dict.editor.website}
      hint={dict.editor.inspectorHintSite}
    >
      <div className="editor-inspector editor-inspector-compact space-y-3">
        <div className="editor-empty-guide">
          <p className="text-[13px] font-medium text-[color:var(--ed-fg)]">
            {config.brand.name || dict.editor.website}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[color:var(--ed-muted)]">
            {dict.editor.emptyClickSection}
          </p>
          <div className="editor-empty-actions">
            {onOpenSections ? (
              <button
                type="button"
                className="editor-empty-action"
                onClick={onOpenSections}
              >
                <Search size={14} />
                {dict.editor.pickSectionCta}
              </button>
            ) : null}
            {onAddSection ? (
              <button
                type="button"
                className="editor-empty-action"
                onClick={onAddSection}
              >
                <Plus size={14} />
                {dict.editor.emptyQuickAdd}
              </button>
            ) : null}
            {onBrowseTemplates ? (
              <button
                type="button"
                className="editor-empty-action"
                onClick={onBrowseTemplates}
              >
                <Settings2 size={14} />
                {dict.editor.template}
              </button>
            ) : null}
            <button
              type="button"
              className="editor-empty-action"
              onClick={() => onSiteGroupChange("style")}
            >
              <Palette size={14} />
              {dict.editor.emptyQuickStyle}
            </button>
            <button
              type="button"
              className="editor-empty-action"
              onClick={() => onSiteGroupChange("site")}
            >
              <Settings2 size={14} />
              {dict.editor.emptyQuickSeo}
            </button>
          </div>
        </div>

        <SiteIdentityCard config={config} dict={dict} locale={locale} />

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
              onClick={() => onSiteGroupChange(id)}
              className="editor-site-group-btn"
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-0.5">
          {siteGroup === "style" ? (
            <>
              <InspectorBlock title={dict.editor.designPresets}>
                <WebsiteQuickSettings
                  config={config}
                  dict={dict}
                  locale={locale}
                  onChange={onChange}
                  presetsOnly
                />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.colors} collapsed>
                <ColorsPanel
                  config={config}
                  dict={dict}
                  locale={locale}
                  onChange={onChange}
                />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.typography} collapsed>
                <TypographyPanel
                  config={config}
                  dict={dict}
                  onChange={onChange}
                />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.designSystem} collapsed>
                <DesignSystemPanel
                  config={config}
                  dict={dict}
                  onChange={onChange}
                />
              </InspectorBlock>
            </>
          ) : null}

          {siteGroup === "content" ? (
            <>
              <InspectorBlock title={dict.editor.brand}>
                <BrandPanel config={config} dict={dict} onChange={onChange} />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.content} collapsed>
                <ContentPanel config={config} dict={dict} onChange={onChange} />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.media} collapsed>
                <MediaPanel config={config} dict={dict} onChange={onChange} />
              </InspectorBlock>
            </>
          ) : null}

          {siteGroup === "site" ? (
            <>
              <InspectorBlock title={dict.editor.seo}>
                <SeoPanel config={config} dict={dict} onChange={onChange} />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.settings} collapsed>
                <SettingsPanel
                  config={config}
                  dict={dict}
                  onChange={onChange}
                  canRemoveBranding={canRemoveBranding}
                />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.template} collapsed>
                <TemplatePanel
                  config={config}
                  dict={dict}
                  locale={locale}
                  onChange={onChange}
                />
              </InspectorBlock>
              <InspectorBlock title={dict.editor.versions} collapsed>
                <VersionsPanel
                  websiteId={websiteId}
                  dict={dict}
                  onRestored={onRestored}
                />
              </InspectorBlock>
            </>
          ) : null}
        </div>
      </div>
    </InspectorShell>
  );
}

function InspectorBlock({
  title,
  children,
  collapsed = false,
}: {
  title: string;
  children: ReactNode;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <section className="border-b border-[color:var(--ed-border)] pb-2 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-2 text-start"
      >
        <h3 className="text-[10px] font-semibold tracking-[0.1em] text-[color:var(--ed-subtle)] uppercase">
          {title}
        </h3>
        <ChevronDown
          size={13}
          className={cn(
            "text-[color:var(--ed-subtle)] transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="space-y-2.5 pb-2">{children}</div> : null}
    </section>
  );
}

function InspectorShell({
  compactChrome,
  eyebrow,
  title,
  icon,
  breadcrumb,
  onBreadcrumbClick,
  hint,
  actions,
  children,
}: {
  compactChrome: boolean;
  eyebrow: string;
  title: string;
  icon?: ReactNode;
  breadcrumb?: string[];
  onBreadcrumbClick?: (index: number) => void;
  hint: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "editor-inspector-sticky-header shrink-0 border-b border-[color:var(--ed-border)]",
          compactChrome ? "px-3 py-2" : "px-3.5 py-2.5",
        )}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {!compactChrome ? (
              <p className="text-[10px] font-medium tracking-[0.12em] text-[color:var(--ed-subtle)] uppercase">
                {eyebrow}
              </p>
            ) : null}
            {breadcrumb && breadcrumb.length > 0 ? (
              <nav
                aria-label="Breadcrumb"
                className={cn(
                  "editor-breadcrumb flex flex-wrap items-center gap-1.5",
                  !compactChrome && "mt-1",
                )}
              >
                {icon ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-md bg-[color:var(--ed-bg-soft)] text-[color:var(--ed-muted)]">
                    {icon}
                  </span>
                ) : null}
                {breadcrumb.map((crumb, index) => (
                  <span key={`${crumb}-${index}`} className="contents">
                    {index > 0 ? (
                      <span className="text-[color:var(--ed-subtle)]">›</span>
                    ) : null}
                    {onBreadcrumbClick && index < breadcrumb.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => onBreadcrumbClick(index)}
                        className={cn(
                          "truncate text-[color:var(--ed-muted)] transition hover:text-[color:var(--ed-fg)]",
                          compactChrome ? "text-[12px]" : "text-[13px]",
                        )}
                      >
                        {crumb}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "truncate",
                          compactChrome ? "text-[12px]" : "text-[13px]",
                          index === breadcrumb.length - 1
                            ? "font-semibold text-[color:var(--ed-fg)]"
                            : "text-[color:var(--ed-muted)]",
                        )}
                      >
                        {crumb}
                      </span>
                    )}
                  </span>
                ))}
              </nav>
            ) : (
              <p
                className={cn(
                  "truncate font-semibold tracking-tight text-[color:var(--ed-fg)]",
                  compactChrome ? "text-[13px]" : "mt-1 text-[14px]",
                )}
              >
                {title}
              </p>
            )}
            {!compactChrome ? (
              <p className="mt-1 text-[11px] leading-4 text-[color:var(--ed-muted)]">
                {hint}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
      </div>
      <div className="editor-inspector editor-inspector-compact editor-inspector-light min-h-0 flex-1 overflow-y-auto p-3">
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
          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 text-[13px] font-semibold tracking-tight text-white"
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
          <p className="truncate text-[13px] font-semibold tracking-tight text-[color:var(--ed-fg)]">
            {config.brand.name || dict.editor.website}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[color:var(--ed-muted)]">
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
            <span className="text-[10px] text-[color:var(--ed-subtle)]" aria-hidden>
              ·
            </span>
            <span className="text-[10.5px] font-medium text-[color:var(--ed-muted)]">
              {langLabel} · {dirLabel}
            </span>
            {config.settings.mood ? (
              <>
                <span className="text-[10px] text-[color:var(--ed-subtle)]" aria-hidden>
                  ·
                </span>
                <span className="text-[10.5px] capitalize text-[color:var(--ed-muted)]">
                  {config.settings.mood}
                </span>
              </>
            ) : null}
            <span className="text-[10px] text-[color:var(--ed-subtle)]" aria-hidden>
              ·
            </span>
            <span className="text-[10.5px] text-[color:var(--ed-muted)]">
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
                onClick={() => {
                  const result = commandApplyThemePreset(
                    config,
                    preset.id as DesignPresetId,
                  );
                  onChange(result.config);
                }}
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
  selectedField,
  viewport,
  propertySearchFocus = 0,
  onChange,
}: {
  config: WebsiteConfig;
  sectionId: string;
  sectionType: WebsiteSectionType;
  dict: Dictionary;
  locale: Locale;
  tab: SectionTab;
  selectedField?: EditorFieldPath;
  viewport: "desktop" | "tablet" | "mobile";
  propertySearchFocus?: number;
  onChange: (next: WebsiteConfig) => void;
}) {
  const [propertyQuery, setPropertyQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const section = config.sections.find((s) => s.id === sectionId);

  const schema = getSectionSchema(sectionType);
  const schemaDriven = Boolean(
    schema &&
      Object.keys(schema).some((key) => {
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

  const showContent = tab === "content";
  const showLayout = tab === "layout";
  const showStyle = tab === "style";

  useEffect(() => {
    if (!propertySearchFocus) return;
    searchRef.current?.focus();
    searchRef.current?.select();
  }, [propertySearchFocus]);

  if (!section) return null;

  return (
    <div className="space-y-3">
      <SectionVariantPicker
        sectionType={sectionType}
        sectionId={sectionId}
        currentVariant={section.variant}
        locale={locale}
        config={config}
        onChange={onChange}
      />
      {schemaDriven ? (
        <label className="editor-search-field">
          <Search size={13} />
          <input
            ref={searchRef}
            value={propertyQuery}
            onChange={(e) => setPropertyQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                if (propertyQuery) {
                  setPropertyQuery("");
                } else {
                  (e.target as HTMLInputElement).blur();
                }
              }
            }}
            placeholder={dict.editor.searchProperties}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[color:var(--ed-fg)] outline-none placeholder:text-[color:var(--ed-subtle)]"
          />
          <kbd className="editor-kbd">⌘/</kbd>
        </label>
      ) : null}

      {schemaDriven && schema ? (
        <SchemaInspectorPanel
          config={config}
          section={section}
          schema={schema}
          groups={schemaGroups}
          locale={locale}
          selectedField={selectedField}
          viewport={viewport}
          query={propertyQuery}
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
                  ["fan", dict.editor.styleFan],
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
    const productId = product!.id || product!.slug;
    if (!productId) {
      const items = [...products!.items];
      items[index] = { ...product!, ...next };
      onChange({
        ...config,
        content: {
          ...config.content,
          products: { ...products!, items },
        },
      });
      return;
    }

    if (next.imageIds) {
      const result = commandUpdateProduct(config, productId, {
        imageId: next.imageIds[0] ?? null,
      });
      if (!result) return;
      const items = [...result.config.content.products!.items];
      const idx = items.findIndex(
        (item) => (item.id || item.slug) === productId,
      );
      if (idx < 0) return;
      items[idx] = { ...items[idx]!, imageIds: next.imageIds };
      onChange({
        ...result.config,
        content: {
          ...result.config.content,
          products: { ...result.config.content.products!, items },
        },
      });
      return;
    }

    const result = commandUpdateProduct(config, productId, {
      ...(next.name !== undefined ? { name: next.name } : {}),
      ...(next.description !== undefined
        ? { description: next.description }
        : {}),
      ...(next.price !== undefined ? { price: next.price } : {}),
      ...(next.currency !== undefined ? { currency: next.currency } : {}),
      ...(next.category !== undefined ? { category: next.category } : {}),
      ...(next.hidden !== undefined ? { hidden: next.hidden } : {}),
    });
    if (result) onChange(result.config);
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

function SectionVariantPicker({
  sectionType,
  sectionId,
  currentVariant,
  locale,
  config,
  onChange,
}: {
  sectionType: WebsiteSectionType;
  sectionId: string;
  currentVariant?: string;
  locale: Locale;
  config: WebsiteConfig;
  onChange: (next: WebsiteConfig) => void;
}) {
  const variants = getSectionVariants(sectionType);
  if (variants.length < 2) return null;
  const active = currentVariant ?? variants[0]?.id;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-wide text-[color:var(--ed-subtle)] uppercase">
        {locale === "fa" ? "واریانت" : "Variant"}
      </p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Variant">
        {variants.map((variant) => {
          const selected = active === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={selected}
              className={cn(
                "min-h-8 rounded-md px-2.5 text-[11px] font-medium transition",
                selected
                  ? "bg-[color:var(--ed-select-soft)] text-[color:var(--ed-fg)]"
                  : "text-[color:var(--ed-muted)] hover:bg-[color:var(--ed-bg-hover)] hover:text-[color:var(--ed-fg)]",
              )}
              onClick={() => {
                const result = commandSetSectionVariant(
                  config,
                  sectionId,
                  variant.id,
                );
                if (result) onChange(result.config);
              }}
            >
              {variant.label[locale]}
            </button>
          );
        })}
      </div>
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
    <div className="border-b border-[color:var(--ed-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-start"
      >
        <span className="text-[10px] font-semibold tracking-wide text-[color:var(--ed-subtle)] uppercase">
          {title}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-[color:var(--ed-subtle)] transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2.5 pb-2.5">
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
    <label className="block space-y-1">
      <span className="text-[10.5px] font-medium tracking-wide text-[color:var(--ed-muted)]">
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
