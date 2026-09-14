"use client";

import type { StoreSectionContext } from "@/lib/store/registry/render-contract";
import {
  getSectionRenderer,
  resolveSectionRenderer,
} from "@/lib/store/registry/catalog";
import { ensureStoreSectionRenderersBound } from "@/components/store/bind-store-renderers";
import { ensureVariantRenderersBound } from "@/components/store/variants/bind-variant-renderers";
import { renderUnsupportedStoreSection } from "@/components/store/section-adapters";

/**
 * Resolve a section body through the Registry renderer map.
 * Prefers variant-specific renderers; falls back to section-type renderer.
 */
export function renderRegisteredStoreSection(ctx: StoreSectionContext) {
  ensureStoreSectionRenderersBound();
  ensureVariantRenderersBound();
  const renderer =
    resolveSectionRenderer(ctx.section.type, ctx.section.variant) ??
    getSectionRenderer(ctx.section.type);
  if (!renderer) return renderUnsupportedStoreSection(ctx);
  return renderer(ctx);
}
