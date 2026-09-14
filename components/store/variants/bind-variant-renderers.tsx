"use client";

/**
 * Registers per-variant renderers on the existing Registry.
 * Metadata stays in definitions; this file only binds React implementations.
 */
import {
  registerVariantRenderer,
  getVariantRenderer,
} from "@/lib/store/registry/catalog";
import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import { HeroFan } from "@/components/store/variants/hero/HeroFan";
import { HeroOverlay } from "@/components/store/variants/hero/HeroOverlay";
import { HeroSplit } from "@/components/store/variants/hero/HeroSplit";
import { HeroMinimal } from "@/components/store/variants/hero/HeroMinimal";
import { HeroEditorial } from "@/components/store/variants/hero/HeroEditorial";
import {
  AboutStory,
  AboutEditorial,
  AboutImageLed,
} from "@/components/store/variants/about/AboutVariants";
import {
  GalleryLookbook,
  GalleryGrid,
  GalleryMasonry,
  GalleryCollage,
} from "@/components/store/variants/gallery/GalleryVariants";
import {
  CtaBanner,
  CtaPromo,
  CtaMinimal,
} from "@/components/store/variants/cta/CtaVariants";
import {
  TrustMetrics,
  TrustInline,
  TrustQuotes,
} from "@/components/store/variants/trust/TrustVariants";

function hero(ctx: StoreSectionContext, Comp: typeof HeroFan) {
  return <Comp config={ctx.config} />;
}

export function ensureVariantRenderersBound() {
  // Re-bind after registry reset (tests clear variantRenderers map).
  if (getVariantRenderer("hero.fan")) return;

  registerVariantRenderer("hero.fan", (ctx) => hero(ctx, HeroFan));
  registerVariantRenderer("hero.overlay", (ctx) => hero(ctx, HeroOverlay));
  registerVariantRenderer("hero.split", (ctx) => hero(ctx, HeroSplit));
  registerVariantRenderer("hero.minimal", (ctx) => hero(ctx, HeroMinimal));
  registerVariantRenderer("hero.editorial", (ctx) => hero(ctx, HeroEditorial));

  registerVariantRenderer("about.story", (ctx) => (
    <AboutStory config={ctx.config} />
  ));
  registerVariantRenderer("about.editorial", (ctx) => (
    <AboutEditorial config={ctx.config} />
  ));
  registerVariantRenderer("about.image-led", (ctx) => (
    <AboutImageLed config={ctx.config} />
  ));

  registerVariantRenderer("gallery.lookbook", (ctx) => (
    <GalleryLookbook config={ctx.config} catalog={ctx.catalog} />
  ));
  registerVariantRenderer("gallery.grid", (ctx) => (
    <GalleryGrid config={ctx.config} catalog={ctx.catalog} />
  ));
  registerVariantRenderer("gallery.masonry", (ctx) => (
    <GalleryMasonry config={ctx.config} catalog={ctx.catalog} />
  ));
  registerVariantRenderer("gallery.collage", (ctx) => (
    <GalleryCollage config={ctx.config} catalog={ctx.catalog} />
  ));

  registerVariantRenderer("cta.banner", (ctx) => (
    <CtaBanner config={ctx.config} />
  ));
  registerVariantRenderer("cta.promo", (ctx) => (
    <CtaPromo config={ctx.config} />
  ));
  registerVariantRenderer("cta.minimal", (ctx) => (
    <CtaMinimal config={ctx.config} />
  ));

  registerVariantRenderer("trust.metrics", (ctx) => (
    <TrustMetrics config={ctx.config} />
  ));
  registerVariantRenderer("trust.inline", (ctx) => (
    <TrustInline config={ctx.config} />
  ));
  registerVariantRenderer("trust.quotes", (ctx) => (
    <TrustQuotes config={ctx.config} />
  ));
  registerVariantRenderer("testimonials.quotes", (ctx) => (
    <TrustQuotes config={ctx.config} />
  ));
}
