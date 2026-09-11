/**
 * Vitrin icon system — one library (Lucide), one stroke language.
 *
 * Rules:
 * - Import icons from here, not directly from `lucide-react`, so the product
 *   keeps a single semantic vocabulary for the Instagram → AI → Website story.
 * - Sizes come from `ICON_SIZE`; stroke comes from the `LucideProvider` in the
 *   root layout. Don't hand-tune either unless a composition needs it.
 * - Decorative icons must set `aria-hidden`; icon-only controls need a label.
 */
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Layout,
  Mail,
  Menu,
  Monitor,
  Package,
  Palette,
  PanelsTopLeft,
  ScanSearch,
  SearchCheck,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  Tags,
  TextCursorInput,
  Type,
  Utensils,
  X,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import type { ComponentType, ReactElement } from "react";

/** Unified icon component type — Lucide + custom glyphs. */
export type AppIcon = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

/* ─── Product story: Instagram → AI → Website ─────────────────────────── */

/**
 * Instagram mark. Lucide v1 dropped brand icons, and this glyph anchors the
 * product's core story, so it is drawn on Lucide's 24px grid to sit beside
 * the rest of the set without looking imported.
 */
export function InstagramGlyph({
  size = 20,
  strokeWidth = 1.75,
  className,
  ...props
}: Omit<LucideProps, "ref">): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M16.9 7.1h.01" />
    </svg>
  );
}

/** Stage 1 — the profile you already built. */
export const IconInstagram: AppIcon = InstagramGlyph;
/** Stage 2 — brand understanding. Sparkles is the single AI voice. */
export const IconAI = Sparkles as AppIcon;
/** Stage 2, working state — reading the profile. */
export const IconAnalyzing = ScanSearch as AppIcon;
/** Stage 3 — the generated website. */
export const IconWebsite = Monitor as AppIcon;

/* ─── Brand intelligence fields ───────────────────────────────────────── */

export const IconBusinessType = Store as AppIcon;
export const IconPersonality = Sparkles as AppIcon;
export const IconVisualStyle = Palette as AppIcon;
export const IconProducts = Package as AppIcon;
export const IconServices = BriefcaseBusiness as AppIcon;
export const IconThemes = Tags as AppIcon;
export const IconSections = Layout as AppIcon;

/* ─── Feature anchors ─────────────────────────────────────────────────── */

export const IconDomain = Globe as AppIcon;
export const IconCopy = Sparkles as AppIcon;
export const IconPhotos: AppIcon = InstagramGlyph;
export const IconMobile = Smartphone as AppIcon;
export const IconSEO = SearchCheck as AppIcon;
export const IconAnalytics = ChartNoAxesCombined as AppIcon;

/* ─── Customization controls ──────────────────────────────────────────── */

export const IconColors = Palette as AppIcon;
export const IconTypography = Type as AppIcon;
export const IconLayout = Layout as AppIcon;
export const IconPanels = PanelsTopLeft as AppIcon;
export const IconContent = TextCursorInput as AppIcon;

/* ─── Showcase categories ─────────────────────────────────────────────── */

export const IconFashion = Shirt as AppIcon;
export const IconRestaurant = Utensils as AppIcon;
export const IconBeauty = Sparkles as AppIcon;
export const IconServicesCategory = BriefcaseBusiness as AppIcon;
export const IconCreator: AppIcon = InstagramGlyph;

/* ─── Interface ───────────────────────────────────────────────────────── */

export {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Menu,
  Sparkles,
  X,
};

export type { LucideIcon, LucideProps };

/**
 * Sizes are fixed so icons stay optically consistent across the product.
 * `sm` small UI · `md` buttons and nav · `lg` feature blocks · `xl` product moments.
 */
export const ICON_SIZE = {
  sm: 15,
  md: 18,
  lg: 22,
  xl: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZE;

/**
 * Direction-aware forward arrow. RTL locales read right-to-left, so "next"
 * points the other way.
 */
export function forwardArrow(locale: string): AppIcon {
  return (locale === "fa" ? ArrowLeft : ArrowRight) as AppIcon;
}
