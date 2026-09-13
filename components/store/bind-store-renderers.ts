"use client";

/**
 * Binds Store section adapters to the Registry.
 * This is the source of truth for type → renderer (not a central RENDERERS map).
 */
import { registerSectionRenderers } from "@/lib/store/registry/catalog";
import {
  renderAboutSection,
  renderBestsellersSection,
  renderCategoriesSection,
  renderContactSection,
  renderFaqSection,
  renderFeaturedProductsSection,
  renderFooterSection,
  renderGallerySection,
  renderHeroSection,
  renderProductSpotlightSection,
  renderProductsSection,
  renderPromoSection,
  renderUnsupportedStoreSection,
} from "@/components/store/section-adapters";

let bound = false;

export function ensureStoreSectionRenderersBound() {
  if (bound) return;
  bound = true;
  registerSectionRenderers({
    hero: renderHeroSection,
    categories: renderCategoriesSection,
    "featured-products": renderFeaturedProductsSection,
    "product-spotlight": renderProductSpotlightSection,
    products: renderProductsSection,
    bestsellers: renderBestsellersSection,
    about: renderAboutSection,
    gallery: renderGallerySection,
    "instagram-feed": renderGallerySection,
    "featured-posts": renderFeaturedProductsSection,
    faq: renderFaqSection,
    contact: renderContactSection,
    cta: renderPromoSection,
    promo: renderPromoSection,
    footer: renderFooterSection,
    testimonials: renderUnsupportedStoreSection,
    services: renderUnsupportedStoreSection,
    location: renderUnsupportedStoreSection,
    social: renderUnsupportedStoreSection,
  });
}

// Bind on module evaluation for Store client tree.
ensureStoreSectionRenderersBound();
