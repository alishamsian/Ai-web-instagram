import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ExternalLink,
  Link2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BioLinkButton } from "@/components/dashboard/BioLinkButton";
import { DomainConnectForm } from "@/components/dashboard/DomainConnectForm";
import { LivePhonePreview } from "@/components/dashboard/LivePhonePreview";
import { PublishButton } from "@/components/dashboard/PublishButton";
import { SetPrimarySiteButton } from "@/components/dashboard/SetPrimarySiteButton";
import { ShareLinkButton } from "@/components/dashboard/ShareLinkButton";
import { SiteQrCard } from "@/components/dashboard/SiteQrCard";
import { SiteSlugForm } from "@/components/dashboard/SiteSlugForm";
import { SyncInstagramButton } from "@/components/dashboard/SyncInstagramButton";
import { SiteImage } from "@/components/website/SiteImage";
import { SoftBanner, StatusBadge } from "@/components/dashboard/ui";
import {
  formatRelativeTime,
  versionDiffLabel,
  type SiteReadinessStep,
} from "@/lib/dashboard/data";
import type { DomainRecord, WebsiteRecord } from "@/types/website";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/config/env";
import type { WebsiteVersionSummary } from "@/lib/database/queries";
import { cn } from "@/lib/utils";

export function WebsiteHubView({
  website,
  username,
  sourceUrl,
  locale,
  dict,
  isPro,
  isPrimary,
  liveUrl,
  previewUrl,
  cover,
  visits,
  visits24h,
  productsCount,
  postsCount,
  reelsCount,
  domains,
  versions,
  readiness,
  health,
}: {
  website: WebsiteRecord;
  username?: string | null;
  sourceUrl?: string | null;
  locale: Locale;
  dict: Dictionary;
  isPro: boolean;
  isPrimary: boolean;
  liveUrl: string;
  previewUrl: string;
  cover: string | null;
  visits: number;
  visits24h: number;
  productsCount: number;
  postsCount: number;
  reelsCount: number;
  domains: DomainRecord[];
  versions: WebsiteVersionSummary[];
  readiness: SiteReadinessStep[];
  health: {
    lastSyncLabel: string | null;
    lastOrderLabel: string | null;
    freshOrders: number;
  };
}) {
  const isFa = locale === "fa";
  const published = website.status === "published";
  const statusLabel = published
    ? dict.dashboard.statusPublished
    : website.status === "unpublished"
      ? dict.dashboard.statusUnpublished
      : dict.dashboard.statusDraft;

  const incomplete = readiness.filter(
    (step) => !step.done && step.id !== "domain",
  );
  const doneCount = readiness.filter((s) => s.done).length;
  const blockPublish = !published && productsCount === 0;
  const showReadiness = incomplete.length > 0;

  const nextStep = blockPublish
    ? isFa
      ? "اول محصولات را آماده کن، بعد منتشر کن."
      : "Fix products first, then publish."
    : published
      ? isFa
        ? "لینک بیو را بگذار و فروش را دنبال کن."
        : "Add the bio link and watch sales."
      : isFa
        ? "یک کلیک تا فروشگاه زنده شود."
        : "One click away from a live storefront.";

  const seo = website.config.seo;
  const phoneSrc = published ? liveUrl : previewUrl;
  const mediaCount = postsCount + reelsCount;

  return (
    <div className="space-y-6">
      {blockPublish ? (
        <SoftBanner tone="warning">
          {isFa
            ? "هنوز محصولی نیست — قبل از انتشار حداقل یک محصول بساز."
            : "No products yet — add at least one before publishing."}{" "}
          <Link
            href={`/${locale}/dashboard/content?id=${website.id}`}
            className="font-medium underline underline-offset-2"
          >
            {isFa ? "ویرایش محصولات" : "Edit products"}
          </Link>
        </SoftBanner>
      ) : null}

      {showReadiness ? (
        <section className="rounded-2xl border border-border/80 bg-white/80 px-4 py-3.5 backdrop-blur-sm sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-ink">
              {isFa ? "آماده‌سازی" : "Setup"}
              <span className="ms-2 tabular-nums text-muted-foreground">
                {doneCount}/{readiness.length}
              </span>
            </p>
            {incomplete[0] ? (
              <Link
                href={incomplete[0].href}
                className="text-xs font-medium text-ink underline-offset-2 hover:underline"
              >
                {isFa ? "ادامه" : "Continue"} →
              </Link>
            ) : null}
          </div>
          <div className="mt-3 flex gap-1.5">
            {readiness.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                title={isFa ? step.labelFa : step.labelEn}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  step.done ? "bg-ink" : "bg-border hover:bg-ink/25",
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {incomplete.slice(0, 3).map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-ink"
              >
                <span className="size-1 rounded-full bg-amber-500" aria-hidden />
                {isFa ? step.labelFa : step.labelEn}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Hero — one composition */}
      <article className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)_200px]">
          {/* Cover */}
          <div className="relative aspect-[5/4] bg-muted sm:aspect-[16/11] lg:aspect-auto lg:min-h-[360px]">
            {cover ? (
              <SiteImage
                src={cover}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 42vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#efefed,transparent_50%),linear-gradient(160deg,#f8f8f6,#eaeae8)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <StatusBadge
                tone={published ? "success" : "warning"}
                className="bg-white/95 backdrop-blur"
              >
                {statusLabel}
              </StatusBadge>
              <p className="mt-3 text-sm text-white/75" dir="ltr">
                @{username ?? website.slug}
                <span className="mx-1.5 opacity-40">·</span>
                <span className="capitalize opacity-80">{website.config.template}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-6 lg:border-s lg:border-border">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {isFa ? "گام بعدی" : "Next"}
                  </p>
                  <p className="mt-1.5 max-w-sm text-[1.05rem] font-medium leading-snug text-ink">
                    {nextStep}
                  </p>
                </div>
                <SetPrimarySiteButton
                  websiteId={website.id}
                  isPrimary={isPrimary}
                  locale={locale}
                />
              </div>

              {/* Health as quiet meta — not a card */}
              <p className="text-[12px] leading-5 text-muted-foreground">
                <span className="tabular-nums text-ink">{visits24h}</span>{" "}
                {isFa ? "بازدید امروز" : "today"}
                <span className="mx-2 text-border">·</span>
                <span className="tabular-nums text-ink">{visits}</span>{" "}
                {isFa ? "۱۴ روز" : "14d"}
                <span className="mx-2 text-border">·</span>
                {health.lastOrderLabel
                  ? `${isFa ? "سفارش" : "Order"} ${health.lastOrderLabel}`
                  : isFa
                    ? "بدون سفارش"
                    : "No orders"}
                {health.freshOrders > 0 ? (
                  <>
                    <span className="mx-2 text-border">·</span>
                    <Link
                      href={`/${locale}/dashboard/orders`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {health.freshOrders} {isFa ? "جدید" : "new"}
                    </Link>
                  </>
                ) : null}
              </p>

              {/* Stats — single quiet row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 border-y border-border/70 py-3 text-sm">
                <StatInline
                  label={dict.dashboard.products}
                  value={String(productsCount)}
                />
                <StatInline
                  label={isFa ? "مدیا" : "Media"}
                  value={String(mediaCount)}
                />
                <StatInline label="v" value={String(website.version)} />
                <StatInline
                  label={isFa ? "به‌روز" : "Updated"}
                  value={formatRelativeTime(website.updatedAt, locale)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {!published ? (
                  <PublishButton
                    websiteId={website.id}
                    published={false}
                    publishLabel={dict.dashboard.publish}
                    unpublishLabel={dict.dashboard.unpublish}
                    locale={locale}
                  />
                ) : (
                  <>
                    <ShareLinkButton url={liveUrl} locale={locale} />
                    <BioLinkButton
                      url={liveUrl}
                      brandName={website.config.brand.name}
                      locale={locale}
                    />
                  </>
                )}
                <Button
                  asChild
                  size="sm"
                  variant={published ? "default" : "outline"}
                >
                  <Link href={`/${locale}/editor/${website.id}`}>
                    <Pencil className="size-3.5 opacity-80" aria-hidden />
                    {dict.dashboard.edit}
                  </Link>
                </Button>
                {published ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={liveUrl} target="_blank" rel="noreferrer">
                      {dict.dashboard.liveSite}
                      <ExternalLink className="size-3 opacity-60" aria-hidden />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={previewUrl}>{dict.dashboard.preview}</Link>
                  </Button>
                )}
              </div>

              {/* Destinations as text rail */}
              <nav className="flex flex-wrap gap-x-1 gap-y-1 text-xs">
                <DestLink
                  href={`/${locale}/dashboard/content?id=${website.id}`}
                  label={dict.dashboard.content}
                  meta={String(productsCount)}
                />
                <DestLink
                  href={`/${locale}/dashboard/orders`}
                  label={isFa ? "سفارش‌ها" : "Orders"}
                  meta={
                    health.freshOrders > 0
                      ? String(health.freshOrders)
                      : undefined
                  }
                  alert={health.freshOrders > 0}
                />
                <DestLink
                  href={`/${locale}/dashboard/analytics`}
                  label={dict.dashboard.analytics}
                  meta={String(visits)}
                />
              </nav>
            </div>

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                {isFa ? "ابزارهای بیشتر" : "More tools"}
                <ChevronDown
                  className="size-3.5 transition group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {published ? (
                  <PublishButton
                    websiteId={website.id}
                    published
                    publishLabel={dict.dashboard.publish}
                    unpublishLabel={dict.dashboard.unpublish}
                    locale={locale}
                  />
                ) : null}
                <SyncInstagramButton
                  websiteId={website.id}
                  locale={locale}
                  enabled={isPro}
                  sourceUrl={sourceUrl}
                  compact
                />
                {sourceUrl ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      href={`/${locale}/create?url=${encodeURIComponent(sourceUrl)}`}
                    >
                      {dict.dashboard.refreshImport}
                    </Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/${locale}/dashboard/domains`}>
                    {dict.dashboard.domains}
                  </Link>
                </Button>
              </div>
            </details>
          </div>

          {/* Phone column */}
          <div className="hidden items-center justify-center border-s border-border bg-[#fafaf8] px-3 py-8 xl:flex">
            <LivePhonePreview src={phoneSrc} locale={locale} compact />
          </div>
        </div>

        {/* Mobile preview strip — quieter */}
        <div className="flex items-center gap-4 border-t border-border px-5 py-4 xl:hidden">
          <div className="w-[88px] shrink-0">
            <LivePhonePreview
              src={phoneSrc}
              locale={locale}
              compact
              hideLink
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">
              {isFa ? "پیش‌نمایش موبایل" : "Mobile preview"}
            </p>
            <Link
              href={phoneSrc}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ink"
            >
              {isFa ? "باز کردن تمام‌صفحه" : "Open full screen"}
              <ArrowUpRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      </article>

      {/* Secondary — one panel with accordions */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">
            {isFa ? "مدیریت سایت" : "Site management"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isFa
              ? "آدرس، دامنه، SEO و نسخه‌ها"
              : "Address, domain, SEO, and versions"}
          </p>
        </div>

        {/* URL row always visible */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-ink" dir="ltr">
            {liveUrl}
          </p>
          {published ? (
            <ShareLinkButton
              url={liveUrl}
              locale={locale}
              variant="ghost"
              size="sm"
            />
          ) : null}
          {domains[0] ? (
            <StatusBadge tone="success">{domains[0].host}</StatusBadge>
          ) : null}
        </div>

        <Accordion
          title={isFa ? "اسلاگ، QR و دامنه" : "Slug, QR & domain"}
          defaultOpen={false}
        >
          <div className="space-y-4">
            <SiteSlugForm
              websiteId={website.id}
              currentSlug={website.slug}
              locale={locale}
            />
            {published ? (
              <SiteQrCard
                url={liveUrl}
                brandName={website.config.brand.name}
                locale={locale}
              />
            ) : null}
            {isPro ? (
              <DomainConnectForm
                websiteId={website.id}
                locale={locale}
                enabled
                initialHost={domains[0]?.host}
                compact
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f6f6f4] px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {isFa
                    ? "دامنه اختصاصی با پلن حرفه‌ای"
                    : "Custom domain on Pro"}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}/dashboard/billing`}>
                    {isFa ? "پلن‌ها" : "Plans"}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title="SEO" defaultOpen={false}>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-muted-foreground">
                {isFa ? "عنوان" : "Title"}
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {seo?.title || "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                {isFa ? "توضیح" : "Description"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {seo?.description || "—"}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/editor/${website.id}?tab=seo`}>
                {isFa ? "ویرایش SEO" : "Edit SEO"}
              </Link>
            </Button>
          </div>
        </Accordion>

        <Accordion
          title={isFa ? "نسخه‌ها" : "Versions"}
          defaultOpen={false}
          last
        >
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isFa
                ? "با ذخیره در ویرایشگر، نسخه ساخته می‌شود."
                : "Versions appear after you save in the editor."}
            </p>
          ) : (
            <ul className="space-y-1">
              {versions.slice(0, 3).map((version, index) => {
                const current = version.version === website.version;
                const previous = versions[index + 1] ?? null;
                const diff = versionDiffLabel(version, previous, locale);
                return (
                  <li key={version.id}>
                    <Link
                      href={`/${locale}/editor/${website.id}?tab=versions`}
                      className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#f6f6f4]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">
                            v{version.version}
                          </span>
                          {current ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700">
                              <Check className="size-3" aria-hidden />
                              {isFa ? "فعلی" : "Current"}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {formatRelativeTime(version.createdAt, locale)}
                          {diff ? ` · ${diff}` : ""}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Accordion>
      </section>
    </div>
  );
}

function StatInline({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-muted-foreground">
      {label}{" "}
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </span>
  );
}

function DestLink({
  href,
  label,
  meta,
  alert,
}: {
  href: string;
  label: string;
  meta?: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-[#f6f6f4] hover:text-ink"
    >
      {label}
      {meta != null ? (
        <span
          className={cn(
            "tabular-nums",
            alert ? "font-semibold text-emerald-700" : "text-ink/70",
          )}
        >
          {meta}
        </span>
      ) : null}
    </Link>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
  last = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  last?: boolean;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className={cn(
        "group border-border open:bg-[#fafafa]/60",
        !last && "border-b",
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-4 text-muted-foreground transition group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}
