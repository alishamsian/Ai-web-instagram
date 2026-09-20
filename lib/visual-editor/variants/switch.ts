/**
 * Real section variant switching — rebuilds structure while preserving identity
 * and compatible editable content.
 */

import type { Component, Editor } from "grapesjs";
import {
  createBlockHtml,
  getVisualBlock,
  resolveVariantId,
} from "@/lib/visual-editor/registry";
import { normalizeBlockId } from "@/lib/visual-editor/dnd/nesting";

export type PreservedField = {
  contentPath?: string;
  role?: string;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
};

export type VariantSwitchResult =
  | {
      ok: true;
      sectionId: string;
      pageId: string;
      fromVariant: string;
      toVariant: string;
      preserved: PreservedField[];
    }
  | { ok: false; error: string };

function walk(cmp: Component, visit: (c: Component) => void) {
  visit(cmp);
  const kids = cmp.components?.();
  const list = Array.isArray(kids)
    ? kids
    : ((kids as { models?: Component[] } | undefined)?.models ?? []);
  for (const child of list) {
    if (child) walk(child, visit);
  }
}

/** Extract editable fields keyed by content-path and component role. */
export function extractPreservedFields(section: Component): PreservedField[] {
  const out: PreservedField[] = [];
  walk(section, (cmp) => {
    const attrs = cmp.getAttributes?.() ?? {};
    const tag = String(cmp.get("tagName") || "").toLowerCase();
    const contentPath = attrs["data-content-path"];
    const componentId = attrs["data-component-id"];
    const role = componentId
      ? String(componentId).split("__").slice(1).join("__") || undefined
      : attrs["data-component-type"];

    let text: string | undefined;
    try {
      if (
        ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button"].includes(
          tag,
        )
      ) {
        text =
          cmp.get("content") ||
          cmp.view?.el?.textContent ||
          undefined;
        if (typeof text === "string") text = text.trim();
      }
    } catch {
      // ignore
    }

    if (
      contentPath ||
      role ||
      attrs.href ||
      attrs.src ||
      tag === "img"
    ) {
      out.push({
        contentPath,
        role,
        text: text || undefined,
        href: attrs.href,
        src: attrs.src,
        alt: attrs.alt,
      });
    }
  });
  return out;
}

/** Pure merge used by tests and apply step. */
export function mergePreservedIntoHtml(
  html: string,
  preserved: PreservedField[],
): string {
  let next = html;
  for (const field of preserved) {
    if (field.contentPath && field.text != null) {
      // Replace text content of the element that carries this content-path.
      const pathEsc = field.contentPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(data-content-path="${pathEsc}"[^>]*>)([\\s\\S]*?)(</)`,
        "i",
      );
      if (re.test(next)) {
        next = next.replace(re, `$1${escapeXml(field.text)}$3`);
      }
    }
    if (field.contentPath && field.href) {
      const pathEsc = field.contentPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(data-content-path="${pathEsc}"[^>]*?)href="[^"]*"`,
        "i",
      );
      if (re.test(next)) {
        next = next.replace(re, `$1href="${escapeXml(field.href)}"`);
      }
    }
    if (field.role && field.src) {
      // media slots / images
      const roleEsc = field.role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(data-component-id="[^"]*__${roleEsc}"[^>]*?)src="[^"]*"`,
        "i",
      );
      if (re.test(next)) {
        next = next.replace(re, `$1src="${escapeXml(field.src)}"`);
      }
    }
    if (field.role && field.alt != null) {
      const roleEsc = field.role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(data-component-id="[^"]*__${roleEsc}"[^>]*?)alt="[^"]*"`,
        "i",
      );
      if (re.test(next)) {
        next = next.replace(re, `$1alt="${escapeXml(field.alt)}"`);
      }
    }
  }
  return next;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findSectionRoot(start: Component): Component | null {
  let target: Component | null = start;
  while (target && !target.getAttributes?.()?.["data-section-id"]) {
    const parent = target.parent?.();
    if (!parent || parent.is("wrapper")) {
      target = null;
      break;
    }
    target = parent;
  }
  return target;
}

