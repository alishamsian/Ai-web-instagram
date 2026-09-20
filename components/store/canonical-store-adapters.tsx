"use client";

import {
  PricingSiteSection,
  MenuSiteSection,
  LocationSiteSection,
  PortfolioSiteSection,
  PropertiesSiteSection,
} from "@/components/website/canonical-sections";
import type { StoreSectionContext } from "@/lib/store/registry/render-contract";

export function renderPricingSection(ctx: StoreSectionContext) {
  return <PricingSiteSection config={ctx.config} />;
}
export function renderMenuSection(ctx: StoreSectionContext) {
  return <MenuSiteSection config={ctx.config} />;
}
export function renderLocationCanonicalSection(ctx: StoreSectionContext) {
  return <LocationSiteSection config={ctx.config} />;
}
export function renderPortfolioCanonicalSection(ctx: StoreSectionContext) {
  return <PortfolioSiteSection config={ctx.config} />;
}
export function renderPropertiesSection(ctx: StoreSectionContext) {
  return <PropertiesSiteSection config={ctx.config} />;
}
