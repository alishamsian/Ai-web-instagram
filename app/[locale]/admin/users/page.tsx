import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminUsersEnriched } from "@/lib/admin/phase3-queries";
import { UsersCommandCenter } from "@/components/admin/phase3/UsersCommandCenter";
import { roleHasPermission } from "@/lib/admin/permissions";
import type { DateRangePreset } from "@/lib/admin/dates";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; focus?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { actor, locale, userId } = await requireAdminPage(raw, "users.read");
  const { metrics, rows } = await getAdminUsersEnriched({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
    q: sp.q,
  });

  return (
    <UsersCommandCenter
      locale={locale}
      metrics={metrics}
      rows={rows}
      initialFocus={sp.focus ?? null}
      canWriteNotes={roleHasPermission(actor.role, "support.write")}
    />
  );
}
