import Link from "next/link";
import { ExternalLink, MoreHorizontal, Rocket } from "lucide-react";
import { SiteImage } from "@/components/website/SiteImage";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/ui";
import { PublishButton } from "@/components/dashboard/PublishButton";
import { ShareLinkButton } from "@/components/dashboard/ShareLinkButton";
import { SyncInstagramButton } from "@/components/dashboard/SyncInstagramButton";
import { siteCoverUrl } from "@/lib/dashboard/format";
import { publishedSiteUrl } from "@/lib/config/runtime";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteRecord } from "@/types/website";

export function PrimarySiteCard({
  site,
  username,
  locale,
  dict,
  isPro,
  visits,
}: {
  site: WebsiteRecord;
  username?: string | null;
  locale: Locale;
  dict: Dictionary;
  isPro: boolean;
  visits: number;
}) {
  const cover = siteCoverUrl(site);
  const published = site.status === "published";
  const isFa = locale === "fa";
  const products = site.config.content.products?.items.length ?? 0;
  const liveUrl = publishedSiteUrl(site.slug);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[200px] bg-muted sm:min-h-[240px] lg:min-h-[300px]">
          {cover ? (
            <SiteImage
              src={cover}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 55vw"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#e8e8e8,transparent_55%),linear-gradient(135deg,#f4f4f4,#ebebeb)]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-5 pt-16">
            <StatusBadge
              tone={published ? "success" : "warning"}
              className="bg-white/95"
            >
              {published
                ? dict.dashboard.statusPublished
                : dict.dashboard.statusDraft}
            </StatusBadge>
            <h2 className="mt-3 font-display text-2xl tracking-tight text-white md:text-3xl">
              {site.config.brand.name}
            </h2>
            <p className="mt-1 text-sm text-white/75" dir="ltr">
              @{username ?? site.slug} · /s/{site.slug}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 p-4 sm:p-5 md:p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <div className="rounded-xl bg-[#f6f6f4] px-2 py-2.5 ring-1 ring-border/60 sm:px-3 sm:py-3">
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {isFa ? "بازدید ۱۴ر" : "14d visits"}
                </p>
                <p className="mt-1 font-display text-lg tabular-nums text-ink sm:text-xl">
                  {visits}
                </p>
              </div>
              <div className="rounded-xl bg-[#f6f6f4] px-2 py-2.5 ring-1 ring-border/60 sm:px-3 sm:py-3">
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {dict.dashboard.products}
                </p>
                <p className="mt-1 font-display text-lg tabular-nums text-ink sm:text-xl">
                  {products}
                </p>
              </div>
              <div className="rounded-xl bg-[#f6f6f4] px-2 py-2.5 ring-1 ring-border/60 sm:px-3 sm:py-3">
                <p className="text-[10px] leading-tight text-muted-foreground">
                  {dict.dashboard.template}
                </p>
                <p className="mt-1 truncate text-xs capitalize text-ink sm:text-sm">
                  {site.config.template}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {published
                ? isFa
                  ? "سایت زنده است — لینک را بفرست یا ویرایش کن."
                  : "Live — share the link or keep editing."
                : isFa
                  ? "پیش‌نویس آماده است — با یک کلیک منتشرش کن."
                  : "Draft ready — publish in one click."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              {!published ? (
              <PublishButton
                websiteId={site.id}
                published={published}
                publishLabel={dict.dashboard.publish}
                unpublishLabel={dict.dashboard.unpublish}
                locale={locale}
                brandName={site.config.brand.name}
                slug={site.slug}
              />
              ) : (
                <ShareLinkButton url={liveUrl} locale={locale} />
              )}
              <Button asChild size="sm" variant={published ? "default" : "outline"} className="w-full min-[420px]:w-auto">
                <Link href={`/${locale}/editor/${site.id}`}>
                  {dict.dashboard.edit}
                </Link>
              </Button>
              {published ? (
                <Button asChild size="sm" variant="outline" className="w-full min-[420px]:col-span-2 min-[420px]:w-auto sm:col-span-1">
                  <Link href={liveUrl} target="_blank">
                    <Rocket className="size-3.5" aria-hidden />
                    {dict.dashboard.liveSite}
                    <ExternalLink className="size-3 opacity-60" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="w-full min-[420px]:w-auto">
                  <Link href={`/${locale}/preview/${site.id}`}>
                    {dict.dashboard.preview}
                  </Link>
                </Button>
              )}
            </div>

            <details className="group rounded-xl bg-[#f6f6f4] ring-1 ring-border/60 open:pb-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                <MoreHorizontal className="size-3.5 text-muted-foreground" aria-hidden />
                {isFa ? "بیشتر" : "More"}
              </summary>
              <div className="flex flex-wrap gap-2 px-3 pb-1">
                {published ? (
              <PublishButton
                websiteId={site.id}
                published={published}
                publishLabel={dict.dashboard.publish}
                unpublishLabel={dict.dashboard.unpublish}
                locale={locale}
              />
                ) : null}
                {!published ? null : (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/${locale}/preview/${site.id}`}>
                      {dict.dashboard.preview}
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/${locale}/dashboard/website?id=${site.id}`}>
                    {dict.dashboard.openSite}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/${locale}/dashboard/content`}>
                    {dict.dashboard.content}
                  </Link>
                </Button>
                <SyncInstagramButton
                  websiteId={site.id}
                  locale={locale}
                  enabled={isPro}
                  sourceUrl={
                    username ? `https://instagram.com/${username}` : undefined
                  }
                  compact
                />
              </div>
            </details>
          </div>
        </div>
      </div>
    </article>
  );
}
