/**
 * Responsive visibility helpers — uses GrapesJS device media rules.
 */

import type { Component, Editor } from "grapesjs";
import type { VisualDeviceId } from "@/lib/visual-editor/devices";

export type DeviceVisibility = {
  desktop: boolean;
  tablet: boolean;
  mobile: boolean;
};

const HIDDEN = "none";

/**
 * Read approximate visibility for the active device from component style.
 * Device-specific overrides live in GrapesJS style media rules when set via setStyle.
 */
export function getDeviceVisibility(
  component: Component,
  device: VisualDeviceId,
): boolean {
  try {
    const style = component.getStyle() as Record<string, string>;
    if (style.display === HIDDEN) return false;
    // GrapesJS may store device rules separately; fall back to data attrs
    const attrs = component.getAttributes?.() ?? {};
    const key = `data-visible-${device}`;
    if (attrs[key] === "false") return false;
    if (attrs[key] === "true") return true;
    return attrs["data-visible"] !== "false";
  } catch {
    return true;
  }
}

export function setDeviceVisibility(
  editor: Editor,
  component: Component,
  device: VisualDeviceId,
  visible: boolean,
): void {
  const attrs = component.getAttributes?.() ?? {};
  component.addAttributes({
    ...attrs,
    [`data-visible-${device}`]: visible ? "true" : "false",
  });

  // Apply via current device so GrapesJS records a media-scoped rule
  const prev = editor.getDevice();
  const deviceMap: Record<VisualDeviceId, string> = {
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
  };
  try {
    editor.setDevice(deviceMap[device]);
    if (visible) {
      component.removeStyle("display");
      // If desktop visible, clear blank display
      const style = component.getStyle() as Record<string, string>;
      if (style.display === HIDDEN && device === "desktop") {
        component.addStyle({ display: "" });
        component.removeStyle("display");
      }
    } else {
      component.addStyle({ display: HIDDEN });
    }
  } finally {
    if (prev) editor.setDevice(prev);
  }
}

export function readVisibilityMap(component: Component): DeviceVisibility {
  const attrs = component.getAttributes?.() ?? {};
  const fallback = attrs["data-visible"] !== "false";
  return {
    desktop:
      attrs["data-visible-desktop"] != null
        ? attrs["data-visible-desktop"] !== "false"
        : fallback,
    tablet:
      attrs["data-visible-tablet"] != null
        ? attrs["data-visible-tablet"] !== "false"
        : fallback,
    mobile:
      attrs["data-visible-mobile"] != null
        ? attrs["data-visible-mobile"] !== "false"
        : fallback,
  };
}
