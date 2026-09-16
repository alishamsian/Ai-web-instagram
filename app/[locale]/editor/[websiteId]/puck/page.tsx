import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PuckEditorShell } from "@/components/editor/puck/PuckEditorShell";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { parseLocale } from "@/lib/i18n/paths";
import { recordProductEvent } from "@/lib/admin/events";

/**
 * Parallel Puck editor route — classic editor at /editor/[id] is untouched.
 * Phase 1 foundation only.
 */
export default async function PuckEditorPage({
  params,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
}) {
  const { locale: raw, websiteId } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/editor/${websiteId}/puck`);
  }
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
    metadata: { source: "puck_editor_page", engine: "puck" },
  });

  return (
    <Suspense fallback={null}>
      <PuckEditorShell
        website={website}
        locale={locale}
        plan={session.workspace.plan}
      />
    </Suspense>
  );
}
