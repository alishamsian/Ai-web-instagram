import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIBreakdown } from "@/lib/admin/phase3-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { relativeTime } from "@/components/admin/format";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAIFailuresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const breakdown = await getAdminAIBreakdown({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
  });
  return (
    <div className="space-y-6">
      <AdminPageHeader title={locale === "fa" ? "خطاهای AI" : "AI Failures"} />
      <AdminDataTable
        locale={locale}
        rows={breakdown.failures}
        searchPlaceholder="error…"
        emptyTitle={locale === "fa" ? "خطایی نیست" : "No failures"}
        columns={[
          { id: "feature", header: "Feature", cell: (r) => r.feature },
          { id: "model", header: "Model", cell: (r) => r.model ?? "—" },
          { id: "code", header: "Code", cell: (r) => r.errorCode ?? "—" },
          { id: "msg", header: "Message", cell: (r) => r.errorMessage ?? "—" },
          { id: "at", header: "When", sortValue: (r) => r.createdAt, cell: (r) => relativeTime(r.createdAt, locale) },
        ]}
      />
    </div>
  );
}
