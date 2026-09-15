import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { resolveAdminActor } from "@/lib/admin/rbac";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLoadingState } from "@/components/admin/primitives";
import { parseLocale } from "@/lib/i18n/paths";

export const dynamic = "force-dynamic";

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

  let actor;
  try {
    actor = await resolveAdminActor(session.user.id);
  } catch (error) {
    // Transient infra failure must not blank the entire Admin shell.
    console.error(
      "[admin:layout]",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    redirect(`/${locale}/dashboard`);
  }
  if (!actor) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    // Suspense only around the shell chrome (useSearchParams in topbar).
    // Do NOT wrap {children} here — remounting the whole tree on every
    // suspended child caused repeated dashboard RSC fetches / stream aborts.
    <AdminShell
      locale={locale}
      role={actor.role}
      email={session.user.email}
      breadcrumbs={[
        {
          label: locale === "fa" ? "ادمین" : "Admin",
          href: `/${locale}/admin/dashboard`,
        },
        { label: locale === "fa" ? "کنسول" : "Console" },
      ]}
    >
      <Suspense fallback={<AdminLoadingState rows={6} />}>{children}</Suspense>
    </AdminShell>
  );
}
