/**
 * Canonical business intake model — source-agnostic (Instagram / manual / import).
 * Not a second WebsiteConfig. Feeds Understanding → Vertical → Recipe → WebsiteConfig.
 */

export type BusinessSource = "instagram" | "manual" | "import" | "unknown";

export type BusinessMediaImage = {
  url: string;
  alt?: string | null;
  source?: string | null;
};

export type BusinessMediaVideo = {
  url: string;
  thumbnailUrl?: string | null;
};

export type BusinessProductInput = {
  id?: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  attributes?: Record<string, unknown>;
};

export type BusinessProfile = {
  source?: BusinessSource;

  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  website?: string | null;

  locale?: string | null;
  languages?: string[];

  category?: string | null;
  subCategory?: string | null;

  brand?: {
    name?: string | null;
    tagline?: string | null;
    logoUrl?: string | null;
    colors?: string[];
  };

  media?: {
    images?: BusinessMediaImage[];
    videos?: BusinessMediaVideo[];
  };

  products?: BusinessProductInput[];

  signals?: {
    productSignals?: string[];
    contentSignals?: string[];
    brandSignals?: string[];
    audienceSignals?: string[];
  };

  metadata?: Record<string, unknown>;
};

export type BusinessUnderstandingMode = "deterministic" | "ai" | "hybrid";

export type ConfidenceBand = "high" | "medium" | "low";
