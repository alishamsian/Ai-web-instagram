import { planLimits } from "@/lib/config/plans";
import type { WebsiteRecord } from "@/types/website";

/** Client-safe dashboard helpers — never import Node / store / Supabase here. */

export type StoreOrderRow = {
  id: string;
  websiteId: string;
  channel: string;
  status: string;
  customerNote: string | null;
  customerContact: string | null;
  items: { name: string; qty: number; price?: number | null }[];
  createdAt: string;
};

export type SetupStep = {
  id: string;
  done: boolean;
  href: string;
  labelFa: string;
  labelEn: string;
};

export function formatRelativeTime(iso: string, locale: "fa" | "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60_000));
  if (mins < 1) return locale === "fa" ? "همین الان" : "Just now";
  if (mins < 60) {
    return locale === "fa" ? `${mins} دقیقه پیش` : `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return locale === "fa" ? `${hours} ساعت پیش` : `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return locale === "fa" ? `${days} روز پیش` : `${days}d ago`;
}

export function siteCoverUrl(site: WebsiteRecord): string | null {
  if (site.config.brand.logo) return site.config.brand.logo;
  const heroId = site.config.content.hero.imageId;
  if (heroId && site.config.media[heroId]?.url) {
    return site.config.media[heroId].url;
  }
  const gallery = site.config.content.gallery?.imageIds ?? [];
  for (const id of gallery) {
    if (site.config.media[id]?.url) return site.config.media[id].url;
  }
  const firstMedia = Object.values(site.config.media)[0];
  return firstMedia?.url ?? null;
}

export function siteLogoUrl(site: WebsiteRecord): string | null {
  if (site.config.brand.logo) return site.config.brand.logo;
  const mediaLogo = site.config.media["logo"]?.url;
  if (mediaLogo) return mediaLogo;
  return siteCoverUrl(site);
}

export function planUsageLabel(
  plan: string | undefined,
  siteCount: number,
  locale: "fa" | "en",
) {
  const limits = planLimits(plan);
  if (locale === "fa") {
    return `${siteCount} از ${limits.maxWebsites} سایت`;
  }
  return `${siteCount} of ${limits.maxWebsites} sites`;
}

export function classifyReferrer(referrer: string | null | undefined): string {
  if (!referrer?.trim()) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram")) return "instagram";
    if (host.includes("t.me") || host.includes("telegram")) return "telegram";
    if (host.includes("google")) return "google";
    if (host.includes("twitter") || host.includes("x.com")) return "x";
    if (host.includes("facebook") || host.includes("fb.")) return "facebook";
    return host || "other";
  } catch {
    return "other";
  }
}
