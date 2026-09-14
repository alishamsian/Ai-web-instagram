import type { LucideIcon } from "lucide-react";
import {
  HelpCircle,
  Image,
  LayoutTemplate,
  MessageSquareQuote,
  Package,
  PanelsTopLeft,
  Phone,
  ShoppingBag,
  Sparkles,
  SquareStack,
  Star,
  Type,
} from "lucide-react";
import type { WebsiteSectionType } from "@/types/website";

const SECTION_ICONS: Partial<Record<WebsiteSectionType | string, LucideIcon>> = {
  hero: Sparkles,
  products: Package,
  featured: Star,
  about: Type,
  gallery: Image,
  testimonials: MessageSquareQuote,
  faq: HelpCircle,
  contact: Phone,
  footer: PanelsTopLeft,
  cta: LayoutTemplate,
  services: SquareStack,
  shop: ShoppingBag,
  header: PanelsTopLeft,
  announcement: LayoutTemplate,
};

export function sectionTypeIcon(
  type: WebsiteSectionType | string,
): LucideIcon {
  return SECTION_ICONS[type] ?? LayoutTemplate;
}
