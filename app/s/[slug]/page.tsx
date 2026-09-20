import { getPublishedWebsiteBySlug } from "@/lib/database/queries";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { SiteViewBeacon } from "@/components/website/SiteViewBeacon";
import {
  ensureWebsitePages,
  findPageByIdOrSlug,
} from "@/lib/visual-editor/pages";
import { notFound } from "next/navigation";

export default async function PublishedSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRef } = await searchParams;
  const website = await getPublishedWebsiteBySlug(slug);
  if (!website) notFound();

  const pages = ensureWebsitePages(website.config);
  const config = { ...website.config, pages };
  const resolved = pageRef
    ? findPageByIdOrSlug(pages, pageRef)
    : pages.find((p) => p.id === "home") || pages[0];
  const pageId = resolved?.id || "home";

  return (
    <>
      <title>{website.config.seo.title}</title>
      <meta name="description" content={website.config.seo.description} />
      <SiteViewBeacon
        websiteId={website.id}
        slug={slug}
        path={pageRef ? `/?page=${encodeURIComponent(pageRef)}` : "/"}
      />
      <WebsiteRenderer
        config={config}
        mode="published"
        basePath={`/s/${slug}`}
        websiteId={website.id}
        pageId={pageId}
      />
    </>
  );
}
