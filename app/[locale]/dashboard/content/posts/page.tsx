import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { getWorkspaceNotificationSettings } from "@/lib/orders/notify";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import {
  buildDemoChannels,
  buildDemoContent,
  channelsFromWorkspace,
  contentFromImports,
} from "@/lib/publishing/repository";
import { PostsPageClient } from "@/components/content/PostsPageClient";

export default async function ContentPostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const [{ websites, imports }, notifications] = await Promise.all([
    getWorkspaceDashboardData(session.workspace.id),
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

  const items = isDemo
    ? buildDemoContent()
    : contentFromImports(imports, session.workspace.id);

  const primary = websites[0];
  const siteUrl = primary?.slug ? publishedSiteUrl(primary.slug) : undefined;

  return (
    <PostsPageClient
      locale={locale}
      items={items}
      channels={channels}
      isDemo={isDemo}
      siteUrl={siteUrl}
      importHref={`/${locale}/dashboard/import`}
      workspaceId={session.workspace.id}
    />
  );
}
