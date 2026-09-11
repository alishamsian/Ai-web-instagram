"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { cn } from "@/lib/utils";

export function StoreHero({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const isFa = config.settings.language === "fa";

  return (
    <section className="store-hero" id="top">
      <div className="store-hero__media">
        {image ? (
          <SiteMedia
            media={image}
            mode="cover"
            fill
            priority
            className="store-hero__img"
            sizes="100vw"
          />
        ) : (
          <div className="store-hero__ph" />
        )}
        <div className="store-hero__shade" />
      </div>

      <div className="store-wrap store-hero__content">
        <p className="store-kicker store-hero__eyebrow">
          {isFa ? "فروشگاه" : "Shop"}
        </p>
        <h1 className="store-display store-hero__brand">{config.brand.name}</h1>
        <p className="store-lead store-hero__lead">
          <EditableText
            path="hero.headline"
            value={hero.headline}
            as="span"
            className="block"
          />
        </p>
        {hero.subheadline ? (
          <p className="store-muted store-hero__sub">
            <EditableText
              path="hero.subheadline"
              value={hero.subheadline}
              as="span"
              className="block"
              multiline
            />
          </p>
        ) : null}
        <div className="store-hero__actions">
          <a href="#shop" className="store-btn store-btn--solid">
            <EditableText
              path="hero.cta"
              value={hero.cta || (isFa ? "ورود به فروشگاه" : "Shop the collection")}
              as="span"
            />
          </a>
        </div>
      </div>
    </section>
  );
}

export function StoreCategories({
  config,
  categories,
}: {
  config: WebsiteConfig;
  categories: { id: string; title: string; description: string; imageId?: string; href: string }[];
}) {
  const isFa = config.settings.language === "fa";
  if (!categories.length) return null;

  return (
    <section className="store-section" id="categories">
      <div className="store-wrap">
        <div className="store-section__head">
          <p className="store-kicker">{isFa ? "دسته‌بندی" : "Browse"}</p>
          <h2 className="store-heading">{isFa ? "از کجا شروع کنیم؟" : "Where to begin?"}</h2>
        </div>
        <div className={cn("store-cats", categories.length <= 3 && "store-cats--3")}>
          {categories.map((cat) => {
            const image = siteMedia(config, cat.imageId);
            return (
              <a key={cat.id} href={cat.href} className="store-cat">
                <div className="store-cat__media">
                  {image ? (
                    <SiteMedia
                      media={image}
                      mode="cover"
                      width={800}
                      height={1000}
                      className="store-cat__img"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="store-cat__ph" />
                  )}
                  <span className="store-cat__veil" />
                </div>
                <div className="store-cat__copy">
                  <h3>{cat.title}</h3>
                  <p>{cat.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
