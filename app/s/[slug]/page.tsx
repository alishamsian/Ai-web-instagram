import { getPublishedWebsiteBySlug } from "@/lib/database/queries";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { SiteViewBeacon } from "@/components/website/SiteViewBeacon";
import { notFound } from "next/navigation";

export default async function PublishedSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const website = await getPublishedWebsiteBySlug(slug);
  if (!website) notFound();

  return (
    <>
      <title>{website.config.seo.title}</title>
      <meta name="description" content={website.config.seo.description} />
      <SiteViewBeacon websiteId={website.id} slug={slug} path="/" />
      <WebsiteRenderer
        config={website.config}
        mode="published"
        basePath={`/s/${slug}`}
        websiteId={website.id}
      />
    </>
  );
}
