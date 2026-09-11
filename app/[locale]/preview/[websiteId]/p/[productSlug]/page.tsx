import { notFound, redirect } from "next/navigation";
import { WebsiteRenderer } from "@/components/website/WebsiteRenderer";
import { getSession } from "@/lib/auth/session";
import { readStore } from "@/lib/database/store";
import { parseLocale } from "@/lib/i18n/paths";
import { polishWebsiteConfig } from "@/lib/website/polish";
import { findCatalogProduct } from "@/lib/website/product";

export default async function PreviewProductPage({
  params,
}: {
  params: Promise<{ locale: string; websiteId: string; productSlug: string }>;
}) {
  const { locale: raw, websiteId, productSlug } = await params;
  const locale = parseLocale(raw);
  const session = await getSession();
  if (!session) redirect(`/${locale}/login`);
  const store = await readStore();
  const website = store.websites.find(
    (item) => item.id === websiteId && item.workspaceId === session.workspace.id,
  );
  if (!website) notFound();

  const polished = polishWebsiteConfig(website.config);
  if (!findCatalogProduct(polished, productSlug)) notFound();

  return (
    <WebsiteRenderer
      config={website.config}
      basePath={`/${locale}/preview/${websiteId}`}
      productSlug={productSlug}
    />
  );
}
