/**
 * Library organization helpers — groups registry blocks without a second catalog.
 */

import type {
  VisualBlockDefinition,
  VisualLibraryTab,
} from "@/lib/visual-editor/registry/types";
import { listVisualBlocks } from "@/lib/visual-editor/registry";

export type LibraryGroupId =
  | "sections"
  | "layout"
  | "typography"
  | "media"
  | "actions"
  | "content"
  | "forms"
  | "navigation"
  | "other";

export type LibraryGroup = {
  id: LibraryGroupId;
  label: { fa: string; en: string };
  blocks: VisualBlockDefinition[];
};

const GROUP_LABELS: Record<LibraryGroupId, { fa: string; en: string }> = {
  sections: { fa: "سکشن‌ها", en: "Sections" },
  layout: { fa: "چیدمان", en: "Layout" },
  typography: { fa: "تایپوگرافی", en: "Typography" },
  media: { fa: "رسانه", en: "Media" },
  actions: { fa: "اکشن‌ها", en: "Actions" },
  content: { fa: "محتوا", en: "Content" },
  forms: { fa: "فرم‌ها", en: "Forms" },
  navigation: { fa: "ناوبری", en: "Navigation" },
  other: { fa: "سایر", en: "Other" },
};

/** Map a registry block to a library display group. */
export function libraryGroupForBlock(
  block: VisualBlockDefinition,
): LibraryGroupId {
  if (block.libraryTab === "sections" || block.sectionType) return "sections";
  if (block.id === "content-heading" || block.id === "content-text") {
    return "typography";
  }
  if (block.id === "content-button" || block.id === "content-link") {
    return "actions";
  }
  if (
    block.id === "content-card" ||
    block.id === "layout-divider" ||
    block.id === "layout-spacer" ||
    block.id === "content-icon"
  ) {
    return "content";
  }
  if (block.libraryTab === "layout" || block.category === "layout") {
    return "layout";
  }
  if (block.libraryTab === "media" || block.category === "media") return "media";
  if (block.libraryTab === "forms" || block.category === "forms") return "forms";
  if (block.libraryTab === "navigation" || block.category === "navigation") {
    return "navigation";
  }
  if (block.category === "content") return "content";
  return "other";
}

const TAB_GROUP_FILTER: Partial<Record<VisualLibraryTab, LibraryGroupId[]>> = {
  sections: ["sections"],
  layout: ["layout", "content"],
  components: ["typography", "actions", "content", "other"],
  media: ["media"],
  forms: ["forms"],
  navigation: ["navigation"],
};

/**
 * Group filtered registry blocks for the library UI.
 * Empty groups are omitted.
 * When `query` is non-empty, search spans all tabs (global find).
 */
export function groupLibraryBlocks(options?: {
  tab?: VisualLibraryTab;
  query?: string;
}): LibraryGroup[] {
  const hasQuery = Boolean(options?.query?.trim());
  const blocks = listVisualBlocks({
    tab: hasQuery ? undefined : options?.tab,
    query: options?.query,
  });
  const allowed =
    !hasQuery && options?.tab ? TAB_GROUP_FILTER[options.tab] : undefined;
  const buckets = new Map<LibraryGroupId, VisualBlockDefinition[]>();

  for (const block of blocks) {
    const group = libraryGroupForBlock(block);
    if (allowed && !allowed.includes(group)) {
      continue;
    }
    const list = buckets.get(group) ?? [];
    list.push(block);
    buckets.set(group, list);
  }

  const order: LibraryGroupId[] = [
    "sections",
    "layout",
    "typography",
    "media",
    "actions",
    "content",
    "forms",
    "navigation",
    "other",
  ];

  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({
      id,
      label: GROUP_LABELS[id],
      blocks: buckets.get(id)!,
    }));
}

/** Case-insensitive substring match used by library search. */
export function matchesLibraryQuery(
  block: VisualBlockDefinition,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    block.id,
    block.label.en,
    block.label.fa,
    block.description?.en,
    block.description?.fa,
    ...(block.keywords ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}
