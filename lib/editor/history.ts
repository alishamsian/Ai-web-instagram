import type { WebsiteConfig } from "@/types/website";
import {
  cloneWebsiteConfig,
  type HistoryEntry,
} from "@/lib/editor/types";
import { configsEqual } from "@/components/editor/editor-utils";

export const EDITOR_HISTORY_LIMIT = 40;

export function createHistoryEntry(
  config: WebsiteConfig,
  label: string,
): HistoryEntry {
  return {
    id: `h-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    config: cloneWebsiteConfig(config),
    createdAt: Date.now(),
  };
}

/**
 * Typing / continuous property edits stay debounced.
 * Discrete structural commands commit immediately (one intentional edit = one entry).
 */
export function shouldDebounceHistoryLabel(label: string): boolean {
  if (label === "Edit") return true;
  if (label.startsWith("Edit ")) return true;
  if (label.startsWith("Change brand.")) return true;
  if (label === "Change brand colors") return true;
  if (label === "Edit SEO keywords") return true;
  return false;
}

export function pushHistory(params: {
  entries: HistoryEntry[];
  index: number;
  next: WebsiteConfig;
  label: string;
  limit?: number;
}): { entries: HistoryEntry[]; index: number } {
  const limit = params.limit ?? EDITOR_HISTORY_LIMIT;
  const current = params.entries[params.index];
  // No-op must NOT truncate the redo stack (slice before equality was a Phase 6 bug).
  if (current && configsEqual(current.config, params.next)) {
    return { entries: params.entries, index: params.index };
  }
  const base = params.entries.slice(0, params.index + 1);
  const merged = [
    ...base,
    createHistoryEntry(params.next, params.label),
  ].slice(-limit);
  return { entries: merged, index: merged.length - 1 };
}

export function undoHistory(params: {
  entries: HistoryEntry[];
  index: number;
}): { index: number; config: WebsiteConfig | null } {
  if (params.index <= 0) return { index: params.index, config: null };
  const index = params.index - 1;
  const entry = params.entries[index];
  return {
    index,
    config: entry ? cloneWebsiteConfig(entry.config) : null,
  };
}

export function redoHistory(params: {
  entries: HistoryEntry[];
  index: number;
}): { index: number; config: WebsiteConfig | null } {
  if (params.index >= params.entries.length - 1) {
    return { index: params.index, config: null };
  }
  const index = params.index + 1;
  const entry = params.entries[index];
  return {
    index,
    config: entry ? cloneWebsiteConfig(entry.config) : null,
  };
}

export function restoreHistoryIndex(params: {
  entries: HistoryEntry[];
  index: number;
}): { index: number; config: WebsiteConfig | null } {
  const entry = params.entries[params.index];
  if (!entry) return { index: params.index, config: null };
  return {
    index: params.index,
    config: cloneWebsiteConfig(entry.config),
  };
}
