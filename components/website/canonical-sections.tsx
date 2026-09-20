"use client";

/**
 * Phase 3.1 canonical section renderers for WebsiteRenderer
 * (non-store templates + custom pages with page.sections).
 */

import type { WebsiteConfig } from "@/types/website";
import { headingFont, siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { sanitizeExternalUrl } from "@/lib/templates/canonical-content";

function Title({
  config,
  children,
}: {
  config: WebsiteConfig;
  children: React.ReactNode;
}) {
  return <h2 className={`vitrin-title ${headingFont(config)}`}>{children}</h2>;
}

export function LookbookSiteSection({ config }: { config: WebsiteConfig }) {
  const lb = config.content.lookbook;
  const items = lb?.items ?? [];
  if (!lb && items.length === 0) {
    // Fallback to gallery ids for legacy
    const ids = config.content.gallery?.imageIds ?? [];
    if (ids.length === 0) return null;
  }
  const resolved =
    items.length > 0
      ? items
      : (config.content.gallery?.imageIds ?? []).map((imageId, i) => ({
          id: `gallery-${imageId || i}`,
          imageId,
          caption: undefined as string | undefined,
          href: undefined as string | undefined,
        }));
  if (resolved.length === 0) return null;

  return (
    <section className="vitrin-section" data-section="lookbook">
      <div className="vitrin-wrap">
        <Title config={config}>
          <EditableText
            path="lookbook.title"
            value={lb?.title || config.content.gallery?.title || "Lookbook"}
            as="span"
          />
        </Title>
        {lb?.description ? (
          <p className="vitrin-lead mt-3">
            <EditableText
              path="lookbook.description"
              value={lb.description}
              as="span"
              multiline
            />
          </p>
        ) : null}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {resolved.map((item, index) => {
            const media = siteMedia(config, item.imageId);
            return (
              <div
                key={item.id}
                className={
                  index === 0
                    ? "relative aspect-[3/4] overflow-hidden md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[360px]"
                    : "relative aspect-[3/4] overflow-hidden"
                }
              >
                {media ? (
                  <SiteMedia media={media} className="size-full object-cover" />
                ) : (
                  <div className="size-full bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ShopTheLookSiteSection({ config }: { config: WebsiteConfig }) {
  const stl = config.content.shopTheLook;
  if (!stl?.items?.length) return null;
  const products = config.content.products?.items ?? [];

  return (
    <section className="vitrin-section" data-section="shop-the-look">
      <div className="vitrin-wrap">
        <Title config={config}>
          <EditableText path="shopTheLook.title" value={stl.title} as="span" />
        </Title>
        {stl.description ? (
          <p className="vitrin-lead mt-3">
            <EditableText
              path="shopTheLook.description"
              value={stl.description}
              as="span"
              multiline
            />
          </p>
        ) : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {stl.items.map((item) => {
            const media = siteMedia(config, item.imageId);
            const linked = products.filter((p) =>
              item.productIds.includes(p.id || ""),
            );
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className="relative aspect-[3/4] bg-muted">
                  {media ? (
                    <SiteMedia
                      media={media}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  {linked.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {linked.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CategoriesSiteSection({ config }: { config: WebsiteConfig }) {
  const cats = config.content.categories;
  if (!cats?.items?.length) return null;
  return (
    <section className="vitrin-section" data-section="categories">
      <div className="vitrin-wrap">
        <Title config={config}>
          <EditableText path="categories.title" value={cats.title} as="span" />
        </Title>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {cats.items.map((item) => {
            const media = siteMedia(config, item.imageId);
            const href = item.href || `/${item.slug}`;
            return (
              <a
                key={item.id}
                href={href}
                className="group overflow-hidden rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {media ? (
                    <SiteMedia
                      media={media}
                      className="size-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <p className="p-3 text-sm font-medium">{item.title}</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingSiteSection({ config }: { config: WebsiteConfig }) {
  const pricing = config.content.pricing;
  if (!pricing?.plans?.length) return null;
  const c = config.brand.colors;
  const locale = config.settings.language;
  const priceLabel = locale === "fa" ? "قیمت" : "Price";
  return (
    <section
      className="vitrin-section"
      data-section="pricing"
      aria-label={pricing.title}
    >
      <div className="vitrin-wrap">
        <div className="text-center">
          <Title config={config}>
            <EditableText path="pricing.title" value={pricing.title} as="span" />
          </Title>
          {pricing.description ? (
            <p className="vitrin-lead mx-auto mt-3 max-w-xl">
              <EditableText
                path="pricing.description"
                value={pricing.description}
                as="span"
                multiline
              />
            </p>
          ) : null}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {pricing.plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border p-6"
              aria-labelledby={`pricing-plan-${plan.id}`}
              style={{
                borderColor: plan.highlighted ? c.foreground : undefined,
                background: plan.highlighted ? c.foreground : c.background,
                color: plan.highlighted ? c.background : c.foreground,
              }}
            >
              <h3
                id={`pricing-plan-${plan.id}`}
                className="text-lg font-semibold"
              >
                {plan.name}
              </h3>
              {plan.description ? (
                <p className="mt-1 text-sm opacity-80">{plan.description}</p>
              ) : null}
              <p className="mt-4 text-3xl font-semibold">
                <span className="sr-only">{`${priceLabel}: `}</span>
                {plan.price}
                {plan.period ? (
                  <span className="text-sm font-normal opacity-70">
                    /{plan.period}
                  </span>
                ) : null}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={`${plan.id}-${f}`}>{f}</li>
                ))}
              </ul>
              {plan.ctaLabel ? (
                <a
                  href={plan.ctaHref || "#contact"}
                  className="mt-6 inline-flex rounded-full px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background: plan.highlighted ? c.background : c.foreground,
                    color: plan.highlighted ? c.foreground : c.background,
                  }}
                >
                  {plan.ctaLabel}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function MenuSiteSection({ config }: { config: WebsiteConfig }) {
  const menu = config.content.menu;
  if (!menu?.items?.length) return null;
  const locale = config.settings.language;
  const priceLabel = locale === "fa" ? "قیمت" : "Price";
  return (
    <section
      className="vitrin-section"
      data-section="menu"
      aria-label={menu.title}
    >
      <div className="vitrin-wrap max-w-2xl">
        <Title config={config}>
          <EditableText path="menu.title" value={menu.title} as="span" />
        </Title>
        {menu.description ? (
          <p className="vitrin-lead mt-3">
            <EditableText
              path="menu.description"
              value={menu.description}
              as="span"
              multiline
            />
          </p>
        ) : null}
        <ul className="mt-8 list-none divide-y divide-border p-0">
          {menu.items.map((item) => {
            const titleId = `menu-item-${item.id}-title`;
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div>
                  <h3 id={titleId} className="m-0 text-base font-medium">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                {item.price ? (
                  <p className="m-0 shrink-0 font-semibold">
                    <span className="sr-only">{`${priceLabel}: `}</span>
                    {item.price}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function LocationSiteSection({ config }: { config: WebsiteConfig }) {
  const loc = config.content.location;
  if (!loc) return null;
  const mapUrl = sanitizeExternalUrl(loc.mapUrl);
  const ctaHref = sanitizeExternalUrl(loc.ctaHref) || loc.ctaHref || mapUrl;
  return (
    <section className="vitrin-section" data-section="location">
      <div className="vitrin-wrap max-w-xl">
        <Title config={config}>
          <EditableText path="location.title" value={loc.title} as="span" />
        </Title>
        <div className="mt-6 space-y-2 text-base">
          {loc.address ? <p>{loc.address}</p> : null}
          {loc.city ? <p>{loc.city}</p> : null}
          {loc.hours ? <p>{loc.hours}</p> : null}
          {loc.phone ? <p>{loc.phone}</p> : null}
        </div>
        {ctaHref && loc.ctaLabel ? (
          <a
            href={ctaHref}
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {loc.ctaLabel}
          </a>
        ) : mapUrl ? (
          <a
            href={mapUrl}
            rel="noopener noreferrer"
            className="mt-6 inline-flex text-sm underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Map
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function PortfolioSiteSection({ config }: { config: WebsiteConfig }) {
  const portfolio = config.content.portfolio;
  if (!portfolio?.items?.length) return null;
  return (
    <section className="vitrin-section" data-section="portfolio">
      <div className="vitrin-wrap">
        <Title config={config}>
          <EditableText
            path="portfolio.title"
            value={portfolio.title}
            as="span"
          />
        </Title>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.items.map((item) => {
            const media = siteMedia(config, item.imageId);
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {media ? (
                    <SiteMedia
                      media={media}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.tag ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.tag}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PropertiesSiteSection({ config }: { config: WebsiteConfig }) {
  const props = config.content.properties;
  if (!props?.items?.length) return null;
  return (
    <section className="vitrin-section" data-section="properties">
      <div className="vitrin-wrap">
        <Title config={config}>
          <EditableText
            path="properties.title"
            value={props.title}
            as="span"
          />
        </Title>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {props.items.map((item) => {
            const media = siteMedia(config, item.imageId);
            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {media ? (
                    <SiteMedia
                      media={media}
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.location ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.location}
                    </p>
                  ) : null}
                  {item.price ? (
                    <p className="mt-2 font-semibold">{item.price}</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Promo/CTA for generic WebsiteRenderer (non-store). */
export function PromoSiteSection({ config }: { config: WebsiteConfig }) {
  const promo = config.content.promo;
  if (!promo?.title && !promo?.cta) return null;
  return (
    <section className="vitrin-section" data-section="cta">
      <div className="vitrin-wrap text-center">
        {promo.kicker ? (
          <p className="vitrin-eyebrow">{promo.kicker}</p>
        ) : null}
        <Title config={config}>
          <EditableText path="promo.title" value={promo.title} as="span" />
        </Title>
        {promo.cta ? (
          <a
            href={promo.ctaHref || "#contact"}
            className="mt-6 inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <EditableText path="promo.cta" value={promo.cta} as="span" />
          </a>
        ) : null}
      </div>
    </section>
  );
}
