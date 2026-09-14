"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { WebsiteConfig, WebsiteSectionType } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import {
  getDefaultVariant,
  getRecommendedVariants,
  getVariantsForSection,
  resolveSectionVariant,
} from "@/lib/store/registry/variant-api";
import type { SectionVariant } from "@/lib/store/registry/types";
import { applySectionVariant } from "@/lib/editor/apply-section-variant";
import { VariantPreview } from "@/components/editor/variant-library/VariantPreview";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Props = {
  config: WebsiteConfig;
  sectionId: string;
  sectionType: WebsiteSectionType;
  currentVariant?: string;
  locale: Locale;
  onChange: (next: WebsiteConfig, label?: string) => void;
};

/**
 * Visual Library for the selected section — registry-backed, command-driven Apply.
 */
export function SectionVariantLibrary({
  config,
  sectionId,
  sectionType,
  currentVariant,
  locale,
  onChange,
}: Props) {
  const labelId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);

  const variants = getVariantsForSection(sectionType);
  const resolved = resolveSectionVariant(sectionType, currentVariant);
  const activeId = resolved.id ?? getDefaultVariant(sectionType)?.id ?? null;
  const recommended = useMemo(() => {
    const mood = config.settings.mood;
    return new Set(
      getRecommendedVariants(sectionType, mood).map((v) => v.id),
    );
  }, [config.settings.mood, sectionType]);

  if (variants.length < 2) return null;

  const filtered = query.trim()
    ? variants.filter((v) => {
        const q = query.trim().toLowerCase();
        return (
          v.id.toLowerCase().includes(q) ||
          v.label.fa.toLowerCase().includes(q) ||
          v.label.en.toLowerCase().includes(q) ||
          v.description?.fa?.toLowerCase().includes(q) ||
          v.description?.en?.toLowerCase().includes(q)
        );
      })
    : variants;

  const activeMeta = variants.find((v) => v.id === activeId);

  function apply(variant: SectionVariant) {
    const result = applySectionVariant(config, sectionId, variant.id);
    if (!result) return;
    onChange(result.config, result.label);
  }

  return (
    <section className="ed-variant-library" aria-labelledby={labelId}>
      <div className="ed-variant-library__head">
        <div className="min-w-0 flex-1">
          <p id={labelId} className="ed-variant-library__title">
            {locale === "fa" ? "ظاهر بصری" : "Appearance"}
          </p>
          <p className="ed-variant-library__current">
            {locale === "fa" ? "فعلی: " : "Current: "}
            <strong>{activeMeta?.label[locale] ?? activeId}</strong>
          </p>
        </div>
        <button
          type="button"
          className="ed-variant-library__toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open
            ? locale === "fa"
              ? "بستن"
              : "Close"
            : locale === "fa"
              ? "مرور استایل‌ها"
              : "Browse styles"}
        </button>
      </div>

      {open ? (
        <div className="ed-variant-library__body">
          {variants.length > 4 ? (
            <label className="ed-variant-library__search">
              <span className="sr-only">
                {locale === "fa" ? "جستجوی واریانت" : "Search variants"}
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={locale === "fa" ? "جستجو…" : "Search…"}
              />
            </label>
          ) : null}

          <div
            className="ed-variant-library__grid"
            role="listbox"
            aria-label={
              locale === "fa" ? "کتابخانه واریانت" : "Variant library"
            }
          >
            {filtered.map((variant) => {
              const selected = variant.id === activeId;
              const isRecommended = recommended.has(variant.id);
              return (
                <VariantCard
                  key={variant.id}
                  config={config}
                  sectionId={sectionId}
                  variant={variant}
                  locale={locale}
                  selected={selected}
                  recommended={isRecommended}
                  onApply={() => apply(variant)}
                />
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="ed-variant-library__empty">
              {locale === "fa" ? "نتیجه‌ای نبود." : "No matches."}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function VariantCard({
  config,
  sectionId,
  variant,
  locale,
  selected,
  recommended,
  onApply,
}: {
  config: WebsiteConfig;
  sectionId: string;
  variant: SectionVariant;
  locale: Locale;
  selected: boolean;
  recommended: boolean;
  onApply: () => void;
}) {
  const responsive = variant.responsive;
  const desc = variant.description?.[locale];

  const applyLabel = selected
    ? locale === "fa"
      ? `${variant.label[locale]} — فعلی`
      : `${variant.label[locale]} — current`
    : locale === "fa"
      ? `اعمال ${variant.label[locale]}`
      : `Apply ${variant.label[locale]}`;

  // Interactive option must not wrap preview store chrome in <button> —
  // real section renderers include nested <button>/<a> (wishlist, CTAs).
  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={selected}
      aria-label={applyLabel}
      className={cn(
        "ed-variant-card",
        selected && "ed-variant-card--selected",
      )}
      onClick={onApply}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onApply();
        }
      }}
    >
      <div className="ed-variant-card__hit">
        <LazyVariantPreview
          config={config}
          sectionId={sectionId}
          variantId={variant.id}
        />
        <div className="ed-variant-card__meta">
          <div className="ed-variant-card__row">
            <span className="ed-variant-card__name">
              {variant.label[locale]}
            </span>
            {selected ? (
              <span className="ed-variant-card__badge ed-variant-card__badge--current">
                <Check size={11} strokeWidth={2.5} aria-hidden />
                {locale === "fa" ? "فعلی" : "Current"}
              </span>
            ) : recommended ? (
              <span className="ed-variant-card__badge">
                {locale === "fa" ? "پیشنهادی" : "Recommended"}
              </span>
            ) : null}
          </div>
          {desc ? <p className="ed-variant-card__desc">{desc}</p> : null}
          {responsive ? (
            <p className="ed-variant-card__responsive">
              <span>
                {locale === "fa" ? "دسکتاپ" : "Desktop"} · {responsive.desktop}
              </span>
              <span>
                {locale === "fa" ? "موبایل" : "Mobile"} · {responsive.mobile}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LazyVariantPreview({
  config,
  sectionId,
  variantId,
}: {
  config: WebsiteConfig;
  sectionId: string;
  variantId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "80px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {visible ? (
        <VariantPreview
          config={config}
          sectionId={sectionId}
          variantId={variantId}
        />
      ) : (
        <div className="ed-variant-preview ed-variant-preview--empty" />
      )}
    </div>
  );
}
