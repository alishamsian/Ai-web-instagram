import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  getWorkspaceImportHandles,
  getWorkspaceWebsites,
} from "@/lib/dashboard/data";
import { getWorkspaceNotificationSettings } from "@/lib/orders/notify";
import { parseLocale } from "@/lib/i18n/paths";
import {
  buildDemoChannels,
  channelsFromWorkspace,
} from "@/lib/publishing/repository";
import { ChannelsPageClient } from "@/components/channels/ChannelsPageClient";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const [websites, imports, notifications] = await Promise.all([
    getWorkspaceWebsites(session.workspace.id),
    getWorkspaceImportHandles(session.workspace.id),
    getWorkspaceNotificationSettings(session.workspace.id),
  ]);

  const hasRealSurface = websites.length > 0 || imports.length > 0;
  const isDemo = !hasRealSurface;
  const channels = isDemo
    ? buildDemoChannels()
    : channelsFromWorkspace({
        websites,
        imports,
        locale,
        telegramChatId: notifications.telegramEnabled
          ? notifications.telegramChatId
          : null,
      });

  return (
    <ChannelsPageClient
      locale={locale}
      channels={channels}
      isDemo={isDemo}
      websiteManageHref={`/${locale}/dashboard/website`}
      importHref={`/${locale}/dashboard/import`}
      settingsHref={`/${locale}/dashboard/settings`}
    />
  );
}
