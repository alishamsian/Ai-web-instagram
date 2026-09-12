import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { parseLocale } from "@/lib/i18n/paths";
import { PublishQueueClient } from "@/components/content/PublishQueueClient";

export default async function PublishQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  return (
    <PublishQueueClient
      locale={locale}
      workspaceId={session.workspace.id}
    />
  );
}
