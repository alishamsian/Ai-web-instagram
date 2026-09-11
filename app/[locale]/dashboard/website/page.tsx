import Link from "next/link";
import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  buildSiteReadiness,
  formatRelativeTime,
  getActiveImportJob,
  getLatestWorkspaceOrder,
  getWebsiteVisitCounts,
  getWorkspaceDashboardData,
  countFreshNewOrders,
  siteCoverUrl,
} from "@/lib/dashboard/data";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import {
  getDomainsForWebsite,
  getWebsiteVersionSummaries,
} from "@/lib/database/queries";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { isProPlan } from "@/lib/config/plans";
import { Button } from "@/components/ui/button";
import { JobProgressBanner } from "@/components/dashboard/JobProgressBanner";
import { WebsiteHubView } from "@/components/dashboard/WebsiteHubView";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
} from "@/components/dashboard/ui";

export default async function WebsiteHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const { id: requestedId } = await searchParams;
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const isFa = locale === "fa";
  const isPro = isProPlan(session.workspace.plan);

  const primaryId = await getPrimarySiteIdCookie();
  const { websites, imports, jobs } = await getWorkspaceDashboardData(
    session.workspace.id,
  );

  const { website, idInvalid, isPrimary } = resolveWorkspaceWebsite(websites, {
    requestedId,
    primaryId,
  });

  const imported = website
    ? (imports.find((item) => item.id === website.importId) ?? null)
    : null;

  const activeJob =
    website &&
    (jobs.find(
      (job) =>
        job.websiteId === website.id &&
        ["queued", "scraping", "processing", "analyzing", "generating"].includes(
          job.status,
        ),
    ) ??
      (imported
        ? jobs.find(
            (job) =>
              job.username === imported.username &&
              [
                "queued",
                "scraping",
                "processing",
                "analyzing",
                "generating",
              ].includes(job.status),
          )
        : null) ??
      getActiveImportJob(jobs));

  const [domains, versions, visitCounts, visitCounts24h, freshOrders, latestOrder] =
    website
      ? await Promise.all([
          getDomainsForWebsite(website.id),
          getWebsiteVersionSummaries(website.id, session.workspace.id, 5),
          getWebsiteVisitCounts([website.id], 14),
          getWebsiteVisitCounts([website.id], 1),
          countFreshNewOrders(session.workspace.id, 24),
          getLatestWorkspaceOrder(session.workspace.id),
        ])
      : [[], [], new Map(), new Map(), 0, null];

  const visits = website ? (visitCounts.get(website.id) ?? 0) : 0;
  const visits24h = website ? (visitCounts24h.get(website.id) ?? 0) : 0;
  const productsCount = website?.config.content.products?.items.length ?? 0;
  const hubBase = `/${locale}/dashboard/website`;
  const published = website?.status === "published";

  const lastCompletedSync = website
    ? jobs.find(
        (job) =>
          job.status === "completed" &&
          (job.websiteId === website.id ||
            (imported && job.username === imported.username)),
      )
    : null;

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.website}
        title={
          website ? website.config.brand.name : dict.dashboard.websiteHubTitle
        }
        description={
          website
            ? published
              ? isFa
                ? "لینک بفرست، ویرایش کن، یا دامنه وصل کن."
                : "Share, edit, or connect a domain."
              : isFa
                ? "محصولات را چک کن و با یک کلیک منتشر کن."
                : "Check products and publish in one click."
            : dict.dashboard.websiteHubBody
        }
        actions={
          <Button asChild size="sm" variant={website ? "outline" : "default"}>
            <Link href={`/${locale}/create`}>{dict.dashboard.newSite}</Link>
          </Button>
        }
      />

      {idInvalid ? (
        <SoftBanner tone="warning">
          {isFa
            ? "سایت درخواستی پیدا نشد — سایت اصلی workspace نمایش داده می‌شود."
            : "Requested site not found — showing your primary workspace site."}
        </SoftBanner>
      ) : null}

      {!website ? (
        <EmptyState
          title={dict.dashboard.noWebsite}
          body={dict.dashboard.emptyBody}
          icon={<Globe className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {activeJob ? (
            <JobProgressBanner job={activeJob} locale={locale} />
          ) : null}

          {websites.length > 1 ? (
            <nav
              aria-label={dict.dashboard.pickSite}
              className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {websites.map((site) => {
                const active = site.id === website.id;
                const primary =
                  site.id === primaryId ||
                  (!primaryId && site.id === websites[0]?.id);
                return (
                  <Link
                    key={site.id}
                    href={`${hubBase}?id=${site.id}`}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "bg-ink text-white"
                        : "bg-white text-muted-foreground ring-1 ring-border hover:text-ink"
                    }`}
                  >
                    {site.config.brand.name}
                    {primary ? (
                      <span
                        className={
                          active ? "ms-1 opacity-60" : "ms-1 text-amber-600"
                        }
                      >
                        ★
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          <WebsiteHubView
            website={website}
            username={imported?.username}
            sourceUrl={imported?.sourceUrl}
            locale={locale}
            dict={dict}
            isPro={isPro}
            isPrimary={isPrimary}
            liveUrl={publishedSiteUrl(website.slug)}
            previewUrl={`/${locale}/preview/${website.id}`}
            cover={siteCoverUrl(website)}
            visits={visits}
            visits24h={visits24h}
            productsCount={productsCount}
            postsCount={imported?.posts.length ?? 0}
            reelsCount={imported?.reels.length ?? 0}
            domains={domains}
            versions={versions}
            readiness={buildSiteReadiness({
              website,
              hasProducts: productsCount > 0,
              hasDomain: domains.length > 0,
              locale,
            })}
            health={{
              lastSyncLabel: lastCompletedSync
                ? formatRelativeTime(lastCompletedSync.updatedAt, locale)
                : null,
              lastOrderLabel: latestOrder
                ? formatRelativeTime(latestOrder.createdAt, locale)
                : null,
              freshOrders,
            }}
          />
        </>
      )}
    </PageStack>
  );
}
