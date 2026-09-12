import { notFound, redirect } from "next/navigation";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";
import { parseLocale } from "@/lib/i18n/paths";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
}) {
  const { locale: raw, websiteId } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === websiteId && item.workspaceId === session.workspace.id,
  );
  if (!website) notFound();
  return (
    <WebsiteRenderer
      config={website.config}
      mode="preview"
      basePath={`/${locale}/preview/${websiteId}`}
    />
  );
}
