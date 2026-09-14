"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { StoreLinkButton, StoreKicker } from "@/components/store/primitives";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveEditorHref } from "@/lib/editor/links";
import { getSectionVariants } from "@/lib/store/registry/catalog";

function heroPrimaryHref(config: WebsiteConfig) {
  return resolveEditorHref(config.content.hero.ctaHref, "#shop");
}

function heroVariant(config: WebsiteConfig) {
  const registered = new Set(
    getSectionVariants("hero").map((variant) => variant.id),
  );
  const raw =
    config.sections.find((s) => s.type === "hero")?.variant ||
    config.content.hero.style ||
    "fan";
  // Legacy "menu" maps to editorial; unknown → fan.
  if (raw === "menu") return "editorial";
  if (registered.has(raw)) return raw;
  return registered.has("fan") ? "fan" : [...registered][0] ?? "fan";
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

function StoreHeroFan({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const isFa = config.settings.language === "fa";
  const reduce = useReducedMotion();
  const animate = !reduce;
  const cta =
    hero.cta || (isFa ? "ورود به فروشگاه" : "Shop the collection");
  const secondary =
    (config.sections.find((s) => s.type === "hero")?.settings
      ?.secondaryCta as string | undefined) ||
    (isFa ? "داستان برند" : "Our story");
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
    (isFa ? "از اینستاگرام تا ویترین فروش" : "From Instagram to storefront");

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

function StoreHeroOverlay({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const isFa = config.settings.language === "fa";
  const cta =
    hero.cta || (isFa ? "ورود به فروشگاه" : "Shop the collection");

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
          <StoreLinkButton
            href={heroPrimaryHref(config)}
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
            {isFa ? "داستان برند" : "Our story"}
          </StoreLinkButton>
        </div>
      </div>
    </section>
  );
}

export function StoreHero({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const isFa = config.settings.language === "fa";
  const variant = heroVariant(config);
  const cta =
    hero.cta || (isFa ? "ورود به فروشگاه" : "Shop the collection");

  if (variant === "fan") {
    return <StoreHeroFan config={config} />;
  }

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
              <StoreLinkButton href={heroPrimaryHref(config)} variant="primary">
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
            <StoreLinkButton href={heroPrimaryHref(config)} variant="primary">
              <EditableText path="hero.cta" value={cta} as="span" />
            </StoreLinkButton>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "editorial") {
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
            <StoreLinkButton href={heroPrimaryHref(config)} variant="primary">
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

  return <StoreHeroOverlay config={config} />;
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
