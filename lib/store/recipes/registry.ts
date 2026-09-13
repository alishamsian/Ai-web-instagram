import type { TemplateRecipe } from "@/lib/store/recipes/types";
import { CORE_TEMPLATE_RECIPES } from "@/lib/store/recipes/catalog";

const registry = new Map<string, TemplateRecipe>();

export function registerRecipe(
  recipe: TemplateRecipe,
): { ok: true } | { ok: false; reason: string } {
  const id = recipe.id?.trim();
  if (!id) return { ok: false, reason: "Recipe id is required" };
  if (registry.has(id)) {
    return { ok: false, reason: `Duplicate recipe: ${id}` };
  }
  if (!recipe.sections?.length) {
    return { ok: false, reason: `Recipe ${id} has no sections` };
  }
  registry.set(id, recipe);
  return { ok: true };
}

export function registerRecipes(recipes: TemplateRecipe[]) {
  for (const recipe of recipes) {
    const result = registerRecipe(recipe);
    if (!result.ok) console.error(`[recipes] ${result.reason}`);
  }
}

export function getRecipe(id: string | null | undefined): TemplateRecipe | undefined {
  if (!id) return undefined;
  return registry.get(id.trim());
}

export function hasRecipe(id: string | null | undefined): boolean {
  return Boolean(getRecipe(id));
}

export function getRecipes(): TemplateRecipe[] {
  return [...registry.values()];
}

export function getRecipesForVertical(
  vertical: string | null | undefined,
): TemplateRecipe[] {
  if (!vertical) return [];
  const v = vertical.trim().toLowerCase();
  return getRecipes().filter((r) => r.vertical.toLowerCase() === v);
}

export function resetRecipeRegistryForTests(recipes: TemplateRecipe[] = []) {
  registry.clear();
  registerRecipes(recipes);
}

registerRecipes(CORE_TEMPLATE_RECIPES);
