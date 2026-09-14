"use client";

/**
 * Binds Store section adapters to the Registry.
 * This is the source of truth for type → renderer (not a central RENDERERS map).
 */
import { registerSectionRenderers, hasSectionRenderer } from "@/lib/store/registry/catalog";
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
  renderTrustSection,
  renderUnsupportedStoreSection,
} from "@/components/store/section-adapters";
import { ensureVariantRenderersBound } from "@/components/store/variants/bind-variant-renderers";
import {
  renderBrewGuideSection,
  renderCoffeeFinderSection,
  renderCollectionStorySection,
  renderDesignerSpotlightSection,
  renderDimensionsSection,
  renderFitGuideSection,
  renderFlavorProfileSection,
  renderIngredientStorySection,
  renderJewelryCareSection,
  renderLookbookSection,
  renderMaterialsSection,
  renderOriginExplorerSection,
  renderProductFinderSection,
  renderProjectsSection,
  renderRoasterStorySection,
  renderRoomInspirationSection,
  renderRoutineSection,
  renderShopByConcernSection,
  renderShopByDesignerSection,
  renderShopByMaterialSection,
  renderShopByOccasionSection,
  renderShopByRoomSection,
  renderShopBySkinTypeSection,
  renderShopTheLookSection,
  renderStackBuilderSection,
  renderStyleGuideSection,
  renderSubscriptionSection,
} from "@/components/store/vertical-section-adapters";

let bound = false;

export function ensureStoreSectionRenderersBound() {
  // Re-bind when registry renderers were cleared (tests) or first load.
  if (bound && hasSectionRenderer("hero")) return;
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
    trust: renderTrustSection,
    footer: renderFooterSection,
    testimonials: renderTrustSection,
    services: renderUnsupportedStoreSection,
    location: renderUnsupportedStoreSection,
    social: renderUnsupportedStoreSection,

    // Beauty
    "shop-by-concern": renderShopByConcernSection,
    "shop-by-skin-type": renderShopBySkinTypeSection,
    routine: renderRoutineSection,
    "ingredient-story": renderIngredientStorySection,
    "product-finder": renderProductFinderSection,

    // Fashion
    lookbook: renderLookbookSection,
    "shop-the-look": renderShopTheLookSection,
    "collection-story": renderCollectionStorySection,
    "style-guide": renderStyleGuideSection,
    "designer-spotlight": renderDesignerSpotlightSection,
    "fit-guide": renderFitGuideSection,

    // Jewelry
    "shop-by-material": renderShopByMaterialSection,
    "shop-by-occasion": renderShopByOccasionSection,
    "stack-builder": renderStackBuilderSection,
    "jewelry-care": renderJewelryCareSection,

    // Coffee
    "origin-explorer": renderOriginExplorerSection,
    "flavor-profile": renderFlavorProfileSection,
    "brew-guide": renderBrewGuideSection,
    "roaster-story": renderRoasterStorySection,
    subscription: renderSubscriptionSection,
    "coffee-finder": renderCoffeeFinderSection,

    // Furniture
    "shop-by-room": renderShopByRoomSection,
    "shop-by-designer": renderShopByDesignerSection,
    materials: renderMaterialsSection,
    dimensions: renderDimensionsSection,
    projects: renderProjectsSection,
    "room-inspiration": renderRoomInspirationSection,
  });
  ensureVariantRenderersBound();
}

// Bind on module evaluation for Store client tree.
ensureStoreSectionRenderersBound();
