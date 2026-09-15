import { requireAdminPage } from "@/lib/admin/gate";
import { AdminPageHeader, AdminCard } from "@/components/admin/primitives";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const { actor, locale } = await requireAdminPage(raw, "settings.read");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "تنظیمات ادمین" : "Admin Settings"}
      />
      <AdminCard>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">
              {locale === "fa" ? "نقش" : "Role"}
            </dt>
            <dd className="font-medium text-[var(--admin-fg)]">{actor.role}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--admin-muted)]">User ID</dt>
            <dd className="font-mono text-xs text-[var(--admin-fg)]">
              {actor.userId}
            </dd>
          </div>
          <p className="pt-2 text-xs text-[var(--admin-muted)]">
            {locale === "fa"
              ? "تنظیمات پیشرفته پلتفرم در فازهای بعدی."
              : "Advanced platform settings ship in later phases."}
          </p>
        </dl>
      </AdminCard>
    </div>
  );
}
