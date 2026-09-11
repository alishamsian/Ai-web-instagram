"use client";

import type { WebsiteConfig } from "@/types/website";
import { headingFont, siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { productHref, type CatalogProduct } from "@/lib/website/product";

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

function categoryLabel(product: CatalogProduct, isFa: boolean) {
  const raw = product.category?.trim() ?? "";
  if (
    raw &&
    !["image", "video", "reel", "sidecar", "carousel", "general"].includes(
      raw.toLowerCase(),
    )
  ) {
    return raw;
  }
  return isFa ? "محصول" : "Product";
}

export function StoreProductCard({
  config,
  product,
  index,
  featured = false,
}: {
  config: WebsiteConfig;
  product: CatalogProduct;
  index: number;
  featured?: boolean;
}) {
  const { basePath, onProductNavigate } = useSiteNav();
  const isFa = config.settings.language === "fa";
  const image = siteMedia(config, product.imageIds[0]);
  const href = productHref(basePath, product.slug);
  const cat = categoryLabel(product, isFa);
  const c = config.brand.colors;

  return (
    <article
      className={`spc ${featured ? "spc--featured" : ""}`}
      style={
        {
          ["--spc-fg" as string]: c.foreground,
          ["--spc-bg" as string]: c.background,
          ["--spc-muted" as string]: c.muted,
        } as React.CSSProperties
      }
    >
      <a
        href={href}
        className="spc__link"
        onClick={(event) => {
          if (!onProductNavigate) return;
          event.preventDefault();
          onProductNavigate(product.slug);
        }}
      >
        <div className="spc__visual">
          <div className="spc__shot">
            {image ? (
              <SiteMedia
                media={image}
                mode="cover"
                width={featured ? 1200 : 900}
                height={featured ? 1500 : 1125}
                className="spc__img"
                sizes={
                  featured
                    ? "(max-width: 900px) 100vw, 50vw"
                    : "(max-width: 700px) 50vw, 33vw"
                }
              />
            ) : (
              <div className="spc__ph" style={{ background: c.muted }} />
            )}
          </div>

          <div className="spc__shade" aria-hidden />

          <div className="spc__top">
            <span className="spc__sku">{String(index + 1).padStart(2, "0")}</span>
            <span className="spc__tag">{cat}</span>
          </div>

          <div className="spc__cta">
            <span className="spc__cta-label">
              {isFa ? "مشاهده و سفارش" : "View & order"}
            </span>
            <span className="spc__cta-icon" aria-hidden>
              {isFa ? "←" : "→"}
            </span>
          </div>
        </div>

        <div className="spc__body">
          <h3 className={`spc__title ${headingFont(config)}`}>{product.name}</h3>
          <p className="spc__price">
            {product.price != null
              ? formatPrice(config, product.price, product.currency)
              : isFa
                ? "قیمت با پیام"
                : "Price on request"}
          </p>
        </div>
      </a>
    </article>
  );
}
