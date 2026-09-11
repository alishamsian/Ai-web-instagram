import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";
import { getDictionary } from "@/lib/i18n/dictionary";
import { parseLocale } from "@/lib/i18n/paths";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/website/SiteImage";

export default async function SitesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLocale((await params).locale);
  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) {
    redirect(`/${locale}/login?next=/${locale}/sites`);
  }

  const store = await readStore();
  const websites = store.websites.filter(
    (item) => item.workspaceId === session.workspace.id,
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar dict={dict} locale={locale} />
      <main className="mx-auto max-w-6xl bg-white px-5 py-14 md:px-8 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink md:text-5xl">
              {dict.dashboard.sitesTitle}
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">{dict.dashboard.sitesBody}</p>
          </div>
          <Button asChild>
            <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
          </Button>
        </div>

        {websites.length === 0 ? (
          <div className="mt-12 rounded-[2rem] border border-dashed border-border bg-white/70 px-8 py-16 text-center">
            <p className="text-lg">{dict.dashboard.empty}</p>
            <Button asChild className="mt-6">
              <Link href={`/${locale}/create`}>{dict.dashboard.emptyCta}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {websites.map((site) => {
              const imported = store.imports.find((item) => item.id === site.importId);
              const cover =
                site.config.brand.logo ||
                site.config.media.logo?.url ||
                (site.config.content.hero.imageId
                  ? site.config.media[site.config.content.hero.imageId]?.url
                  : null);
              return (
                <article
                  key={site.id}
                  className="overflow-hidden rounded-[1.75rem] border border-border bg-white shadow-[0_20px_60px_rgba(18,18,18,0.04)]"
                >
                  <div className="relative aspect-[16/11] bg-muted">
                    {cover ? (
                      <SiteImage
                        src={cover}
                        alt={site.config.brand.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    <p className="text-lg font-medium">{site.config.brand.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      @{imported?.username ?? site.slug}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {site.status === "published"
                        ? dict.dashboard.statusPublished
                        : dict.dashboard.statusDraft}
                      {" · "}
                      {dict.dashboard.cached}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={`/${locale}/editor/${site.id}`}>
                          {dict.dashboard.openSite}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/${locale}/preview/${site.id}`}>
                          {dict.dashboard.preview}
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          href={`/${locale}/create?url=instagram.com/${imported?.username ?? site.slug}&refresh=1`}
                        >
                          {dict.dashboard.refreshImport}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer dict={dict} locale={locale} />
    </div>
  );
}
