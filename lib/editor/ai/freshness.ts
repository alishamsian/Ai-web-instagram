/**
 * Proposal freshness — prevent stale AI Apply from overwriting newer edits.
 * Uses client localRevision (increments on every WebsiteConfig mutation)
 * plus server website.version captured at propose time.
 */

export type ProposalFreshness = {
  /** Server WebsiteRecord.version when proposal was created */
  baseVersion: number;
  /** Client-side revision counter when proposal was created */
  localRevision: number;
};

export type FreshnessCheckResult =
  | { ok: true }
  | {
      ok: false;
      code: "STALE_PROPOSAL" | "VERSION_CONFLICT";
      messageFa: string;
      messageEn: string;
    };

/**
 * Apply is allowed only when local editor revision still matches the proposal.
 * Server version is re-checked on persist (PATCH expectedVersion).
 */
export function assertProposalFresh(params: {
  proposal: ProposalFreshness;
  currentLocalRevision: number;
  currentServerVersion?: number;
}): FreshnessCheckResult {
  if (params.proposal.localRevision !== params.currentLocalRevision) {
    return {
      ok: false,
      code: "STALE_PROPOSAL",
      messageFa:
        "این پیشنهاد قدیمی شده است؛ لطفاً دوباره تلاش کنید.",
      messageEn:
        "This proposal is out of date. Please regenerate and try again.",
    };
  }

  if (
    typeof params.currentServerVersion === "number" &&
    params.proposal.baseVersion !== params.currentServerVersion
  ) {
    return {
      ok: false,
      code: "VERSION_CONFLICT",
      messageFa:
        "نسخه سایت تغییر کرده. صفحه را به‌روزرسانی کنید و دوباره تلاش کنید.",
      messageEn:
        "The website changed while you were editing. Refresh and try again.",
    };
  }

  return { ok: true };
}
