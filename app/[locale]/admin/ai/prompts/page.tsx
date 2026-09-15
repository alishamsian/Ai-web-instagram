import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { AdminPageHeader, AdminEmptyState } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";

export default async function AdminAIPromptsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const breakdown = await getAdminAIBreakdown({ userId });
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
        title={locale === "fa" ? "رجیستری پرامپت" : "Prompt Registry"}
        description={locale === "fa" ? "فقط متادیتا — بدون متن خام پرامپت" : "Metadata only — no raw prompt bodies"}
      />
      {!rows.length ? (
        <AdminEmptyState
          title={locale === "fa" ? "رجیستری خالی است" : "Registry empty"}
          body={locale === "fa" ? "مایگریشن Phase 3 را اعمال کنید." : "Apply the Phase 3 migration."}
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
