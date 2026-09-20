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
  "background-image",
  "background-size",
  "background-position",
  "border",
  "border-width",
  "border-style",
  "border-color",
  "border-radius",
  "opacity",
  "object-fit",
  "object-position",
  "z-index",
  "box-shadow",
  "grid-gap",
  "row-gap",
  "column-gap",
  "margin-inline",
  "margin-block",
  "padding-inline",
  "padding-block",
  "inset-inline",
  "inset-block",
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
  | "background"
  | "border"
  | "style"
  | "responsive"
  | "advanced";

export function relevantInspectorGroups(
  component: Component | null,
): InspectorGroup[] {
  if (!component || component.is("wrapper")) {
    return ["layout", "spacing", "background", "border"];
  }
  const tag = String(component.get("tagName") || "").toLowerCase();
  const type = String(component.get("type") || "");
  const attrs = component.getAttributes?.() ?? {};
  const groups: InspectorGroup[] = [
    "layout",
    "spacing",
    "background",
    "border",
    "responsive",
  ];
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
  // Keep legacy "style" alias for older tests / UI
  groups.push("style");
  return Array.from(new Set(groups));
}

/** Parse a CSS length into value + unit without inventing defaults. */
export function parseCssLength(raw: string): { value: string; unit: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: "", unit: "px" };
  if (trimmed === "auto") return { value: "auto", unit: "" };
  const match = trimmed.match(/^(-?[\d.]+)(px|%|rem|em|vh|vw)?$/i);
  if (!match) return { value: trimmed, unit: "" };
  return { value: match[1], unit: (match[2] || "px").toLowerCase() };
}

export function formatCssLength(value: string, unit: string): string {
  if (!value.trim()) return "";
  if (value.trim() === "auto") return "auto";
  if (!unit) return value.trim();
  return `${value.trim()}${unit}`;
}
