import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  formatRelativeTime,
  getWorkspaceDashboardData,
  getWorkspaceOrders,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import { OrderActions } from "@/components/dashboard/OrderActions";
import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
} from "@/components/dashboard/ui";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const isFa = locale === "fa";

  const [{ websites }, orders] = await Promise.all([
    getWorkspaceDashboardData(session.workspace.id),
    getWorkspaceOrders(session.workspace.id, 50),
  ]);

  const siteName = new Map(
    websites.map((site) => [site.id, site.config.brand.name]),
  );
  const whatsappBySite = new Map(
    websites.map((site) => [
      site.id,
      site.config.content.contact?.info?.whatsapp ?? null,
    ]),
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.navMain}
        title={isFa ? "سفارش‌ها" : "Orders"}
        description={
          isFa
            ? "درخواست‌های ثبت‌شده از سبد فروشگاه (واتساپ، پیامک، اینستاگرام)."
            : "Checkout intents from your store bag (WhatsApp, SMS, Instagram)."
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title={isFa ? "هنوز سفارشی نیست" : "No orders yet"}
          body={
            isFa
              ? "بعد از انتشار فروشگاه، سفارش‌های مشتریان اینجا می‌آید."
              : "After you publish the store, customer intents appear here."
          }
          icon={<ShoppingBag className="size-5" aria-hidden />}
          action={
            websites[0] ? (
              <Button asChild>
                <Link href={`/${locale}/dashboard/website?id=${websites[0].id}`}>
                  {dict.dashboard.openSite}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
              </Button>
            )
          }
        />
      ) : (
        <Panel
          title={isFa ? "همه سفارش‌ها" : "All orders"}
          description={`${orders.length} ${isFa ? "مورد" : "items"}`}
        >
          <ul className="divide-y divide-border">
            {orders.map((order) => {
              const summary = order.items
                .map((item) => `${item.name} ×${item.qty}`)
                .join(isFa ? "، " : ", ");
              return (
                <li key={order.id} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {summary || order.channel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {siteName.get(order.websiteId) ?? order.websiteId} ·{" "}
                        {order.channel} ·{" "}
                        {formatRelativeTime(order.createdAt, locale)}
                      </p>
                      {order.customerNote ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {order.customerNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <OrderActions
                    orderId={order.id}
                    status={order.status}
                    locale={locale}
                    whatsapp={whatsappBySite.get(order.websiteId)}
                    summary={summary || order.channel}
                  />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </PageStack>
  );
}
