import { notFound, redirect } from "next/navigation";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";
import { parseLocale } from "@/lib/i18n/paths";
import { recordProductEvent } from "@/lib/admin/events";
import { findPageByIdOrSlug } from "@/lib/visual-editor/pages";
import { ensureWebsitePages } from "@/lib/visual-editor/pages";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: raw, websiteId } = await params;
  const { page: pageRef } = await searchParams;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === websiteId && item.workspaceId === session.workspace.id,
  );
  if (!website) notFound();

  const pages = ensureWebsitePages(website.config);
  const config = { ...website.config, pages };
  const resolved = pageRef
    ? findPageByIdOrSlug(pages, pageRef)
    : pages.find((p) => p.id === "home") || pages[0];
  const pageId = resolved?.id || "home";

  void recordProductEvent({
    eventName: "website_previewed",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId,
    resourceType: "website",
    resourceId: websiteId,
    metadata: { source: "preview_page", pageId },
  });

  return (
    <WebsiteRenderer
      config={config}
      mode="preview"
      basePath={`/${locale}/preview/${websiteId}`}
      pageId={pageId}
    />
  );
}
