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
  SoftBanner,
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
        description={
          isFa
            ? "فضای کاری، اعلان‌ها و امنیت — یکجا و مرتب."
            : "Workspace, notifications, and security — one clean place."
        }
      />

      <SoftBanner tone="info">
        {isFa
          ? "زبان رابط از مسیر /fa یا /en در آدرس سایت تعیین می‌شود."
          : "UI language follows the /fa or /en path in the URL."}
      </SoftBanner>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={isFa ? "فضای کاری" : "Workspace"}
          description={
            isFa
              ? "نام برند، پلن و ظرفیت"
              : "Brand name, plan, and capacity"
          }
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
              value={planUsageLabel(
                session.workspace.plan,
                siteCount,
                locale,
              )}
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
          title={dict.dashboard.profile}
          description={
            isFa ? "حساب ورود شما" : "Your sign-in account"
          }
        >
          <dl className="divide-y divide-border">
            <KeyValue
              label={dict.dashboard.name}
              value={session.user.name || "—"}
            />
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
          title={isFa ? "اعلان‌ها" : "Notifications"}
          description={
            isFa
              ? "وقتی سفارش جدید می‌آید چطور خبرت کنیم"
              : "How we reach you when a new order arrives"
          }
        >
          <NotificationSettingsForm
            locale={locale}
            initial={notificationSettings}
          />
        </Panel>

        <Panel
          title={isFa ? "امنیت" : "Security"}
          description={
            isFa ? "رمز عبور حساب" : "Account password"
          }
        >
          <PasswordChangeForm locale={locale} />
        </Panel>
      </div>

      <Panel
        title={isFa ? "میانبرها" : "Shortcuts"}
        description={isFa ? "⌘K همه‌جا در دسترس است" : "⌘K works anywhere in the dashboard"}
      >
        <div className="flex flex-wrap gap-2 p-5">
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/orders`}>
              {isFa ? "سفارش‌ها" : "Orders"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/domains`}>
              {dict.dashboard.domains}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/content/posts`}>
              {isFa ? "پست‌ها" : "Posts"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/channels`}>
              {isFa ? "کانال‌ها" : "Channels"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/content/queue`}>
              {isFa ? "صف انتشار" : "Queue"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/${locale}/dashboard/analytics`}>
              {dict.dashboard.analytics}
            </Link>
          </Button>
        </div>
      </Panel>
    </PageStack>
  );
}
