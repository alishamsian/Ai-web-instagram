import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config/env";
import { listPublishedWebsiteSlugs } from "@/lib/database/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = APP_URL.replace(/\/$/, "");
  const marketing: MetadataRoute.Sitemap = ["", "/en", "/fa"].map((path) => ({
    url: `${base}${path || "/fa"}`,
    lastModified: new Date(),
  }));

  try {
    const sites = await listPublishedWebsiteSlugs();
    const published = sites.map((site) => ({
      url: `${base}/s/${site.slug}`,
      lastModified: new Date(site.updatedAt),
    }));
    return [...marketing, ...published];
  } catch {
    return marketing;
  }
}
