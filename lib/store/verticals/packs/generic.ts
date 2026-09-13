import type { VerticalPack } from "@/lib/store/verticals/types";
import { CORE_ECOMMERCE_SECTIONS } from "@/lib/store/verticals/core-sections";

/** Safe fallback when vertical is unknown / unsupported / null. */
export const genericPack: VerticalPack = {
  id: "generic",
  label: { fa: "عمومی", en: "Generic" },
  description: {
    fa: "فروشگاه عمومی بدون تخصص عمودی",
    en: "Generic ecommerce without a specialized vertical",
  },
  sectionTypes: [...CORE_ECOMMERCE_SECTIONS],
  recommendedSections: [
    "hero",
    "products",
    "featured-products",
    "about",
    "gallery",
    "faq",
    "contact",
    "footer",
  ],
  templates: ["generic-store"],
  productAttributes: [],
  filters: [],
  capabilities: {},
};
