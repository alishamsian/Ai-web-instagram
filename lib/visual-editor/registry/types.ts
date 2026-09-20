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

export type VisualLibraryTab = "sections" | "components" | "layout" | "media";

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
  canNest?: boolean;
  variants?: VisualBlockVariant[];
  /** Build HTML markup with stable metadata attributes. */
  create: (ctx: VisualBlockCreateContext) => string;
};

export type VisualRegistrySnapshot = {
  blocks: VisualBlockDefinition[];
  byId: Map<string, VisualBlockDefinition>;
};
