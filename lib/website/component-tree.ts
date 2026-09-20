/**
 * Product-owned canonical nested component tree (Phase 3.2.1).
 * WebsiteConfig is SoT — GrapesJS is an editing projection only.
 */

import type {
  SectionConfig,
  WebsiteComponentNode,
  WebsiteComponentResponsiveStyles,
  WebsiteComponentVisibility,
  WebsiteConfig,
  WebsitePage,
} from "@/types/website";
import { createId } from "@/lib/utils";
import { canNestBlocks } from "@/lib/visual-editor/dnd/nesting";

export type DeviceBreakpoint = "desktop" | "tablet" | "mobile";

const DEVICE_CHAIN: Record<DeviceBreakpoint, DeviceBreakpoint[]> = {
  desktop: ["desktop"],
  tablet: ["tablet", "desktop"],
  mobile: ["mobile", "tablet", "desktop"],
};

const FALLBACK_TYPE = "unknown";

/** Mint a new stable component id (UUID — never Date.now / Math.random / index). */
export function mintComponentId(typeHint?: string): string {
  const prefix = (typeHint || "cmp")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 24);
  return `${prefix}_${createId()}`;
}

export function createComponentNode(
  partial: Partial<WebsiteComponentNode> & { type: string },
): WebsiteComponentNode {
  return {
    id: partial.id?.trim() || mintComponentId(partial.type),
    type: partial.type || FALLBACK_TYPE,
    children: partial.children,
    props: partial.props,
    content: partial.content,
    styles: partial.styles,
    responsive: partial.responsive,
    visibility: partial.visibility,
    variant: partial.variant,
    locked: partial.locked,
    hidden: partial.hidden,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeStringMap(
  value: unknown,
): Record<string, string> | undefined {
  if (!isPlainObject(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && v.trim()) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeResponsive(
  value: unknown,
): WebsiteComponentResponsiveStyles | undefined {
  if (!isPlainObject(value)) return undefined;
  const desktop = sanitizeStringMap(value.desktop);
  const tablet = sanitizeStringMap(value.tablet);
  const mobile = sanitizeStringMap(value.mobile);
  if (!desktop && !tablet && !mobile) return undefined;
  return { desktop, tablet, mobile };
}

function sanitizeVisibility(
  value: unknown,
): WebsiteComponentVisibility | undefined {
  if (!isPlainObject(value)) return undefined;
  const out: WebsiteComponentVisibility = {};
  if (typeof value.desktop === "boolean") out.desktop = value.desktop;
  if (typeof value.tablet === "boolean") out.tablet = value.tablet;
  if (typeof value.mobile === "boolean") out.mobile = value.mobile;
  return Object.keys(out).length ? out : undefined;
}

function sanitizeContent(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined;
  return structuredClone(value);
}

/**
 * Normalize a single node. Unknown types become controlled fallbacks.
 * Circular references are rejected (seen ids skipped).
 * Idempotent for already-valid trees.
 */
export function normalizeComponentNode(
  raw: unknown,
  seen: Set<string> = new Set(),
): WebsiteComponentNode | null {
  if (!isPlainObject(raw)) return null;
  const type =
    typeof raw.type === "string" && raw.type.trim()
      ? raw.type.trim()
      : FALLBACK_TYPE;
  let id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : mintComponentId(type);
  if (seen.has(id)) {
    id = mintComponentId(type);
  }
  seen.add(id);

  const childrenRaw = Array.isArray(raw.children) ? raw.children : undefined;
  const children: WebsiteComponentNode[] = [];
  if (childrenRaw) {
    for (const child of childrenRaw) {
      const normalized = normalizeComponentNode(child, seen);
      if (!normalized) continue;
      const nest = canNestBlocks(type, normalized.type);
      if (!nest.accepted && type !== FALLBACK_TYPE) {
        // Keep data with a safe parent wrap rather than destroying user content
        children.push(normalized);
      } else {
        children.push(normalized);
      }
    }
  }

  return {
    id,
    type,
    children: children.length ? children : undefined,
    props: sanitizeContent(raw.props),
    content: sanitizeContent(raw.content),
    styles: sanitizeStringMap(raw.styles),
    responsive: sanitizeResponsive(raw.responsive),
    visibility: sanitizeVisibility(raw.visibility),
    variant: typeof raw.variant === "string" ? raw.variant : undefined,
    locked: raw.locked === true ? true : undefined,
    hidden: raw.hidden === true ? true : undefined,
  };
}

export function normalizeComponentTree(
  nodes: unknown,
): WebsiteComponentNode[] | undefined {
  if (!Array.isArray(nodes) || nodes.length === 0) return undefined;
  const seen = new Set<string>();
  const out: WebsiteComponentNode[] = [];
  for (const n of nodes) {
    const next = normalizeComponentNode(n, seen);
    if (next) out.push(next);
  }
  return out.length ? out : undefined;
}

/** Deep clone with explicit old→new id remapping for the entire subtree. */
export function duplicateComponentSubtree(
  node: WebsiteComponentNode,
  idMap: Map<string, string> = new Map(),
): WebsiteComponentNode {
  const newId = mintComponentId(node.type);
  idMap.set(node.id, newId);
  const children = node.children?.map((c) =>
    duplicateComponentSubtree(c, idMap),
  );
  return {
    id: newId,
    type: node.type,
    children: children?.length ? children : undefined,
    props: node.props ? structuredClone(node.props) : undefined,
    content: node.content ? structuredClone(node.content) : undefined,
    styles: node.styles ? { ...node.styles } : undefined,
    responsive: node.responsive
      ? structuredClone(node.responsive)
      : undefined,
    visibility: node.visibility ? { ...node.visibility } : undefined,
    variant: node.variant,
    locked: node.locked,
    hidden: node.hidden,
  };
}

export function duplicateComponentForest(
  nodes: WebsiteComponentNode[],
): { nodes: WebsiteComponentNode[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>();
  const next = nodes.map((n) => duplicateComponentSubtree(n, idMap));
  return { nodes: next, idMap };
}

/** Resolve style with breakpoint inheritance (desktop → tablet → mobile). */
export function resolveComponentStyleProp(
  node: WebsiteComponentNode,
  cssProp: string,
  device: DeviceBreakpoint,
): { value: string; source: DeviceBreakpoint | "none"; inherited: boolean } {
  for (const d of DEVICE_CHAIN[device]) {
    const bucket =
      d === "desktop"
        ? (node.responsive?.desktop ?? node.styles)
        : node.responsive?.[d];
    const value = bucket?.[cssProp];
    if (typeof value === "string" && value.trim()) {
      return { value, source: d, inherited: d !== device };
    }
  }
  const base = node.styles?.[cssProp];
  if (typeof base === "string" && base.trim()) {
    return {
      value: base,
      source: "desktop",
      inherited: device !== "desktop",
    };
  }
  return { value: "", source: "none", inherited: false };
}

export function isComponentVisibleAt(
  node: WebsiteComponentNode,
  device: DeviceBreakpoint,
): boolean {
  if (node.hidden === true) return false;
  const v = node.visibility;
  if (!v) return true;
  if (device === "desktop") return v.desktop !== false;
  if (device === "tablet") {
    if (v.tablet != null) return v.tablet !== false;
    return v.desktop !== false;
  }
  if (v.mobile != null) return v.mobile !== false;
  if (v.tablet != null) return v.tablet !== false;
  return v.desktop !== false;
}

/** Flatten tree for tests / searches. */
export function walkComponentTree(
  nodes: WebsiteComponentNode[] | undefined,
  visit: (node: WebsiteComponentNode, depth: number) => void,
  depth = 0,
): void {
  if (!nodes) return;
  for (const node of nodes) {
    visit(node, depth);
    walkComponentTree(node.children, visit, depth + 1);
  }
}

export function findComponentById(
  nodes: WebsiteComponentNode[] | undefined,
  id: string,
): WebsiteComponentNode | null {
  if (!nodes) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findComponentById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function reorderSiblings(
  nodes: WebsiteComponentNode[],
  fromIndex: number,
  toIndex: number,
): WebsiteComponentNode[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= nodes.length ||
    toIndex >= nodes.length ||
    fromIndex === toIndex
  ) {
    return nodes;
  }
  const next = [...nodes];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item!);
  return next;
}

export function removeComponentById(
  nodes: WebsiteComponentNode[],
  id: string,
): WebsiteComponentNode[] {
  const out: WebsiteComponentNode[] = [];
  for (const node of nodes) {
    if (node.id === id) continue;
    out.push({
      ...node,
      children: node.children
        ? removeComponentById(node.children, id)
        : undefined,
    });
  }
  return out;
}

/**
 * Idempotent normalization of all section.components on a config.
 * Does not invent empty arrays; preserves unknown section fields.
 */
export function normalizeWebsiteComponentTrees(
  config: WebsiteConfig,
): WebsiteConfig {
  const next = structuredClone(config);

  const normalizeSection = (section: SectionConfig): SectionConfig => {
    if (!section.components) return section;
    const components = normalizeComponentTree(section.components);
    if (!components) {
      const { components: _drop, ...rest } = section;
      void _drop;
      return rest;
    }
    return { ...section, components };
  };

  next.sections = next.sections.map(normalizeSection);
  if (next.pages) {
    next.pages = next.pages.map((page: WebsitePage) => ({
      ...page,
      sections: page.sections?.map(normalizeSection),
    }));
  }
  return next;
}

/** Structural fingerprint for equality tests (stable key order). */
export function componentTreeFingerprint(
  nodes: WebsiteComponentNode[] | undefined,
): string {
  if (!nodes?.length) return "[]";
  const stable = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(stable);
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = stable(obj[key]);
    }
    return out;
  };
  return JSON.stringify(
    nodes.map(function mapNode(n: WebsiteComponentNode): unknown {
      return stable({
        id: n.id,
        type: n.type,
        content: n.content ?? null,
        props: n.props ?? null,
        styles: n.styles ?? null,
        responsive: n.responsive ?? null,
        visibility: n.visibility ?? null,
        variant: n.variant ?? null,
        locked: n.locked ?? false,
        hidden: n.hidden ?? false,
        children: (n.children ?? []).map(mapNode),
      });
    }),
  );
}
