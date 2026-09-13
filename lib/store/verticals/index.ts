export type {
  VerticalId,
  VerticalPack,
  BusinessProfile,
  BusinessStrategy,
  ProductAttributeDefinition,
  FilterDefinition,
  ContentSignalDefinition,
  SubVerticalDefinition,
  VerticalCapabilities,
  LocaleLabel,
} from "@/lib/store/verticals/types";
export { VERTICAL_CONFIDENCE_THRESHOLD } from "@/lib/store/verticals/types";

export {
  registerVertical,
  registerVerticals,
  getVertical,
  hasVertical,
  getVerticals,
  getVerticalIds,
  resetVerticalRegistryForTests,
} from "@/lib/store/verticals/registry";

export {
  resolveVerticalId,
  resolveVerticalPack,
  getSectionsForVertical,
  getRecommendedSectionsForVertical,
  isSectionSupportedByVertical,
  getProductAttributesForVertical,
  getFiltersForVertical,
  pickVerticalWithConfidence,
  isKnownVerticalId,
} from "@/lib/store/verticals/resolve";

export {
  resolveBusinessStrategy,
  toBusinessProfile,
} from "@/lib/store/verticals/strategy";

export { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

export { CORE_VERTICAL_PACKS } from "@/lib/store/verticals/packs";
