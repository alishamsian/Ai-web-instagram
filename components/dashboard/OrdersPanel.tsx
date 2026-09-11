import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/ui";
import { OrderActions } from "@/components/dashboard/OrderActions";
import { formatRelativeTime, type StoreOrderRow } from "@/lib/dashboard/data";

export function OrdersPanel({
  orders,
  locale,
  siteHref,
  whatsappBySite,
}: {
  orders: StoreOrderRow[];
  locale: "fa" | "en";
  siteHref?: string;
  whatsappBySite?: Map<string, string | null>;
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
              ? "بعد از انتشار فروشگاه، سفارش‌ها اینجا می‌آیند."
              : "They appear here after customers check out on your live store."}
          </p>
          {siteHref ? (
            <Link
              href={siteHref}
              className="mt-4 inline-flex rounded-xl bg-ink px-3 py-2 text-xs font-medium text-white"
            >
              {isFa ? "رفتن به سایت" : "Open site hub"}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {orders.slice(0, 5).map((order) => {
            const summary = order.items
              .map((item) => `${item.name} ×${item.qty}`)
              .join(isFa ? "، " : ", ");
            const tone =
              order.status === "done"
                ? ("success" as const)
                : order.status === "seen"
                  ? ("accent" as const)
                  : order.status === "new"
                    ? ("warning" as const)
                    : ("neutral" as const);
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
                  <StatusBadge tone={tone}>{order.status}</StatusBadge>
                </div>
                <OrderActions
                  orderId={order.id}
                  status={order.status}
                  locale={locale}
                  whatsapp={whatsappBySite?.get(order.websiteId)}
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
