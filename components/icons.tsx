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
}: Omit<LucideProps, "ref">) {
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
export const IconInstagram = InstagramGlyph;
/** Stage 2 — brand understanding. Sparkles is the single AI voice. */
export const IconAI: LucideIcon = Sparkles;
/** Stage 2, working state — reading the profile. */
export const IconAnalyzing: LucideIcon = ScanSearch;
/** Stage 3 — the generated website. */
export const IconWebsite: LucideIcon = Monitor;

/* ─── Brand intelligence fields ───────────────────────────────────────── */

export const IconBusinessType: LucideIcon = Store;
export const IconPersonality: LucideIcon = Sparkles;
export const IconVisualStyle: LucideIcon = Palette;
export const IconProducts: LucideIcon = Package;
export const IconServices: LucideIcon = BriefcaseBusiness;
export const IconThemes: LucideIcon = Tags;
export const IconSections: LucideIcon = Layout;

/* ─── Feature anchors ─────────────────────────────────────────────────── */

export const IconDomain: LucideIcon = Globe;
export const IconCopy: LucideIcon = Sparkles;
export const IconPhotos = InstagramGlyph;
export const IconMobile: LucideIcon = Smartphone;
export const IconSEO: LucideIcon = SearchCheck;
export const IconAnalytics: LucideIcon = ChartNoAxesCombined;

/* ─── Customization controls ──────────────────────────────────────────── */

export const IconColors: LucideIcon = Palette;
export const IconTypography: LucideIcon = Type;
export const IconLayout: LucideIcon = Layout;
export const IconPanels: LucideIcon = PanelsTopLeft;
export const IconContent: LucideIcon = TextCursorInput;

/* ─── Showcase categories ─────────────────────────────────────────────── */

export const IconFashion: LucideIcon = Shirt;
export const IconRestaurant: LucideIcon = Utensils;
export const IconBeauty: LucideIcon = Sparkles;
export const IconServicesCategory: LucideIcon = BriefcaseBusiness;
export const IconCreator = InstagramGlyph;

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
export function forwardArrow(locale: string): LucideIcon {
  return locale === "fa" ? ArrowLeft : ArrowRight;
}
