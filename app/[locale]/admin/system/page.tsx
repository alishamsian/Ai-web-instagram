import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminSystemHealth } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminSystemHealthGrid } from "@/components/admin/AdminSystemHealth";

export default async function AdminSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale, userId } = await requireAdminPage(raw, "system.read");
  const health = await getAdminSystemHealth({ userId });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "سلامت سیستم" : "System Health"}
        description={
          locale === "fa"
            ? "بدون uptime جعلی — فقط سیگنال‌های واقعی موجود"
            : "No fake uptime — only available real signals"
        }
      />
      <AdminSystemHealthGrid health={health} locale={locale} />
    </div>
  );
}
