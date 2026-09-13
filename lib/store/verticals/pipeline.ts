/**
 * AI / Business Understanding consumer seam.
 * No Instagram classification — only structured profile → strategy → config.
 */

import type { WebsiteAIAnalysis } from "@/types/ai";
import type { WebsiteConfig } from "@/types/website";
import type {
  BusinessProfile,
  BusinessStrategy,
} from "@/lib/store/verticals/types";
import {
  resolveBusinessStrategy,
  toBusinessProfile,
} from "@/lib/store/verticals/strategy";
import {
  buildWebsiteConfigFromRecipe,
  resolveRecipe,
} from "@/lib/store/recipes/builder";
import { resolveVerticalId } from "@/lib/store/verticals/resolve";

/** Alias matching Phase 3 brief naming. */
export type BusinessUnderstanding = BusinessProfile;

export function resolveVertical(
  input: BusinessUnderstanding | WebsiteAIAnalysis | null | undefined,
) {
  const strategy = resolveBusinessStrategy(input);
  return {
    vertical: resolveVerticalId(strategy.vertical),
    fallbackVertical: resolveVerticalId(strategy.fallbackVertical),
    uncertain: strategy.uncertain,
    strategy,
  };
}

export function resolveRecipeForUnderstanding(
  input: BusinessUnderstanding | WebsiteAIAnalysis | null | undefined,
) {
  const strategy = resolveBusinessStrategy(input);
  return resolveRecipe(strategy.template);
}

/**
 * Full pipeline:
 * BusinessUnderstanding → Vertical → Recipe → WebsiteConfig
 */
export function buildWebsiteConfigFromUnderstanding(input: {
  understanding: BusinessUnderstanding | WebsiteAIAnalysis | null | undefined;
  seed?: Parameters<typeof buildWebsiteConfigFromRecipe>[0]["seed"];
}): {
  strategy: BusinessStrategy;
  config: WebsiteConfig;
} {
  const strategy = resolveBusinessStrategy(input.understanding);
  const recipe = resolveRecipe(strategy.template);
  const config = buildWebsiteConfigFromRecipe({
    recipe,
    seed: {
      ...input.seed,
      brandName: input.seed?.brandName ?? input.seed?.brand?.name,
      locale: input.seed?.locale ?? input.seed?.settings?.language,
      settings: {
        language: input.seed?.locale ?? input.seed?.settings?.language ?? "en",
        direction:
          (input.seed?.locale ?? input.seed?.settings?.language) === "fa"
            ? "rtl"
            : (input.seed?.settings?.direction ?? "ltr"),
        showBranding: input.seed?.settings?.showBranding ?? true,
        published: false,
        ...input.seed?.settings,
        vertical: strategy.vertical,
        recipeId: recipe.id,
      },
    },
  });

  return { strategy, config };
}

export { toBusinessProfile, resolveBusinessStrategy };
