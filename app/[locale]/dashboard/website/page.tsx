import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  formatRelativeTime,
  getWorkspaceDashboardData,
  siteCoverUrl,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { Button } from "@/components/ui/button";
import { PublishButton } from "@/components/dashboard/PublishButton";
import { SyncInstagramButton } from "@/components/dashboard/SyncInstagramButton";
import { SiteImage } from "@/components/website/SiteImage";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function WebsiteHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const { id } = await searchParams;
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { websites, imports } = await getWorkspaceDashboardData(
    session.workspace.id,
  );
  const website =
    websites.find((item) => item.id === id) ?? websites[0] ?? null;
  const imported = website
    ? imports.find((item) => item.id === website.importId)
    : null;
  const cover = website ? siteCoverUrl(website) : null;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navMain}
        title={dict.dashboard.websiteHubTitle}
        description={dict.dashboard.websiteHubBody}
        actions={
          <Button asChild size="sm">
            <Link href={`/${locale}/create`}>{dict.dashboard.newSite}</Link>
          </Button>
        }
      />

      {!website ? (
        <EmptyState
          title={dict.dashboard.noWebsite}
          body={dict.dashboard.emptyBody}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <>
          {websites.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-xs text-muted-foreground">
                {dict.dashboard.pickSite}:
              </span>
              {websites.map((site) => (
                <Link
                  key={site.id}
                  href={`/${locale}/dashboard/website?id=${site.id}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    site.id === website.id
                      ? "bg-ink text-white"
                      : "bg-white text-muted-foreground ring-1 ring-border hover:text-ink"
                  }`}
                >
                  {site.config.brand.name}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-muted">
                {cover ? (
                  <SiteImage
                    src={cover}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="60vw"
                  />
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16">
                  <p className="font-display text-2xl text-white">
                    {website.config.brand.name}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    @{imported?.username ?? website.slug}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-5">
                <Button asChild>
                  <Link href={`/${locale}/editor/${website.id}`}>
                    {dict.dashboard.edit}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/preview/${website.id}`}>
                    {dict.dashboard.preview}
                  </Link>
                </Button>
                <PublishButton
                  websiteId={website.id}
                  published={website.status === "published"}
                  publishLabel={dict.dashboard.publish}
                  unpublishLabel={dict.dashboard.unpublish}
                />
                <SyncInstagramButton
                  websiteId={website.id}
                  locale={locale}
                  enabled={session.workspace.plan === "pro"}
                />
                {website.status === "published" ? (
                  <Button asChild variant="ghost">
                    <Link href={publishedSiteUrl(website.slug)}>
                      {dict.dashboard.liveSite}
                    </Link>
                  </Button>
                ) : null}
                {imported ? (
                  <Button asChild variant="outline">
                    <Link
                      href={`/${locale}/create?url=${encodeURIComponent(imported.sourceUrl)}`}
                    >
                      {dict.dashboard.refreshImport}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel title={dict.dashboard.website}>
                <dl className="divide-y divide-border">
                  {[
                    {
                      label: dict.dashboard.jobStatus,
                      value: (
                        <StatusBadge
                          tone={
                            website.status === "published"
                              ? "success"
                              : "neutral"
                          }
                        >
                          {website.status === "published"
                            ? dict.dashboard.statusPublished
                            : website.status === "unpublished"
                              ? dict.dashboard.statusUnpublished
                              : dict.dashboard.statusDraft}
                        </StatusBadge>
                      ),
                    },
                    {
                      label: dict.dashboard.template,
                      value: (
                        <span className="capitalize">{website.config.template}</span>
                      ),
                    },
                    {
                      label: dict.dashboard.version,
                      value: `v${website.version}`,
                    },
                    {
                      label: dict.dashboard.slug,
                      value: (
                        <span className="font-mono text-xs">
                          {publishedSiteUrl(website.slug)}
                        </span>
                      ),
                    },
                    {
                      label: dict.dashboard.lastUpdated,
                      value: formatRelativeTime(website.updatedAt, locale),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-4 px-5 py-3.5"
                    >
                      <dt className="text-xs text-muted-foreground">{row.label}</dt>
                      <dd className="text-sm text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Panel>

              <Panel title={dict.dashboard.content}>
                <div className="grid grid-cols-3 gap-3 p-5 text-center">
                  <div className="rounded-2xl bg-muted px-3 py-4">
                    <p className="font-display text-xl text-ink">
                      {imported?.posts.length ?? 0}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dict.dashboard.posts}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-4">
                    <p className="font-display text-xl text-ink">
                      {imported?.reels.length ?? 0}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dict.dashboard.reels}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-4">
                    <p className="font-display text-xl text-ink">
                      {website.config.content.products?.items.length ?? 0}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dict.dashboard.products}
                    </p>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
