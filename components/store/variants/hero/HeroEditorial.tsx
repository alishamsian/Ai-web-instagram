"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

/**
 * Type-led editorial: oversized copy, quiet CTA, secondary full-bleed media below.
 * Distinct from minimal (no bleed) and overlay (media is not a backdrop).
 */
export function HeroEditorial({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const fa = isFa(config);
  const cta =
    hero.cta || (fa ? "ورود به فروشگاه" : "Shop the collection");
  const href = resolveEditorHref(hero.ctaHref, "#shop");

  return (
    <section
      className="store-hero store-hero--editorial"
      id="top"
      data-variant="editorial"
    >
      <div className="store-wrap store-hero-editorial">
        <div className="store-hero-editorial__copy">
          <StoreKicker>{fa ? "ویترین" : "Campaign"}</StoreKicker>
          <h1 className="store-display store-hero-editorial__title">
            <EditableText
              path="hero.headline"
              value={hero.headline}
              as="span"
              className="block"
            />
          </h1>
          {hero.subheadline ? (
            <p className="store-lead store-hero-editorial__sub">
              <EditableText
                path="hero.subheadline"
                value={hero.subheadline}
                as="span"
                className="block"
                multiline
              />
            </p>
          ) : null}
          <div className="store-hero__actions store-hero-editorial__actions">
            <StoreLinkButton href={href} variant="outline">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
            <StoreLinkButton href="#story" variant="ghost">
              {fa ? "بیشتر بدانید" : "Learn more"}
            </StoreLinkButton>
          </div>
        </div>
      </div>
      {image ? (
        <div className="store-hero__bleed store-hero-editorial__bleed">
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
