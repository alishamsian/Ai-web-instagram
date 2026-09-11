import Link from "next/link";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { resolveWorkspaceWebsite } from "@/lib/dashboard/primary-site";
import { getPrimarySiteIdCookie } from "@/lib/dashboard/primary-site-server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import { ContentStudio } from "@/components/dashboard/content/ContentStudio";
import {
  EmptyState,
  PageHeader,
  PageStack,
  SoftBanner,
} from "@/components/dashboard/ui";

export default async function ContentPage({
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

  const { imports, websites } = await getWorkspaceDashboardData(
    session.workspace.id,
  );
  const primaryId = await getPrimarySiteIdCookie();

  const { website: primary, idInvalid } = resolveWorkspaceWebsite(websites, {
    requestedId,
    primaryId,
  });
  const products = primary?.config.content.products?.items ?? [];
  const mediaMap = primary?.config.media ?? {};

  const siteImport = primary
    ? (imports.find((item) => item.id === primary.importId) ?? null)
    : null;
  const scopedImports = siteImport ? [siteImport] : imports;

  const allPosts = scopedImports.flatMap((item) =>
    [...item.posts, ...item.reels].map((post) => ({
      id: post.id,
      type: post.type,
      caption: post.caption,
      displayUrl: post.displayUrl,
      images: post.images,
      videoUrl: post.videoUrl,
      alt: post.alt,
      username: item.username,
    })),
  );

  const mediaLibrary = [
    ...Object.entries(mediaMap).map(([id, m]) => ({
      id,
      url: m.url,
      type: m.type as "image" | "video" | undefined,
    })),
    ...scopedImports.flatMap((item) =>
      item.media
        .filter((m) => m.type === "image" || m.type === "video")
        .slice(0, 40)
        .map((m) => ({
          id: m.id,
          url: m.originalUrl,
          type: m.type as "image" | "video",
          username: item.username,
        })),
    ),
  ].filter(
    (item, index, arr) =>
      arr.findIndex((x) => x.id === item.id || x.url === item.url) === index,
  );

  if (!imports[0] && allPosts.length === 0 && !primary) {
    return (
      <PageStack>
        <PageHeader
          title={dict.dashboard.contentTitle}
          description={dict.dashboard.contentBody}
        />
        <EmptyState
          title={dict.dashboard.contentEmpty}
          body={dict.dashboard.contentEmptyBody}
          icon={<Images className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      </PageStack>
    );
  }

  return (
    <PageStack>
      {primary ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {websites.length > 1 ? (
              <nav className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {websites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/${locale}/dashboard/content?id=${site.id}`}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      site.id === primary.id
                        ? "bg-ink text-white"
                        : "bg-white/80 text-muted-foreground ring-1 ring-border/70 hover:text-ink"
                    }`}
                  >
                    {site.config.brand.name}
                  </Link>
                ))}
              </nav>
            ) : (
              <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {dict.dashboard.navMain}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/${locale}/dashboard/website?id=${primary.id}`}>
                {dict.dashboard.openSite}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/editor/${primary.id}`}>
                {dict.dashboard.edit}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <PageHeader
          title={isFa ? "استودیوی محتوا" : "Content studio"}
          description={
            isFa
              ? "کاتالوگ بصری — از پست اینستا تا محصول آماده فروش."
              : "Visual catalog — from Instagram posts to sellable products."
          }
        />
      )}

      {idInvalid ? (
        <SoftBanner tone="warning">
          {isFa
            ? "سایت درخواستی پیدا نشد — سایت اصلی نمایش داده می‌شود."
            : "Requested site not found — showing your primary site."}
        </SoftBanner>
      ) : null}

      {primary ? (
        <ContentStudio
          websiteId={primary.id}
          brandName={primary.config.brand.name}
          locale={locale}
          products={products}
          mediaMap={Object.fromEntries(
            Object.entries(mediaMap).map(([id, m]) => [
              id,
              { url: m.url, type: m.type },
            ]),
          )}
          posts={allPosts}
          mediaLibrary={mediaLibrary}
          previewBase={
            primary.status === "published"
              ? `/${locale}/preview/${primary.id}`
              : `/${locale}/preview/${primary.id}`
          }
          catalogDefaults={{
            category: primary.config.content.products?.defaults?.category ?? "",
            currency:
              primary.config.content.products?.defaults?.currency !== undefined
                ? primary.config.content.products.defaults.currency
                : locale === "fa"
                  ? "IRT"
                  : "USD",
          }}
        />
      ) : (
        <EmptyState
          title={dict.dashboard.noWebsite}
          body={dict.dashboard.emptyBody}
          icon={<Images className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      )}
    </PageStack>
  );
}
