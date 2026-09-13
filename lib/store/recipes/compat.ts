import type { TemplateDefinition } from "@/lib/website/templates";
import type { TemplateRecipe } from "@/lib/store/recipes/types";

/** Compatibility: legacy TemplateDefinition → TemplateRecipe shape. */
export function templateDefinitionToRecipe(
  template: TemplateDefinition,
  vertical = "generic",
): TemplateRecipe {
  return {
    id: `legacy-${template.id}`,
    vertical,
    label: template.name,
    description: template.description,
    baseTemplate: template.id,
    sections: template.sections.map((type) => ({ type })),
    recommended: template.id === "store",
  };
}
