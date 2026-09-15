import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/admin/rbac";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLoadingState } from "@/components/admin/primitives";
import { parseLocale } from "@/lib/i18n/paths";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/admin/dashboard`);
  }
  const actor = await resolveAdminActor(session.user.id);
  if (!actor) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <Suspense fallback={<AdminLoadingState rows={6} />}>
      <AdminShell
        locale={locale}
        role={actor.role}
        email={session.user.email}
        breadcrumbs={[
          { label: locale === "fa" ? "ادمین" : "Admin", href: `/${locale}/admin/dashboard` },
          { label: locale === "fa" ? "کنسول" : "Console" },
        ]}
      >
        {children}
      </AdminShell>
    </Suspense>
  );
}
