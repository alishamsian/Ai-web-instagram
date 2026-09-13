import {
  primitiveBreakpoint,
  primitiveLayout,
} from "@/lib/design-system/primitives";

export const breakpoints = primitiveBreakpoint;

/** Editor / preview viewport buckets — DS interpolates; no per-control flood. */
export const viewportBuckets = {
  mobile: breakpoints.md,
  tablet: breakpoints.tablet,
  desktop: breakpoints.desktop,
} as const;

export const layout = {
  pageContainer: primitiveLayout.pageMax,
  contentContainer: primitiveLayout.contentMax,
  wideContainer: primitiveLayout.wideMax,
  fullBleed: "100%",
  gridColumns: primitiveLayout.gridColumns,
  columnGap: "var(--store-space-6)",
  sectionPadding: "var(--store-section-pad)",
  wrapGutterMobile: "1.5rem",
  wrapGutterTablet: "3rem",
  wrapGutterDesktop: "4rem",
  headerHeight: primitiveLayout.headerHeight,
  touchMin: primitiveLayout.touchMin,
} as const;

export const mediaQuery = {
  tabletUp: `(min-width: ${breakpoints.tablet}px)`,
  laptopUp: `(min-width: ${breakpoints.laptop}px)`,
  desktopUp: `(min-width: ${breakpoints.desktop}px)`,
  wideUp: `(min-width: ${breakpoints.wide}px)`,
} as const;