function applyPreservedToComponent(
  section: Component,
  preserved: PreservedField[],
): void {
  const byPath = new Map(
    preserved.filter((p) => p.contentPath).map((p) => [p.contentPath!, p]),
  );
  const byRole = new Map(
    preserved.filter((p) => p.role).map((p) => [p.role!, p]),
  );

  walk(section, (cmp) => {
    const attrs = cmp.getAttributes?.() ?? {};
    const path = attrs["data-content-path"];
    const componentId = attrs["data-component-id"];
    const role = componentId
      ? String(componentId).split("__").slice(1).join("__")
      : undefined;
    const field =
      (path && byPath.get(path)) || (role && byRole.get(role)) || null;
    if (!field) return;

    const tag = String(cmp.get("tagName") || "").toLowerCase();
    if (field.text != null && ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "button"].includes(tag)) {
      try {
        cmp.components(field.text);
      } catch {
        // ignore
      }
    }
    const attrUpdates: Record<string, string> = {};
    if (field.href) attrUpdates.href = field.href;
    if (field.src) attrUpdates.src = field.src;
    if (field.alt != null) attrUpdates.alt = field.alt;
    if (Object.keys(attrUpdates).length) {
      cmp.addAttributes(attrUpdates);
      if (field.src && (tag === "img" || cmp.get("type") === "image")) {
        cmp.set("src", field.src);
      }
    }
  });
}

/**
 * Switch the selected section (or ancestor section) to a new variant.
 * Preserves section id, page id, and compatible content.
 */
export function switchSectionVariant(
  editor: Editor,
  variantId: string,
  options?: {
    locale?: "fa" | "en";
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      foreground?: string;
      muted?: string;
    };
  },
): VariantSwitchResult {
  const selected = editor.getSelected();
  if (!selected) return { ok: false, error: "Nothing selected" };
  const section = findSectionRoot(selected);
  if (!section) return { ok: false, error: "No section selected" };

  const attrs = section.getAttributes?.() ?? {};
  const sectionId = attrs["data-section-id"];
  const pageId = attrs["data-page-id"] || editor.Pages.getSelected()?.getId() || "home";
  const fromVariant = attrs["data-section-variant"] || "";
  const rawType =
    attrs["data-component-type"] ||
    (attrs["data-section-type"]
      ? `section-${attrs["data-section-type"]}`
      : undefined);
  const blockId = normalizeBlockId(rawType);
  if (!sectionId || !blockId) {
    return { ok: false, error: "Missing section metadata" };
  }

  const block = getVisualBlock(blockId);
  if (!block?.variants?.length) {
    return { ok: false, error: "Block has no variants" };
  }
  const toVariant = resolveVariantId(block.variants, variantId);
  if (!toVariant) {
    return { ok: false, error: `Unknown variant: ${variantId}` };
  }
  if (toVariant === fromVariant) {
    return {
      ok: true,
      sectionId,
      pageId,
      fromVariant,
      toVariant,
      preserved: [],
    };
  }

  const preserved = extractPreservedFields(section);
  const locale = options?.locale || "en";
  const { html } = createBlockHtml(blockId, {
    locale,
    pageId,
    sectionId,
    variantId: toVariant,
    colors: options?.colors,
  });

  const parent = section.parent();
  if (!parent) return { ok: false, error: "No parent" };
  const index = section.index();
  section.remove();
  const added = parent.append(html, { at: index });
  const nextSection = Array.isArray(added) ? added[0] : added;
  if (!nextSection) return { ok: false, error: "Variant insert failed" };

  // Ensure identity attributes survived create()
  nextSection.addAttributes({
    "data-section-id": sectionId,
    "data-page-id": pageId,
    "data-section-variant": toVariant,
  });

  applyPreservedToComponent(nextSection, preserved);
  editor.select(nextSection);

  return {
    ok: true,
    sectionId,
    pageId,
    fromVariant,
    toVariant,
    preserved,
  };
}

/**
 * Compatibility matrix helpers for tests / docs.
 * Compatible roles are remapped; others stay in preserved metadata only.
 */
export const VARIANT_COMPATIBLE_ROLES: Record<string, string[]> = {
  hero: ["headline", "subheadline", "cta"],
  cta: ["title", "cta"],
  about: ["title", "body"],
  gallery: ["title"],
  testimonials: ["title"],
};

export function compatibleRolesForSectionType(
  sectionType: string,
): string[] {
  return VARIANT_COMPATIBLE_ROLES[sectionType] ?? [];
}

export function filterCompatibleFields(
  sectionType: string,
  preserved: PreservedField[],
): PreservedField[] {
  const roles = new Set(compatibleRolesForSectionType(sectionType));
  if (roles.size === 0) return preserved;
  return preserved.filter(
    (f) =>
      (f.role && roles.has(f.role)) ||
      (f.contentPath &&
        [...roles].some((r) => f.contentPath!.includes(`.${r}`))),
  );
}
