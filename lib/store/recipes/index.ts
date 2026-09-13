export type {
  TemplateRecipe,
  TemplateSectionRecipe,
} from "@/lib/store/recipes/types";
export {
  registerRecipe,
  registerRecipes,
  getRecipe,
  hasRecipe,
  getRecipes,
  getRecipesForVertical,
  resetRecipeRegistryForTests,
} from "@/lib/store/recipes/registry";
export {
  buildWebsiteConfigFromRecipe,
  type BuildRecipeInput,
} from "@/lib/store/recipes/builder";
export { templateDefinitionToRecipe } from "@/lib/store/recipes/compat";
export { CORE_TEMPLATE_RECIPES } from "@/lib/store/recipes/catalog";
