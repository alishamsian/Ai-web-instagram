import type { ReactNode } from "react";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { WebsiteRenderMode } from "@/components/editor/EditContext";
import type { StoreCatalogProduct, StoreCategory } from "@/lib/store/theme";

/**
 * Typed render contract for Store sections.
 * Registry owns the renderer; adapters wrap existing Store components.
 */
export type StoreSectionContext = {
  config: WebsiteConfig;
  section: SectionConfig;
  mode: WebsiteRenderMode;
  catalog: StoreCatalogProduct[];
  categories: StoreCategory[];
  /** Products resolved for the main shop section / shared data sources */
  shopProducts: StoreCatalogProduct[];
  onQuickView: (product: StoreCatalogProduct) => void;
};

export type StoreSectionRenderer = (
  ctx: StoreSectionContext,
) => ReactNode;
