"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { TemplateType, WebsiteConfig } from "@/types/website";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/editor/MediaPicker";
import {
  commandApplyTemplate,
  applyCommandResult,
  commandSetGalleryImages,
  commandToggleGalleryImage,
  commandSetSeoField,
  commandSetSeoKeywords,
  commandAssignMedia,
  commandSetBrandLogo,
  commandUpdateSiteSettings,
} from "@/lib/editor";
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
          onPick={(id) =>
            applyCommandResult(commandSetBrandLogo(config, id), onChange)
          }
          onClear={() =>
            applyCommandResult(commandSetBrandLogo(config, null), onChange)
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
            applyCommandResult(
              commandAssignMedia(config, "content.hero.imageId", id),
              onChange,
            )
          }
          onClear={() =>
            applyCommandResult(
              commandAssignMedia(config, "content.hero.imageId", null),
              onChange,
            )
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
              applyCommandResult(
                commandAssignMedia(config, "content.about.imageId", id),
                onChange,
              )
            }
            onClear={() =>
              applyCommandResult(
                commandAssignMedia(config, "content.about.imageId", null),
                onChange,
              )
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
              applyCommandResult(
                commandToggleGalleryImage(config, id),
                onChange,
              );
            }}
            onClear={() =>
              applyCommandResult(commandSetGalleryImages(config, []), onChange)
            }
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
  const title = config.seo.title;
  const description = config.seo.description;
  const titleLen = title.length;
  const descLen = description.length;

  return (
    <div className="space-y-4">
      <div className="editor-seo-serp">
        <p className="mb-2 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {dict.editor.seoPreview}
        </p>
        <p className="editor-seo-serp-title line-clamp-2">
          {title || config.brand.name || "—"}
        </p>
        <p className="editor-seo-serp-url" dir="ltr">
          vitrin.app › s › …
        </p>
        <p className="editor-seo-serp-desc line-clamp-2">
          {description || config.brand.tagline || "—"}
        </p>
      </div>

      <Field label={dict.editor.seoTitle}>
        <Input
          value={title}
          onChange={(event) =>
            applyCommandResult(
              commandSetSeoField(config, "title", event.target.value),
              onChange,
            )
          }
        />
        <p
          className={cn(
            "mt-1 text-[10.5px] tabular-nums",
            titleLen > 60 ? "text-amber-700" : "text-muted-foreground",
          )}
        >
          {titleLen}/60 · {dict.editor.seoTitleHint}
        </p>
      </Field>
      <Field label={dict.editor.seoDescription}>
        <Textarea
          className="min-h-28 rounded-xl"
          value={description}
          onChange={(event) =>
            applyCommandResult(
              commandSetSeoField(config, "description", event.target.value),
              onChange,
            )
          }
        />
        <p
          className={cn(
            "mt-1 text-[10.5px] tabular-nums",
            descLen > 155 ? "text-amber-700" : "text-muted-foreground",
          )}
        >
          {descLen}/155 · {dict.editor.seoDescHint}
        </p>
      </Field>
      <Field label={dict.editor.seoKeywords}>
        <Input
          value={config.seo.keywords.join(", ")}
          onChange={(event) =>
            applyCommandResult(
              commandSetSeoKeywords(
                config,
                event.target.value.split(",").map((k) => k.trim()),
              ),
              onChange,
            )
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
    <div className="space-y-3">
      <div className="editor-setting-row">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink">
            {dict.editor.language}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {dict.editor.languageHint}
          </p>
        </div>
        <Segmented<"fa" | "en">
          value={config.settings.language}
          onChange={(language) =>
            onChange(
              commandUpdateSiteSettings(config, { language }).config,
            )
          }
          options={[
            { id: "fa", label: "فارسی" },
            { id: "en", label: "EN" },
          ]}
        />
      </div>

      <div className="editor-setting-row">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink">
            {dict.editor.direction}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            RTL / LTR
          </p>
        </div>
        <Segmented<"rtl" | "ltr">
          value={config.settings.direction}
          onChange={(direction) =>
            onChange(commandUpdateSiteSettings(config, { direction }).config)
          }
          options={[
            { id: "rtl", label: "RTL" },
            { id: "ltr", label: "LTR" },
          ]}
        />
      </div>

      <label className="editor-setting-row cursor-pointer">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-ink">
            {dict.editor.showBranding}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {dict.editor.brandingHint}
            {!canRemoveBranding ? " · Pro" : ""}
          </p>
        </div>
        <input
          type="checkbox"
          className="size-4 accent-ink"
          checked={config.settings.showBranding}
          disabled={!canRemoveBranding && config.settings.showBranding}
          onChange={(event) => {
            if (!canRemoveBranding && !event.target.checked) return;
            onChange(
              commandUpdateSiteSettings(config, {
                showBranding: canRemoveBranding
                  ? event.target.checked
                  : true,
              }).config,
            );
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
  const [pendingId, setPendingId] = useState<TemplateType | null>(null);

  function confirmApply() {
    if (!pendingId) return;
    const result = commandApplyTemplate(config, pendingId);
    onChange(result.config);
    setPendingId(null);
  }

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
              onClick={() => {
                if (id === config.template) return;
                setPendingId(id);
              }}
              className={cn(
                "editor-template-card w-full px-3.5 py-3 text-start transition",
                active
                  ? "border-[color:var(--ed-accent)] bg-[color:var(--ed-bg-soft)]"
                  : "border-[color:var(--ed-border)] bg-white hover:border-[color:var(--ed-border-strong)]",
              )}
            >
              <p className="text-sm font-medium text-ink">{def.name[locale]}</p>
              <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                {def.description[locale]}
              </p>
            </button>
          );
        })}
      </div>

      {pendingId ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-confirm-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={dict.editor.cancel}
            onClick={() => setPendingId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-t-2xl border border-white/10 bg-[#0D0D0F] p-5 shadow-2xl sm:rounded-2xl">
            <p
              id="template-confirm-title"
              className="text-[15px] font-medium text-[#F7F7F8]"
            >
              {dict.editor.templateConfirmTitle}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-[#77777F]">
              {dict.editor.templateConfirmBody.replace(
                "{name}",
                templates[pendingId].name[locale],
              )}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-md border border-white/10 text-[12px] text-[#B5B5BC] hover:bg-white/[0.04]"
                onClick={() => setPendingId(null)}
              >
                {dict.editor.cancel}
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-md bg-[#FF6B57] text-[12px] font-medium text-white hover:bg-[#ff7d6c]"
                onClick={confirmApply}
              >
                {dict.editor.applyTemplate}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
