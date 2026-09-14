/**
 * Section variant API — single source of truth helpers on top of registry definitions.
 * Does not maintain a parallel variant list.
 */

import type { SectionConfig, WebsiteConfig } from "@/types/website";
import type {
  RegistrySectionType,
  SectionVariant,
} from "@/lib/store/registry/types";
import {
  getSectionVariants,
  getSections,
  hasSection,
} from "@/lib/store/registry/catalog";
import {
  VARIANT_SIGNATURE_KEYS,
  isVariantResponsiveStrategy,
  type VariantVisualSignature,
} from "@/lib/store/registry/variant-contract";
import {
  getVisualPreset,
  VISUAL_PRESETS,
} from "@/lib/design-system/visual-presets";

export type VariantResolveSource =
  | "exact"
  | "alias"
  | "default"
  | "fallback"
  | "none";

export type ResolvedSectionVariant = {
  sectionType: RegistrySectionType;
  variant: SectionVariant | null;
  id: string | null;
  source: VariantResolveSource;
  rendererKey: string | null;
};

export function getVariant(
  sectionType: RegistrySectionType,
  variantId: string,
): SectionVariant | undefined {
  return getSectionVariants(sectionType).find((v) => v.id === variantId);
}

export function getVariantsForSection(
  sectionType: RegistrySectionType,
): SectionVariant[] {
  return getSectionVariants(sectionType);
}

export function getDefaultVariant(
  sectionType: RegistrySectionType,
): SectionVariant | undefined {
  const variants = getSectionVariants(sectionType);
  if (variants.length === 0) return undefined;
  return variants.find((v) => v.default) ?? variants[0];
}

export function isVariantSupported(
  sectionType: RegistrySectionType,
  variantId: string,
): boolean {
  const variants = getSectionVariants(sectionType);
  return variants.some(
    (v) => v.id === variantId || v.aliases?.includes(variantId),
  );
}

/** Canonicalize raw/legacy/missing ids without mutating content. */
export function resolveSectionVariant(
  sectionType: RegistrySectionType,
  rawVariant?: string | null,
): ResolvedSectionVariant {
  const variants = getSectionVariants(sectionType);
  if (variants.length === 0) {
    return {
      sectionType,
      variant: null,
      id: null,
      source: "none",
      rendererKey: null,
    };
  }

  if (rawVariant) {
    const exact = variants.find((v) => v.id === rawVariant);
    if (exact) {
      return {
        sectionType,
        variant: exact,
        id: exact.id,
        source: "exact",
        rendererKey: getVariantRendererKey(sectionType, exact.id),
      };
    }
    const aliased = variants.find((v) => v.aliases?.includes(rawVariant));
    if (aliased) {
      return {
        sectionType,
        variant: aliased,
        id: aliased.id,
        source: "alias",
        rendererKey: getVariantRendererKey(sectionType, aliased.id),
      };
    }
  }

  const fallback = getDefaultVariant(sectionType)!;
  return {
    sectionType,
    variant: fallback,
    id: fallback.id,
    source: rawVariant ? "fallback" : "default",
    rendererKey: getVariantRendererKey(sectionType, fallback.id),
  };
}

export function getVariantRendererKey(
  sectionType: RegistrySectionType,
  variantId: string,
): string | null {
  const variant = getVariant(sectionType, variantId);
  if (!variant) return null;
  return variant.rendererKey ?? `${sectionType}.${variant.id}`;
}

export function getRecommendedVariants(
  sectionType: RegistrySectionType,
  visualPresetId: string | null | undefined,
): SectionVariant[] {
  if (!visualPresetId) return [];
  const preset = getVisualPreset(visualPresetId);
  if (!preset) return [];
  const recommendedId = preset.recommendedVariants?.[sectionType as keyof typeof preset.recommendedVariants];
  if (typeof recommendedId === "string") {
    const variant = getVariant(sectionType, recommendedId);
    return variant ? [variant] : [];
  }
  return getSectionVariants(sectionType).filter((v) =>
    v.recommendedForPresets?.includes(visualPresetId),
  );
}

export function areVariantsVisuallyDistinct(
  a: SectionVariant,
  b: SectionVariant,
): boolean {
  if (!a.signature || !b.signature) return true;
  let diffs = 0;
  for (const key of VARIANT_SIGNATURE_KEYS) {
    if (a.signature[key] !== b.signature[key]) diffs += 1;
  }
  return diffs >= 3;
}

export type VariantCatalogValidation = {
  ok: boolean;
  errors: string[];
};

