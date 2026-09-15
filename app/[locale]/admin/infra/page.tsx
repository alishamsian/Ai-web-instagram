import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, AdminComingSoon } from "@/components/admin/primitives";

export default async function AdminComingSoonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { locale } = await requireAdminPage(raw, "system.read");
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "به‌زودی" : "Coming soon"}
      />
      <AdminComingSoon
        title={locale === "fa" ? "این بخش در فاز بعد" : "Later phase"}
        locale={locale}
      />
    </div>
  );
}
