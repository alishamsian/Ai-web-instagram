"use client";

import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type {
  ColorConfig,
  TypographyConfig,
  WebsiteConfig,
} from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { COLOR_PRESETS } from "@/components/editor/editor-utils";
import { cn } from "@/lib/utils";
import {
  applyCommandResult,
  commandSetBrandColor,
  commandSetBrandColors,
  commandSetBrandDesign,
  commandSetBrandTypography,
  commandSetContentPath,
  commandSetSectionVariant,
} from "@/lib/editor";
import { getSectionVariants } from "@/lib/store/registry/catalog";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

export function BrandPanel({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label={dict.editor.brandName}>
        <Input
          value={config.brand.name}
          onChange={(event) =>
            applyCommandResult(
              commandSetContentPath(
                config,
                "brand.name",
                event.target.value,
              ),
              onChange,
            )
          }
        />
      </Field>
      <Field label={dict.editor.tagline}>
        <Textarea
          className="min-h-24 rounded-xl"
          value={config.brand.tagline ?? ""}
          onChange={(event) =>
            applyCommandResult(
              commandSetContentPath(
                config,
                "brand.tagline",
                event.target.value,
              ),
              onChange,
            )
          }
        />
      </Field>
    </div>
  );
}

export function ColorsPanel({
  config,
  dict,
  locale,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  onChange: (next: WebsiteConfig) => void;
}) {
  const keys: { key: keyof ColorConfig; label: string }[] = [
    { key: "primary", label: dict.editor.colorPrimary },
    { key: "accent", label: dict.editor.colorAccent },
    { key: "background", label: dict.editor.colorBackground },
    { key: "foreground", label: dict.editor.colorForeground },
    { key: "secondary", label: dict.editor.colorSecondary },
    { key: "muted", label: dict.editor.colorMuted },
  ];

  function setColor(key: keyof ColorConfig, value: string) {
    onChange(commandSetBrandColor(config, key, value).config);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          {dict.editor.presets}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.label[locale]}
              onClick={() =>
                onChange(commandSetBrandColors(config, preset.colors).config)
              }
              className="group flex flex-col items-center gap-1.5"
            >
              <span className="flex size-10 overflow-hidden rounded-xl ring-1 ring-border transition group-hover:ring-ink/30">
                <span
                  className="h-full w-1/2"
                  style={{ background: preset.colors.background }}
                />
                <span
                  className="h-full w-1/2"
                  style={{ background: preset.colors.accent }}
                />
              </span>
              <span className="text-[9px] text-muted-foreground">
                {preset.label[locale]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {keys.map((item) => (
          <label key={item.key} className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {item.label}
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-border bg-white p-1.5">
              <input
                type="color"
                className="size-9 cursor-pointer rounded-lg border-0 bg-transparent"
                value={config.brand.colors[item.key]}
                onChange={(event) => setColor(item.key, event.target.value)}
              />
              <input
                className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none"
                value={config.brand.colors[item.key]}
                onChange={(event) => setColor(item.key, event.target.value)}
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function TypographyPanel({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.headingFont}
        </p>
        <Segmented<TypographyConfig["heading"]>
          value={config.brand.typography.heading}
          onChange={(heading) =>
            onChange(commandSetBrandTypography(config, { heading }).config)
          }
          options={[
            { id: "serif", label: dict.editor.fontSerif },
            { id: "sans", label: dict.editor.fontSans },
            { id: "display", label: dict.editor.fontDisplay },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.bodyFont}
        </p>
        <Segmented<TypographyConfig["body"]>
          value={config.brand.typography.body}
          onChange={(body) =>
            onChange(commandSetBrandTypography(config, { body }).config)
          }
          options={[
            { id: "sans", label: dict.editor.fontSans },
            { id: "serif", label: dict.editor.fontSerif },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.typeScale}
        </p>
        <Segmented<TypographyConfig["scale"]>
          value={config.brand.typography.scale}
          onChange={(scale) =>
            onChange(commandSetBrandTypography(config, { scale }).config)
          }
          options={[
            { id: "editorial", label: dict.editor.scaleEditorial },
            { id: "compact", label: dict.editor.scaleCompact },
            { id: "bold", label: dict.editor.scaleBold },
          ]}
        />
      </div>
    </div>
  );
}

export function LayoutPanel({
  config,
  dict,
  locale,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  locale: Locale;
  onChange: (next: WebsiteConfig) => void;
}) {
  const heroSection = config.sections.find((s) => s.type === "hero");
  const variants = getSectionVariants("hero");
  const current =
    heroSection?.variant ?? config.content.hero.style ?? variants[0]?.id ?? "fan";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.heroStyle}
        </p>
        <Segmented
          value={current}
          onChange={(style) => {
            if (!heroSection) {
              applyCommandResult(
                commandSetContentPath(config, "content.hero.style", style),
                onChange,
              );
              return;
            }
            applyCommandResult(
              commandSetSectionVariant(config, heroSection.id, style),
              onChange,
            );
          }}
          options={variants.map((v) => ({
            id: v.id,
            label: v.label[locale] ?? v.id,
          }))}
        />
      </div>
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12px] leading-5 text-muted-foreground">
        {dict.editor.canvasHint}
      </p>
    </div>
  );
}

export function DesignSystemPanel({
  config,
  dict,
  onChange,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
}) {
  const design = {
    contentWidth: config.brand.design?.contentWidth ?? "default",
    sectionSpacing: config.brand.design?.sectionSpacing ?? "comfortable",
    radius: config.brand.design?.radius ?? "soft",
    shadow: config.brand.design?.shadow ?? "subtle",
  } as const;

  function patch(next: Partial<typeof design>) {
    onChange(commandSetBrandDesign(config, next).config);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.designContentWidth}
        </p>
        <Segmented
          value={design.contentWidth}
          onChange={(contentWidth) => patch({ contentWidth })}
          options={[
            { id: "narrow", label: dict.editor.widthNarrow },
            { id: "default", label: dict.editor.widthMedium },
            { id: "wide", label: dict.editor.widthFull },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.designSectionSpacing}
        </p>
        <Segmented
          value={design.sectionSpacing}
          onChange={(sectionSpacing) => patch({ sectionSpacing })}
          options={[
            { id: "compact", label: dict.editor.spacingCompact },
            { id: "comfortable", label: dict.editor.spacingComfortable },
            { id: "spacious", label: dict.editor.spacingSpacious },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.designRadius}
        </p>
        <Segmented
          value={design.radius}
          onChange={(radius) => patch({ radius })}
          options={[
            { id: "sharp", label: dict.editor.radiusSharp },
            { id: "soft", label: dict.editor.radiusSoft },
            { id: "rounded", label: dict.editor.radiusRounded },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.designShadow}
        </p>
        <Segmented
          value={design.shadow}
          onChange={(shadow) => patch({ shadow })}
          options={[
            { id: "none", label: dict.editor.shadowNone },
            { id: "subtle", label: dict.editor.shadowSubtle },
            { id: "elevated", label: dict.editor.shadowElevated },
          ]}
        />
      </div>
    </div>
  );
}
