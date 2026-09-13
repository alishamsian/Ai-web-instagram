/**
 * Architecture-level Design System for Store / future Vertical Packs.
 *
 * Layers:
 * 1. primitives — raw values
 * 2. semantic — meaning-based roles
 * 3. component contracts — Registry-ready vocabulary
 *
 * Runtime Store still uses `--store-*` CSS vars via `storeCssVars`.
 * Theme mood (luxury/minimal/…) ≠ Vertical (beauty/coffee/…).
 */

export * from "@/lib/design-system/primitives";
export * from "@/lib/design-system/semantic";
export * from "@/lib/design-system/typography";
export * from "@/lib/design-system/spacing";
export * from "@/lib/design-system/layout";
export * from "@/lib/design-system/foundation";
export * from "@/lib/design-system/components";
export * from "@/lib/design-system/themes";
export { storeCssVars } from "@/lib/design-system/css-vars";
