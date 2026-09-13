"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

function heroVariant(config: WebsiteConfig) {
  return (
    config.sections.find((s) => s.type === "hero")?.variant ||
    config.content.hero.style ||
    "overlay"
  );
}

export function StoreHero({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const isFa = config.settings.language === "fa";
  const variant = heroVariant(config);
  const cta =
    hero.cta || (isFa ? "ورود به فروشگاه" : "Shop the collection");

  if (variant === "split") {
    return (
      <section className="store-hero store-hero--split" id="top" data-variant="split">
        <div className="store-wrap store-hero__split">
          <div className="store-hero__split-copy">
            <StoreKicker>{isFa ? "مجموعه جدید" : "New season"}</StoreKicker>
            <h1 className="store-display">
              <EditableText path="hero.headline" value={hero.headline} as="span" className="block" />
            </h1>
            {hero.subheadline ? (
              <p className="store-lead">
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
              <StoreLinkButton href="#shop" variant="primary">
                <EditableText path="hero.cta" value={cta} as="span" />
              </StoreLinkButton>
              <StoreLinkButton href="#story" variant="ghost">
                {isFa ? "داستان ما" : "Our story"}
              </StoreLinkButton>
            </div>
          </div>
          <div className="store-hero__split-media">
            {image ? (
              <SiteMedia
                media={image}
                mode="cover"
                width={1400}
                height={1750}
                priority
                className="store-hero__img"
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            ) : (
              <div className="store-hero__ph" />
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === "minimal") {
    return (
      <section className="store-hero store-hero--minimal" id="top" data-variant="minimal">
        <div className="store-wrap store-hero__plain">
          <StoreKicker>{config.brand.name}</StoreKicker>
          <h1 className="store-display">
            <EditableText path="hero.headline" value={hero.headline} as="span" className="block" />
          </h1>
          {hero.subheadline ? (
            <p className="store-lead store-hero__sub">
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
            <StoreLinkButton href="#shop" variant="primary">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "editorial" || variant === "menu") {
    return (
      <section className="store-hero store-hero--editorial" id="top" data-variant="editorial">
        <div className="store-wrap store-hero__plain">
          <StoreKicker>{isFa ? "ویترین" : "Campaign"}</StoreKicker>
          <h1 className="store-display">
            <EditableText path="hero.headline" value={hero.headline} as="span" className="block" />
          </h1>
          {hero.subheadline ? (
            <p className="store-lead store-hero__sub">
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
            <StoreLinkButton href="#shop" variant="primary">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
            <StoreLinkButton href="#story" variant="ghost">
              {isFa ? "بیشتر بدانید" : "Learn more"}
            </StoreLinkButton>
          </div>
        </div>
        {image ? (
          <div className="store-hero__bleed">
            <SiteMedia
              media={image}
              mode="cover"
              width={2000}
              height={1000}
              priority
              className="store-hero__img"
              sizes="100vw"
            />
          </div>
        ) : null}
      </section>
    );
  }

  /* Default: cinematic overlay campaign */
  return (
    <section className="store-hero store-hero--overlay" id="top" data-variant="overlay">
      <div className="store-hero__media" aria-hidden={!image}>
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
        <StoreKicker className="store-hero__eyebrow">
          {isFa ? "فروشگاه" : "Shop"}
        </StoreKicker>
        <h1 className="store-display store-hero__brand">
          <EditableText
            path="hero.headline"
            value={hero.headline || config.brand.name}
            as="span"
            className="block"
          />
        </h1>
        {hero.subheadline ? (
          <p className="store-hero__sub">
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
          <StoreLinkButton href="#shop" variant="primary" className="store-hero__cta-solid">
            <EditableText path="hero.cta" value={cta} as="span" />
          </StoreLinkButton>
          <StoreLinkButton href="#story" variant="ghost" className="store-hero__cta-ghost">
            {isFa ? "داستان برند" : "Our story"}
          </StoreLinkButton>
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
  categories: {
    id: string;
    title: string;
    description: string;
    imageId?: string;
    href: string;
  }[];
}) {
  const isFa = config.settings.language === "fa";
  if (!categories.length) return null;

  const layout =
    categories.length >= 4
      ? "editorial"
      : categories.length === 3
        ? "three"
        : "two";

  return (
    <section className="store-section" id="categories">
      <div className="store-wrap">
        <div className="store-section__head store-section__head--row">
          <div>
            <p className="store-kicker">
              {isFa ? "مجموعه‌ها" : "Collections"}
            </p>
            <h2 className="store-heading">
              {isFa ? "خرید بر اساس دسته" : "Shop by category"}
            </h2>
          </div>
        </div>

        <div
          className={cn(
            "store-cats",
            layout === "editorial" && "store-cats--editorial",
            layout === "three" && "store-cats--3",
            layout === "two" && "store-cats--2",
          )}
        >
          {categories.map((cat, index) => {
            const image = siteMedia(config, cat.imageId);
            return (
              <a
                key={cat.id}
                href={cat.href}
                className={cn(
                  "store-cat",
                  layout === "editorial" && index === 0 && "store-cat--lead",
                )}
              >
                <div className="store-cat__media">
                  {image ? (
                    <SiteMedia
                      media={image}
                      mode="cover"
                      width={1000}
                      height={1250}
                      className="store-cat__img"
                      sizes="(max-width: 768px) 70vw, 33vw"
                    />
                  ) : (
                    <div className="store-cat__ph" />
                  )}
                  <span className="store-cat__veil" />
                </div>
                <div className="store-cat__copy">
                  <h3>{cat.title}</h3>
                  <span className="store-cat__meta">
                    {cat.description}
                    <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
