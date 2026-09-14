"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

/** Two-column split: copy + portrait media (stacks copy-first on mobile). */
export function HeroSplit({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const fa = isFa(config);
  const cta =
    hero.cta || (fa ? "ورود به فروشگاه" : "Shop the collection");
  const href = resolveEditorHref(hero.ctaHref, "#shop");

  return (
    <section
      className="store-hero store-hero--split"
      id="top"
      data-variant="split"
    >
      <div className="store-wrap store-hero__split">
        <div className="store-hero__split-copy">
          <StoreKicker>{fa ? "مجموعه جدید" : "New season"}</StoreKicker>
          <h1 className="store-display">
            <EditableText
              path="hero.headline"
              value={hero.headline}
              as="span"
              className="block"
            />
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
            <StoreLinkButton href={href} variant="primary">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
            <StoreLinkButton href="#story" variant="ghost">
              {fa ? "داستان ما" : "Our story"}
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
