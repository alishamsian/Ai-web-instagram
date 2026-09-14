import type { WebsiteAIAnalysis } from "@/types/ai";
import type {
  InstagramImport,
  InstagramPost,
  InstagramProfile,
  ScrapeStatus,
} from "@/types/instagram";
import { mergeInstagramData } from "@/lib/instagram/merger";
import { normalizePost, normalizeProfile } from "@/lib/instagram/normalizer";

/**
 * Provider-agnostic import normalization.
 * Raw provider payloads → InstagramImport (never trusts field names).
 */
export function normalizeInstagramImport(input: {
  workspaceId: string;
  sourceUrl: string;
  collector: string;
  requestedLimit: number;
  rawProfile: Record<string, unknown>;
  rawPosts: Record<string, unknown>[];
}): InstagramImport {
  const profile = normalizeProfile(input.rawProfile, input.sourceUrl);
  const owner = { username: profile.username, id: profile.id };
  const posts = input.rawPosts
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map((row) => normalizePost(row, owner));

  const imported = mergeInstagramData({
    workspaceId: input.workspaceId,
    sourceUrl: input.sourceUrl,
    profile,
    posts,
    requestedLimit: input.requestedLimit,
    collector: input.collector,
  });

  return imported;
}

/**
 * Deterministic analysis when AI is unavailable.
 * Does NOT invent product names from captions.
 */
export function heuristicAnalysisFromImport(
  imported: InstagramImport,
  locale: "fa" | "en" = "en",
): WebsiteAIAnalysis {
  const name =
    imported.profile.fullName?.trim() ||
    imported.username ||
    (locale === "fa" ? "برند شما" : "Your brand");
  const bio = imported.profile.biography?.trim() || "";
  const fa = locale === "fa";

  return {
    businessType: imported.profile.businessCategory?.trim() || "creator",
    businessName: name,
    summary:
      bio ||
      (fa
        ? `${name} — وب‌سایت ساخته‌شده از اینستاگرام`
        : `${name} — website built from Instagram`),
    targetAudience: fa ? "مخاطبان اینستاگرام" : "Instagram audience",
    brandTone: ["authentic", "modern"],
    visualStyle: ["editorial", "clean"],
    suggestedColors: [],
    products: [],
    services: [],
    contactInfo: {
      phone: null,
      email: null,
      website: imported.profile.externalUrl,
      instagram: imported.username,
      telegram: null,
      whatsapp: null,
      address: null,
      location: null,
    },
    recommendedSections: [
      "hero",
      "gallery",
      "instagram-feed",
      "about",
      "contact",
      "footer",
    ],
    suggestedCTA: fa ? "مشاهده" : "Explore",
    seo: {
      title: name.slice(0, 60),
      description: (bio || name).slice(0, 155),
      keywords: [imported.username, name].filter(Boolean),
    },
    template: "store",
    heroCopy: {
      headline: name,
      subheadline:
        bio.slice(0, 160) ||
        (fa ? "از اینستاگرام به وب‌سایت" : "From Instagram to website"),
    },
    aboutCopy:
      bio ||
      (fa
        ? "داستان برند را اینجا کامل کنید."
        : "Tell your brand story here."),
  };
}

export function mapScrapeStatusToPipeline(
  status: ScrapeStatus | null | undefined,
): "ready" | "failed" | "normalizing" {
  if (!status) return "normalizing";
  if (
    status === "PRIVATE" ||
    status === "NOT_FOUND" ||
    status === "LOGIN_REQUIRED" ||
    status === "RATE_LIMITED" ||
    status === "SCRAPE_FAILED"
  ) {
    return "failed";
  }
  return "ready";
}

export type { InstagramProfile, InstagramPost, InstagramImport };
