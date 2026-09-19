/**
 * Persistence helpers — reuse Classic Editor save path (PATCH + expectedVersion).
 * Includes a latest-wins save queue to prevent autosave races.
 */

import type { WebsiteConfig } from "@/types/website";

export type VisualSaveState =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

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

/**
 * Serializes overlapping saves so an older in-flight request cannot overwrite
 * a newer successful save. Always persists the latest requested config.
 */
export function createSaveQueue(params: {
  websiteId: string;
  getExpectedVersion: () => number;
  setExpectedVersion: (version: number) => void;
}) {
  let chain: Promise<VisualSaveResult | null> = Promise.resolve(null);
  let pending: WebsiteConfig | null = null;
  let running = false;

  const flush = async (): Promise<VisualSaveResult | null> => {
    if (running) return null;
    running = true;
    let last: VisualSaveResult | null = null;
    try {
      while (pending) {
        const config = pending;
        pending = null;
        last = await saveWebsiteConfigViaApi({
          websiteId: params.websiteId,
          config,
          expectedVersion: params.getExpectedVersion(),
        });
        if (last.ok) {
          params.setExpectedVersion(last.version);
        } else {
          // Stop on conflict/error — caller keeps dirty state
          break;
        }
      }
    } finally {
      running = false;
    }
    return last;
  };

  return {
    enqueue(config: WebsiteConfig): Promise<VisualSaveResult | null> {
      pending = config;
      const next = chain.then(flush, flush);
      chain = next.then(
        () => null,
        () => null,
      );
      return next;
    },
    get isRunning() {
      return running;
    },
  };
}
