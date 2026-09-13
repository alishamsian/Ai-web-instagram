"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import { getSectionRenderer } from "@/lib/store/registry/catalog";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { renderUnsupportedStoreSection } from "@/components/store/section-adapters";

/**
 * Resolve a section body through the Registry renderer map.
 * Adapters live in section-adapters; bindings in bind-store-renderers.
 */
export function renderRegisteredStoreSection(ctx: StoreSectionContext) {
  ensureStoreSectionRenderersBound();
  const renderer = getSectionRenderer(ctx.section.type);
  if (!renderer) return renderUnsupportedStoreSection(ctx);
  return renderer(ctx);
}
