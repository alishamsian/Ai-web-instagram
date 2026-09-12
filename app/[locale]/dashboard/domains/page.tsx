import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { parseLocale } from "@/lib/i18n/paths";

/** Domains live in the website hub — redirect to domain section. */
export default async function DomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const [{ websites }, primaryId] = await Promise.all([
    getWorkspaceDashboardData(session.workspace.id),
    getPrimarySiteIdCookie(),
  ]);
  const { website } = resolveWorkspaceWebsite(websites, { primaryId });

  if (!website) {
    redirect(`/${locale}/dashboard/website`);
  }

  // Use ?section=domain (hash is unreliable across HTTP redirects)
  redirect(
    `/${locale}/dashboard/website?id=${website.id}&section=domain`,
  );
}
