import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { parseLocale } from "@/lib/i18n/paths";
import { recordProductEvent } from "@/lib/admin/events";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
}) {
  const { locale: raw, websiteId } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login?next=/${locale}/editor/${websiteId}`);
  const website = await getWebsiteForWorkspace(
    websiteId,
    session.workspace.id,
  );
  if (!website) notFound();

  void recordProductEvent({
    eventName: "editor_opened",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId,
    resourceType: "website",
    resourceId: websiteId,
    metadata: { source: "editor_page" },
  });

  return (
    <Suspense fallback={null}>
      <EditorShell
        website={website}
        locale={locale}
        plan={session.workspace.plan}
      />
    </Suspense>
  );
}
