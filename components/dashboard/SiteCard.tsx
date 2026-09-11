import Link from "next/link";
import { SiteImage } from "@/components/website/SiteImage";
import { StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/dashboard/ShareLinkButton";
import { siteCoverUrl } from "@/lib/dashboard/data";
import { publishedSiteUrl } from "@/lib/config/runtime";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteRecord } from "@/types/website";

export function SiteCard({
  site,
  username,
  locale,
  dict,
  visits,
}: {
  site: WebsiteRecord;
  username?: string | null;
  locale: Locale;
  dict: Dictionary;
  visits?: number;
}) {
  const cover = siteCoverUrl(site);
  const published = site.status === "published";
  const isFa = locale === "fa";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {cover ? (
          <SiteImage
            src={cover}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#e8e8e8,transparent_55%),linear-gradient(135deg,#f4f4f4,#ebebeb)]" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={published ? "success" : "neutral"}
              className="bg-white/95 backdrop-blur"
            >
              {published
                ? dict.dashboard.statusPublished
                : dict.dashboard.statusDraft}
            </StatusBadge>
            {typeof visits === "number" ? (
              <span className="rounded-lg bg-black/45 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                {visits} {isFa ? "بازدید" : "visits"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">
              {site.config.brand.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              @{username ?? site.slug}
            </p>
          </div>
          <span className="shrink-0 rounded-lg bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
            v{site.version}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/${locale}/editor/${site.id}`}>
              {dict.dashboard.edit}
            </Link>
          </Button>
          {published ? (
            <ShareLinkButton
              url={publishedSiteUrl(site.slug)}
              locale={locale}
              variant="outline"
            />
          ) : (
            <Button asChild size="sm" variant="outline">
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
        </div>
      </div>
    </article>
  );
}
