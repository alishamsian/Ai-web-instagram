import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Lock, Link2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui";

export default async function DomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { websites } = await getWorkspaceDashboardData(session.workspace.id);
  const isPro = session.workspace.plan === "pro";

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navGrowth}
        title={dict.dashboard.domainsTitle}
        description={dict.dashboard.domainsBody}
      />

      {websites.length === 0 ? (
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
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={dict.dashboard.subdomain}
            action={<StatusBadge tone="success">SSL</StatusBadge>}
          >
            <ul className="divide-y divide-border">
              {websites.map((site) => (
                <li key={site.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {site.config.brand.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-xs text-muted-foreground">
                        <Link2 className="size-3.5 shrink-0" aria-hidden />
                        {publishedSiteUrl(site.slug)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        site.status === "published" ? "success" : "neutral"
                      }
                    >
                      {site.status === "published"
                        ? dict.dashboard.statusPublished
                        : dict.dashboard.statusDraft}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {site.status === "published" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={publishedSiteUrl(site.slug)}>
                          {dict.dashboard.liveSite}
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm">
                        <Link href={`/${locale}/dashboard/website?id=${site.id}`}>
                          {dict.dashboard.publish}
                        </Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title={dict.dashboard.customDomain}
            action={
              <StatusBadge tone={isPro ? "success" : "accent"}>
                {isPro ? "Pro" : dict.dashboard.proOnly}
              </StatusBadge>
            }
          >
            <div className="space-y-5 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {dict.dashboard.customDomainBody}
              </p>
              <ul className="space-y-2.5">
                {[
                  locale === "fa" ? "دامنه اختصاصی + SSL" : "Custom domain + SSL",
                  locale === "fa" ? "حذف برند ویترین" : "Remove Vitrin branding",
                  locale === "fa" ? "اتصال چند دامنه" : "Multiple domains",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    {isPro ? (
                      <Check className="size-4 text-emerald-600" aria-hidden />
                    ) : (
                      <Lock className="size-4 text-muted-foreground" aria-hidden />
                    )}
                    {item}
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-4">
                <label className="text-xs text-muted-foreground">
                  example.com
                </label>
                <input
                  disabled={!isPro}
                  placeholder="www.yourbrand.com"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              {isPro ? (
                <Button className="w-full" disabled>
                  {dict.dashboard.connectDomain}
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href={`/${locale}/dashboard/billing`}>
                    {dict.dashboard.connectDomain}
                  </Link>
                </Button>
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
