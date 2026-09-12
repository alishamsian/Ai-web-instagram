import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/ui";
import { OrderActions } from "@/components/dashboard/OrderActions";
import { formatRelativeTime, type StoreOrderRow } from "@/lib/dashboard/data";
import { orderStatusTone } from "@/lib/orders/status";

export function OrdersPanel({
  orders,
  locale,
  siteHref,
  contentHref,
  whatsappBySite,
  brandNameBySite,
}: {
  orders: StoreOrderRow[];
  locale: "fa" | "en";
  siteHref?: string;
  contentHref?: string;
  whatsappBySite?: Map<string, string | null>;
  brandNameBySite?: Map<string, string>;
}) {
  const isFa = locale === "fa";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            {isFa ? "سفارش‌ها" : "Orders"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isFa
              ? "درخواست‌های ثبت‌شده از سبد فروشگاه"
              : "Checkout intents from your store bag"}
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/orders`}
          className="rounded-lg px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-muted"
        >
          {isFa ? "همه" : "All"}
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-ink">
            {isFa ? "هنوز سفارشی نیست" : "No orders yet"}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
            {isFa
              ? "بعد از انتشار و آماده‌کردن محصولات، سفارش‌ها اینجا می‌آیند."
              : "They appear after you publish and stock products."}
          </p>
          <ol className="mx-auto mt-4 max-w-xs space-y-1.5 text-start text-[11px] text-muted-foreground">
            <li>
              {siteHref ? (
                <Link href={siteHref} className="underline-offset-2 hover:underline">
                  {isFa ? "۱. انتشار فروشگاه" : "1. Publish store"}
                </Link>
              ) : (
                <span>{isFa ? "۱. انتشار فروشگاه" : "1. Publish store"}</span>
              )}
            </li>
            <li>
              {contentHref ? (
                <Link
                  href={contentHref}
                  className="underline-offset-2 hover:underline"
                >
                  {isFa ? "۲. افزودن محصول" : "2. Add products"}
                </Link>
              ) : (
                <span>{isFa ? "۲. افزودن محصول" : "2. Add products"}</span>
              )}
            </li>
            <li>{isFa ? "۳. اشتراک لینک بیو" : "3. Share bio link"}</li>
          </ol>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {siteHref ? (
              <Link
                href={siteHref}
                className="inline-flex rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white"
              >
                {isFa ? "انتشار" : "Publish"}
              </Link>
            ) : null}
            {contentHref ? (
              <Link
                href={contentHref}
                className="inline-flex rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink ring-1 ring-border"
              >
                {isFa ? "محصولات" : "Products"}
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {orders.slice(0, 5).map((order) => {
            const summary = order.items
              .map((item) => `${item.name} ×${item.qty}`)
              .join(isFa ? "، " : ", ");
            const tone = orderStatusTone(order.status);
            return (
              <li key={order.id} className="space-y-2.5 px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {summary || order.channel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.channel} ·{" "}
                      {formatRelativeTime(order.createdAt, locale)}
                    </p>
                  </div>
                  <StatusBadge tone={tone === "neutral" ? "default" : tone}>
                    {order.status}
                  </StatusBadge>
                </div>
                <OrderActions
                  orderId={order.id}
                  status={order.status}
                  locale={locale}
                  whatsapp={whatsappBySite?.get(order.websiteId)}
                  customerContact={order.customerContact}
                  brandName={brandNameBySite?.get(order.websiteId)}
                  summary={summary || order.channel}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
