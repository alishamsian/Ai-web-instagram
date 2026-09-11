"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import type { WebsiteConfig } from "@/types/website";
import { siteMedia } from "@/components/website/shell";
import { SiteMedia } from "@/components/website/SiteImage";
import { useStoreCart } from "@/lib/store/cart";
import { cartOrderHref, buildOrderMessage } from "@/lib/website/product";

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

export function StoreCartDrawer({
  config,
  websiteId,
}: {
  config: WebsiteConfig;
  websiteId?: string;
}) {
  const isFa = config.settings.language === "fa";
  const cart = useStoreCart();
  const priced = cart.lines.filter((line) => line.product.price != null);
  const subtotal = priced.reduce(
    (sum, line) => sum + (line.product.price ?? 0) * line.qty,
    0,
  );
  const currency = priced[0]?.product.currency ?? null;
  const orderLines = cart.lines.map((line) => ({
    name: line.product.name,
    qty: line.qty,
  }));
  const orderMessage = buildOrderMessage(config, orderLines);
  const checkoutHref =
    cart.lines.length > 0 ? cartOrderHref(config, orderLines) : "#contact";
  const prefersIgOnly =
    Boolean(config.content.contact?.info?.instagram) &&
    !config.content.contact?.info?.whatsapp &&
    !config.content.contact?.info?.phone &&
    !config.content.contact?.info?.email;

  const logOrder = () => {
    if (!websiteId || !cart.lines.length) return;
    void fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        websiteId,
        channel: prefersIgOnly ? "instagram" : "whatsapp",
        items: cart.lines.map((line) => ({
          name: line.product.name,
          qty: line.qty,
          price: line.product.price,
        })),
      }),
      keepalive: true,
    }).catch(() => undefined);
  };

  return (
    <Dialog.Root open={cart.open} onOpenChange={cart.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="store-modal__overlay" />
        <Dialog.Content className="store-cart" aria-describedby={undefined}>
          <div className="store-cart__head">
            <Dialog.Title className="store-heading store-heading--sm">
              {isFa ? "سبد خرید" : "Your bag"}
            </Dialog.Title>
            <button
              type="button"
              className="store-icon-btn"
              onClick={() => cart.setOpen(false)}
              aria-label={isFa ? "بستن" : "Close"}
            >
              <X size={18} />
            </button>
          </div>

          {cart.lines.length === 0 ? (
            <div className="store-cart__empty">
              <p className="store-muted">
                {isFa ? "سبد شما خالی است." : "Your bag is empty."}
              </p>
              <button
                type="button"
                className="store-btn store-btn--solid"
                onClick={() => cart.setOpen(false)}
              >
                {isFa ? "ادامه خرید" : "Continue shopping"}
              </button>
            </div>
          ) : (
            <>
              <ul className="store-cart__list">
                {cart.lines.map((line) => {
                  const image = siteMedia(config, line.product.imageIds[0]);
                  return (
                    <li key={line.key} className="store-cart__item">
                      <div className="store-cart__thumb">
                        {image ? (
                          <SiteMedia
                            media={image}
                            mode="cover"
                            width={160}
                            height={200}
                            className="store-cart__img"
                            sizes="80px"
                          />
                        ) : (
                          <div className="store-card__ph" />
                        )}
                      </div>
                      <div className="store-cart__meta">
                        <p className="store-cart__name">{line.product.name}</p>
                        <p className="store-muted">
                          {line.product.price != null
                            ? formatPrice(
                                config,
                                line.product.price,
                                line.product.currency,
                              )
                            : isFa
                              ? "قیمت با پیام"
                              : "Price on request"}
                        </p>
                        <div className="store-cart__qty">
                          <button
                            type="button"
                            aria-label="Decrease"
                            onClick={() => cart.setQty(line.key, line.qty - 1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span>{line.qty}</span>
                          <button
                            type="button"
                            aria-label="Increase"
                            onClick={() => cart.setQty(line.key, line.qty + 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="store-link"
                        onClick={() => cart.remove(line.key)}
                      >
                        {isFa ? "حذف" : "Remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="store-cart__foot">
                <div className="store-cart__row">
                  <span>{isFa ? "جمع" : "Subtotal"}</span>
                  <strong>
                    {subtotal > 0
                      ? formatPrice(config, subtotal, currency)
                      : isFa
                        ? "پس از هماهنگی"
                        : "Confirmed on order"}
                  </strong>
                </div>
                <p className="store-muted store-cart__note">
                  {isFa
                    ? prefersIgOnly
                      ? "متن سفارش کپی می‌شود؛ در دایرکت اینستاگرام بفرستید. پرداخت آنلاین هنوز فعال نیست."
                      : "پرداخت آنلاین هنوز فعال نیست — سفارش از واتساپ/پیامک نهایی می‌شود."
                    : prefersIgOnly
                      ? "Order text is copied — paste it in Instagram DM. Online checkout isn’t enabled yet."
                      : "Online checkout isn’t enabled yet — orders finalize on WhatsApp/SMS."}
                </p>
                <a
                  href={checkoutHref}
                  className="store-btn store-btn--solid store-btn--block"
                  target={
                    checkoutHref.startsWith("http") ||
                    checkoutHref.startsWith("sms:") ||
                    checkoutHref.startsWith("mailto:")
                      ? "_blank"
                      : undefined
                  }
                  rel={checkoutHref.startsWith("http") ? "noreferrer" : undefined}
                  onClick={() => {
                    logOrder();
                    if (!prefersIgOnly) return;
                    void navigator.clipboard?.writeText(orderMessage);
                  }}
                >
                  {isFa
                    ? prefersIgOnly
                      ? "کپی سفارش و باز کردن اینستاگرام"
                      : "ادامه سفارش"
                    : prefersIgOnly
                      ? "Copy order & open Instagram"
                      : "Continue to order"}
                </a>
                <button
                  type="button"
                  className="store-btn store-btn--ghost store-btn--block"
                  onClick={() => cart.setOpen(false)}
                >
                  {isFa ? "ادامه خرید" : "Continue shopping"}
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
