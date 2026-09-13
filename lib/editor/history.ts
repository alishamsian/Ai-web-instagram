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

export function pushHistory(params: {
  entries: HistoryEntry[];
  index: number;
  next: WebsiteConfig;
  label: string;
  limit?: number;
}): { entries: HistoryEntry[]; index: number } {
  const limit = params.limit ?? EDITOR_HISTORY_LIMIT;
  const base = params.entries.slice(0, params.index + 1);
  const last = base[base.length - 1];
  if (last && configsEqual(last.config, params.next)) {
    return { entries: base, index: base.length - 1 };
  }
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
