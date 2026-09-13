import type { BusinessProfile } from "@/lib/business/types";
import type { InstagramImport } from "@/types/instagram";
import type { WebsiteAIAnalysis } from "@/types/ai";
import { sanitizeHttpUrl } from "@/lib/business/schema";

/**
 * Map Instagram import (+ optional AI analysis) → canonical BusinessProfile.
 * Never invents product names, prices, or commercial claims.
 *
 * Important: raw posts/reels are media evidence, not products. A caption
 * sentence is not treated as a product name because doing so can turn generic
 * marketing copy into false catalog inventory. Products enter the canonical
 * profile only when the upstream analysis explicitly identifies a named item.
 */
export function businessProfileFromInstagram(input: {
  imported: InstagramImport;
  analysis?: WebsiteAIAnalysis | null;
  locale?: "fa" | "en";
}): BusinessProfile {
  const { imported, analysis, locale } = input;
  const profile = imported.profile;

  const logoUrl = sanitizeHttpUrl(
    profile.profilePicUrlHD ?? profile.profilePicUrl,
  );

  const images = [
    ...imported.posts,
    ...imported.reels,
  ].flatMap((post) => {
    const urls = [
      ...(post.images ?? []),
      ...(post.displayUrl ? [post.displayUrl] : []),
    ];
    return urls
      .map((url) => sanitizeHttpUrl(url))
      .filter((url): url is string => Boolean(url))
      .map((url) => ({
        url,
        alt: post.alt ?? null,
        source: post.id,
      }));
  });

  // Dedupe by URL while preserving order.
  const seen = new Set<string>();
  const uniqueImages = images.filter((img) => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });

  const mediaById = new Map(
    imported.media.map((m) => [m.id, m] as const),
  );

  const sourcePosts = [...imported.posts, ...imported.reels];
  const analysisProducts =
    analysis?.products
      ?.map((product) => {
        const name = product.name?.trim();
        if (!name) return null;

        const firstImageId = product.imageIds?.[0];
        const media = firstImageId ? mediaById.get(firstImageId) : undefined;
        const imageFromPost = firstImageId
          ? sourcePosts.find((p) => p.id === firstImageId)
          : undefined;
        const imageUrl = sanitizeHttpUrl(
          media?.originalUrl ??
            imageFromPost?.displayUrl ??
            imageFromPost?.images?.[0] ??
            null,
        );

        return {
          id: product.id,
          name,
          description: product.description?.trim() || null,
          price: product.price ?? null,
          currency: product.currency ?? null,
          confidence:
            typeof product.confidence === "number" ? product.confidence : null,
          imageUrl,
          attributes: product.industryData?.attributes
            ? { ...product.industryData.attributes }
            : product.category
              ? { category: product.category }
              : undefined,
        };
      })
      .filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? [];

  return {
    source: "instagram",
    username: imported.username,
    displayName:
      analysis?.businessName?.trim() ||
      profile.fullName?.trim() ||
      imported.username,
    bio: profile.biography,
    website: sanitizeHttpUrl(profile.externalUrl),
    locale: locale ?? null,
    category:
      analysis?.businessType?.trim() ||
      profile.businessCategory?.trim() ||
      null,
    brand: {
      name:
        analysis?.businessName?.trim() ||
        profile.fullName?.trim() ||
        imported.username,
      tagline: analysis?.summary?.trim() || null,
      description:
        analysis?.aboutCopy?.trim() || analysis?.summary?.trim() || null,
      logoUrl,
      colors: (analysis?.suggestedColors ?? []).filter(Boolean),
    },
    media: {
      images: uniqueImages.slice(0, 24),
    },
    products: analysisProducts,
    signals: {
      contentSignals: analysis?.brandTone ?? [],
      brandSignals: analysis?.visualStyle ?? [],
    },
    metadata: {
      instagramUsername: imported.username,
      scrapeStatus: imported.scrapeStatus,
      heroHeadline: analysis?.heroCopy?.headline ?? null,
      heroSubheadline: analysis?.heroCopy?.subheadline ?? null,
      suggestedCta: analysis?.suggestedCTA ?? null,
      seoTitle: analysis?.seo?.title ?? null,
      seoDescription: analysis?.seo?.description ?? null,
    },
  };
}
