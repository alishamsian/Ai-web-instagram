import { requireAdminPage } from "@/lib/admin/gate";
import { getAdminUsers } from "@/lib/admin/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import type { DateRangePreset } from "@/lib/admin/dates";
import { relativeTime } from "@/components/admin/format";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale: raw } = await params;
  const sp = await searchParams;
  const { locale, userId } = await requireAdminPage(raw, "users.read");
  const users = await getAdminUsers({
    userId,
    preset: (sp.range as DateRangePreset) || "30d",
    limit: 100,
  });

  const rows = users.map((u) => ({
    id: u.id as string,
    email: (u.email as string) ?? "",
    name: (u.name as string | null) ?? "",
    created_at: u.created_at as string,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={locale === "fa" ? "کاربران" : "Users"}
        description={
          locale === "fa"
            ? "فهرست پروفایل‌ها از لایهٔ Admin Query"
            : "Profiles from the Admin query layer"
        }
      />
      <AdminDataTable
        locale={locale}
        rows={rows}
        searchPlaceholder={locale === "fa" ? "جستجوی ایمیل یا نام…" : "Search email or name…"}
        emptyTitle={locale === "fa" ? "کاربری نیست" : "No users"}
        emptyBody={
          locale === "fa"
            ? "وقتی پروفایلی ساخته شود اینجا دیده می‌شود."
            : "Users appear here once profiles exist."
        }
        columns={[
          {
            id: "email",
            header: "Email",
            sortValue: (r) => r.email,
            cell: (r) => r.email,
          },
          {
            id: "name",
            header: locale === "fa" ? "نام" : "Name",
            sortValue: (r) => r.name,
            cell: (r) => r.name || "—",
          },
          {
            id: "created",
            header: locale === "fa" ? "ایجاد" : "Created",
            sortValue: (r) => r.created_at,
            cell: (r) => relativeTime(r.created_at, locale),
          },
        ]}
      />
    </div>
  );
}
