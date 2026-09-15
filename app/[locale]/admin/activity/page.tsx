import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminActivity } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminActivityPage({
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
    limit: 80,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "فعالیت زنده" : "Live Activity"}
      />
      <AdminActivityFeed items={activity} locale={locale} />
    </div>
  );
}
