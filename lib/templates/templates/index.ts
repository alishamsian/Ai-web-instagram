import { fashionLuxuryTemplate } from "@/lib/templates/templates/fashion-luxury";
import { restaurantEditorialTemplate } from "@/lib/templates/templates/restaurant-editorial";
import { saasModernTemplate } from "@/lib/templates/templates/saas-modern";
import { beautyPremiumTemplate } from "@/lib/templates/templates/beauty-premium";
import { agencyCreativeTemplate } from "@/lib/templates/templates/agency-creative";
import { portfolioCreatorTemplate } from "@/lib/templates/templates/portfolio-creator";
import { realEstateTemplate } from "@/lib/templates/templates/real-estate";
import { coffeeModernTemplate } from "@/lib/templates/templates/coffee-modern";
import type { WebsiteTemplate } from "@/lib/templates/types";

/** All product-owned full-site templates (Phase 3.0 catalog). */
export const ALL_WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  fashionLuxuryTemplate,
  restaurantEditorialTemplate,
  saasModernTemplate,
  beautyPremiumTemplate,
  agencyCreativeTemplate,
  portfolioCreatorTemplate,
  realEstateTemplate,
  coffeeModernTemplate,
];
