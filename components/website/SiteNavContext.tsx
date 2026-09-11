"use client";

import { createContext, useContext } from "react";

export type SiteNavContextValue = {
  basePath: string;
  onProductNavigate?: (slug: string) => void;
  onHomeNavigate?: () => void;
};

const SiteNavContext = createContext<SiteNavContextValue>({ basePath: "" });

export function SiteNavProvider({
  value,
  children,
}: {
  value: SiteNavContextValue;
  children: React.ReactNode;
}) {
  return <SiteNavContext.Provider value={value}>{children}</SiteNavContext.Provider>;
}

export function useSiteNav() {
  return useContext(SiteNavContext);
}
