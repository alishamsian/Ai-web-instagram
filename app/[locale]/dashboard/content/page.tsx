import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getWorkspaceDashboardData } from "@/lib/dashboard/data";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/website/SiteImage";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatCard,
} from "@/components/dashboard/ui";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);

  const { imports, websites } = await getWorkspaceDashboardData(
    session.workspace.id,
  );
  const latest = imports[0];
  const products =
    websites.flatMap((site) => site.config.content.products?.items ?? []) ?? [];

  const allPosts = imports.flatMap((item) =>
    [...item.posts, ...item.reels].map((post) => ({
      ...post,
      username: item.username,
    })),
  );
  const mediaItems = imports.flatMap((item) =>
    item.media
      .filter((m) => m.type === "image")
      .slice(0, 24)
      .map((m) => ({
        id: m.id,
        url: m.originalUrl,
        username: item.username,
      })),
  );

  if (!latest && allPosts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={dict.dashboard.contentTitle}
          description={dict.dashboard.contentBody}
        />
        <EmptyState
          title={dict.dashboard.contentEmpty}
          body={dict.dashboard.contentEmptyBody}
          action={
            <Button asChild>
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.navMain}
        title={dict.dashboard.contentTitle}
        description={dict.dashboard.contentBody}
        actions={
          websites[0] ? (
            <Button asChild size="sm">
              <Link href={`/${locale}/editor/${websites[0].id}`}>
                {dict.dashboard.edit}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={dict.dashboard.posts} value={String(allPosts.filter((p) => p.type !== "reel").length)} />
        <StatCard
          label={dict.dashboard.reels}
          value={String(allPosts.filter((p) => p.type === "reel").length)}
        />
        <StatCard label={dict.dashboard.media} value={String(mediaItems.length)} />
        <StatCard label={dict.dashboard.products} value={String(products.length)} />
      </div>

      <Panel title={dict.dashboard.posts}>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allPosts.slice(0, 24).map((post) => {
            const src = post.displayUrl || post.images[0];
            return (
              <article
                key={`${post.id}-${post.shortcode}`}
                className="overflow-hidden rounded-2xl border border-border bg-white"
              >
                <div className="relative aspect-square bg-muted">
                  {src ? (
                    <SiteImage
                      src={src}
                      alt={post.alt ?? ""}
                      fill
                      className="object-cover"
                      sizes="25vw"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-muted-foreground">
                    @{post.username} · {post.type}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink">
                    {post.caption || "—"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {products.length > 0 ? (
        <Panel title={dict.dashboard.products}>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 12).map((product, index) => (
              <div
                key={`${product.name}-${index}`}
                className="rounded-2xl border border-border px-4 py-4"
              >
                <p className="font-medium text-ink">{product.name}</p>
                {product.price != null ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {product.price}
                    {product.currency ? ` ${product.currency}` : ""}
                  </p>
                ) : null}
                {product.description ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {product.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
