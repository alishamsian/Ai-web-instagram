/**
 * Feature adoption — only features with real evidence sources.
 */

export type FeatureDefinition = {
  id: string;
  label: string;
  /** How adopters are counted */
  source:
    | "product_events"
    | "websites"
    | "instagram_imports"
    | "domains"
    | "publications"
    | "ai_usage_logs";
  eventNames?: string[];
  /** Human-readable eligibility */
  eligibility: string;
};

export const MEASURABLE_FEATURES: FeatureDefinition[] = [
  {
    id: "instagram_import",
    label: "Instagram import",
    source: "instagram_imports",
    eligibility: "All workspaces",
  },
  {
    id: "website_editor",
    label: "Website editor",
    source: "product_events",
    eventNames: ["website_edited", "editor_saved"],
    eligibility: "Workspaces with ≥1 website",
  },
  {
    id: "website_publish",
    label: "Website publish",
    source: "websites",
    eligibility: "Workspaces with ≥1 website",
  },
  {
    id: "custom_domain",
    label: "Custom domain",
    source: "domains",
    eligibility: "Workspaces with published website",
  },
  {
    id: "ai_generation",
    label: "AI generation",
    source: "ai_usage_logs",
    eligibility: "All workspaces / users with AI access",
  },
  {
    id: "channel_publishing",
    label: "Channel publishing",
    source: "publications",
    eligibility: "Workspaces with published website",
  },
];

export type FeatureAdoptionStat = {
  id: string;
  label: string;
  eligible: number | null;
  adopters: number | null;
  adoptionRate: number | null;
  status: "available" | "partial" | "unavailable" | "insufficient_data";
  reason?: string;
  source: string;
};

export function adoptionRate(
  adopters: number,
  eligible: number,
): number | null {
  if (eligible <= 0) return null;
  return adopters / eligible;
}
