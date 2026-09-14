"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

/** Immersive full-bleed media with overlaid copy and floating CTAs. */
export function HeroOverlay({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const fa = isFa(config);
  const cta =
    hero.cta || (fa ? "ورود به فروشگاه" : "Shop the collection");
  const href = resolveEditorHref(hero.ctaHref, "#shop");

  return (
    <section
      className="store-hero store-hero--overlay"
      id="top"
      data-variant="overlay"
    >
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
          {fa ? "فروشگاه" : "Shop"}
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
          <StoreLinkButton
            href={href}
            variant="primary"
            className="store-hero__cta-solid"
          >
            <EditableText path="hero.cta" value={cta} as="span" />
          </StoreLinkButton>
          <StoreLinkButton
            href="#story"
            variant="ghost"
            className="store-hero__cta-ghost"
          >
            {fa ? "داستان برند" : "Our story"}
          </StoreLinkButton>
        </div>
      </div>
    </section>
  );
}
