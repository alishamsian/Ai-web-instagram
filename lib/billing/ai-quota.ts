/**
 * Server-authoritative AI generation quota.
 * Reuses entitlements + usage_counters — no second billing system.
 */

import { resolveWorkspaceEntitlements } from "@/lib/billing/entitlements-resolver";
import { getUsageCounter } from "@/lib/admin/usage";
import { getRemainingUsage } from "@/lib/admin/entitlements";

export type AiQuotaResult =
  | {
      ok: true;
      plan: string;
      used: number;
      remaining: number;
      limit: number;
    }
  | {
      ok: false;
      code: "AI_QUOTA_EXCEEDED";
      plan: string;
      used: number;
      remaining: 0;
      limit: number;
      messageFa: string;
      messageEn: string;
    };

export async function assertAiGenerationAllowed(params: {
  workspaceId: string;
  workspacePlan?: string | null;
}): Promise<AiQuotaResult> {
  const entitlements = await resolveWorkspaceEntitlements(
    params.workspaceId,
    params.workspacePlan,
  );
  const used = await getUsageCounter({
    workspaceId: params.workspaceId,
    feature: "ai_generations",
  });
  const remaining = getRemainingUsage({
    plan: entitlements.plan,
    feature: "max_ai_generations",
    used,
  });
  const limit = Math.max(0, used + remaining);

  if (remaining <= 0) {
    return {
      ok: false,
      code: "AI_QUOTA_EXCEEDED",
      plan: entitlements.plan,
      used,
      remaining: 0,
      limit,
      messageFa:
        "سقف استفاده از AI در این دوره تمام شده است. پلن را ارتقا دهید یا ماه بعد دوباره تلاش کنید.",
      messageEn:
        "AI generation quota for this period is exhausted. Upgrade your plan or try again next month.",
    };
  }

  return {
    ok: true,
    plan: entitlements.plan,
    used,
    remaining,
    limit,
  };
}
