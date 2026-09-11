import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Lock, Link2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { getDomainsForWebsite } from "@/lib/database/queries";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { publishedSiteUrl } from "@/lib/config/runtime";
import { isProPlan } from "@/lib/config/plans";
import { Button } from "@/components/ui/button";
import { DomainConnectForm } from "@/components/dashboard/DomainConnectForm";
import { ProUpgradeCard } from "@/components/dashboard/ProUpgradeCard";
import {
  EmptyState,
  PageHeader,
  PageStack,
  Panel,
  SoftBanner,
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
  const isPro = isProPlan(session.workspace.plan);
  const isFa = locale === "fa";
  const primary = websites[0] ?? null;
  const existingDomains = primary
    ? await getDomainsForWebsite(primary.id)
    : [];

  return (
    <PageStack>
      <PageHeader
        eyebrow={dict.dashboard.navGrowth}
        title={dict.dashboard.domainsTitle}
        description={dict.dashboard.domainsBody}
      />

      {!isPro ? (
        <SoftBanner tone="info">
          {isFa
            ? "دامنه اختصاصی روی پلن حرفه‌ای فعال می‌شود. ساب‌دامین ویترین همین حالا آماده است."
            : "Custom domains unlock on Pro. Your Vitrin subdomain works today."}
        </SoftBanner>
      ) : null}

      {websites.length === 0 ? (
        <EmptyState
          title={dict.dashboard.noWebsite}
          body={dict.dashboard.emptyBody}
          icon={<Link2 className="size-5" aria-hidden />}
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
            description={isFa ? "آدرس آماده و امن" : "Ready HTTPS URL"}
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

          <div className="space-y-4">
            <Panel
              title={dict.dashboard.customDomain}
              description={dict.dashboard.customDomainBody}
              action={
                <StatusBadge tone={isPro ? "success" : "accent"}>
                  {isPro ? "Pro" : dict.dashboard.proOnly}
                </StatusBadge>
              }
            >
              <div className="space-y-5 p-5">
                <ul className="space-y-2.5">
                  {[
                    locale === "fa"
                      ? "دامنه اختصاصی + SSL"
                      : "Custom domain + SSL",
                    locale === "fa"
                      ? "حذف برند ویترین"
                      : "Remove Vitrin branding",
                    locale === "fa"
                      ? "اتصال چند دامنه"
                      : "Multiple domains",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-ink"
                    >
                      {isPro ? (
                        <Check className="size-4 text-emerald-600" aria-hidden />
                      ) : (
                        <Lock
                          className="size-4 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                      {item}
                    </li>
                  ))}
                </ul>

                {existingDomains.length ? (
                  <ul className="space-y-2 rounded-xl bg-[#f6f6f4] p-3 ring-1 ring-border/60">
                    {existingDomains.map((domain) => (
                      <li
                        key={domain.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="font-mono text-xs" dir="ltr">
                          {domain.host}
                        </span>
                        <StatusBadge tone="success">
                          {isFa ? "متصل" : "Linked"}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {primary ? (
                  <DomainConnectForm
                    websiteId={primary.id}
                    locale={locale}
                    enabled={isPro}
                    initialHost={existingDomains[0]?.host}
                  />
                ) : null}

                {!isPro ? (
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/${locale}/dashboard/billing`}>
                      {dict.dashboard.connectDomain}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </Panel>

            {!isPro ? <ProUpgradeCard locale={locale} feature="domain" /> : null}
          </div>
        </div>
      )}
    </PageStack>
  );
}
