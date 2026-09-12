import Link from "next/link";
import { redirect } from "next/navigation";
import { countWebsitesForWorkspace } from "@/lib/database/queries";
import { getSession } from "@/lib/auth/session";
import { planUsageLabel } from "@/lib/dashboard/data";
import { getWorkspaceNotificationSettings } from "@/lib/orders/notify";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { PasswordChangeForm } from "@/components/dashboard/PasswordChangeForm";
import { WorkspaceNameForm } from "@/components/dashboard/WorkspaceNameForm";
import { NotificationSettingsForm } from "@/components/dashboard/NotificationSettingsForm";
import {
  KeyValue,
  PageHeader,
  PageStack,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const [siteCount, notificationSettings] = await Promise.all([
    countWebsitesForWorkspace(session.workspace.id),
    getWorkspaceNotificationSettings(session.workspace.id),
  ]);
  const isFa = locale === "fa";

  const planLabel =
    session.workspace.plan === "pro"
      ? isFa
        ? "حرفه‌ای"
        : "Pro"
      : isFa
        ? "شروع"
        : "Starter";

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.navAccount}
        title={dict.dashboard.settingsTitle}
        description={dict.dashboard.settingsBody}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={dict.dashboard.profile}>
          <dl className="divide-y divide-border">
            <KeyValue label={dict.dashboard.name} value={session.user.name || "—"} />
            <KeyValue label={dict.dashboard.email} value={session.user.email} />
            <KeyValue
              label={dict.dashboard.language}
              value={isFa ? "فارسی" : "English"}
            />
          </dl>
          <div className="border-t border-border p-4 md:hidden">
            <SignOutButton label={dict.dashboard.signOut} locale={locale} />
          </div>
        </Panel>

        <Panel
          title={dict.dashboard.workspace}
          description={isFa ? "نام و ظرفیت فضای کاری" : "Name and capacity"}
        >
          <WorkspaceNameForm
            initialName={session.workspace.name}
            locale={locale}
          />
          <dl className="divide-y divide-border border-t border-border">
            <KeyValue
              label={dict.dashboard.plan}
              value={<StatusBadge tone="accent">{planLabel}</StatusBadge>}
            />
            <KeyValue
              label={isFa ? "ظرفیت سایت" : "Site capacity"}
              value={planUsageLabel(session.workspace.plan, siteCount, locale)}
            />
          </dl>
          <div className="border-t border-border p-4">
            <Button asChild className="w-full" variant="outline">
              <Link href={`/${locale}/dashboard/billing`}>
                {dict.dashboard.billing}
              </Link>
            </Button>
          </div>
        </Panel>

        <Panel
          title={isFa ? "اعلان سفارش" : "Order notifications"}
          description={
            isFa
              ? "ایمیل، تلگرام و واتساپ برای سفارش جدید"
              : "Email, Telegram, and WhatsApp for new orders"
          }
        >
          <NotificationSettingsForm
            locale={locale}
            initial={notificationSettings}
          />
        </Panel>

        <Panel title={isFa ? "امنیت" : "Security"}>
          <PasswordChangeForm locale={locale} />
        </Panel>

        <Panel
          title={isFa ? "دسترسی سریع" : "Shortcuts"}
          description={isFa ? "میانبر به بخش‌های پرتکرار" : "Jump to frequent areas"}
        >
          <div className="flex flex-wrap gap-2 p-5">
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/dashboard/orders`}>
                {isFa ? "سفارش‌ها" : "Orders"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  siteCount > 0
                    ? `/${locale}/dashboard/website?section=domain`
                    : `/${locale}/dashboard/website`
                }
              >
                {dict.dashboard.domains}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/dashboard/content`}>
                {dict.dashboard.content}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/dashboard/analytics`}>
                {dict.dashboard.analytics}
              </Link>
            </Button>
          </div>
        </Panel>
      </div>
    </PageStack>
  );
}
