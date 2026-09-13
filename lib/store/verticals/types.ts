/**
 * Vertical Engine contracts.
 * Vertical ≠ Template Recipe ≠ Theme/Mood ≠ Product attributes.
 */

import type { RegistrySectionType } from "@/lib/store/registry/types";
import type { StoreMood } from "@/lib/design-system/themes";

/** Canonical ecommerce vertical ids — extensible via registerVertical. */
export type VerticalId =
  | "beauty"
  | "fashion"
  | "jewelry"
  | "coffee"
  | "furniture"
  | "home"
  | "food"
  | "pet"
  | "fitness"
  | "generic";

export type LocaleLabel = { fa: string; en: string };

export type SubVerticalDefinition = {
  id: string;
  label: LocaleLabel;
};

export type ProductAttributeKind =
  | "text"
  | "textarea"
  | "boolean"
  | "select"
  | "multiselect"
  | "number";

export type ProductAttributeDefinition = {
  key: string;
  kind: ProductAttributeKind;
  label: LocaleLabel;
  description?: LocaleLabel;
  options?: { value: string; label: LocaleLabel }[];
  /** Sub-verticals this attribute applies to; omit = all. */
  subVerticals?: string[];
  filterable?: boolean;
};

export type FilterDefinition = {
  key: string;
  /** Attribute key or logical filter id */
  attribute: string;
  label: LocaleLabel;
  kind: "select" | "multiselect" | "range" | "boolean";
};

export type ContentSignalDefinition = {
  key: string;
  label: LocaleLabel;
  /** Soft hint for future AI content strategy — not runtime truth. */
  examples?: string[];
};

export type VerticalCapabilities = {
  subscriptions?: boolean;
  appointments?: boolean;
  lookbooks?: boolean;
  concerns?: boolean;
  rooms?: boolean;
  origins?: boolean;
};

export type VerticalPack = {
  id: VerticalId | (string & {});
  label: LocaleLabel;
  description: LocaleLabel;
  subVerticals?: SubVerticalDefinition[];
  /**
   * Section types this vertical cares about (core + planned).
   * Runtime library only surfaces types present in Section Registry.
   */
  sectionTypes?: RegistrySectionType[];
  /** Preferred composition order hints — must be subset of supported. */
  recommendedSections?: RegistrySectionType[];
  /** Recipe ids owned by this vertical */
  templates?: string[];
  productAttributes?: ProductAttributeDefinition[];
  contentSignals?: ContentSignalDefinition[];
  filters?: FilterDefinition[];
  capabilities?: VerticalCapabilities;
};

/**
 * Strategy hints consumed by Vertical Engine (not the full business input model).
 * Full intake lives in `lib/business` as BusinessProfile.
 */
export type BusinessStrategyInput = {
  vertical?: VerticalId | string | null;
  subVertical?: string | null;
  style?: string | null;
  /** 0–1 when known; absent/null = unknown (not fake confidence). */
  confidence?: number | null;
  recommendedTemplate?: string | null;
  recommendedModules?: string[];
  productAttributes?: string[];
  fallbackVertical?: VerticalId | string | null;
  mood?: StoreMood | string | null;
};

/** @deprecated Use BusinessStrategyInput — P4 BusinessProfile is lib/business */
export type BusinessProfile = BusinessStrategyInput;

export type BusinessStrategy = {
  vertical: VerticalId | string;
  fallbackVertical: VerticalId | string;
  template: string | null;
  mood: StoreMood | string | null;
  recommendedSections: RegistrySectionType[];
  productAttributes: ProductAttributeDefinition[];
  /** True when vertical was uncertain / unknown. */
  uncertain: boolean;
};

/** Confidence below this uses fallbackVertical / generic. */
export const VERTICAL_CONFIDENCE_THRESHOLD = 0.55;
