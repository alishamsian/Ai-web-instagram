import type { WebsiteSectionType } from "@/types/website";
import type {
  ElementFieldKind,
  ElementFieldSchema,
  ElementSchema,
} from "@/lib/store/registry/element-schema";

/** Registry is source of truth for section taxonomy (Editor library consumes this). */
export type SectionCategory =
  | "navigation"
  | "commerce"
  | "content"
  | "media"
  | "editorial"
  | "conversion"
  | "social"
  | "featured";

export type SectionCapabilities = {
  reorder: boolean;
  duplicate: boolean;
  hide: boolean;
  responsive: boolean;
  inlineEdit: boolean;
  dataSource: boolean;
  lock?: boolean;
  replace?: boolean;
  animation?: boolean;
};

/** @deprecated Prefer ElementFieldKind from element-schema */
export type SectionFieldKind = ElementFieldKind;

/** @deprecated Prefer ElementFieldSchema from element-schema */
export type SectionFieldSchema = ElementFieldSchema;

/** Section customization contract — owned by Registry definitions. */
export type SectionSchema = ElementSchema;

export type SectionVariant = {
  id: string;
  label: { fa: string; en: string };
  description?: { fa: string; en: string };
};

export type SectionPreview = {
  thumbnailTone?: "warm" | "cool" | "dark" | "neutral";
  aspect?: "16/9" | "4/3" | "1/1";
};

export type RegistrySectionType = WebsiteSectionType | (string & {});

/** Optional data needs — generation may omit the section when unmet. */
export type SectionDataRequirements = {
  products?: boolean;
  productImages?: boolean;
  gallery?: boolean;
  categories?: boolean;
  attributes?: string[];
  minProducts?: number;
};

export type SectionDefinition = {
  type: RegistrySectionType;
  category: SectionCategory;
  label: { fa: string; en: string };
  description: { fa: string; en: string };
  variants?: SectionVariant[];
  verticals?: string[] | ["*"];
  capabilities: SectionCapabilities;
  /** When set, generation omits the section if business data cannot satisfy it. */
  dataRequirements?: SectionDataRequirements;
  /** Element Schema — source of truth for customization metadata */
  schema?: SectionSchema;
  preview?: SectionPreview;
  chrome?: "announcement" | "header" | "footer" | false;
  library?: boolean;
};

export const DEFAULT_CAPABILITIES: SectionCapabilities = {
  reorder: true,
  duplicate: true,
  hide: true,
  responsive: true,
  inlineEdit: true,
  dataSource: false,
};
