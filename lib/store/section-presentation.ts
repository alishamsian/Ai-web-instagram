/**
 * Apply Element Schema settings to section DOM (design-system safe).
 */

export function sectionPresentationProps(settings?: Record<string, unknown>) {
  if (!settings) return {};
  const align = typeof settings.alignment === "string" ? settings.alignment : undefined;
  const maxWidth =
    typeof settings.maxWidth === "string" ? settings.maxWidth : undefined;
  const gap = typeof settings.gap === "string" ? settings.gap : undefined;
  const radius =
    typeof settings.radius === "string" ? settings.radius : undefined;
  const aspect =
    typeof settings.aspectRatio === "string" ? settings.aspectRatio : undefined;
  const surface =
    typeof settings.surface === "string" ? settings.surface : undefined;
  const overlay = settings.overlay;

  const style: Record<string, string> = {};
  if (surface) style["--section-surface"] = surface;

  return {
    "data-align": align,
    "data-max-width": maxWidth,
    "data-gap": gap,
    "data-radius": radius,
    "data-aspect": aspect,
    "data-overlay": overlay === false ? "off" : overlay === true ? "on" : undefined,
    style: Object.keys(style).length ? style : undefined,
  };
}
