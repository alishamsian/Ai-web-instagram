import { getPublishedWebsiteBySlug } from "@/lib/database/queries";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { SiteViewBeacon } from "@/components/website/SiteViewBeacon";
import { notFound } from "next/navigation";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { findCatalogProduct } from "@/lib/website/product";

export default async function PublishedProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const website = await getPublishedWebsiteBySlug(slug);
  if (!website) notFound();

  const polished = polishWebsiteConfig(website.config);
  const product = findCatalogProduct(polished, productSlug);
  if (!product) notFound();

  return (
    <>
      <title>{`${product.name} · ${polished.brand.name}`}</title>
      <meta
        name="description"
        content={product.description || polished.seo.description}
      />
      <SiteViewBeacon
        websiteId={website.id}
        slug={slug}
        path={`/p/${productSlug}`}
      />
      <WebsiteRenderer
        config={website.config}
        basePath={`/s/${slug}`}
        productSlug={productSlug}
        websiteId={website.id}
      />
    </>
  );
}
