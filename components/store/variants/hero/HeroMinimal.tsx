"use client";

import type { WebsiteConfig } from "@/types/website";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

/** Typography-first hero — no media stage, compact CTA hierarchy. */
export function HeroMinimal({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const fa = isFa(config);
  const cta =
    hero.cta || (fa ? "ورود به فروشگاه" : "Shop the collection");
  const href = resolveEditorHref(hero.ctaHref, "#shop");

  return (
    <section
      className="store-hero store-hero--minimal"
      id="top"
      data-variant="minimal"
    >
      <div className="store-wrap store-hero__plain store-hero-minimal">
        <StoreKicker>{config.brand.name}</StoreKicker>
        <h1 className="store-display">
          <EditableText
            path="hero.headline"
            value={hero.headline}
            as="span"
            className="block"
          />
        </h1>
        {hero.subheadline ? (
          <p className="store-lead store-hero__sub store-hero-minimal__measure">
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
        </div>
      </div>
    </section>
  );
}
