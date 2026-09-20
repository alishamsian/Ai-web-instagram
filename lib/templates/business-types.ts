/**
 * Business-type → recommended template categories (recommendation foundation only).
 */

import type { TemplateCategory } from "@/lib/templates/types";

export type BusinessTypeId =
  | "fashion"
  | "restaurant"
  | "saas"
  | "beauty"
  | "agency"
  | "creator"
  | "real-estate"
  | "coffee"
  | "general";

export const BUSINESS_TYPE_CATEGORY_MAP: Record<
  BusinessTypeId,
  TemplateCategory[]
> = {
  fashion: ["fashion", "jewelry", "beauty"],
  restaurant: ["restaurant", "coffee", "hotel"],
  saas: ["saas", "agency", "general"],
  beauty: ["beauty", "fashion", "healthcare"],
  agency: ["agency", "portfolio", "saas"],
  creator: ["creator", "portfolio", "photography"],
  "real-estate": ["real-estate", "furniture", "general"],
  coffee: ["coffee", "restaurant", "general"],
  general: ["general", "portfolio", "agency"],
};

export function recommendedCategoriesForBusinessType(
  businessType: string,
): TemplateCategory[] {
  const key = businessType.trim().toLowerCase() as BusinessTypeId;
  return BUSINESS_TYPE_CATEGORY_MAP[key] ?? BUSINESS_TYPE_CATEGORY_MAP.general;
}

export function listBusinessTypes(): BusinessTypeId[] {
  return Object.keys(BUSINESS_TYPE_CATEGORY_MAP) as BusinessTypeId[];
}
