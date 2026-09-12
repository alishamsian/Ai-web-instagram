import Link from "next/link";
import { SiteImage } from "@/components/website/SiteImage";
import { siteCoverUrl } from "@/lib/dashboard/format";
import { publishedSiteUrl } from "@/lib/config/runtime";
import type { WebsiteRecord } from "@/types/website";
import type { Locale } from "@/lib/config/env";
import { ShareLinkButton } from "@/components/dashboard/ShareLinkButton";
import { StatusBadge } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

/** Compact phone-frame preview for dashboard overview / site hub. */
export function SitePhonePreview({
  site,
  locale,
  variant = "card",
  showActions = true,
}: {
  site: WebsiteRecord;
  locale: Locale;
  variant?: "card" | "inline";
  showActions?: boolean;
}) {
  const cover = siteCoverUrl(site);
  const published = site.status === "published";
  const url = publishedSiteUrl(site.slug);
  const isFa = locale === "fa";
  const inline = variant === "inline";

  const frame = (
    <div className={cn("mx-auto w-full", inline ? "max-w-[148px]" : "max-w-[200px]")}>
      <div
        className={cn(
          "overflow-hidden border border-border bg-[#0a0a0a] shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
          inline ? "rounded-[1.35rem] p-1.5" : "rounded-[1.6rem] p-2",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            inline ? "aspect-[9/16] rounded-[1.05rem]" : "aspect-[9/16] rounded-[1.2rem]",
          )}
        >
          {cover ? (
            <SiteImage
              src={cover}
              alt=""
              fill
              className="object-cover"
              sizes={inline ? "148px" : "200px"}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(160deg,#eee,#ddd)]" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10">
            <p className="truncate text-xs font-medium text-white">
              {site.config.brand.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-white/75">
              {site.config.content.hero.headline}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const actions = (
    <div className={cn("flex flex-wrap gap-2", inline ? "justify-stretch" : "justify-center")}>
      {published ? (
        <>
          {!inline ? <ShareLinkButton url={url} locale={locale} /> : null}
          <Link
            href={url}
            target="_blank"
            className={cn(
              "inline-flex h-8 items-center justify-center rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-muted",
              inline && "w-full",
            )}
          >
            {isFa ? "باز کردن" : "Open"}
          </Link>
        </>
      ) : (
        <Link
          href={`/${locale}/preview/${site.id}`}
          className={cn(
            "inline-flex h-8 items-center justify-center rounded-xl bg-ink px-3 text-xs font-medium text-white",
            inline && "w-full",
          )}
        >
          {isFa ? "پیش‌نمایش کامل" : "Full preview"}
        </Link>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col items-center gap-3">
        {frame}
        {showActions ? actions : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {isFa ? "پیش‌نمایش" : "Preview"}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {site.config.brand.name}
          </p>
        </div>
        <StatusBadge tone={published ? "success" : "warning"}>
          {published
            ? isFa
              ? "زنده"
              : "Live"
            : isFa
              ? "پیش‌نویس"
              : "Draft"}
        </StatusBadge>
      </div>
      {frame}
      {showActions ? <div className="mt-4">{actions}</div> : null}
    </div>
  );
}
