import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminAIRequests } from "@/lib/admin/phase4-queries";
import {
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
} from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AiRequestsFilterForm } from "@/components/admin/phase4/AiRequestsFilterForm";
import { relativeTime } from "@/components/admin/format";
import type { DateRangePreset } from "@/lib/admin/dates";

function statusTone(
  status: string,
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "started") return "info";
  return "neutral";
}

export default async function AdminAIRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    range?: string;
    provider?: string;
    model?: string;
    feature?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "ai.read");
  const isFa = locale === "fa";
  const preset = (sp.range as DateRangePreset) || "30d";
  const page = Math.max(Number(sp.page ?? 0) || 0, 0);

  const result = await getAdminAIRequests({
    userId,
    preset,
    provider: sp.provider?.trim() || undefined,
    model: sp.model?.trim() || undefined,
    feature: sp.feature?.trim() || undefined,
    status: sp.status?.trim() || undefined,
    q: sp.q?.trim() || undefined,
    page,
  });

  const filterValues = {
    range: preset,
    provider: sp.provider ?? "",
    model: sp.model ?? "",
    feature: sp.feature ?? "",
    status: sp.status ?? "",
    q: sp.q ?? "",
    page: String(page),
  };

  function pageHref(nextPage: number) {
    const qs = new URLSearchParams();
    if (preset !== "30d") qs.set("range", preset);
    if (sp.provider) qs.set("provider", sp.provider);
    if (sp.model) qs.set("model", sp.model);
    if (sp.feature) qs.set("feature", sp.feature);
    if (sp.status) qs.set("status", sp.status);
    if (sp.q) qs.set("q", sp.q);
    if (nextPage > 0) qs.set("page", String(nextPage));
    const q = qs.toString();
    return q ? `?${q}` : "?";
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isFa ? "درخواست‌های AI" : "AI Requests"}
        description={
          isFa
            ? "بدون نمایش محتوای پرامپت — فقط متادیتای درخواست"
            : "No prompt content shown — request metadata only"
        }
      />
      <AiRequestsFilterForm locale={locale} values={filterValues} />
      <AdminSection>
        <AdminDataTable
          locale={locale}
          rows={result.rows}
          pageSize={result.pageSize}
          searchPlaceholder={isFa ? "جستجو…" : "search…"}
          emptyTitle={isFa ? "درخواستی نیست" : "No requests"}
          columns={[
            {
              id: "id",
              header: "ID",
              cell: (r) => (
                <span className="font-mono text-[11px]">
                  {r.id.slice(0, 8)}…
                </span>
              ),
            },
            {
              id: "created",
              header: isFa ? "ایجاد" : "Created",
              sortValue: (r) => r.createdAt,
              cell: (r) => relativeTime(r.createdAt, locale),
            },
            {
              id: "provider",
              header: "Provider",
              cell: (r) => r.provider ?? "—",
            },
            {
              id: "model",
              header: "Model",
              cell: (r) => r.model ?? "—",
            },
            {
              id: "feature",
              header: "Feature",
              cell: (r) => r.feature,
            },
            {
              id: "status",
              header: "Status",
              cell: (r) => (
                <AdminStatusBadge tone={statusTone(r.status)}>
                  {r.status}
                </AdminStatusBadge>
              ),
              sortValue: (r) => r.status,
            },
            {
              id: "latency",
              header: "Latency",
              sortValue: (r) => r.latencyMs ?? -1,
              cell: (r) =>
                r.latencyMs == null ? "—" : `${r.latencyMs}ms`,
            },
            {
              id: "tokens",
              header: "Tokens",
              sortValue: (r) => r.totalTokens ?? -1,
              cell: (r) =>
                r.totalTokens == null ? "—" : r.totalTokens,
            },
            {
              id: "errorCategory",
              header: isFa ? "دسته خطا" : "Error category",
              cell: (r) => r.errorCategory ?? "—",
            },
          ]}
        />
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--admin-muted)]">
          <span>
            {result.totalHint.status === "available"
              ? isFa
                ? `حداقل ${result.totalHint.value} ردیف`
                : `At least ${result.totalHint.value} rows`
              : result.totalHint.status === "partial"
                ? result.totalHint.warning
                : result.totalHint.reason}
          </span>
          <div className="flex gap-2">
            {page > 0 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-[var(--admin-border)] px-2.5 py-1 hover:border-[var(--admin-fg)]/20"
              >
                {isFa ? "قبلی" : "Prev"}
              </Link>
            ) : null}
            {result.rows.length === result.pageSize ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-[var(--admin-border)] px-2.5 py-1 hover:border-[var(--admin-fg)]/20"
              >
                {isFa ? "بعدی" : "Next"}
              </Link>
            ) : null}
          </div>
        </div>
      </AdminSection>
    </div>
  );
}
