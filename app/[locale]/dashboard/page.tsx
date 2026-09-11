import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FolderOpen,
  Globe2,
  Images,
  PencilLine,
  Rocket,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  formatRelativeTime,
  getWorkspaceDashboardData,
  jobStageLabel,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { getRuntimeMode } from "@/lib/config/env";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { Button } from "@/components/ui/button";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { PublishButton } from "@/components/dashboard/PublishButton";
import { SiteCard } from "@/components/dashboard/SiteCard";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { websites, imports, jobs } = await getWorkspaceDashboardData(
    session.workspace.id,
  );
  const website = websites[0];
  const mode = getRuntimeMode();
  const isMock = mode.collector === "mock";

  const publishedCount = websites.filter((s) => s.status === "published").length;
  const draftCount = websites.length - publishedCount;
  const postsCount = imports.reduce(
    (sum, item) => sum + item.posts.length + item.reels.length,
    0,
  );

  const activity = [
    ...jobs.slice(0, 6).map((job) => ({
      id: `job-${job.id}`,
      at: job.updatedAt,
      tone:
        job.status === "failed"
          ? ("danger" as const)
          : job.status === "completed"
            ? ("success" as const)
            : ("warning" as const),
      title:
        job.status === "failed"
          ? dict.dashboard.activityFailed
          : dict.dashboard.activityImport,
      detail: `@${job.username ?? "…"} · ${jobStageLabel(job.stage, dict.importUi)}`,
    })),
    ...websites.slice(0, 4).map((site) => ({
      id: `site-${site.id}`,
      at: site.publishedAt ?? site.updatedAt,
      tone:
        site.status === "published"
          ? ("success" as const)
          : ("neutral" as const),
      title:
        site.status === "published"
          ? dict.dashboard.activityPublish
          : dict.dashboard.activityUpdate,
      detail: site.config.brand.name,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6 md:space-y-8">
      {isMock ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {dict.dashboard.mockBanner}
        </p>
      ) : null}

      <PageHeader
        eyebrow={dict.dashboard.overviewEyebrow}
        title={dict.dashboard.title}
        description={dict.dashboard.overviewBody}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/dashboard/content`}>
                {dict.dashboard.content}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dict.dashboard.statsSites}
          value={String(websites.length)}
          icon={<FolderOpen className="size-4" aria-hidden />}
        />
        <StatCard
          label={dict.dashboard.statsPublished}
          value={String(publishedCount)}
          hint={dict.dashboard.statsHintPublished}
          icon={<Globe2 className="size-4" aria-hidden />}
        />
        <StatCard
          label={dict.dashboard.statsDrafts}
          value={String(draftCount)}
          hint={dict.dashboard.statsHintDrafts}
          icon={<PencilLine className="size-4" aria-hidden />}
        />
        <StatCard
          label={dict.dashboard.statsPosts}
          value={String(postsCount)}
          hint={dict.dashboard.statsHintPosts}
          icon={<Images className="size-4" aria-hidden />}
        />
      </div>

      {websites.length === 0 ? (
        <EmptyState
          title={dict.dashboard.empty}
          body={dict.dashboard.emptyBody}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    {dict.dashboard.sitesTitle}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dict.dashboard.sitesBody}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {websites.map((site) => {
                  const imported = imports.find((item) => item.id === site.importId);
                  return (
                    <SiteCard
                      key={site.id}
                      site={site}
                      username={imported?.username}
                      locale={locale}
                      dict={dict}
                    />
                  );
                })}
              </div>
            </div>

            <Panel title={dict.dashboard.recent}>
              {activity.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">
                  {dict.dashboard.noActivity}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-ink">
                            {item.title}
                          </p>
                          <StatusBadge tone={item.tone}>
                            {formatRelativeTime(item.at, locale)}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {website ? (
            <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
              <Panel
                title={website.config.brand.name}
                action={
                  <StatusBadge
                    tone={
                      website.status === "published" ? "success" : "neutral"
                    }
                  >
                    {website.status === "published"
                      ? dict.dashboard.statusPublished
                      : dict.dashboard.statusDraft}
                  </StatusBadge>
                }
              >
                <div className="max-h-[620px] overflow-auto bg-[#fafafa]">
                  <WebsiteRenderer config={website.config} />
                </div>
              </Panel>

              <div className="space-y-4">
                <Panel>
                  <div className="space-y-5 p-5">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {dict.dashboard.slug}
                      </p>
                      <p className="mt-1 font-mono text-sm text-ink">
                        /s/{website.slug}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {dict.dashboard.template}
                      </p>
                      <p className="mt-1 text-sm capitalize text-ink">
                        {website.config.template}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {dict.dashboard.lastUpdated}
                      </p>
                      <p className="mt-1 text-sm text-ink">
                        {formatRelativeTime(website.updatedAt, locale)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                      <Button asChild size="sm">
                        <Link href={`/${locale}/editor/${website.id}`}>
                          {dict.dashboard.edit}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
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
                    </div>
                    {website.status === "published" ? (
                      <Button asChild size="sm" variant="ghost" className="w-full justify-start">
                        <Link href={publishedSiteUrl(website.slug)}>
                          <Rocket className="size-3.5" aria-hidden />
                          {dict.dashboard.liveSite}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </Panel>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
