/**
 * Product-owned visual block registry types.
 * GrapesJS BlockManager consumes this registry — it is not the business SoT.
 */

import type { WebsiteSectionType } from "@/types/website";

export type VisualBlockCategory =
  | "layout"
  | "content"
  | "media"
  | "commerce"
  | "social"
  | "forms"
  | "navigation"
  | "utility"
  | "sections";

export type VisualLibraryTab =
  | "sections"
  | "components"
  | "layout"
  | "media"
  | "forms";

export type VisualBlockVariant = {
  id: string;
  label: { fa: string; en: string };
  description?: { fa: string; en: string };
  /** Default when inserting this block without an explicit variant. */
  default?: boolean;
};

export type VisualBlockCreateContext = {
  locale: "fa" | "en";
  pageId: string;
  /** Stable section id when creating a canonical/page section. */
  sectionId: string;
  variantId?: string;
  /** Brand color hints for token-aware defaults. */
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
    muted?: string;
  };
};

/**
 * Nesting / interaction metadata for the production visual builder.
 * Prefer these over hardcoded leaf lists in DnD code.
 */
export type VisualBlockNesting = {
  /** Explicit allow-list of parent block ids. Empty = use defaults. */
  allowedParents?: string[];
  /** Explicit allow-list of child block ids. Empty = any nestable child. */
  allowedChildren?: string[];
  /** Deny-list of child block ids (wins over allowedChildren when both set). */
  deniedChildren?: string[];
  /** Max nesting depth under this block (undefined = unlimited within safety cap). */
  maxDepth?: number;
};

export type VisualBlockDefinition = {
  id: string;
  label: { fa: string; en: string };
  category: VisualBlockCategory;
  /** Library tab placement */
  libraryTab: VisualLibraryTab;
  description?: { fa: string; en: string };
  keywords?: string[];
  /** Lucide-style icon key for UI */
  icon?: string;
  /** Maps to WebsiteSectionType when this block is a canonical section. */
  sectionType?: WebsiteSectionType;
  /** When true, insert also registers SectionConfig on home sync. */
  canonical?: boolean;
  /** Whether this block may contain children (layout containers). */
  canNest?: boolean;
  nesting?: VisualBlockNesting;
  /** Defaults true. */
  draggable?: boolean;
  /** Defaults true. */
  duplicatable?: boolean;
  /** Defaults false — leaf content is not free-form resizable. */
  resizable?: boolean;
  variants?: VisualBlockVariant[];
  /** Build HTML markup with stable metadata attributes. */
  create: (ctx: VisualBlockCreateContext) => string;
};

export type VisualRegistrySnapshot = {
  blocks: VisualBlockDefinition[];
  byId: Map<string, VisualBlockDefinition>;
};
