/**
 * Persistence helpers — reuse Classic Editor save path (PATCH + expectedVersion).
 */

import type { WebsiteConfig } from "@/types/website";

export type VisualSaveState =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

export type VisualSaveResult =
  | { ok: true; version: number; config: WebsiteConfig }
  | { ok: false; conflict?: boolean; message: string };

export async function saveWebsiteConfigViaApi(params: {
  websiteId: string;
  config: WebsiteConfig;
  expectedVersion: number;
}): Promise<VisualSaveResult> {
  try {
    const response = await fetch(`/api/websites/${params.websiteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        config: params.config,
        expectedVersion: params.expectedVersion,
      }),
    });

    if (response.status === 409) {
      return {
        ok: false,
        conflict: true,
        message: "Site was updated elsewhere. Reload and try again.",
      };
    }
    if (!response.ok) {
      return { ok: false, message: "Save failed." };
    }
    const payload = (await response.json().catch(() => null)) as {
      version?: number;
    } | null;
    const version =
      typeof payload?.version === "number"
        ? payload.version
        : params.expectedVersion + 1;
    return { ok: true, version, config: params.config };
  } catch {
    return { ok: false, message: "Network error while saving." };
  }
}
