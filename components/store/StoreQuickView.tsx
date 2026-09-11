"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import type { StoreCatalogProduct } from "@/lib/store/theme";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useSiteNav } from "@/components/website/SiteNavContext";
import { useStoreCart } from "@/lib/store/cart";
import { productHref, orderHref } from "@/lib/website/product";

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

export function StoreQuickView({
  config,
  product,
  open,
  onOpenChange,
}: {
  config: WebsiteConfig;
  product: StoreCatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isFa = config.settings.language === "fa";
  const cart = useStoreCart();
  const { basePath, onProductNavigate } = useSiteNav();
  if (!product) return null;

  const image = siteMedia(config, product.imageIds[0]);
  const href = productHref(basePath, product.slug);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="store-modal__overlay" />
        <Dialog.Content className="store-modal__content" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">{product.name}</Dialog.Title>
          <button
            type="button"
            className="store-modal__close"
            onClick={() => onOpenChange(false)}
            aria-label={isFa ? "بستن" : "Close"}
          >
            <X size={18} />
          </button>
          <div className="store-qv">
            <div className="store-qv__media">
              {image ? (
                <SiteMedia
                  media={image}
                  mode="cover"
                  width={900}
                  height={1125}
                  className="store-qv__img"
                  sizes="(max-width: 800px) 100vw, 45vw"
                />
              ) : (
                <div className="store-card__ph" />
              )}
            </div>
            <div className="store-qv__copy">
              <p className="store-kicker">
                {product.category || (isFa ? "مجموعه" : "Collection")}
              </p>
              <h2 className="store-heading">{product.name}</h2>
              <p className="store-qv__price">
                {product.price != null
                  ? formatPrice(config, product.price, product.currency)
                  : isFa
                    ? "قیمت با پیام"
                    : "Price on request"}
              </p>
              <p className="store-lead">{product.shortDescription || product.description}</p>
              <div className="store-qv__actions">
                <button
                  type="button"
                  className="store-btn store-btn--solid"
                  onClick={() => {
                    cart.add(product);
                    onOpenChange(false);
                  }}
                >
                  {isFa ? "افزودن به سبد" : "Add to bag"}
                </button>
                <a
                  href={href}
                  className="store-btn store-btn--ghost"
                  onClick={(event) => {
                    if (!onProductNavigate) return;
                    event.preventDefault();
                    onOpenChange(false);
                    onProductNavigate(product.slug);
                  }}
                >
                  {isFa ? "صفحه محصول" : "Full details"}
                </a>
                <a
                  href={orderHref(config, product.name)}
                  className="store-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  {isFa ? "سفارش مستقیم از اینستاگرام" : "Order on Instagram"}
                </a>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
