"use client";

import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { categoryLabel } from "@/lib/store/catalog";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import { productHref } from "@/lib/website/product";
import { cn } from "@/lib/utils";

function formatPrice(
  config: WebsiteConfig,
  price: number,
  currency: string | null,
) {
  const locale = config.settings.language === "fa" ? "fa-IR" : "en-US";
  const formatted = new Intl.NumberFormat(locale).format(price);
  if (!currency) return formatted;
  return config.settings.language === "fa"
    ? `${formatted} ${currency}`
    : `${currency} ${formatted}`;
}

export function StoreProductCard({
  config,
  product,
  onQuickView,
}: {
  config: WebsiteConfig;
  product: StoreCatalogProduct;
  index?: number;
  onQuickView?: (product: StoreCatalogProduct) => void;
  ratio?: "1/1" | "4/5" | "3/4";
  featured?: boolean;
}) {
  const isFa = config.settings.language === "fa";
  const { basePath, onProductNavigate } = useSiteNav();
  const cart = useStoreCart();
  const primary = siteMedia(config, product.imageIds[0]);
  const href = productHref(basePath, product.slug);
  const cat = categoryLabel(product.category, isFa);
  const badge = product.badges?.[0];

  const open = (event: React.MouseEvent) => {
    if (!onProductNavigate) return;
    event.preventDefault();
    onProductNavigate(product.slug);
  };

  const priceLabel =
    product.price != null
      ? formatPrice(config, product.price, product.currency)
      : isFa
        ? "قیمت با پیام"
        : "Price on request";

  return (
    <article className="store-card">
      <div className="store-card__visual">
        <a href={href} className="store-card__media" onClick={open}>
          {primary ? (
            <SiteMedia
              media={primary}
              mode="cover"
              width={900}
              height={1125}
              className="store-card__img"
              sizes="(max-width: 700px) 50vw, 25vw"
            />
          ) : (
            <div className="store-card__ph" />
          )}
          <span className="store-card__shade" aria-hidden />
        </a>

        {badge ? <span className="store-card__badge">{badge}</span> : null}

        <div className="store-card__actions">
          {onQuickView ? (
            <button
              type="button"
              className="store-card__action store-card__action--quick"
              onClick={() => onQuickView(product)}
            >
              {isFa ? "مشاهده سریع" : "Quick view"}
            </button>
          ) : null}
          <button
            type="button"
            className="store-card__action store-card__action--solid"
            onClick={() => cart.add(product)}
          >
            {isFa ? "افزودن به سبد" : "Add to bag"}
          </button>
        </div>
      </div>

      <div className="store-card__body">
        <p className="store-card__cat">{cat}</p>
        <h3 className="store-card__title">
          <a href={href} onClick={open}>
            {product.name}
          </a>
        </h3>
        <p className="store-card__price">{priceLabel}</p>
      </div>
    </article>
  );
}

export function StoreProductGrid({
  config,
  products,
  title,
  kicker,
  lead,
  id = "shop",
  columns = 4,
  onQuickView,
}: {
  config: WebsiteConfig;
  products: StoreCatalogProduct[];
  title: string;
  kicker?: string;
  lead?: string;
  id?: string;
  columns?: 2 | 3 | 4;
  onQuickView?: (product: StoreCatalogProduct) => void;
  featuredLead?: boolean;
}) {
  if (!products.length) {
    return (
      <section className="store-section" id={id}>
        <div className="store-wrap store-empty">
          <h2 className="store-heading">{title}</h2>
          <p className="store-muted">
            {config.settings.language === "fa"
              ? "هنوز محصولی اضافه نشده است."
              : "No products yet."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="store-section store-section--soft" id={id}>
      <div className="store-wrap">
        <div className="store-section__head">
          {kicker ? <p className="store-kicker">{kicker}</p> : null}
          <h2 className="store-heading">{title}</h2>
          {lead ? <p className="store-lead">{lead}</p> : null}
        </div>
        <div className={cn("store-grid", `store-grid--${columns}`)}>
          {products.map((product) => (
            <StoreProductCard
              key={product.id}
              config={config}
              product={product}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
