"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SectionConfig } from "@/types/website";

const SectionRenderContext = createContext<SectionConfig | null>(null);

export function SectionRenderProvider({
  section,
  children,
}: {
  section: SectionConfig;
  children: ReactNode;
}) {
  return (
    <SectionRenderContext.Provider value={section}>
      {children}
    </SectionRenderContext.Provider>
  );
}

/** Current section config while rendering inside WebsiteRenderer SectionList. */
export function useSectionRender(): SectionConfig | null {
  return useContext(SectionRenderContext);
}

export function useSectionVariant(fallback?: string): string | undefined {
  return useContext(SectionRenderContext)?.variant ?? fallback;
}

export function useSectionSettings(): Record<string, unknown> | undefined {
  return useContext(SectionRenderContext)?.settings;
}
