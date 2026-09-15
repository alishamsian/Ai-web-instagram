import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIFailuresIntel } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
} from "@/components/admin/primitives";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
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
  const isFa = locale === "fa";
  const preset = (sp.range as DateRangePreset) || "30d";
  const intel = await getAdminAIFailuresIntel({ userId, preset });

  const categoryRows = Object.entries(intel.categories).map(([category, count]) => ({
    id: category,
    category,
    count,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "خطاهای AI" : "AI Failures"}
        description={
          isFa
            ? "پیام‌های sanitize‌شده — بدون secrets یا پرامپت"
            : "Sanitized messages — no secrets or prompts"
        }
      />
      <AdminSection>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminMetricCard
            label={isFa ? "تعداد خطا" : "Failure count"}
            metric={intel.failureCount}
          />
          <AdminMetricCard
            label={isFa ? "نرخ خطا" : "Error rate"}
            metric={intel.errorRate}
            style="percent"
          />
        </div>
      </AdminSection>
      {categoryRows.length > 0 ? (
        <AdminSection title={isFa ? "دسته‌بندی" : "By category"}>
          <AdminDataTable
            locale={locale}
            rows={categoryRows}
            searchPlaceholder="category…"
            emptyTitle=""
            columns={[
              {
                id: "category",
                header: isFa ? "دسته" : "Category",
                cell: (r) => r.category,
              },
              {
                id: "count",
                header: isFa ? "تعداد" : "Count",
                sortValue: (r) => r.count,
                cell: (r) => r.count,
              },
            ]}
          />
        </AdminSection>
      ) : null}
      <AdminSection title={isFa ? "خطاهای اخیر" : "Recent failures"}>
        <AdminDataTable
          locale={locale}
          rows={intel.failures}
          searchPlaceholder="error…"
          emptyTitle={isFa ? "خطایی نیست" : "No failures"}
          columns={[
            { id: "feature", header: "Feature", cell: (r) => r.feature },
            {
              id: "provider",
              header: "Provider",
              cell: (r) => r.provider ?? "—",
            },
            { id: "model", header: "Model", cell: (r) => r.model ?? "—" },
            {
              id: "category",
              header: isFa ? "دسته" : "Category",
              cell: (r) => r.errorCategory,
            },
            {
              id: "code",
              header: "Code",
              cell: (r) => r.errorCode ?? "—",
            },
            {
              id: "msg",
              header: isFa ? "پیام" : "Message",
              cell: (r) => r.safeMessage ?? "—",
            },
            {
              id: "at",
              header: isFa ? "زمان" : "When",
              sortValue: (r) => r.createdAt,
              cell: (r) => relativeTime(r.createdAt, locale),
            },
          ]}
        />
      </AdminSection>
    </div>
  );
}
