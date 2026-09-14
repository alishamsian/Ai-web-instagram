"use client";

import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

function promoContent(config: WebsiteConfig) {
  const fa = isFa(config);
  return (
    config.content.promo ?? {
      kicker: fa ? "کمپین" : "Campaign",
      title: fa
        ? "آیین هرروزه، ارتقا یافته."
        : "Your daily ritual, elevated.",
      cta: fa ? "مشاهده مجموعه" : "Shop the collection",
      ctaHref: "#shop",
    }
  );
}

/** Accent conversion band — centered hierarchy. */
export function CtaBanner({ config }: { config: WebsiteConfig }) {
  const promo = promoContent(config);
  const href = resolveEditorHref(promo.ctaHref, "#shop");

  return (
    <section className="store-promo" id="campaign" data-variant="banner">
      <div className="store-wrap store-promo__inner">
        {promo.kicker ? (
          <p className="store-kicker store-kicker--on-dark">
            <EditableText path="promo.kicker" value={promo.kicker} as="span" />
          </p>
        ) : null}
        <h2 className="store-display store-display--sm">
          <EditableText path="promo.title" value={promo.title} as="span" />
        </h2>
        {promo.cta ? (
          <a href={href} className="store-btn store-btn--on-dark">
            <EditableText path="promo.cta" value={promo.cta} as="span" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** Stronger promo split with optional media panel. */
export function CtaPromo({ config }: { config: WebsiteConfig }) {
  const promo = promoContent(config);
  const fa = isFa(config);
  const href = resolveEditorHref(promo.ctaHref, "#shop");
  const image = siteMedia(
    config,
    config.content.hero.imageId || config.content.gallery?.imageIds?.[0],
  );

  return (
    <section
      className="store-cta-promo"
      id="campaign"
      data-variant="promo"
    >
      <div className="store-wrap store-cta-promo__grid">
        <div className="store-cta-promo__copy">
          {promo.kicker ? (
            <p className="store-kicker">
              <EditableText path="promo.kicker" value={promo.kicker} as="span" />
            </p>
          ) : null}
          <h2 className="store-display store-display--sm">
            <EditableText path="promo.title" value={promo.title} as="span" />
          </h2>
          {promo.cta ? (
            <StoreLinkButton href={href} variant="primary">
              <EditableText path="promo.cta" value={promo.cta} as="span" />
            </StoreLinkButton>
          ) : null}
        </div>
        <div className="store-cta-promo__media" aria-hidden={!image}>
          {image ? (
            <SiteMedia
              media={image}
              mode="cover"
              width={1200}
              height={900}
              className="store-cta-promo__img"
              sizes="(max-width: 900px) 100vw, 42vw"
            />
          ) : (
            <div className="store-cta-promo__ph">
              <span>{fa ? "پیشنهاد ویژه" : "Featured offer"}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Typography-led restrained CTA. */
export function CtaMinimal({ config }: { config: WebsiteConfig }) {
  const promo = promoContent(config);
  const href = resolveEditorHref(promo.ctaHref, "#shop");

  return (
    <section
      className="store-cta-minimal"
      id="campaign"
      data-variant="minimal"
    >
      <div className="store-wrap store-cta-minimal__inner">
        <h2 className="store-heading">
          <EditableText path="promo.title" value={promo.title} as="span" />
        </h2>
        {promo.cta ? (
          <StoreLinkButton href={href} variant="outline">
            <EditableText path="promo.cta" value={promo.cta} as="span" />
          </StoreLinkButton>
        ) : null}
      </div>
    </section>
  );
}
