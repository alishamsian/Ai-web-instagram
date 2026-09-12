import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceWebsites } from "@/lib/dashboard/data";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { getDomainsForWebsite } from "@/lib/database/queries";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { isProPlan } from "@/lib/config/plans";
import { DomainsPageClient } from "@/components/dashboard/DomainsPageClient";

export default async function DomainsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const { id: requestedId } = await searchParams;
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const [websites, primaryId] = await Promise.all([
    getWorkspaceWebsites(session.workspace.id),
    getPrimarySiteIdCookie(),
  ]);
  const { website } = resolveWorkspaceWebsite(websites, {
    requestedId,
    primaryId,
  });

  const domains = website ? await getDomainsForWebsite(website.id) : [];
  const liveUrl = website ? publishedSiteUrl(website.slug) : null;

  return (
    <DomainsPageClient
      locale={locale}
      isPro={isProPlan(session.workspace.plan)}
      billingHref={`/${locale}/dashboard/billing`}
      sites={websites.map((site) => ({
        id: site.id,
        name: site.config.brand.name,
        slug: site.slug,
      }))}
      selectedId={website?.id ?? null}
      liveUrl={liveUrl}
      subdomainHint={website ? `${website.slug}` : null}
      initialDomain={
        domains[0] ? { id: domains[0].id, host: domains[0].host } : null
      }
    />
  );
}
