/**
 * Responsive style inheritance for the Visual Editor.
 *
 * Product model (mirrors classic resolveResponsiveValue):
 *   Desktop base → Tablet override → Mobile override
 * Unset values inherit from the larger breakpoint.
 *
 * Overrides are stored as data-rstyle-{device}-{cssProp} attributes so they
 * survive project serialization into WebsiteConfig.visualEditor.project.
 * GrapesJS media-scoped styles are applied for the active device.
 */

import type { Component, Editor } from "grapesjs";
import type { VisualDeviceId } from "@/lib/visual-editor/devices";
import { getComponentStyle, setComponentStyle } from "@/lib/visual-editor/inspector-model";

const ATTR_PREFIX = "data-rstyle-";

function attrKey(device: VisualDeviceId, cssProp: string): string {
  return `${ATTR_PREFIX}${device}-${cssProp}`;
}

export type ResolvedStyleProp = {
  value: string;
  source: VisualDeviceId | "none";
  inherited: boolean;
};

const DEVICE_CHAIN: Record<VisualDeviceId, VisualDeviceId[]> = {
  desktop: ["desktop"],
  tablet: ["tablet", "desktop"],
  mobile: ["mobile", "tablet", "desktop"],
};

/** Read explicit override for a device (empty string if unset). */
export function getStyleOverride(
  component: Component,
  cssProp: string,
  device: VisualDeviceId,
): string {
  const attrs = component.getAttributes?.() ?? {};
  const raw = attrs[attrKey(device, cssProp)];
  return typeof raw === "string" ? raw : "";
}

/**
 * Effective value for `device` with inheritance.
 * Falls back to current GrapesJS computed style when no data-rstyle attrs exist
 * (legacy projects edited only via GrapesJS media rules).
 */
export function resolveStyleProp(
  component: Component,
  cssProp: string,
  device: VisualDeviceId,
): ResolvedStyleProp {
  for (const d of DEVICE_CHAIN[device]) {
    const override = getStyleOverride(component, cssProp, d);
    if (override) {
      return {
        value: override,
        source: d,
        inherited: d !== device,
      };
    }
  }
  const live = getComponentStyle(component, cssProp);
  if (live) {
    return { value: live, source: "desktop", inherited: device !== "desktop" };
  }
  return { value: "", source: "none", inherited: false };
}

export function setStyleOverride(
  editor: Editor,
  component: Component,
  cssProp: string,
  device: VisualDeviceId,
  value: string,
): boolean {
  const next = value.trim();
  const key = attrKey(device, cssProp);
  if (!next) {
    component.removeAttributes(key);
  } else {
    component.addAttributes({ [key]: next });
  }

  const deviceMap: Record<VisualDeviceId, string> = {
    desktop: "Desktop",
    tablet: "Tablet",
    mobile: "Mobile",
  };
  const prev = editor.getDevice();
  try {
    editor.setDevice(deviceMap[device]);
    const effective = resolveStyleProp(component, cssProp, device);
    return setComponentStyle(component, cssProp, effective.value);
  } finally {
    if (prev) editor.setDevice(prev);
  }
}

export function clearStyleOverride(
  editor: Editor,
  component: Component,
  cssProp: string,
  device: VisualDeviceId,
): boolean {
  return setStyleOverride(editor, component, cssProp, device, "");
}

/** Props commonly overridden per breakpoint in the inspector. */
export const RESPONSIVE_STYLE_PROPS = [
  "font-size",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-bottom",
  "width",
  "max-width",
  "gap",
  "grid-template-columns",
  "flex-direction",
  "justify-content",
  "align-items",
  "text-align",
] as const;

export type ResponsiveStyleProp = (typeof RESPONSIVE_STYLE_PROPS)[number];
