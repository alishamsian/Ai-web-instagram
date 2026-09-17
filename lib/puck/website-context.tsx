"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { WebsiteConfig, SectionConfig } from "@/types/website";
import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import {
  getStoreCatalog,
  getStoreCategories,
} from "@/lib/store/catalog";

type PuckWebsiteContextValue = {
  config: WebsiteConfig;
  locale: "fa" | "en";
  /** Patch WebsiteConfig from schema-bound custom fields */
  onSchemaFieldChange?: (next: WebsiteConfig, label?: string) => void;
};

const PuckWebsiteContext = createContext<PuckWebsiteContextValue | null>(null);

export function PuckWebsiteProvider({
  config,
  locale,
  onSchemaFieldChange,
  children,
}: {
  config: WebsiteConfig;
  locale: "fa" | "en";
  onSchemaFieldChange?: (next: WebsiteConfig, label?: string) => void;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ config, locale, onSchemaFieldChange }),
    [config, locale, onSchemaFieldChange],
  );
  return (
    <PuckWebsiteContext.Provider value={value}>
      {children}
    </PuckWebsiteContext.Provider>
  );
}

export function usePuckWebsite(): PuckWebsiteContextValue {
  const ctx = useContext(PuckWebsiteContext);
  if (!ctx) {
    throw new Error("usePuckWebsite must be used within PuckWebsiteProvider");
  }
  return ctx;
}

export function usePuckWebsiteOptional(): PuckWebsiteContextValue | null {
  return useContext(PuckWebsiteContext);
}

/** Build StoreSectionContext for registry renderers from live Puck-synced config. */
export function buildStoreSectionContext(
  config: WebsiteConfig,
  section: SectionConfig,
): StoreSectionContext {
  const catalog = getStoreCatalog(config);
  const categories = getStoreCategories(config, catalog);
  return {
    config,
    section,
    mode: "editor",
    catalog,
    categories,
    shopProducts: catalog,
    onQuickView: () => {
      /* Phase 1: quick view deferred — no-op */
    },
  };
}
