import type {
  RegistrySectionType,
  SectionCategory,
  SectionDefinition,
  SectionVariant,
} from "@/lib/store/registry/types";
import type { StoreSectionRenderer } from "@/lib/store/registry/render-contract";
import { CORE_SECTION_DEFINITIONS } from "@/lib/store/registry/definitions";
import { VERTICAL_SECTION_DEFINITIONS } from "@/lib/store/registry/vertical-definitions";
import { validateSectionDefinition } from "@/lib/store/registry/element-schema";

const registry = new Map<string, SectionDefinition>();
const renderers = new Map<string, StoreSectionRenderer>();
/** Optional per-variant renderers keyed by rendererKey (`type.id` by default). */
const variantRenderers = new Map<string, StoreSectionRenderer>();

function seed(defs: SectionDefinition[]) {
  for (const def of defs) {
    const result = validateSectionDefinition(def);
    if (!result.ok) {
      console.error(
        `[registry] rejecting invalid SectionDefinition "${def.type}"`,
        result.issues,
      );
      continue;
    }
    registry.set(def.type, def);
  }
}

seed(CORE_SECTION_DEFINITIONS);
seed(VERTICAL_SECTION_DEFINITIONS);

/** Register or override section definitions (vertical packs later). */
export function registerSections(defs: SectionDefinition[]) {
  seed(defs);
}

/**
 * Bind a renderer to a section type.
 * Call from client bindings so Registry owns type → render resolution.
 */
export function registerSectionRenderer(
  type: RegistrySectionType,
  renderer: StoreSectionRenderer,
) {
  renderers.set(type, renderer);
}

export function registerSectionRenderers(
  map: Partial<Record<string, StoreSectionRenderer>>,
) {
  for (const [type, renderer] of Object.entries(map)) {
    if (renderer) renderers.set(type, renderer);
  }
}

/**
 * Bind a renderer to a variant rendererKey without loading every variant eagerly.
 * Unregistered keys fall back to the section-type renderer.
 */
export function registerVariantRenderer(
  rendererKey: string,
  renderer: StoreSectionRenderer,
) {
  variantRenderers.set(rendererKey, renderer);
}

export function getVariantRenderer(
  rendererKey: string,
): StoreSectionRenderer | undefined {
  return variantRenderers.get(rendererKey);
}

export function getSectionRenderer(
  type: RegistrySectionType,
): StoreSectionRenderer | undefined {
  return renderers.get(type);
}

/**
 * Resolve renderer for a section + optional variant.
 * Prefer variant-specific binding, then section-type fallback.
 * Never throws for unknown variants.
 */
export function resolveSectionRenderer(
  type: RegistrySectionType,
  variantId?: string | null,
): StoreSectionRenderer | undefined {
  if (variantId) {
    const variants = getSectionVariants(type);
    const exact = variants.find((v) => v.id === variantId);
    const aliased = exact
      ? exact
      : variants.find((v) => v.aliases?.includes(variantId));
    const canonical = aliased ?? variants.find((v) => v.default) ?? variants[0];
    if (canonical) {
      const key = canonical.rendererKey ?? `${type}.${canonical.id}`;
      const variantRenderer = variantRenderers.get(key);
      if (variantRenderer) return variantRenderer;
    }
  }
  return renderers.get(type);
}

export function hasSectionRenderer(type: RegistrySectionType): boolean {
  return renderers.has(type);
}

export function getSectionDefinition(
  type: RegistrySectionType,
): SectionDefinition | undefined {
  return registry.get(type);
}

export function hasSection(type: RegistrySectionType): boolean {
  return registry.has(type);
}

export function getSections(): SectionDefinition[] {
  return [...registry.values()];
}

export function getSectionsByCategory(
  category: SectionCategory,
): SectionDefinition[] {
  return getSections().filter((def) => def.category === category);
}

export function getSectionsForVertical(vertical: string): SectionDefinition[] {
  const v = vertical.toLowerCase();
  return getSections().filter((def) => {
    if (!def.verticals || def.verticals.length === 0) return true;
    if (def.verticals.includes("*")) return true;
    return def.verticals.some((item) => item.toLowerCase() === v);
  });
}

export function getSectionVariants(
  type: RegistrySectionType,
): SectionVariant[] {
  return getSectionDefinition(type)?.variants ?? [];
}

export function getLibrarySections(): SectionDefinition[] {
  return getSections().filter((def) => def.library !== false);
}

/** Source of truth for section customization contract. */
export function getSectionSchema(type: RegistrySectionType) {
  return getSectionDefinition(type)?.schema;
}

export const ALL_SECTION_DEFINITIONS = [
  ...CORE_SECTION_DEFINITIONS,
  ...VERTICAL_SECTION_DEFINITIONS,
];

export function resetRegistryForTests(
  defs: SectionDefinition[] = ALL_SECTION_DEFINITIONS,
) {
  registry.clear();
  renderers.clear();
  variantRenderers.clear();
  seed(defs);
}
