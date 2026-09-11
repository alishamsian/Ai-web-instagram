import { notFound, redirect } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";
import { parseLocale } from "@/lib/i18n/paths";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
}) {
  const { locale: raw, websiteId } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/editor/${websiteId}`);
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === websiteId && item.workspaceId === session.workspace.id,
  );
  if (!website) notFound();
  return <EditorShell website={website} locale={locale} plan={session.workspace.plan} />;
}
