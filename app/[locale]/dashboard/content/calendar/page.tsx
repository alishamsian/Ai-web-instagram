import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { parseLocale } from "@/lib/i18n/paths";
import { ContentCalendarClient } from "@/components/content/ContentCalendarClient";

export default async function ContentCalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  return (
    <ContentCalendarClient
      locale={locale}
      workspaceId={session.workspace.id}
    />
  );
}
