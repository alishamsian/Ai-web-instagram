"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreSectionHead } from "@/components/store/primitives";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { productHref } from "@/lib/website/product";
import { StoreLinkButton, StoreButton } from "@/components/store/primitives";
import { isFa } from "@/components/store/variants/shared";

/** True horizontal product rail with snap scrolling. */
export function ProductsScrollRail({
  config,
  products,
  id,
  kicker,
  title,
  onQuickView,
}: {
  config: StoreSectionContext["config"];
  products: StoreCatalogProduct[];
  id: string;
  kicker?: string;
  title: string;
  onQuickView?: (product: StoreCatalogProduct) => void;
}) {
  const fa = isFa(config);
  if (!products.length) {
    return (
      <section className="store-section" id={id}>
        <div className="store-wrap store-empty">
          <h2 className="store-heading">{title}</h2>
          <p className="store-muted">
            {fa
              ? "هنوز محصولی اضافه نشده است."
              : "No products yet."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="store-section store-products--rail"
      id={id}
      data-variant="rail"
    >
      <div className="store-wrap">
        <StoreSectionHead kicker={kicker} title={title} />
      </div>
      <div className="store-hrail" role="list">
        {products.slice(0, 12).map((product) => (
          <div key={product.id} className="store-hrail__item" role="listitem">
            <StoreProductCard
              config={config}
              product={product}
              onQuickView={onQuickView}
              variant="compact"
              ratio="3/4"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Hero product + supporting products — for featured spotlight. */
export function FeaturedSpotlight({
  config,
  products,
  id,
  kicker,
  title,
  onQuickView,
}: {
  config: StoreSectionContext["config"];
  products: StoreCatalogProduct[];
  id: string;
  kicker?: string;
  title: string;
  onQuickView?: (product: StoreCatalogProduct) => void;
}) {
  const fa = isFa(config);
  const { basePath, onProductNavigate } = useSiteNav();
  const [lead, ...rest] = products;
  if (!lead) return null;

  const image = siteMedia(config, lead.imageIds[0]);
  const href = productHref(basePath, lead.slug);
  const open = (event: React.MouseEvent) => {
    if (!onProductNavigate) return;
    event.preventDefault();
    onProductNavigate(lead.slug);
  };

  return (
    <section
      className="store-section store-featured-spotlight"
      id={id}
      data-variant="spotlight"
    >
      <div className="store-wrap">
        <StoreSectionHead kicker={kicker} title={title} />
        <div className="store-featured-spotlight__grid">
          <article className="store-featured-spotlight__lead">
            <div className="store-featured-spotlight__media">
              {image ? (
                <SiteMedia
                  media={image}
                  mode="cover"
                  width={1400}
                  height={1600}
                  className="store-featured-spotlight__img"
                  sizes="(max-width: 900px) 100vw, 55vw"
                />
              ) : (
                <div className="store-card__ph" />
              )}
            </div>
            <div className="store-featured-spotlight__copy">
              <h3 className="store-heading">{lead.name}</h3>
              {lead.description ? (
                <p className="store-muted">{lead.description}</p>
              ) : null}
              <div className="store-hero__actions">
                <StoreLinkButton href={href} variant="primary" onClick={open}>
                  {fa ? "مشاهده" : "View"}
                </StoreLinkButton>
                {onQuickView ? (
                  <StoreButton variant="ghost" onClick={() => onQuickView(lead)}>
                    {fa ? "پیش‌نمایش" : "Quick view"}
                  </StoreButton>
                ) : null}
              </div>
            </div>
          </article>
          {rest.length ? (
            <div className="store-featured-spotlight__rest store-grid store-grid--2">
              {rest.slice(0, 4).map((product) => (
                <StoreProductCard
                  key={product.id}
                  config={config}
                  product={product}
                  onQuickView={onQuickView}
                  variant="compact"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
