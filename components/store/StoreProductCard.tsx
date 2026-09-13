"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { categoryLabel } from "@/lib/store/catalog";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import { productHref } from "@/lib/website/product";
import {
  StoreLinkButton,
  StoreButton,
  StoreInput,
  StoreSectionHead,
} from "@/components/store/primitives";
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

export type ProductCardVariant = "classic" | "minimal" | "editorial" | "compact";

export function StoreProductCard({
  config,
  product,
  onQuickView,
  ratio = "4/5",
  variant = "classic",
}: {
  config: WebsiteConfig;
  product: StoreCatalogProduct;
  index?: number;
  onQuickView?: (product: StoreCatalogProduct) => void;
  ratio?: "1/1" | "4/5" | "3/4" | "3/5";
  featured?: boolean;
  dense?: boolean;
  variant?: ProductCardVariant;
}) {
  const isFa = config.settings.language === "fa";
  const { basePath, onProductNavigate } = useSiteNav();
  const cart = useStoreCart();
  const [wish, setWish] = useState(false);
  const primary = siteMedia(config, product.imageIds[0]);
  const secondary = siteMedia(config, product.imageIds[1]);
  const href = productHref(basePath, product.slug);
  const cat = categoryLabel(product.category, isFa);
  const badge =
    product.badges?.[0] ||
    (product.isNew ? (isFa ? "جدید" : "New") : null) ||
    (product.isBestSeller ? (isFa ? "پرفروش" : "Bestseller") : null);

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

  const compareLabel =
    product.compareAtPrice != null
      ? formatPrice(config, product.compareAtPrice, product.currency)
      : null;

  const dense = variant === "compact";
  const showDesc = variant === "editorial" || variant === "classic";

  return (
    <article
      className={cn(
        "store-card",
        dense && "store-card--dense",
        `store-card--${variant}`,
      )}
      style={{ ["--store-ratio" as string]: ratio.replace("/", " / ") }}
    >
      <div className="store-card__visual">
        <a href={href} className="store-card__media" onClick={open}>
          {primary ? (
            <SiteMedia
              media={primary}
              mode="cover"
              width={900}
              height={1125}
              className={cn(
                "store-card__img",
                secondary && "store-card__img--primary",
              )}
              sizes="(max-width: 700px) 50vw, 25vw"
            />
          ) : (
            <div className="store-card__ph" />
          )}
          {secondary ? (
            <SiteMedia
              media={secondary}
              mode="cover"
              width={900}
              height={1125}
              className="store-card__img store-card__img--secondary"
              sizes="(max-width: 700px) 50vw, 25vw"
            />
          ) : null}
          <span className="store-card__shade" aria-hidden />
        </a>

        {badge ? <span className="store-card__badge">{badge}</span> : null}

        <button
          type="button"
          className={cn("store-card__wish", wish && "is-active")}
          aria-label={isFa ? "علاقه‌مندی" : "Wishlist"}
          aria-pressed={wish}
          onClick={() => setWish((v) => !v)}
        >
          <Heart size={16} strokeWidth={1.6} fill={wish ? "currentColor" : "none"} />
        </button>

        <div className="store-card__actions">
          {onQuickView ? (
            <button
              type="button"
              className="store-card__action"
              onClick={() => onQuickView(product)}
            >
              {isFa ? "مشاهده" : "Quick view"}
            </button>
          ) : null}
          <button
            type="button"
            className="store-card__action store-card__action--solid"
            onClick={() => cart.add(product)}
          >
            {isFa ? "افزودن" : "Add"}
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
        {showDesc && !dense && product.shortDescription ? (
          <p className="store-card__desc">{product.shortDescription}</p>
        ) : null}
        <div className="store-card__price-row">
          <p className="store-card__price">{priceLabel}</p>
          {compareLabel ? (
            <p className="store-card__compare">{compareLabel}</p>
          ) : null}
        </div>
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
  soft = true,
  variant = "classic",
  editableTitle = false,
  cardVariant,
}: {
  config: WebsiteConfig;
  products: StoreCatalogProduct[];
  title: string;
  kicker?: string;
  lead?: string;
  id?: string;
  columns?: 2 | 3 | 4 | 5;
  onQuickView?: (product: StoreCatalogProduct) => void;
  featuredLead?: boolean;
  soft?: boolean;
  variant?: "classic" | "editorial" | "compact" | "minimal" | "rail";
  editableTitle?: boolean;
  cardVariant?: ProductCardVariant;
}) {
  const isFa = config.settings.language === "fa";
  const resolvedCard: ProductCardVariant =
    cardVariant ||
    (variant === "compact"
      ? "compact"
      : variant === "editorial"
        ? "editorial"
        : variant === "minimal"
          ? "minimal"
          : "classic");

  if (!products.length) {
    return (
      <section className="store-section" id={id}>
        <div className="store-wrap store-empty">
          <h2 className="store-heading">{title}</h2>
          <p className="store-muted">
            {isFa
              ? "هنوز محصولی اضافه نشده است. محصولات را از ادیتور اضافه کنید."
              : "No products yet. Add products from the editor to start building your catalog."}
          </p>
        </div>
      </section>
    );
  }

  if (variant === "rail") {
    const [leadProduct, ...rest] = products;
    return (
      <section className="store-section" id={id}>
        <div className="store-wrap">
          <StoreSectionHead
            kicker={kicker}
            title={
              editableTitle ? (
                <EditableText path="products.title" value={title} as="span" />
              ) : (
                title
              )
            }
            lead={lead}
          />
          <div className="store-rail">
            {leadProduct ? (
              <div className="store-rail__lead">
                <StoreProductCard
                  config={config}
                  product={leadProduct}
                  onQuickView={onQuickView}
                  variant="editorial"
                  ratio="3/4"
                />
              </div>
            ) : null}
            <div className="store-rail__rest store-grid store-grid--2">
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
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "store-section",
        soft && "store-section--soft",
        `store-products--${variant}`,
      )}
      id={id}
    >
      <div className="store-wrap">
        <StoreSectionHead
          kicker={kicker}
          title={
            editableTitle ? (
              <EditableText path="products.title" value={title} as="span" />
            ) : (
              title
            )
          }
          lead={lead}
        />
        <div
          className={cn(
            "store-grid",
            `store-grid--${columns}`,
            variant === "editorial" && "store-grid--editorial",
            variant === "compact" && "store-grid--compact",
          )}
        >
          {products.map((product, index) => (
            <StoreProductCard
              key={product.id}
              config={config}
              product={product}
              index={index}
              onQuickView={onQuickView}
              variant={resolvedCard}
              ratio={resolvedCard === "minimal" ? "1/1" : "4/5"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoreProductSpotlight({
  config,
  product,
  onQuickView,
}: {
  config: WebsiteConfig;
  product: StoreCatalogProduct;
  onQuickView?: (product: StoreCatalogProduct) => void;
}) {
  const isFa = config.settings.language === "fa";
  const { basePath, onProductNavigate } = useSiteNav();
  const image = siteMedia(config, product.imageIds[0]);
  const href = productHref(basePath, product.slug);
  const benefits = isFa
    ? ["کیفیت انتخاب‌شده", "ارسال مطمئن", "پاسخ سریع"]
    : ["Curated quality", "Careful shipping", "Fast replies"];

  const open = (event: React.MouseEvent) => {
    if (!onProductNavigate) return;
    event.preventDefault();
    onProductNavigate(product.slug);
  };

  return (
    <section className="store-section store-spotlight" id="spotlight">
      <div className="store-wrap store-spotlight__grid">
        <div className="store-spotlight__media">
          {image ? (
            <SiteMedia
              media={image}
              mode="cover"
              width={1400}
              height={1600}
              className="store-spotlight__img"
              sizes="(max-width: 900px) 100vw, 55vw"
            />
          ) : (
            <div className="store-card__ph" />
          )}
        </div>
        <div className="store-spotlight__copy">
          <p className="store-kicker">{isFa ? "ویژه" : "Featured"}</p>
          <h2 className="store-display store-display--sm">{product.name}</h2>
          <p className="store-lead">
            {product.shortDescription || product.description}
          </p>
          <ul className="store-spotlight__benefits">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="store-hero__actions">
            <StoreLinkButton href={href} variant="primary" onClick={open}>
              {isFa ? "کشف محصول" : "Discover"}
            </StoreLinkButton>
            {onQuickView ? (
              <StoreButton variant="ghost" onClick={() => onQuickView(product)}>
                {isFa ? "مشاهده سریع" : "Quick view"}
              </StoreButton>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoreNewsletter({ config }: { config: WebsiteConfig }) {
  const isFa = config.settings.language === "fa";
  return (
    <section className="store-section store-newsletter" id="newsletter">
      <div className="store-wrap store-newsletter__inner">
        <p className="store-kicker">{isFa ? "خبرنامه" : "Newsletter"}</p>
        <h2 className="store-heading store-newsletter__title">
          {isFa ? (
            <>
              چند خط
              <br />
              برای صندوق ورودی‌تان.
            </>
          ) : (
            <>
              A little something
              <br />
              for your inbox.
            </>
          )}
        </h2>
        <p className="store-lead">
          {isFa
            ? "اطلاع از محصولات تازه و پیشنهادهای محدود — بدون شلوغی."
            : "New drops and quiet offers — without the noise."}
        </p>
        <form
          className="store-newsletter__form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="sr-only" htmlFor="store-newsletter-email">
            Email
          </label>
          <StoreInput
            id="store-newsletter-email"
            type="email"
            required
            placeholder={isFa ? "ایمیل شما" : "Your email"}
            className="store-newsletter__input"
          />
          <StoreButton type="submit" variant="primary">
            {isFa ? "عضویت" : "Subscribe"}
          </StoreButton>
        </form>
      </div>
    </section>
  );
}
