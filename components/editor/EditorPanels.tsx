"use client";

import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type {
  ColorConfig,
  HeroConfig,
  TypographyConfig,
  WebsiteConfig,
} from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { COLOR_PRESETS } from "@/components/editor/editor-utils";
import { cn } from "@/lib/utils";

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
            onChange({
              ...config,
              brand: { ...config.brand, name: event.target.value },
            })
          }
        />
      </Field>
      <Field label={dict.editor.tagline}>
        <Textarea
          className="min-h-24 rounded-xl"
          value={config.brand.tagline ?? ""}
          onChange={(event) =>
            onChange({
              ...config,
              brand: { ...config.brand, tagline: event.target.value },
            })
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
    onChange({
      ...config,
      brand: {
        ...config.brand,
        colors: { ...config.brand.colors, [key]: value },
      },
    });
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
                onChange({
                  ...config,
                  brand: { ...config.brand, colors: preset.colors },
                })
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
            onChange({
              ...config,
              brand: {
                ...config.brand,
                typography: { ...config.brand.typography, heading },
              },
            })
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
            onChange({
              ...config,
              brand: {
                ...config.brand,
                typography: { ...config.brand.typography, body },
              },
            })
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
            onChange({
              ...config,
              brand: {
                ...config.brand,
                typography: { ...config.brand.typography, scale },
              },
            })
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
          {dict.editor.heroStyle}
        </p>
        <Segmented<HeroConfig["style"]>
          value={config.content.hero.style}
          onChange={(style) =>
            onChange({
              ...config,
              content: {
                ...config.content,
                hero: { ...config.content.hero, style },
              },
            })
          }
          options={[
            { id: "overlay", label: dict.editor.styleOverlay },
            { id: "split", label: dict.editor.styleSplit },
            { id: "minimal", label: dict.editor.styleMinimal },
            { id: "editorial", label: dict.editor.styleEditorial },
            { id: "menu", label: dict.editor.styleMenu },
          ]}
        />
      </div>
      <p className="rounded-xl bg-muted px-3 py-2.5 text-[12px] leading-5 text-muted-foreground">
        {dict.editor.canvasHint}
      </p>
    </div>
  );
}
