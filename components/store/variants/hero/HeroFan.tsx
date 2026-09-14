"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { resolveEditorHref } from "@/lib/editor/links";
import { isFa } from "@/components/store/variants/shared";

function heroPrimaryHref(config: WebsiteConfig) {
  return resolveEditorHref(config.content.hero.ctaHref, "#shop");
}

function collectFanMedia(config: WebsiteConfig) {
  const seen = new Set<string>();
  const out: { id: string; media: NonNullable<ReturnType<typeof siteMedia>> }[] =
    [];

  const push = (id?: string) => {
    if (!id || seen.has(id) || out.length >= 3) return;
    const media = siteMedia(config, id);
    if (!media) return;
    seen.add(id);
    out.push({ id, media });
  };

  push(config.content.hero.imageId);
  for (const id of config.content.gallery?.imageIds ?? []) push(id);
  for (const product of config.content.products?.items ?? []) {
    for (const id of product.imageIds ?? []) push(id);
  }
  for (const id of Object.keys(config.media)) push(id);

  return out;
}

const fanSlots = [
  {
    className: "store-hero-fan__card store-hero-fan__card--left",
    rotate: -7,
    x: 36,
    ty: 22,
  },
  {
    className: "store-hero-fan__card store-hero-fan__card--center",
    rotate: 0,
    x: 0,
    ty: -8,
  },
  {
    className: "store-hero-fan__card store-hero-fan__card--right",
    rotate: 7,
    x: -36,
    ty: 22,
  },
] as const;

const fanContainer: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delayChildren: 0.12,
      staggerChildren: 0.08,
    },
  },
};

const fanCard: Variants = {
  hidden: (slot: (typeof fanSlots)[number]) => ({
    opacity: 0.4,
    x: slot.x,
    y: slot.ty,
    rotate: slot.rotate,
  }),
  visible: (slot: (typeof fanSlots)[number]) => ({
    opacity: 1,
    x: 0,
    y: slot.ty,
    rotate: slot.rotate,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Layered / offset media stage with centered editorial copy. */
export function HeroFan({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const fa = isFa(config);
  const reduce = useReducedMotion();
  const animate = !reduce;
  const cta =
    hero.cta || (fa ? "ورود به فروشگاه" : "Shop the collection");
  const secondary =
    (config.sections.find((s) => s.type === "hero")?.settings
      ?.secondaryCta as string | undefined) ||
    (fa ? "داستان برند" : "Our story");
  const collected = collectFanMedia(config);
  const images =
    collected.length === 0
      ? [null, null, null]
      : collected.length === 1
        ? [null, collected[0]!, null]
        : collected.length === 2
          ? [collected[0]!, collected[1]!, collected[0]!]
          : collected.slice(0, 3);
  const social =
    config.brand.tagline?.trim() ||
    (fa ? "از اینستاگرام تا ویترین فروش" : "From Instagram to storefront");

  return (
    <section
      className="store-hero store-hero--fan"
      id="top"
      data-variant="fan"
    >
      <div className="store-wrap store-hero-fan">
        <motion.div
          className="store-hero-fan__copy"
          initial={animate ? { opacity: 0, y: 12 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <StoreKicker>{config.brand.name}</StoreKicker>
          <h1 className="store-display store-hero-fan__title">
            <EditableText
              path="hero.headline"
              value={hero.headline || config.brand.name}
              as="span"
              className="block"
            />
          </h1>
          {hero.subheadline ? (
            <p className="store-lead store-hero-fan__sub">
              <EditableText
                path="hero.subheadline"
                value={hero.subheadline}
                as="span"
                className="block"
                multiline
              />
            </p>
          ) : null}
          <div className="store-hero__actions store-hero-fan__actions">
            <StoreLinkButton href={heroPrimaryHref(config)} variant="primary">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
            <StoreLinkButton href="#story" variant="outline">
              {secondary}
            </StoreLinkButton>
          </div>
          <p className="store-hero-fan__proof">{social}</p>
        </motion.div>

        <motion.div
          className="store-hero-fan__stage"
          variants={fanContainer}
          initial={animate ? "hidden" : false}
          whileInView={animate ? "visible" : undefined}
          animate={animate ? undefined : "visible"}
          viewport={{ once: true, margin: "-40px" }}
        >
          {images.map((item, i) => {
            const slot = fanSlots[i] ?? fanSlots[1]!;
            return (
              <motion.div
                key={item?.id ?? `ph-${i}`}
                className={slot.className}
                custom={slot}
                variants={fanCard}
              >
                {item ? (
                  <SiteMedia
                    media={item.media}
                    mode="cover"
                    width={900}
                    height={1125}
                    priority={i === 1}
                    className="store-hero__img"
                    sizes="(max-width: 768px) 42vw, 28vw"
                  />
                ) : (
                  <div className="store-hero__ph" />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
