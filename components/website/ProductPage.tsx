"use client";

import type { WebsiteConfig } from "@/types/website";
import { headingFont, siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useSiteNav } from "@/components/website/SiteNavContext";
import {
  findCatalogProduct,
  orderHref,
  ensureCatalogProduct,
} from "@/lib/website/product";
import { StoreProductCard } from "@/components/website/StoreProductCard";

function formatPrice(
  config: WebsiteConfig,
  price: number,
  currency: string | null,
) {
  const locale = config.settings.language === "fa" ? "fa-IR" : "en-US";
  const formatted = new Intl.NumberFormat(locale).format(price);
  if (!currency) return formatted;
  if (config.settings.language === "fa") return `${formatted} ${currency}`;
  return `${currency} ${formatted}`;
}

export function ProductPageView({
  config,
  productSlug,
}: {
  config: WebsiteConfig;
  productSlug: string;
}) {
  const product = findCatalogProduct(config, productSlug);
  const { basePath, onHomeNavigate } = useSiteNav();
  const isFa = config.settings.language === "fa";
  const c = config.brand.colors;
  const homeHref = basePath || "#products";

  if (!product) {
    return (
      <div className="vitrin-wrap vitrin-product-missing">
        <p>{isFa ? "محصول پیدا نشد." : "Product not found."}</p>
        <a
          href={homeHref}
          className="vitrin-cta vitrin-cta--editorial"
          style={{ background: c.foreground, color: c.background }}
          onClick={(event) => {
            if (!onHomeNavigate) return;
            event.preventDefault();
            onHomeNavigate();
          }}
        >
          {isFa ? "بازگشت به فروشگاه" : "Back to shop"}
        </a>
      </div>
    );
  }

  const image = siteMedia(config, product.imageIds[0]);
  const gallery = product.imageIds
    .map((id) => siteMedia(config, id))
    .filter(Boolean);
  const related = (config.content.products?.items ?? [])
    .map((item, index) =>
      ensureCatalogProduct(item, index, config.settings.language),
    )
    .filter((item) => item.slug !== product.slug)
    .slice(0, 4);

  const buyHref = orderHref(config, product.name);

  return (
    <div className="vitrin-product-page">
      <div className="vitrin-wrap vitrin-product-detail">
        <nav className="vitrin-product-crumb">
          <a
            href={homeHref}
            onClick={(event) => {
              if (!onHomeNavigate) return;
              event.preventDefault();
              onHomeNavigate();
            }}
          >
            {isFa ? "فروشگاه" : "Shop"}
          </a>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="vitrin-product-detail__grid">
          <div className="vitrin-product-detail__media">
            {image ? (
              <SiteMedia
                media={image}
                mode="cover"
                width={1200}
                height={1500}
                priority
                className="vitrin-product-detail__hero-img"
                sizes="(max-width: 900px) 100vw, 55vw"
              />
            ) : (
              <div
                className="vitrin-product-detail__ph"
                style={{ background: c.muted }}
              />
            )}
            {gallery.length > 1 ? (
              <div className="vitrin-product-detail__thumbs">
                {gallery.slice(0, 4).map((media, index) =>
                  media ? (
                    <SiteMedia
                      key={`${product.slug}-g-${index}`}
                      media={media}
                      mode="cover"
                      width={240}
                      height={300}
                      className="vitrin-product-detail__thumb"
                      sizes="120px"
                    />
                  ) : null,
                )}
              </div>
            ) : null}
          </div>

          <div className="vitrin-product-detail__copy">
            {product.category ? (
              <p className="vitrin-eyebrow">{product.category}</p>
            ) : (
              <p className="vitrin-eyebrow">
                {isFa ? "از مجموعه" : "From the collection"}
              </p>
            )}
            <h1 className={`vitrin-product-detail__title ${headingFont(config)}`}>
              {product.name}
            </h1>
            <p className="vitrin-product-detail__price">
              {product.price != null
                ? formatPrice(config, product.price, product.currency)
                : isFa
                  ? "قیمت با پیام"
                  : "Price on request"}
            </p>
            <p className="vitrin-product-detail__desc">
              {product.description ||
                (isFa
                  ? "جزئیات سایز، رنگ و موجودی را در سفارش مشخص کنید."
                  : "Confirm size, color, and availability when you order.")}
            </p>

            <ul className="vitrin-product-detail__facts">
              <li>{isFa ? "ارسال به سراسر کشور" : "Nationwide shipping"}</li>
              <li>{isFa ? "پاسخ سریع در دایرکت" : "Fast reply on Instagram"}</li>
              <li>
                {isFa ? "مشاوره سایز قبل از خرید" : "Sizing help before purchase"}
              </li>
            </ul>

            <div className="vitrin-product-detail__actions">
              <a
                href={buyHref}
                className="vitrin-cta vitrin-cta--editorial"
                style={{ background: c.foreground, color: c.background }}
                target={buyHref.startsWith("http") ? "_blank" : undefined}
                rel={buyHref.startsWith("http") ? "noreferrer" : undefined}
              >
                {isFa ? "سفارش این محصول" : "Order this piece"}
              </a>
              <a
                href={homeHref}
                className="vitrin-cta vitrin-cta--ghost-dark"
                onClick={(event) => {
                  if (!onHomeNavigate) return;
                  event.preventDefault();
                  onHomeNavigate();
                }}
              >
                {isFa ? "ادامه خرید" : "Continue shopping"}
              </a>
            </div>
          </div>
        </div>

        {related.length ? (
          <section className="vitrin-product-related">
            <div className="vitrin-section__head vitrin-section__head--editorial">
              <p className="vitrin-eyebrow">
                {isFa ? "بیشتر ببینید" : "More to explore"}
              </p>
              <h2 className={`vitrin-title ${headingFont(config)}`}>
                {isFa ? "از همین مجموعه" : "From the same collection"}
              </h2>
            </div>
            <div className="vitrin-products vitrin-products--related vitrin-products--shop">
              {related.map((item, index) => (
                <StoreProductCard
                  key={item.id}
                  config={config}
                  product={item}
                  index={index}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
