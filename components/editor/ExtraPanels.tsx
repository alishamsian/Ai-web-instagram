"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { TemplateType, WebsiteConfig } from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/editor/MediaPicker";
import { applyTemplate } from "@/components/editor/editor-utils";
import { templates, templateOrder } from "@/lib/website/templates";
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

export function MediaPanel({
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
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.mediaHint}
      </p>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.logo}
        </p>
        <MediaPicker
          config={config}
          value={
            Object.entries(config.media).find(
              ([, m]) => m.url === config.brand.logo,
            )?.[0]
          }
          onPick={(id) => {
            const media = config.media[id];
            if (!media) return;
            onChange({
              ...config,
              brand: { ...config.brand, logo: media.url },
            });
          }}
          onClear={() =>
            onChange({
              ...config,
              brand: { ...config.brand, logo: undefined },
            })
          }
          clearLabel={dict.editor.clearMedia}
          emptyLabel={dict.editor.noMedia}
        />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.heroImage}
        </p>
        <MediaPicker
          config={config}
          value={config.content.hero.imageId}
          onPick={(id) =>
            onChange({
              ...config,
              content: {
                ...config.content,
                hero: { ...config.content.hero, imageId: id },
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
          clearLabel={dict.editor.clearMedia}
          emptyLabel={dict.editor.noMedia}
        />
      </div>

      {config.content.about ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            {dict.editor.aboutImage}
          </p>
          <MediaPicker
            config={config}
            value={config.content.about.imageId}
            onPick={(id) =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  about: { ...config.content.about!, imageId: id },
                },
              })
            }
            onClear={() =>
              onChange({
                ...config,
                content: {
                  ...config.content,
                  about: { ...config.content.about!, imageId: undefined },
                },
              })
            }
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
          />
        </div>
      ) : null}

      {config.content.gallery ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">
            {dict.editor.galleryImages}
          </p>
          <MediaPicker
            config={config}
            multi
            values={config.content.gallery.imageIds}
            onPick={(id) => {
              const ids = config.content.gallery!.imageIds;
              const next = ids.includes(id)
                ? ids.filter((x) => x !== id)
                : [...ids, id];
              onChange({
                ...config,
                content: {
                  ...config.content,
                  gallery: { ...config.content.gallery!, imageIds: next },
                },
              });
            }}
            clearLabel={dict.editor.clearMedia}
            emptyLabel={dict.editor.noMedia}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SeoPanel({
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
      <Field label={dict.editor.seoTitle}>
        <Input
          value={config.seo.title}
          onChange={(event) =>
            onChange({
              ...config,
              seo: { ...config.seo, title: event.target.value },
            })
          }
        />
      </Field>
      <Field label={dict.editor.seoDescription}>
        <Textarea
          className="min-h-28 rounded-xl"
          value={config.seo.description}
          onChange={(event) =>
            onChange({
              ...config,
              seo: { ...config.seo, description: event.target.value },
            })
          }
        />
      </Field>
      <Field label={dict.editor.seoKeywords}>
        <Input
          value={config.seo.keywords.join(", ")}
          onChange={(event) =>
            onChange({
              ...config,
              seo: {
                ...config.seo,
                keywords: event.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean),
              },
            })
          }
        />
      </Field>
    </div>
  );
}

export function SettingsPanel({
  config,
  dict,
  onChange,
  canRemoveBranding = false,
}: {
  config: WebsiteConfig;
  dict: Dictionary;
  onChange: (next: WebsiteConfig) => void;
  canRemoveBranding?: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.language}
        </p>
        <Segmented<"fa" | "en">
          value={config.settings.language}
          onChange={(language) =>
            onChange({
              ...config,
              settings: {
                ...config.settings,
                language,
                direction: language === "fa" ? "rtl" : "ltr",
              },
            })
          }
          options={[
            { id: "fa", label: "فارسی" },
            { id: "en", label: "English" },
          ]}
        />
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {dict.editor.direction}
        </p>
        <Segmented<"rtl" | "ltr">
          value={config.settings.direction}
          onChange={(direction) =>
            onChange({
              ...config,
              settings: { ...config.settings, direction },
            })
          }
          options={[
            { id: "rtl", label: "RTL" },
            { id: "ltr", label: "LTR" },
          ]}
        />
      </div>
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
        <span>
          {dict.editor.showBranding}
          {!canRemoveBranding ? (
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Pro
            </span>
          ) : null}
        </span>
        <input
          type="checkbox"
          checked={config.settings.showBranding}
          disabled={!canRemoveBranding && config.settings.showBranding}
          onChange={(event) => {
            if (!canRemoveBranding && !event.target.checked) return;
            onChange({
              ...config,
              settings: {
                ...config.settings,
                showBranding: canRemoveBranding
                  ? event.target.checked
                  : true,
              },
            });
          }}
        />
      </label>
    </div>
  );
}

export function TemplatePanel({
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
  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.templateHint}
      </p>
      <div className="space-y-2">
        {templateOrder.map((id) => {
          const def = templates[id];
          const active = config.template === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(applyTemplate(config, id as TemplateType))}
              className={cn(
                "w-full rounded-2xl border px-3.5 py-3 text-start transition",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white hover:border-ink/30",
              )}
            >
              <p className="text-sm font-medium">{def.name[locale]}</p>
              <p
                className={cn(
                  "mt-1 text-[12px] leading-5",
                  active ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {def.description[locale]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type VersionListItem = { id: string; version: number; createdAt: string };

export function VersionsPanel({
  websiteId,
  dict,
  onRestored,
}: {
  websiteId: string;
  dict: Dictionary;
  onRestored: (config: WebsiteConfig) => void;
}) {
  const [versions, setVersions] = useState<VersionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const response = await fetch(`/api/websites/${websiteId}/versions`);
      if (!cancelled && response.ok) {
        const data = (await response.json()) as { versions: VersionListItem[] };
        setVersions(data.versions);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [websiteId]);

  async function restore(versionId: string) {
    setBusyId(versionId);
    const response = await fetch(`/api/websites/${websiteId}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    setBusyId(null);
    if (!response.ok) return;
    const website = (await response.json()) as { config: WebsiteConfig };
    onRestored(website.config);
    const refresh = await fetch(`/api/websites/${websiteId}/versions`);
    if (refresh.ok) {
      const data = (await refresh.json()) as { versions: VersionListItem[] };
      setVersions(data.versions);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-5 text-muted-foreground">
        {dict.editor.versionsHint}
      </p>
      {loading ? (
        <p className="text-[12px] text-muted-foreground">…</p>
      ) : versions.length === 0 ? (
        <p className="rounded-xl bg-muted px-3 py-2.5 text-[12px] text-muted-foreground">
          {dict.editor.noVersions}
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium">v{item.version}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyId === item.id}
                onClick={() => void restore(item.id)}
              >
                {busyId === item.id
                  ? dict.editor.restoring
                  : dict.editor.restoreVersion}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
