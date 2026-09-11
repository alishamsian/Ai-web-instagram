"use client";

import { useMemo, useState } from "react";
import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import {
  relatedProducts,
  categoryLabel,
  productForGalleryImage,
} from "@/lib/store/catalog";
import { orderHref, productHref } from "@/lib/website/product";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { StoreAnnouncement, StoreHeader } from "@/components/store/StoreHeader";
import { StoreFooter } from "@/components/store/StoreFooter";

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

export function StoreProductPage({
  config,
  product,
  catalog,
  hasCategories = false,
  onQuickView,
}: {
  config: WebsiteConfig;
  product: StoreCatalogProduct;
  catalog: StoreCatalogProduct[];
  hasCategories?: boolean;
  onQuickView?: (product: StoreCatalogProduct) => void;
}) {
  const isFa = config.settings.language === "fa";
  const cart = useStoreCart();
  const { basePath, onHomeNavigate } = useSiteNav();
  const images = product.imageIds
    .map((id) => siteMedia(config, id))
    .filter(Boolean);
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  const related = useMemo(
    () => relatedProducts(catalog, product, 4),
    [catalog, product],
  );
  const homeHref = basePath || "#shop";
  const buyHref = orderHref(config, product.name);
  const trust =
    config.content.trust?.items?.filter(Boolean) ??
    (isFa
      ? ["ارسال به سراسر کشور", "هماهنگی قبل از خرید", "پاسخ سریع در دایرکت"]
      : [
          "Nationwide shipping",
          "Confirm before purchase",
          "Fast reply on Instagram",
        ]);
  const cat = categoryLabel(product.category, isFa);

  return (
    <>
      <StoreAnnouncement config={config} />
      <StoreHeader
        config={config}
        hasCategories={hasCategories}
        mode="pdp"
      />
      <main>
        <div className="store-wrap store-pdp">
          <nav className="store-crumb">
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

          <div className="store-pdp__grid">
            <div className="store-pdp__gallery">
              <div className="store-pdp__stage">
                {current ? (
                  <SiteMedia
                    media={current}
                    mode="cover"
                    width={1400}
                    height={1750}
                    priority
                    className="store-pdp__img"
                    sizes="(max-width: 900px) 100vw, 55vw"
                  />
                ) : (
                  <div className="store-card__ph" />
                )}
              </div>
              {images.length > 1 ? (
                <div className="store-pdp__thumbs">
                  {images.map((media, index) =>
                    media ? (
                      <button
                        key={`${product.slug}-t-${index}`}
                        type="button"
                        className={
                          index === active
                            ? "store-pdp__thumb is-active"
                            : "store-pdp__thumb"
                        }
                        onClick={() => setActive(index)}
                      >
                        <SiteMedia
                          media={media}
                          mode="cover"
                          width={200}
                          height={250}
                          className="store-pdp__thumb-img"
                          sizes="80px"
                        />
                      </button>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>

            <div className="store-pdp__info">
              <p className="store-kicker">{cat}</p>
              <h1 className="store-display store-display--sm">{product.name}</h1>
              <p className="store-pdp__price">
                {product.price != null
                  ? formatPrice(config, product.price, product.currency)
                  : isFa
                    ? "قیمت با پیام"
                    : "Price on request"}
              </p>
              <p className="store-lead">
                {product.description || product.shortDescription}
              </p>

              {trust.length ? (
                <ul className="store-pdp__trust">
                  {trust.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              <div className="store-pdp__actions">
                <button
                  type="button"
                  className="store-btn store-btn--solid"
                  onClick={() => cart.add(product)}
                >
                  {isFa ? "افزودن به سبد" : "Add to bag"}
                </button>
                <a
                  href={buyHref}
                  className="store-btn store-btn--ghost"
                  target={buyHref.startsWith("http") ? "_blank" : undefined}
                  rel={buyHref.startsWith("http") ? "noreferrer" : undefined}
                >
                  {isFa ? "سفارش مستقیم" : "Order directly"}
                </a>
              </div>
            </div>
          </div>

          {related.length ? (
            <section className="store-section store-pdp__related">
              <div className="store-section__head">
                <p className="store-kicker">
                  {isFa ? "پیشنهادها" : "You may also like"}
                </p>
                <h2 className="store-heading">
                  {isFa ? "از همین مجموعه" : "More from the collection"}
                </h2>
              </div>
              <div className="store-grid store-grid--4">
                {related.map((item) => (
                  <StoreProductCard
                    key={item.id}
                    config={config}
                    product={item}
                    onQuickView={onQuickView}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>
      <StoreFooter config={config} hasCategories={hasCategories} mode="pdp" />
    </>
  );
}

export function StoreStory({ config }: { config: WebsiteConfig }) {
  const about = config.content.about;
  if (!about) return null;
  const image = siteMedia(config, about.imageId);
  const isFa = config.settings.language === "fa";

  return (
    <section className="store-section" id="story">
      <div className="store-wrap store-story">
        <div className="store-story__media">
          {image ? (
            <SiteMedia
              media={image}
              mode="cover"
              width={1000}
              height={1250}
              className="store-story__img"
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          ) : (
            <div className="store-card__ph" />
          )}
        </div>
        <div className="store-story__copy">
          <p className="store-kicker">{isFa ? "داستان برند" : "Brand story"}</p>
          <h2 className="store-heading">
            <EditableText path="about.title" value={about.title} as="span" />
          </h2>
          <p className="store-lead">
            <EditableText
              path="about.body"
              value={about.body}
              as="span"
              className="block"
              multiline
            />
          </p>
          {config.brand.tagline ? (
            <p className="store-quote">{config.brand.tagline}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function StoreLookbook({
  config,
  catalog,
}: {
  config: WebsiteConfig;
  catalog: StoreCatalogProduct[];
}) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return null;
  const isFa = config.settings.language === "fa";
  const { basePath, onProductNavigate } = useSiteNav();

  return (
    <section className="store-section store-section--soft" id="lookbook">
      <div className="store-wrap">
        <div className="store-section__head">
          <p className="store-kicker">{isFa ? "گالری" : "Gallery"}</p>
          <h2 className="store-heading">
            <EditableText path="gallery.title" value={gallery.title} as="span" />
          </h2>
        </div>
        <div className="store-lookbook">
          {gallery.imageIds.slice(0, 8).map((id, index) => {
            const image = siteMedia(config, id);
            if (!image) return null;
            const matched = productForGalleryImage(catalog, id);
            const href = matched
              ? productHref(basePath, matched.slug)
              : undefined;
            const open = (event: React.MouseEvent) => {
              if (!matched || !onProductNavigate) return;
              event.preventDefault();
              onProductNavigate(matched.slug);
            };
            const className =
              index === 0
                ? "store-lookbook__item store-lookbook__item--lead"
                : "store-lookbook__item";

            if (href) {
              return (
                <a
                  key={id}
                  href={href}
                  className={className}
                  onClick={open}
                  aria-label={matched?.name}
                >
                  <SiteMedia
                    media={image}
                    mode="cover"
                    width={index === 0 ? 1400 : 800}
                    height={index === 0 ? 1600 : 800}
                    className="store-lookbook__img"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </a>
              );
            }

            return (
              <figure key={id} className={className}>
                <SiteMedia
                  media={image}
                  mode="cover"
                  width={index === 0 ? 1400 : 800}
                  height={index === 0 ? 1600 : 800}
                  className="store-lookbook__img"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function StorePromo({ config }: { config: WebsiteConfig }) {
  const isFa = config.settings.language === "fa";
  const promo = config.content.promo ?? {
    kicker: isFa ? "سفارش" : "Order",
    title: isFa
      ? "برای سفارش، مستقیم پیام بدهید."
      : "Message us to place your order.",
    cta: isFa ? "ارتباط با فروشگاه" : "Contact the shop",
  };

  return (
    <section className="store-promo">
      <div className="store-wrap store-promo__inner">
        <p className="store-kicker store-kicker--on-dark">
          <EditableText path="promo.kicker" value={promo.kicker} as="span" />
        </p>
        <h2 className="store-display store-display--sm">
          <EditableText path="promo.title" value={promo.title} as="span" />
        </h2>
        <a href="#contact" className="store-btn store-btn--on-dark">
          <EditableText path="promo.cta" value={promo.cta} as="span" />
        </a>
      </div>
    </section>
  );
}

export function StoreFAQ({ config }: { config: WebsiteConfig }) {
  const faq = config.content.faq;
  if (!faq?.items.length) return null;
  return (
    <section className="store-section" id="faq">
      <div className="store-wrap store-faq">
        <h2 className="store-heading">
          <EditableText path="faq.title" value={faq.title} as="span" />
        </h2>
        <div className="store-faq__list">
          {faq.items.map((item) => (
            <details key={item.question} className="store-faq__item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StoreContact({ config }: { config: WebsiteConfig }) {
  const contact = config.content.contact;
  if (!contact) return null;
  const isFa = config.settings.language === "fa";
  const info = contact.info;
  const ig = info.instagram?.replace(/^@/, "");

  return (
    <section className="store-contact" id="contact">
      <div className="store-wrap store-contact__grid">
        <div>
          <p className="store-kicker store-kicker--on-dark">
            {isFa ? "ارتباط" : "Contact"}
          </p>
          <h2 className="store-heading store-heading--on-dark">{contact.title}</h2>
          <p className="store-lead store-lead--on-dark">{contact.body}</p>
          {ig ? (
            <a
              href={`https://instagram.com/${ig}`}
              className="store-btn store-btn--on-dark"
              target="_blank"
              rel="noreferrer"
            >
              @{ig}
            </a>
          ) : null}
        </div>
        <ul className="store-contact__list">
          {info.phone ? (
            <li>
              <span>{isFa ? "تلفن" : "Phone"}</span>
              <a href={`tel:${info.phone}`}>{info.phone}</a>
            </li>
          ) : null}
          {info.whatsapp ? (
            <li>
              <span>WhatsApp</span>
              <a href={`https://wa.me/${info.whatsapp.replace(/\D/g, "")}`}>
                {info.whatsapp}
              </a>
            </li>
          ) : null}
          {info.email ? (
            <li>
              <span>{isFa ? "ایمیل" : "Email"}</span>
              <a href={`mailto:${info.email}`}>{info.email}</a>
            </li>
          ) : null}
          {info.address ? (
            <li>
              <span>{isFa ? "آدرس" : "Address"}</span>
              <strong>{info.address}</strong>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}
