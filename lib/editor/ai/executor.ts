/**
 * Apply a validated batch of EditorActions as one transaction.
 */

import type { WebsiteConfig } from "@/types/website";
import type { EditorAction } from "@/lib/editor/actions";
import { validateEditorActions } from "@/lib/editor/ai/validator";

export type ExecuteAiBatchResult =
  | {
      ok: true;
      config: WebsiteConfig;
      actions: EditorAction[];
      summaries: string[];
      label: string;
    }
  | { ok: false; reason: string };

export function executeAiActionBatch(params: {
  config: WebsiteConfig;
  actions: EditorAction[];
  label?: string;
}): ExecuteAiBatchResult {
  const validated = validateEditorActions(params.config, params.actions);
  if (!validated.ok) {
    return { ok: false, reason: validated.reason };
  }
  return {
    ok: true,
    config: validated.proposedConfig,
    actions: validated.actions,
    summaries: validated.summaries,
    label: params.label ?? "AI Edit",
  };
}
