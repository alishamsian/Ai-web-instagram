/**
 * Style helpers for the product-owned inspector (safe CSS properties only).
 */

import type { Component } from "grapesjs";

const SAFE_PROPS = new Set([
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "display",
  "flex-direction",
  "justify-content",
  "align-items",
  "flex-wrap",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "color",
  "background-color",
  "border-radius",
  "opacity",
  "object-fit",
]);

export function getComponentStyle(
  component: Component,
  prop: string,
): string {
  try {
    return String(component.getStyle()?.[prop] ?? "");
  } catch {
    return "";
  }
}

export function setComponentStyle(
  component: Component,
  prop: string,
  value: string,
): boolean {
  if (!SAFE_PROPS.has(prop)) return false;
  const next = value.trim();
  try {
    if (!next) {
      component.removeStyle(prop);
    } else {
      component.addStyle({ [prop]: next });
    }
    return true;
  } catch {
    return false;
  }
}

export function setComponentStyles(
  component: Component,
  styles: Record<string, string>,
): void {
  for (const [prop, value] of Object.entries(styles)) {
    setComponentStyle(component, prop, value);
  }
}

export function getSelectedText(component: Component): string {
  try {
    return component.get("content") || component.view?.el?.textContent || "";
  } catch {
    return "";
  }
}

export function setSelectedText(component: Component, text: string): void {
  try {
    if (component.is("text") || component.get("type") === "text") {
      component.components(text);
      return;
    }
    const tag = String(component.get("tagName") || "").toLowerCase();
    if (["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button"].includes(tag)) {
      component.components(text);
    }
  } catch {
    // ignore
  }
}

export type InspectorGroup =
  | "content"
  | "layout"
  | "spacing"
  | "typography"
  | "style"
  | "responsive"
  | "advanced";

export function relevantInspectorGroups(
  component: Component | null,
): InspectorGroup[] {
  if (!component || component.is("wrapper")) {
    return ["layout", "spacing", "style"];
  }
  const tag = String(component.get("tagName") || "").toLowerCase();
  const type = String(component.get("type") || "");
  const attrs = component.getAttributes?.() ?? {};
  const groups: InspectorGroup[] = ["layout", "spacing", "style", "responsive"];
  if (
    ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button"].includes(tag) ||
    type === "text" ||
    attrs["data-content-path"]
  ) {
    groups.unshift("content");
    groups.push("typography");
  }
  if (tag === "img" || type === "image") {
    groups.unshift("content");
  }
  if (attrs["data-section-id"] || attrs["data-section-variant"]) {
    groups.push("advanced");
  }
  return Array.from(new Set(groups));
}
