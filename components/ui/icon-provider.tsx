"use client";

import { LucideProvider } from "lucide-react";

/**
 * One stroke language for every Lucide icon in the product.
 * Children stay server-rendered — this only supplies context defaults.
 */
export function IconProvider({ children }: { children: React.ReactNode }) {
  return (
    <LucideProvider size={18} strokeWidth={1.75} absoluteStrokeWidth>
      {children}
    </LucideProvider>
  );
}