/** Deterministic registry validation for tests / CI. */
export function validateSectionVariantCatalog(
  defs = getSections(),
): VariantCatalogValidation {
  const errors: string[] = [];
  const globalIds = new Set<string>();

  for (const def of defs) {
    const variants = def.variants ?? [];
    if (variants.length === 0) continue;

    const localIds = new Set<string>();
    let defaultCount = 0;

    for (const variant of variants) {
      if (!variant.id?.trim()) {
        errors.push(`missing-id:${def.type}`);
        continue;
      }
      if (!variant.label?.fa || !variant.label?.en) {
        errors.push(`missing-label:${def.type}.${variant.id}`);
      }
      if (localIds.has(variant.id)) {
        errors.push(`duplicate-local:${def.type}.${variant.id}`);
      }
      localIds.add(variant.id);

      const composite = `${def.type}.${variant.id}`;
      if (globalIds.has(composite)) {
        errors.push(`duplicate-composite:${composite}`);
      }
      globalIds.add(composite);

      if (variant.default) defaultCount += 1;

      if (variant.signature) {
        for (const key of VARIANT_SIGNATURE_KEYS) {
          if (!variant.signature[key]?.trim()) {
            errors.push(`invalid-signature:${composite}.${key}`);
          }
        }
      } else {
        errors.push(`missing-signature:${composite}`);
      }

      if (!variant.responsive) {
        errors.push(`missing-responsive:${composite}`);
      } else {
        for (const bp of ["mobile", "tablet", "desktop"] as const) {
          const value = variant.responsive[bp];
          if (!isVariantResponsiveStrategy(value)) {
            errors.push(`invalid-responsive:${composite}.${bp}:${value}`);
          }
        }
      }

      if (!variant.theme) {
        errors.push(`missing-theme:${composite}`);
      } else {
        if (!variant.theme.light) {
          errors.push(`theme-no-light:${composite}`);
        }
        if (!variant.theme.dark) {
          errors.push(`theme-no-dark:${composite}`);
        }
        if (!variant.theme.semanticTokens) {
          errors.push(`no-semantic-tokens:${composite}`);
        }
      }

      if (variant.recommendedForPresets) {
        for (const presetId of variant.recommendedForPresets) {
          if (!getVisualPreset(presetId)) {
            errors.push(`unknown-preset:${composite}:${presetId}`);
          }
        }
      }

      const key = getVariantRendererKey(def.type, variant.id);
      if (!key) errors.push(`missing-renderer-key:${composite}`);
    }

    if (defaultCount === 0) {
      errors.push(`missing-default:${def.type}`);
    }
    if (defaultCount > 1) {
      errors.push(`multiple-defaults:${def.type}`);
    }

    for (let i = 0; i < variants.length; i += 1) {
      for (let j = i + 1; j < variants.length; j += 1) {
        const a = variants[i]!;
        const b = variants[j]!;
        if (
          a.signature &&
          b.signature &&
          !areVariantsVisuallyDistinct(a, b)
        ) {
          errors.push(`near-duplicate:${def.type}.${a.id}:${b.id}`);
        }
      }
    }
  }

  for (const preset of VISUAL_PRESETS) {
    const recs = preset.recommendedVariants ?? {};
    for (const [sectionType, variantId] of Object.entries(recs)) {
      if (!hasSection(sectionType)) {
        errors.push(`preset-unknown-section:${preset.id}:${sectionType}`);
        continue;
      }
      if (!variantId || !isVariantSupported(sectionType, variantId)) {
        errors.push(
          `preset-unknown-variant:${preset.id}:${sectionType}.${variantId}`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors: errors.sort() };
}

/**
 * Idempotent section variant normalization.
 * Preserves content and section ids; only writes canonical variant when needed.
 */
export function normalizeSectionVariants(
  config: WebsiteConfig,
): WebsiteConfig {
  let changed = false;
  const sections = config.sections.map((section) => {
    if (!hasSection(section.type)) return section;
    const variants = getSectionVariants(section.type);
    if (variants.length === 0) return section;

    const resolved = resolveSectionVariant(section.type, section.variant);
    if (!resolved.id) return section;
    if (section.variant === resolved.id) return section;
    changed = true;
    return { ...section, variant: resolved.id };
  });

  let next: WebsiteConfig = changed ? { ...config, sections } : config;

  // Keep hero.style in sync with canonical hero variant when present.
  const heroSection = next.sections.find((s) => s.type === "hero");
  if (heroSection) {
    const resolved = resolveSectionVariant("hero", heroSection.variant);
    if (
      resolved.id &&
      (next.content.hero.style as string) !== resolved.id
    ) {
      next = {
        ...next,
        content: {
          ...next.content,
          hero: {
            ...next.content.hero,
            style: resolved.id as typeof next.content.hero.style,
          },
        },
        sections: next.sections.map((s) =>
          s.id === heroSection.id ? { ...s, variant: resolved.id! } : s,
        ),
      };
    }
  }

  return next;
}

export function normalizeSectionVariant(
  section: SectionConfig,
): SectionConfig {
  if (!hasSection(section.type)) return section;
  const variants = getSectionVariants(section.type);
  if (variants.length === 0) return section;
  const resolved = resolveSectionVariant(section.type, section.variant);
  if (!resolved.id || section.variant === resolved.id) return section;
  return { ...section, variant: resolved.id };
}

/** Signature helper for definitions — keeps enrichment terse. */
export function signature(
  partial: VariantVisualSignature,
): VariantVisualSignature {
  return partial;
}
