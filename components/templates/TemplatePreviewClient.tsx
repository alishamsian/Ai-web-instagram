"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Locale } from "@/lib/config/env";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { WebsiteConfig, WebsitePage } from "@/types/website";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_STYLES,
  type TemplateFeature,
  type TemplateStyle,
  type TemplateCategory,
} from "@/lib/templates";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function labelFor(locale: Locale, item: { fa: string; en: string }): string {
  return locale === "fa" ? item.fa : item.en;
}

export function TemplatePreviewClient({
  locale,
  dict,
  templateId,
  name,
  description,
  category,
  style,
  tags,
  features,
  pages,
  previewConfig,
}: {
  locale: Locale;
  dict: Dictionary;
  templateId: string;
  name: { fa: string; en: string };
  description: { fa: string; en: string };
  category: TemplateCategory;
  style: TemplateStyle;
  tags: string[];
  features: TemplateFeature[];
  pages: WebsitePage[];
  /** In-memory WebsiteConfig — not persisted. */
  previewConfig: WebsiteConfig;
}) {
  const t = dict.templateCatalog;
  const router = useRouter();
  const [activePageId, setActivePageId] = useState(
    pages.find((p) => p.kind === "home")?.id || pages[0]?.id || "home",
  );
  const [brandName, setBrandName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryLabel =
    TEMPLATE_CATEGORIES.find((c) => c.id === category)?.label ?? null;
  const styleLabel = TEMPLATE_STYLES.find((s) => s.id === style)?.label ?? null;

  const configForPage = useMemo(
    () => ({ ...previewConfig, pages }),
    [previewConfig, pages],
  );

  function useTemplate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/templates/instantiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId,
            brandName: brandName.trim() || undefined,
            locale,
          }),
        });
        if (res.status === 401) {
          router.push(
            `/${locale}/login?next=/${locale}/templates/${templateId}`,
          );
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          websiteId?: string;
          error?: string;
        };
        if (!res.ok || !data.websiteId) {
          setError(t.failed);
          return;
        }
        router.push(`/${locale}/editor/${data.websiteId}/visual`);
      } catch {
        setError(t.failed);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-5 py-6 md:px-8">
          <div className="min-w-0 flex-1">
            <Link
              href={`/${locale}/templates`}
              className="text-sm text-muted-foreground hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              ← {t.back}
            </Link>
            <h1 className="mt-3 font-display text-3xl text-ink md:text-4xl">
              {labelFor(locale, name)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              {labelFor(locale, description)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {categoryLabel ? (
                <span className="rounded-md bg-muted px-2 py-1">
                  {labelFor(locale, categoryLabel)}
                </span>
              ) : null}
              {styleLabel ? (
                <span className="rounded-md bg-muted px-2 py-1">
                  {labelFor(locale, styleLabel)}
                </span>
              ) : null}
              {tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-2 py-1">
                  {tag}
                </span>
              ))}
            </div>
            {features.length > 0 ? (
              <ul
                className="mt-3 flex flex-wrap gap-1.5"
                aria-label={t.features}
              >
                {features.map((f) => (
                  <li
                    key={f}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px]"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="w-full max-w-sm rounded-2xl border border-border bg-[#fafafa] p-4">
            <label
              htmlFor="template-brand-name"
              className="text-sm font-medium text-ink"
            >
              {t.brandName}
            </label>
            <Input
              id="template-brand-name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t.brandNamePlaceholder}
              className="mt-2"
              disabled={pending}
            />
            <Button
              type="button"
              className="mt-3 w-full"
              onClick={useTemplate}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? t.using : t.useTemplate}
            </Button>
            {error ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <nav aria-label={t.pageNav} className="mb-4 flex flex-wrap gap-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActivePageId(page.id)}
              aria-current={activePageId === page.id ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                activePageId === page.id
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-white text-foreground-muted hover:text-ink",
              )}
            >
              {page.name}
            </button>
          ))}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgba(18,18,18,0.06)]">
          <WebsiteRenderer
            config={configForPage}
            mode="preview"
            pageId={activePageId}
            basePath={`/${locale}/templates/${templateId}`}
          />
        </div>
      </div>
    </div>
  );
}
