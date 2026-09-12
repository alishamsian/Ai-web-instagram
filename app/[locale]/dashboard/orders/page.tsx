import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  formatRelativeTime,
  getWorkspaceOrders,
  getWorkspaceWebsites,
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

  const [websites, orders] = await Promise.all([
    getWorkspaceWebsites(session.workspace.id),
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
  const primary = websites[0] ?? null;
  const published = websites.some((s) => s.status === "published");

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
              ? "با انتشار فروشگاه و اشتراک لینک بیو، سفارش‌ها اینجا می‌آیند."
              : "Publish your store and share the bio link — orders land here."
          }
          icon={<ShoppingBag className="size-5" aria-hidden />}
          steps={[
            {
              label: isFa ? "انتشار فروشگاه" : "Publish the store",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : `/${locale}/create`,
              done: published,
            },
            {
              label: isFa ? "افزودن یا بررسی محصولات" : "Add or review products",
              href: primary
                ? `/${locale}/dashboard/content?id=${primary.id}`
                : `/${locale}/create`,
              done: Boolean(
                primary?.config.content.products?.items?.length,
              ),
            },
            {
              label: isFa
                ? "اشتراک لینک بیو در اینستاگرام"
                : "Share bio link on Instagram",
              href: primary
                ? `/${locale}/dashboard/website?id=${primary.id}`
                : undefined,
              done: false,
            },
          ]}
          action={
            primary ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href={`/${locale}/dashboard/website?id=${primary.id}`}>
                    {published ? dict.dashboard.openSite : dict.dashboard.publish}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/dashboard/content?id=${primary.id}`}>
                    {dict.dashboard.content}
                  </Link>
                </Button>
              </div>
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
                <li key={order.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {summary || order.channel}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
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
                    customerContact={order.customerContact}
                    brandName={siteName.get(order.websiteId)}
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
