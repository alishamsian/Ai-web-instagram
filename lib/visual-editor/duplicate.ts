/**
 * Safe component / section duplication with unique identity regeneration.
 */

import type { Component, Editor } from "grapesjs";
import { nextSectionId } from "@/lib/visual-editor/registry/markup";
import { visualComponentId } from "@/lib/visual-editor/ids";
import { blockIdFromAttrs, normalizeBlockId } from "@/lib/visual-editor/dnd/nesting";

export type DuplicateResult =
  | { ok: true; sectionId?: string; componentId?: string }
  | { ok: false; error: string };

function walkComponents(
  root: Component,
  visit: (cmp: Component) => void,
): void {
  visit(root);
  const kids = root.components?.();
  const list = Array.isArray(kids)
    ? kids
    : ((kids as { models?: Component[] } | undefined)?.models ?? []);
  for (const child of list) {
    if (child && typeof child.getAttributes === "function") {
      walkComponents(child, visit);
    }
  }
}

function collectSectionIds(editor: Editor): string[] {
  const ids: string[] = [];
  const wrapper = editor.getWrapper();
  if (!wrapper) return ids;
  walkComponents(wrapper, (cmp) => {
    const id = cmp.getAttributes?.()?.["data-section-id"];
    if (id) ids.push(id);
  });
  return ids;
}

/**
 * After cloning a subtree, regenerate section/component IDs and strip
 * conflicting canonical content-paths on duplicated sections.
 */
export function remintIdentities(
  root: Component,
  options: {
    existingSectionIds: string[];
    /** When true, strip data-content-path so WebsiteConfig is not overwritten. */
    stripCanonicalContentPaths: boolean;
    pageId?: string;
  },
): { sectionId?: string; componentId?: string } {
  const existing = [...options.existingSectionIds];
  let newSectionId: string | undefined;
  let newComponentId: string | undefined;
  let sectionCounter = 0;

  walkComponents(root, (cmp) => {
    const attrs = { ...(cmp.getAttributes?.() ?? {}) } as Record<
      string,
      string
    >;
    const updates: Record<string, string> = {};
    const removes: string[] = [];

    if (attrs["data-section-id"]) {
      const oldId = attrs["data-section-id"];
      const type =
        attrs["data-section-type"] ||
        normalizeBlockId(attrs["data-component-type"])?.replace(
          /^section-/,
          "",
        ) ||
        "section";
      const nextId = nextSectionId(type, existing);
      existing.push(nextId);
      updates["data-section-id"] = nextId;
      if (options.pageId) updates["data-page-id"] = options.pageId;
      if (sectionCounter === 0) newSectionId = nextId;
      sectionCounter += 1;

      // Remint nested component ids scoped to the new section
      if (attrs["data-component-id"]) {
        const role =
          attrs["data-component-type"] ||
          attrs["data-component-id"].split("__").pop() ||
          "node";
        // Prefer role from old visualComponentId pattern section__role
        const parts = String(attrs["data-component-id"]).split("__");
        const rolePart = parts.length > 1 ? parts.slice(1).join("__") : role;
        updates["data-component-id"] = visualComponentId(nextId, rolePart);
      }

      if (options.stripCanonicalContentPaths && attrs["data-content-path"]) {
        removes.push("data-content-path");
      }

      // Track old→new for children that reference the old section in component ids
      void oldId;
    } else if (attrs["data-component-id"]) {
      const parentSection =
        newSectionId ||
        findAncestorSectionId(cmp) ||
        `cmp-${Date.now().toString(36)}`;
      const parts = String(attrs["data-component-id"]).split("__");
      const role =
        parts.length > 1
          ? parts.slice(1).join("__")
          : attrs["data-component-type"] || "node";
      const next =
        visualComponentId(parentSection, `${role}_copy_${Math.random().toString(36).slice(2, 7)}`);
      updates["data-component-id"] = next;
      if (!newComponentId) newComponentId = next;
      if (options.pageId) updates["data-page-id"] = options.pageId;
      // Standalone component duplicates should not share content paths
      if (attrs["data-content-path"]) {
        removes.push("data-content-path");
      }
    }

    if (Object.keys(updates).length) {
      cmp.addAttributes(updates);
    }
    for (const key of removes) {
      cmp.removeAttributes(key);
    }
  });

  // Second pass: remint child component ids under new section roots
  if (newSectionId) {
    walkComponents(root, (cmp) => {
      const attrs = cmp.getAttributes?.() ?? {};
      if (attrs["data-section-id"]) return;
      const cid = attrs["data-component-id"];
      if (!cid) return;
      // If still pointing at an old section prefix, rewrite
      const sectionId =
        findAncestorSectionId(cmp) || newSectionId || "cmp";
      const parts = String(cid).split("__");
      const role =
        parts.length > 1
          ? parts.slice(1).join("__").replace(/_copy_[a-z0-9]+$/i, "")
          : attrs["data-component-type"] || "node";
      const next = visualComponentId(
        sectionId,
        `${role}_${Math.random().toString(36).slice(2, 6)}`,
      );
      cmp.addAttributes({ "data-component-id": next });
      if (options.stripCanonicalContentPaths && attrs["data-content-path"]) {
        cmp.removeAttributes("data-content-path");
      }
    });
  }

  return { sectionId: newSectionId, componentId: newComponentId };
}

