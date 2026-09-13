"use client";

import type { WebsiteConfig } from "@/types/website";
import { headingFont, siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { EditableText } from "@/components/editor/EditContext";
import { useSiteNav } from "@/components/website/SiteNavContext";
import {
  ensureCatalogProduct,
  productHref,
} from "@/lib/website/product";
import { StoreProductCard } from "@/components/website/StoreProductCard";

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="vitrin-eyebrow">{children}</p>;
}

function SectionTitle({
  config,
  children,
}: {
  config: WebsiteConfig;
  children: React.ReactNode;
}) {
  return <h2 className={`vitrin-title ${headingFont(config)}`}>{children}</h2>;
}

function formatPrice(config: WebsiteConfig, price: number, currency: string | null) {
  const locale = config.settings.language === "fa" ? "fa-IR" : "en-US";
  const formatted = new Intl.NumberFormat(locale).format(price);
  if (!currency) return formatted;
  if (config.settings.language === "fa") return `${formatted} ${currency}`;
  return `${currency} ${formatted}`;
}

export function HeroSection({ config }: { config: WebsiteConfig }) {
  const hero = config.content.hero;
  const image = siteMedia(config, hero.imageId);
  const c = config.brand.colors;
  const isStore = config.template === "store";
  const isEditorial =
    isStore ||
    config.template === "restaurant" ||
    config.brand.typography.scale === "editorial";
  const style = isEditorial ? "overlay" : hero.style;
  const isFa = config.settings.language === "fa";
  const shopHref = config.content.products?.items.length ? "#products" : "#contact";
  const primaryCta = isEditorial
    ? isFa
      ? config.content.products?.items.length
        ? "مشاهده مجموعه"
        : hero.cta
      : config.content.products?.items.length
        ? "View collection"
        : hero.cta
    : hero.cta;

  if ((style === "overlay" || style === "menu") && image) {
    return (
      <section
        className={`vitrin-hero vitrin-hero--overlay ${isEditorial ? "vitrin-hero--editorial" : ""} ${isStore ? "vitrin-hero--store" : ""}`}
      >
        <SiteMedia
          media={image}
          fill
          priority
          mode="cover"
          className="vitrin-hero__media"
          sizes="100vw"
        />
        <div
          className="vitrin-hero__shade"
          style={{
            background: isEditorial
              ? `linear-gradient(180deg, ${c.foreground}22 0%, ${c.foreground}08 38%, ${c.foreground}c4 100%)`
              : `linear-gradient(105deg, ${c.foreground}e6 0%, ${c.foreground}66 48%, ${c.foreground}22 100%)`,
          }}
        />
        <div className="vitrin-wrap vitrin-hero__content">
          {isEditorial ? (
            <>
              <p className={`vitrin-hero__brand ${headingFont(config)}`}>
                {config.brand.name}
              </p>
              <h1 className="vitrin-hero__headline vitrin-hero__headline--line">
                <EditableText
                  path="hero.headline"
                  value={hero.headline}
                  as="span"
                  className="block"
                />
              </h1>
              <p className="vitrin-hero__sub">
                <EditableText
                  path="hero.subheadline"
                  value={hero.subheadline}
                  as="span"
                  className="block"
                  multiline
                />
              </p>
              <div className="vitrin-hero__actions">
                <a
                  href={shopHref}
                  className="vitrin-cta vitrin-cta--editorial"
                  style={{ background: c.background, color: c.foreground }}
                >
                  {primaryCta}
                </a>
              </div>
            </>
          ) : (
            <>
              <SectionEyebrow>{config.brand.name}</SectionEyebrow>
              <h1 className={`vitrin-hero__headline ${headingFont(config)}`}>
                <EditableText
                  path="hero.headline"
                  value={hero.headline}
                  as="span"
                  className="block"
                />
              </h1>
              <p className="vitrin-hero__sub">
                <EditableText
                  path="hero.subheadline"
                  value={hero.subheadline}
                  as="span"
                  className="block"
                  multiline
                />
              </p>
              <div className="vitrin-hero__actions">
                <a
                  href="#contact"
                  className="vitrin-cta"
                  style={{ background: c.accent, color: "#fff" }}
                >
                  {hero.cta}
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // Editorial templates without a hero image still get a brand-first opening.
  if (isEditorial && !image) {
    return (
      <section
        className="vitrin-hero vitrin-hero--editorial-plain"
        style={{ background: c.foreground, color: c.background }}
      >
        <div className="vitrin-wrap vitrin-hero__content">
          <p className={`vitrin-hero__brand ${headingFont(config)}`}>
            {config.brand.name}
          </p>
          <h1 className="vitrin-hero__headline vitrin-hero__headline--line">
            <EditableText
              path="hero.headline"
              value={hero.headline}
              as="span"
              className="block"
            />
          </h1>
          <p className="vitrin-hero__sub">
            <EditableText
              path="hero.subheadline"
              value={hero.subheadline}
              as="span"
              className="block"
              multiline
            />
          </p>
          <div className="vitrin-hero__actions">
            <a
              href={shopHref}
              className="vitrin-cta vitrin-cta--editorial"
              style={{ background: c.background, color: c.foreground }}
            >
              {primaryCta}
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (style === "minimal") {
    return (
      <section className="vitrin-hero vitrin-hero--minimal vitrin-hero--editorial-plain">
        <div className="vitrin-wrap vitrin-hero__content">
          <p className={`vitrin-hero__brand ${headingFont(config)}`}>
            {config.brand.name}
          </p>
          <h1 className="vitrin-hero__headline vitrin-hero__headline--line">
            <EditableText
              path="hero.headline"
              value={hero.headline}
              as="span"
              className="block"
            />
          </h1>
          <p className="vitrin-hero__sub vitrin-hero__sub--narrow">
            <EditableText
              path="hero.subheadline"
              value={hero.subheadline}
              as="span"
              className="block"
              multiline
            />
          </p>
          <div className="vitrin-hero__actions">
            <a
              href="#contact"
              className="vitrin-cta vitrin-cta--editorial"
              style={{ background: c.primary, color: c.secondary }}
            >
              {hero.cta}
            </a>
          </div>
        </div>
        {image ? (
          <div className="vitrin-hero__bleed">
            <SiteMedia
              media={image}
              width={1600}
              height={900}
              priority
              className="vitrin-hero__bleed-img"
              sizes="100vw"
            />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="vitrin-hero vitrin-hero--split">
      <div className="vitrin-hero__split-copy">
        <div className="vitrin-hero__split-inner">
          <p className={`vitrin-hero__brand vitrin-hero__brand--split ${headingFont(config)}`}>
            {config.brand.name}
          </p>
          <h1 className="vitrin-hero__headline vitrin-hero__headline--line">
            <EditableText
              path="hero.headline"
              value={hero.headline}
              as="span"
              className="block"
            />
          </h1>
          <p className="vitrin-hero__sub">
            <EditableText
              path="hero.subheadline"
              value={hero.subheadline}
              as="span"
              className="block"
              multiline
            />
          </p>
          <a
            href="#contact"
            className="vitrin-cta vitrin-cta--editorial"
            style={{ background: c.primary, color: c.secondary }}
          >
            {hero.cta}
          </a>
        </div>
      </div>
      {image ? (
        <div className="vitrin-hero__split-media">
          <SiteMedia
            media={image}
            fill
            priority
            className="vitrin-hero__media"
            sizes="(max-width: 1024px) 100vw, 52vw"
          />
        </div>
      ) : null}
    </section>
  );
}

export function AboutSection({ config }: { config: WebsiteConfig }) {
  const about = config.content.about;
  if (!about) return null;
  const image = siteMedia(config, about.imageId);
  const isFa = config.settings.language === "fa";
  const isStore = config.template === "store";
  return (
    <section id="about" className={`vitrin-section ${isStore ? "vitrin-about-section--store" : ""}`}>
      <div className="vitrin-wrap vitrin-about">
        {image ? (
          <div className="vitrin-about__media">
            <SiteMedia
              media={image}
              width={900}
              height={1100}
              className="vitrin-about__img"
              sizes="(max-width: 900px) 100vw, 46vw"
            />
          </div>
        ) : null}
        <div className="vitrin-about__copy">
          <SectionEyebrow>{isFa ? "درباره" : "About"}</SectionEyebrow>
          <SectionTitle config={config}>
            <EditableText path="about.title" value={about.title} as="span" />
          </SectionTitle>
          {isStore ? (
            <p className={`vitrin-about__quote ${headingFont(config)}`} aria-hidden>
              “
            </p>
          ) : null}
          <p className="vitrin-prose">
            <EditableText
              path="about.body"
              value={about.body}
              as="span"
              className="block"
              multiline
            />
          </p>
          {config.brand.tagline ? (
            <p className="vitrin-about__tag">{config.brand.tagline}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProductsSection({ config }: { config: WebsiteConfig }) {
  const { basePath, onProductNavigate } = useSiteNav();
  const products = config.content.products;
  if (!products?.items.length) return null;
  const isStore = config.template === "store";
  const isEditorial =
    isStore ||
    config.template === "restaurant" ||
    config.brand.typography.scale === "editorial";
  const isFa = config.settings.language === "fa";

  const items = products.items.map((item, index) =>
    ensureCatalogProduct(item, index, config.settings.language),
  );

  return (
    <section
      id="products"
      className={`vitrin-section vitrin-section--soft ${isEditorial ? "vitrin-products-section--editorial" : ""} ${isStore ? "vitrin-products-section--store" : ""}`}
    >
      <div className="vitrin-wrap">
        <div
          className={`vitrin-section__head ${isEditorial ? "vitrin-section__head--editorial" : ""}`}
        >
          {isEditorial ? (
            <SectionEyebrow>
              {isStore
                ? isFa
                  ? "فروشگاه"
                  : "Shop"
                : isFa
                  ? "منو"
                  : "Menu"}
            </SectionEyebrow>
          ) : null}
          <SectionTitle config={config}>
            <EditableText path="products.title" value={products.title} as="span" />
          </SectionTitle>
          {isStore ? (
            <p className="vitrin-section__lead">
              {isFa
                ? "۹ انتخاب از ویترین — روی هر محصول بزنید تا صفحه اختصاصی‌اش باز شود."
                : "Nine picks from the shop — tap any piece for its product page."}
            </p>
          ) : isEditorial ? (
            <p className="vitrin-section__lead">
              {isFa
                ? "انتخاب‌های تازه — برای سفارش مستقیم پیام بدهید."
                : "New picks — message directly to order."}
            </p>
          ) : null}
        </div>

        <div
          className={
            isStore
              ? "vitrin-products vitrin-products--shop"
              : isEditorial
                ? "vitrin-products vitrin-products--editorial"
                : "vitrin-products"
          }
        >
          {items.map((product, index) => {
            if (isStore) {
              return (
                <StoreProductCard
                  key={product.id}
                  config={config}
                  product={product}
                  index={index}
                  featured={index === 0}
                />
              );
            }

            const image = siteMedia(config, product.imageIds[0]);
            const href = productHref(basePath, product.slug);
            const rawCategory = product.category?.trim() ?? "";
            const showBadge =
              isEditorial &&
              rawCategory.length > 0 &&
              !["image", "video", "reel", "sidecar", "carousel", "general"].includes(
                rawCategory.toLowerCase(),
              );

            const openProduct = (event: React.MouseEvent) => {
              if (!onProductNavigate) return;
              event.preventDefault();
              onProductNavigate(product.slug);
            };

            return (
              <article key={product.id} className="vitrin-product">
                <a
                  href={href}
                  className="vitrin-product__media-link"
                  onClick={openProduct}
                >
                  <div className="vitrin-product__media">
                    {image ? (
                      <SiteMedia
                        media={image}
                        mode="cover"
                        width={700}
                        height={880}
                        className="vitrin-product__img"
                        sizes="(max-width: 700px) 50vw, 28vw"
                      />
                    ) : (
                      <div
                        className="vitrin-product__ph"
                        style={{ background: config.brand.colors.muted }}
                      />
                    )}
                    {showBadge ? (
                      <span className="vitrin-product__badge">{rawCategory}</span>
                    ) : null}
                    <span className="vitrin-product__index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </a>
                <div className="vitrin-product__meta">
                  <div className="vitrin-product__row">
                    <h3
                      className={`vitrin-product__name ${isEditorial ? headingFont(config) : ""}`}
                    >
                      <a href={href} onClick={openProduct}>
                        {product.name}
                      </a>
                    </h3>
                    {product.price != null ? (
                      <p className="vitrin-product__price">
                        {formatPrice(config, product.price, product.currency)}
                      </p>
                    ) : (
                      <p className="vitrin-product__price vitrin-product__price--ask">
                        {isFa ? "استعلام" : "Inquire"}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {isStore ? <StoreBenefits config={config} /> : null}
    </section>
  );
}

export function StoreBenefits({ config }: { config: WebsiteConfig }) {
  const isFa = config.settings.language === "fa";
  const items = isFa
    ? [
        { title: "سفارش مستقیم", body: "از صفحه محصول به دایرکت یا واتساپ." },
        { title: "ارسال سراسری", body: "هماهنگی ارسال بعد از تأیید سفارش." },
        { title: "مشاوره سایز", body: "قبل از خرید راهنمایی می‌گیرید." },
      ]
    : [
        { title: "Direct order", body: "From product page to Instagram or WhatsApp." },
        { title: "Nationwide ship", body: "Shipping arranged after confirmation." },
        { title: "Sizing help", body: "Guidance before you buy." },
      ];

  return (
    <div className="vitrin-wrap vitrin-store-benefits">
      {items.map((item) => (
        <div key={item.title} className="vitrin-store-benefit">
          <p className="vitrin-store-benefit__title">{item.title}</p>
          <p className="vitrin-store-benefit__body">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function ServicesSection({ config }: { config: WebsiteConfig }) {
  const services = config.content.services;
  if (!services?.items.length) return null;
  return (
    <section id="services" className="vitrin-section">
      <div className="vitrin-wrap">
        <div className="vitrin-section__head">
          <SectionTitle config={config}>
            <EditableText path="services.title" value={services.title} as="span" />
          </SectionTitle>
        </div>
        <div className="vitrin-services">
          {services.items.map((service, index) => (
            <article key={service.name} className="vitrin-service">
              <span className="vitrin-service__index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="vitrin-service__name">{service.name}</h3>
                <p className="vitrin-service__desc">{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ config }: { config: WebsiteConfig }) {
  const gallery = config.content.gallery;
  if (!gallery?.imageIds.length) return null;
  const isStore = config.template === "store";
  const isEditorial =
    isStore ||
    config.template === "restaurant" ||
    config.brand.typography.scale === "editorial";
  const isFa = config.settings.language === "fa";
  return (
    <section
      id="gallery"
      className={`vitrin-section ${isEditorial ? "vitrin-gallery-section--store" : "vitrin-section--soft"}`}
    >
      <div className="vitrin-wrap">
        <div
          className={`vitrin-section__head ${isEditorial ? "vitrin-section__head--editorial" : ""}`}
        >
          {isEditorial ? (
            <SectionEyebrow>{isFa ? "آرشیو" : "Archive"}</SectionEyebrow>
          ) : null}
          <SectionTitle config={config}>
            <EditableText path="gallery.title" value={gallery.title} as="span" />
          </SectionTitle>
        </div>
        <div className={isEditorial ? "vitrin-gallery vitrin-gallery--store" : "vitrin-gallery"}>
          {gallery.imageIds.slice(0, isEditorial ? 7 : 9).map((id, index) => {
            const image = siteMedia(config, id);
            if (!image) return null;
            return (
              <figure
                key={id}
                className={`vitrin-gallery__item ${
                  index === 0
                    ? "vitrin-gallery__item--lead"
                    : index === 3 && isEditorial
                      ? "vitrin-gallery__item--wide"
                      : ""
                }`}
              >
                <SiteMedia
                  media={image}
                  width={index === 0 ? 1400 : 700}
                  height={index === 0 ? 1600 : 700}
                  className="vitrin-gallery__img"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FAQSiteSection({ config }: { config: WebsiteConfig }) {
  const faq = config.content.faq;
  if (!faq?.items.length) return null;
  const isStore = config.template === "store";
  return (
    <section className={`vitrin-section ${isStore ? "vitrin-section--soft" : ""}`}>
      <div className="vitrin-wrap vitrin-faq">
        <SectionTitle config={config}>
          <EditableText path="faq.title" value={faq.title} as="span" />
        </SectionTitle>
        <div className="vitrin-faq__list">
          {faq.items.map((item) => (
            <details key={item.question} className="vitrin-faq__item">
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ config }: { config: WebsiteConfig }) {
  const contact = config.content.contact;
  if (!contact) return null;
  const info = contact.info;
  const c = config.brand.colors;
  const isFa = config.settings.language === "fa";
  const isStore = config.template === "store";

  const rows = [
    info.instagram
      ? {
          label: "Instagram",
          value: `@${info.instagram.replace(/^@/, "")}`,
          href: `https://instagram.com/${info.instagram.replace(/^@/, "")}`,
        }
      : null,
    info.phone
      ? { label: isFa ? "تلفن" : "Phone", value: info.phone, href: `tel:${info.phone}` }
      : null,
    info.whatsapp
      ? {
          label: "WhatsApp",
          value: info.whatsapp,
          href: `https://wa.me/${info.whatsapp.replace(/\D/g, "")}`,
        }
      : null,
    info.email
      ? { label: isFa ? "ایمیل" : "Email", value: info.email, href: `mailto:${info.email}` }
      : null,
    info.address
      ? { label: isFa ? "آدرس" : "Address", value: info.address, href: undefined }
      : null,
  ].filter(Boolean) as { label: string; value: string; href?: string }[];

  return (
    <section id="contact" className="vitrin-section">
      <div
        className={`vitrin-contact ${isStore ? "vitrin-contact--store" : ""}`}
        style={{ background: c.foreground, color: c.background }}
      >
        <div className="vitrin-wrap vitrin-contact__grid">
          <div>
            <SectionEyebrow>{isFa ? "ارتباط" : "Contact"}</SectionEyebrow>
            <h2 className={`vitrin-title vitrin-title--on-dark ${headingFont(config)}`}>
              {contact.title}
            </h2>
            <p className="vitrin-prose vitrin-prose--on-dark">{contact.body}</p>
            <a
              href={
                info.instagram
                  ? `https://instagram.com/${info.instagram.replace(/^@/, "")}`
                  : info.whatsapp
                    ? `https://wa.me/${info.whatsapp.replace(/\D/g, "")}`
                    : info.phone
                      ? `tel:${info.phone}`
                      : "#contact"
              }
              className={`vitrin-cta vitrin-cta--invert ${isStore ? "vitrin-cta--store" : ""}`}
              style={{ background: c.background, color: c.foreground }}
              target="_blank"
              rel="noreferrer"
            >
              {config.content.hero.cta}
            </a>
          </div>
          {rows.length ? (
            <ul className="vitrin-contact__list">
              {rows.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noreferrer">
                      {row.value}
                    </a>
                  ) : (
                    <strong>{row.value}</strong>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ config }: { config: WebsiteConfig }) {
  const testimonials = config.content.testimonials;
  if (!testimonials?.items.length) return null;
  const isFa = config.settings.language === "fa";
  return (
    <section id="testimonials" className="vitrin-section vitrin-section--soft">
      <div className="vitrin-wrap">
        <div className="vitrin-section__head">
          <SectionEyebrow>{isFa ? "نظرات" : "Testimonials"}</SectionEyebrow>
          <SectionTitle config={config}>
            <EditableText
              path="testimonials.title"
              value={testimonials.title}
              as="span"
            />
          </SectionTitle>
        </div>
        <div className="vitrin-testimonials">
          {testimonials.items.map((item, index) => (
            <blockquote key={`${item.author}-${index}`} className="vitrin-testimonial">
              <p className={`vitrin-testimonial__quote ${headingFont(config)}`}>
                “{item.quote}”
              </p>
              <footer className="vitrin-testimonial__author">{item.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FooterSection({ config }: { config: WebsiteConfig }) {
  const isStore = config.template === "store";
  return (
    <footer className={`vitrin-footer ${isStore ? "vitrin-footer--store" : ""}`}>
      <div className="vitrin-wrap vitrin-footer__inner">
        <span className={headingFont(config)}>{config.brand.name}</span>
        {config.brand.tagline ? (
          <span className="vitrin-footer__tag">{config.brand.tagline}</span>
        ) : null}
        {config.settings.showBranding ? (
          <span className="vitrin-footer__credit">Made with Vitrin</span>
        ) : null}
      </div>
    </footer>
  );
}
