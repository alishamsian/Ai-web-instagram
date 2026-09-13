import type { RegistrySectionType } from "@/lib/store/registry/types";
import type { StoreMood } from "@/lib/design-system/themes";
import type { TemplateType } from "@/types/website";

export type TemplateSectionRecipe = {
  type: RegistrySectionType;
  variant?: string;
  visible?: boolean;
  settings?: Record<string, unknown>;
  /** Stable id suffix — builder prefixes with recipe id */
  id?: string;
};

/**
 * Composition recipe — not a renderer, not a theme.
 * Resolves through Section Registry + produces WebsiteConfig sections.
 */
export type TemplateRecipe = {
  id: string;
  vertical: string;
  label: { fa: string; en: string };
  description?: { fa: string; en: string };
  /** Suggested mood only — theme system resolves independently */
  mood?: StoreMood | string;
  /** Legacy TemplateType for generator compatibility */
  baseTemplate?: TemplateType;
  sections: TemplateSectionRecipe[];
  recommended?: boolean;
};
