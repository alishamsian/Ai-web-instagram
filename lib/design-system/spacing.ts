import { primitiveSpace } from "@/lib/design-system/primitives";

/**
 * Spacing roles — map intent → scale steps.
 * Prefer these over ad-hoc rem values in new Store work.
 */
export const spacing = {
  micro: primitiveSpace[1],
  tight: primitiveSpace[2],
  compact: primitiveSpace[3],
  component: primitiveSpace[4],
  comfortable: primitiveSpace[6],
  card: primitiveSpace[5],
  sectionGap: primitiveSpace[8],
  section: "var(--store-section-pad)",
  page: primitiveSpace[12],
  pageLarge: primitiveSpace[20],
} as const;

export const spaceScale = primitiveSpace;
