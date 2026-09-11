import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import {
  formatRelativeTime,
  getWorkspaceDashboardData,
  jobStageLabel,
} from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";

function jobTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "queued") return "neutral" as const;
  return "warning" as const;
}

export default async function ImportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { imports, jobs, websites } = await getWorkspaceDashboardData(
    session.workspace.id,
  );

  const stages = [
    "connecting",
    "profile_found",
    "reading_content",
    "posts_imported",
    "understanding_brand",
    "creating_website",
    "ready",
  ] as const;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navMain}
        title={dict.dashboard.importTitle}
        description={dict.dashboard.importBody}
        actions={
          <Button asChild size="sm">
            <Link href={`/${locale}/create`}>{dict.dashboard.startImport}</Link>
          </Button>
        }
      />

      {jobs.length === 0 && imports.length === 0 ? (
        <EmptyState
          title={dict.dashboard.importEmpty}
          body={dict.dashboard.importEmptyBody}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.startImport}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel title={dict.dashboard.import}>
            <ul className="divide-y divide-border">
              {jobs.map((job) => {
                const site = websites.find((item) => item.id === job.websiteId);
                const currentIndex = stages.indexOf(job.stage);
                return (
                  <li key={job.id} className="px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">
                          @{job.username ?? "…"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {job.sourceUrl}
                        </p>
                      </div>
                      <StatusBadge tone={jobTone(job.status)}>
                        {job.status}
                      </StatusBadge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {stages.map((stage, index) => {
                        const done = index <= currentIndex && job.status !== "failed";
                        const failed =
                          job.status === "failed" && index === currentIndex;
                        return (
                          <span
                            key={stage}
                            className={`rounded-full px-2.5 py-1 text-[10px] ${
                              failed
                                ? "bg-red-500/12 text-red-700"
                                : done
                                  ? "bg-ink text-white"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {jobStageLabel(stage, dict.importUi)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>
                        {dict.dashboard.postsCount}: {job.postsImported}
                      </span>
                      <span>
                        {dict.dashboard.source}: {job.collector}
                      </span>
                      <span>{formatRelativeTime(job.updatedAt, locale)}</span>
                    </div>

                    {job.errorMessage ? (
                      <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                        {job.errorMessage}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {site ? (
                        <>
                          <Button asChild size="sm">
                            <Link href={`/${locale}/editor/${site.id}`}>
                              {dict.dashboard.edit}
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/${locale}/dashboard/website?id=${site.id}`}>
                              {dict.dashboard.openSite}
                            </Link>
                          </Button>
                        </>
                      ) : null}
                      {job.username ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={`/${locale}/create?url=${encodeURIComponent(job.sourceUrl)}`}
                          >
                            {dict.dashboard.refreshImport}
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title={dict.dashboard.content}>
            <ul className="divide-y divide-border">
              {imports.map((item) => (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">@{item.username}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.profile.fullName ?? item.scrapeStatus}
                      </p>
                    </div>
                    <StatusBadge tone="neutral">{item.scrapeStatus}</StatusBadge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <p className="text-sm font-semibold">{item.posts.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dict.dashboard.posts}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <p className="text-sm font-semibold">{item.reels.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dict.dashboard.reels}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted px-2 py-2">
                      <p className="text-sm font-semibold">{item.media.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {dict.dashboard.media}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  );
}
