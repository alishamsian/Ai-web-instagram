import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWebsiteForWorkspace } from "@/lib/database/queries";
import { parseLocale } from "@/lib/i18n/paths";
import { recordProductEvent } from "@/lib/admin/events";
import { VisualEditorShell } from "@/components/visual-editor/VisualEditorShell";
import { VisualEditorErrorBoundary } from "@/components/visual-editor/VisualEditorErrorBoundary";
import { VisualEditorLoading } from "@/components/visual-editor/VisualEditorLoading";

/**
 * Product Visual Editor — GrapesJS engine.
 * Classic Editor remains at /[locale]/editor/[websiteId].
 */
export default async function VisualEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; websiteId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { locale: raw, websiteId } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/editor/${websiteId}/visual`);
  }
  const website = await getWebsiteForWorkspace(
    websiteId,
    session.workspace.id,
  );
  if (!website) notFound();

  const sp = await searchParams;
  const pageRaw = sp.page;
  const initialPage =
    typeof pageRaw === "string"
      ? pageRaw
      : Array.isArray(pageRaw)
        ? pageRaw[0]
        : null;

  void recordProductEvent({
    eventName: "editor_opened",
    userId: session.user.id,
    workspaceId: session.workspace.id,
    websiteId,
    resourceType: "website",
    resourceId: websiteId,
    metadata: { source: "visual_editor_page", engine: "grapesjs" },
  });

  return (
    <VisualEditorErrorBoundary locale={locale} websiteId={websiteId}>
      <Suspense
        fallback={
          <VisualEditorLoading label="Loading website editor…" />
        }
      >
        <VisualEditorShell
          website={website}
          locale={locale}
          initialPage={initialPage}
        />
      </Suspense>
    </VisualEditorErrorBoundary>
  );
}
