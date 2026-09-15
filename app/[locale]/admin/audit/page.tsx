import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminActivity } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "audit.read");
  const activity = await getAdminActivity({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
  });
  const auditOnly = activity.filter((a) => a.kind === "audit");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "ممیزی" : "Audit"}
        description={
          locale === "fa"
            ? "فقط رویدادهای admin_audit_logs"
            : "Admin audit log events only"
        }
      />
      <AdminActivityFeed items={auditOnly} locale={locale} />
    </div>
  );
}
