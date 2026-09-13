import type { WebsiteAIAnalysis, WebsiteBusinessProfile } from "@/types/ai";
import type {
  BusinessStrategyInput,
  BusinessStrategy,
} from "@/lib/store/verticals/types";
import {
  getProductAttributesForVertical,
  getRecommendedSectionsForVertical,
  pickVerticalWithConfidence,
  resolveVerticalPack,
} from "@/lib/store/verticals/resolve";
import { getRecipe, getRecipesForVertical } from "@/lib/store/recipes/registry";
import type { RegistrySectionType } from "@/lib/store/registry/types";
import type { StoreMood } from "@/lib/design-system/themes";

function fromWebsiteProfile(
  profile: WebsiteBusinessProfile | undefined,
): BusinessStrategyInput {
  if (!profile) return {};
  return {
    vertical: profile.vertical,
    subVertical: profile.subVertical,
    style: profile.style,
    confidence: profile.confidence,
    recommendedTemplate: profile.recommendedTemplate,
    recommendedModules: profile.recommendedModules,
    productAttributes: profile.productAttributes,
    fallbackVertical: profile.fallbackVertical,
    mood: profile.mood,
  };
}

/**
 * Consumer seam for strategy hints → Vertical Engine.
 * Does NOT classify Instagram. Does NOT invent confidence.
 */
export function toBusinessProfile(
  input: BusinessStrategyInput | WebsiteAIAnalysis | null | undefined,
): BusinessStrategyInput {
  if (!input) return {};
  if ("businessName" in input && "businessType" in input) {
    const analysis = input as WebsiteAIAnalysis;
    const fromNested = fromWebsiteProfile(analysis.businessProfile);
    return {
      ...fromNested,
      style: fromNested.style ?? analysis.visualStyle?.[0] ?? null,
      recommendedModules:
        fromNested.recommendedModules ??
        analysis.recommendedSections?.map(String),
      fallbackVertical: fromNested.fallbackVertical ?? "generic",
    };
  }
  return input as BusinessStrategyInput;
}

export function resolveBusinessStrategy(
  input: BusinessStrategyInput | WebsiteAIAnalysis | null | undefined,
): BusinessStrategy {
  const profile = toBusinessProfile(input);
  const picked = pickVerticalWithConfidence({
    vertical: profile.vertical,
    fallbackVertical: profile.fallbackVertical ?? "generic",
    confidence: profile.confidence,
  });
  const pack = resolveVerticalPack(picked.vertical);

  const recipeId =
    profile.recommendedTemplate && getRecipe(profile.recommendedTemplate)
      ? profile.recommendedTemplate
      : (pack.templates?.[0] ??
        getRecipesForVertical(picked.vertical)[0]?.id ??
        null);

  const recipe = recipeId ? getRecipe(recipeId) : undefined;
  const mood = (profile.mood ?? recipe?.mood ?? null) as
    | StoreMood
    | string
    | null;

  const recommendedFromPack = getRecommendedSectionsForVertical(picked.vertical);
  const supported = new Set(recommendedFromPack);
  const fromModules = (profile.recommendedModules ?? []).filter((type) =>
    supported.has(type as RegistrySectionType),
  ) as RegistrySectionType[];

  const recommendedSections = [
    ...new Set([...fromModules, ...recommendedFromPack]),
  ];

  return {
    vertical: picked.vertical,
    fallbackVertical: resolveVerticalPack(profile.fallbackVertical ?? "generic")
      .id,
    template: recipeId,
    mood,
    recommendedSections,
    productAttributes: getProductAttributesForVertical(
      picked.vertical,
      profile.subVertical,
    ),
    uncertain: picked.uncertain,
  };
}
