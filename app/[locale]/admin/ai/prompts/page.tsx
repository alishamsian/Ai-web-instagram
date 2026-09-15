import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { roleHasPermission } from "@/lib/admin/permissions";
import {
  AdminPageHeader,
  AdminEmptyState,
  MetricUnavailable,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { PromptRegistryClient } from "@/components/admin/phase4/PromptRegistryClient";

export default async function AdminAIPromptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale, userId } = await requireAdminPage(raw, "ai.read");
  const isFa = locale === "fa";
  const breakdown = await getAdminAIBreakdown({ userId });
  const canManage = roleHasPermission(actor.role, "ai.manage");
  const rows = breakdown.prompts.map((p) => ({
    id: `${p.feature}-${p.version}`,
    feature: p.feature,
    version: p.version,
    status: p.status,
    notes: p.notes ?? "",
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "رجیستری پرامپت" : "Prompt Registry"}
        description={
          isFa
            ? "فقط متادیتا — بدون متن خام پرامپت"
            : "Metadata only — no raw prompt bodies"
        }
      />
      {canManage ? <PromptRegistryClient locale={locale} /> : null}
      {breakdown.promptsUnavailableReason ? (
        <MetricUnavailable
          label={isFa ? "رجیستری در دسترس نیست" : "Registry unavailable"}
          reason={breakdown.promptsUnavailableReason}
          compact
        />
      ) : !rows.length ? (
        <AdminEmptyState
          title={isFa ? "رجیستری خالی است" : "Registry empty"}
          body={
            isFa
              ? "هنوز پرامپتی ثبت نشده است."
              : "No prompt versions registered yet."
          }
        />
      ) : (
        <AdminDataTable
          locale={locale}
          rows={rows}
          searchPlaceholder="feature…"
          emptyTitle=""
          columns={[
            { id: "feature", header: "Feature", cell: (r) => r.feature },
            { id: "version", header: "Version", cell: (r) => r.version },
            { id: "status", header: "Status", cell: (r) => r.status },
            { id: "notes", header: "Notes", cell: (r) => r.notes || "—" },
          ]}
        />
      )}
    </div>
  );
}
