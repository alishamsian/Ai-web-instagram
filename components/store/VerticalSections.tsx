"use client";

import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { StoreSectionHead, StoreLinkButton } from "@/components/store/primitives";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import {
  filterProductsByAttribute,
  collectAttributeOptions,
} from "@/lib/store/verticals/filters";
import { cn } from "@/lib/utils";

import { resolveResponsiveColumns } from "@/lib/editor/responsive";

function settingString(
  section: SectionConfig,
  key: string,
  fallback: string,
): string {
  const value = section.settings?.[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function settingColumns(section: SectionConfig, fallback = 4) {
  return resolveResponsiveColumns(section.settings?.columns, fallback);
}

export function VerticalTaxonomySection({
  config,
  section,
  products,
  attribute,
  defaultTitle,
  defaultKicker,
  defaultLead,
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  products: StoreCatalogProduct[];
  attribute: string;
  defaultTitle: string;
  defaultKicker: string;
  defaultLead?: string;
}) {
  const isFa = config.settings.language === "fa";
  const attr =
    (section.settings?.filterAttribute as string) || attribute;
  const options = collectAttributeOptions(products, attr);
  if (options.length === 0) return null;

  return (
    <section className="store-section" data-section={section.type}>
      <div className="store-wrap">
        <StoreSectionHead
          kicker={settingString(section, "kicker", defaultKicker)}
          title={settingString(section, "title", defaultTitle)}
          lead={settingString(
            section,
            "description",
            defaultLead ??
              (isFa
                ? "مسیرهای خرید متناسب با نیاز شما."
                : "Shopping paths tailored to what you need."),
          )}
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {options.slice(0, 8).map((option) => (
            <a
              key={option}
              href={`#shop`}
              className="group min-h-11 border border-[color:var(--store-border)] bg-[color:var(--store-surface)] px-4 py-5 transition hover:border-[color:var(--store-fg)]"
            >
              <span className="block text-[13px] font-medium tracking-wide text-[color:var(--store-fg)]">
                {option}
              </span>
              <span className="mt-2 block text-[11px] text-[color:var(--store-muted)] opacity-0 transition group-hover:opacity-100">
                {isFa ? "مشاهده" : "Explore"}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VerticalStorySection({
  config,
  section,
  defaultTitle,
  defaultKicker,
  defaultLead,
  tone = "editorial",
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  defaultTitle: string;
  defaultKicker: string;
  defaultLead?: string;
  tone?: "editorial" | "band";
}) {
  const isFa = config.settings.language === "fa";
  const imageId =
    typeof section.settings?.imageId === "string"
      ? section.settings.imageId
      : undefined;
  const media = imageId ? siteMedia(config, imageId) : null;
  const galleryId = config.content.gallery?.imageIds?.[0];
  const fallbackMedia =
    media ?? (galleryId ? siteMedia(config, galleryId) : null);

  if (tone === "band") {
    return (
      <section
        className="store-section store-section--soft"
        data-section={section.type}
      >
        <div className="store-wrap flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <StoreSectionHead
            kicker={settingString(section, "kicker", defaultKicker)}
            title={settingString(section, "title", defaultTitle)}
            lead={settingString(
              section,
              "description",
              defaultLead ??
                (isFa
                  ? "جزئیات بیشتر در ادامه مسیر خرید."
                  : "More detail along the shopping journey."),
            )}
          />
          <StoreLinkButton href="#shop" variant="primary" size="md">
            {isFa ? "ادامه" : "Continue"}
          </StoreLinkButton>
        </div>
      </section>
    );
  }

  return (
    <section className="store-section" data-section={section.type}>
      <div
        className={cn(
          "store-wrap grid gap-8",
          fallbackMedia && "lg:grid-cols-2 lg:items-center",
        )}
      >
        <StoreSectionHead
          kicker={settingString(section, "kicker", defaultKicker)}
          title={settingString(section, "title", defaultTitle)}
          lead={settingString(
            section,
            "description",
            defaultLead ??
              (isFa
                ? "داستانی کوتاه از برند و محصول."
                : "A short story from the brand and product."),
          )}
        />
        {fallbackMedia ? (
          <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--store-muted)]/30 sm:aspect-[5/4]">
            <SiteMedia
              media={fallbackMedia}
              className="size-full object-cover"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function VerticalStepsSection({
  config,
  section,
  defaultTitle,
  defaultKicker,
  steps,
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  defaultTitle: string;
  defaultKicker: string;
  steps: { title: string; body: string }[];
}) {
  const isFa = config.settings.language === "fa";
  return (
    <section className="store-section" data-section={section.type}>
      <div className="store-wrap">
        <StoreSectionHead
          kicker={settingString(section, "kicker", defaultKicker)}
          title={settingString(section, "title", defaultTitle)}
          lead={settingString(
            section,
            "description",
            isFa
              ? "مراحل واضح، بدون شلوغی."
              : "Clear steps — nothing noisy.",
          )}
        />
        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="min-h-11">
              <p className="text-[11px] tracking-[0.14em] text-[color:var(--store-muted)] uppercase">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-[16px] font-medium text-[color:var(--store-fg)]">
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[color:var(--store-muted)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function VerticalFinderSection({
  config,
  section,
  products,
  attributeKeys,
  defaultTitle,
  defaultKicker,
  onQuickView,
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  products: StoreCatalogProduct[];
  attributeKeys: string[];
  defaultTitle: string;
  defaultKicker: string;
  onQuickView?: (product: StoreCatalogProduct) => void;
}) {
  const isFa = config.settings.language === "fa";
  const primaryAttr = attributeKeys[0];
  const filtered = primaryAttr
    ? filterProductsByAttribute(products, primaryAttr).slice(0, 8)
    : products.slice(0, 8);
  const list = filtered.length ? filtered : products.slice(0, 8);
  if (!list.length) return null;

  const columns = settingColumns(section, 4);

  return (
    <StoreProductGrid
      config={config}
      products={list}
      id={`finder-${section.id}`}
      columns={columns}
      soft={false}
      variant="classic"
      kicker={settingString(section, "kicker", defaultKicker)}
      title={settingString(section, "title", defaultTitle)}
      lead={settingString(
        section,
        "description",
        isFa
          ? "انتخاب‌هایی بر اساس ویژگی‌های صنعت."
          : "Picks shaped by industry attributes.",
      )}
      onQuickView={onQuickView}
    />
  );
}

export function VerticalLookbookSection({
  config,
  section,
  defaultTitle,
  defaultKicker,
}: {
  config: WebsiteConfig;
  section: SectionConfig;
  defaultTitle: string;
  defaultKicker: string;
}) {
  const isFa = config.settings.language === "fa";
  const ids = config.content.gallery?.imageIds ?? [];
  const images = ids
    .map((id) => ({ id, media: siteMedia(config, id) }))
    .filter((item) => item.media);

  if (images.length === 0) return null;

  return (
    <section className="store-section" data-section={section.type}>
      <div className="store-wrap">
        <StoreSectionHead
          kicker={settingString(section, "kicker", defaultKicker)}
          title={settingString(section, "title", defaultTitle)}
          lead={settingString(
            section,
            "description",
            isFa
              ? "فضا و استایل، بدون قاب‌های اضافه."
              : "Atmosphere and style — no extra frames.",
          )}
        />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {images.slice(0, 6).map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "relative overflow-hidden bg-[color:var(--store-muted)]/20",
                index === 0 && "md:col-span-2 md:row-span-2",
                index === 0
                  ? "aspect-[4/5] md:aspect-auto md:min-h-[420px]"
                  : "aspect-[3/4]",
              )}
            >
              <SiteMedia
                media={item.media!}
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