function findAncestorSectionId(cmp: Component): string | undefined {
  let walk: Component | undefined = cmp.parent?.() ?? undefined;
  while (walk) {
    const id = walk.getAttributes?.()?.["data-section-id"];
    if (id) return id;
    walk = walk.parent?.() ?? undefined;
  }
  return undefined;
}

/**
 * Duplicate selected (or given) component with safe identity reminting.
 */
export function duplicateComponentSafe(
  editor: Editor,
  source?: Component | null,
): DuplicateResult {
  const selected = source ?? editor.getSelected();
  if (!selected || selected.is("wrapper")) {
    return { ok: false, error: "Nothing to duplicate" };
  }
  const parent = selected.parent();
  if (!parent) return { ok: false, error: "No parent" };

  const attrs = selected.getAttributes?.() ?? {};
  const isSection = Boolean(attrs["data-section-id"]);
  const isCanonical =
    isSection &&
    Boolean(
      normalizeBlockId(blockIdFromAttrs(attrs as Record<string, string>)) &&
        attrs["data-content-path"] === undefined
        ? // section itself may not have content-path; check children later
          true
        : true,
    );

  // Canonical sections always strip content paths on duplicate to avoid
  // overwriting WebsiteConfig.content.*
  const stripCanonical = isSection;

  const existing = collectSectionIds(editor);
  const pageId =
    attrs["data-page-id"] ||
    editor.Pages.getSelected()?.getId() ||
    "home";

  const clone = selected.clone();
  const index = selected.index();
  parent.append(clone, { at: index + 1 });

  // GrapesJS may return Component|Component[]; normalize
  const appended = Array.isArray(clone) ? clone[0] : clone;
  if (!appended) return { ok: false, error: "Clone failed" };

  const minted = remintIdentities(appended, {
    existingSectionIds: existing,
    stripCanonicalContentPaths: stripCanonical || Boolean(isCanonical),
    pageId,
  });

  editor.select(appended);
  return {
    ok: true,
    sectionId: minted.sectionId,
    componentId: minted.componentId,
  };
}

/** Pure helper for tests — remint identity maps from attribute snapshots. */
export function remintAttributeTree(
  nodes: Array<{
    attrs: Record<string, string>;
    children?: Array<{ attrs: Record<string, string> }>;
  }>,
  existingSectionIds: string[],
): Array<{
  attrs: Record<string, string>;
  children?: Array<{ attrs: Record<string, string> }>;
}> {
  const existing = [...existingSectionIds];
  return nodes.map((node) => {
    const attrs = { ...node.attrs };
    if (attrs["data-section-id"]) {
      const type = attrs["data-section-type"] || "section";
      const next = nextSectionId(type, existing);
      existing.push(next);
      attrs["data-section-id"] = next;
      delete attrs["data-content-path"];
    }
    if (attrs["data-component-id"] && attrs["data-section-id"]) {
      const parts = attrs["data-component-id"].split("__");
      const role = parts.length > 1 ? parts.slice(1).join("__") : "node";
      attrs["data-component-id"] = visualComponentId(
        attrs["data-section-id"],
        role,
      );
    } else if (attrs["data-component-id"]) {
      attrs["data-component-id"] = `${attrs["data-component-id"]}_copy`;
      delete attrs["data-content-path"];
    }
    const children = node.children?.map((child) => {
      const cattrs = { ...child.attrs };
      if (attrs["data-section-id"] && cattrs["data-component-id"]) {
        const parts = cattrs["data-component-id"].split("__");
        const role = parts.length > 1 ? parts.slice(1).join("__") : "node";
        cattrs["data-component-id"] = visualComponentId(
          attrs["data-section-id"],
          `${role}_dup`,
        );
      }
      if (cattrs["data-content-path"]) delete cattrs["data-content-path"];
      return { attrs: cattrs };
    });
    return { attrs, children };
  });
}
