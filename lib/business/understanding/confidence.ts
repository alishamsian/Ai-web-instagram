import type { ConfidenceBand } from "@/lib/business/types";

/** Centralized confidence bands — do not scatter thresholds. */
export const CONFIDENCE = {
  HIGH: 0.85,
  MEDIUM: 0.6,
  /** Align with Vertical Engine fallback threshold */
  LOW_FALLBACK: 0.55,
} as const;

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= CONFIDENCE.HIGH) return "high";
  if (score >= CONFIDENCE.MEDIUM) return "medium";
  return "low";
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

/**
 * Map raw rule score margin into 0–1 confidence.
 * Strong winner + clear gap → higher confidence.
 */
export function scoreToConfidence(params: {
  topScore: number;
  secondScore: number;
  corpusTokens: number;
}): number {
  const { topScore, secondScore, corpusTokens } = params;
  if (topScore <= 0) return clampConfidence(0.15);

  const margin = topScore - secondScore;
  const strength = Math.min(1, topScore / 12);
  const separation = Math.min(1, margin / Math.max(topScore, 1));
  const evidence = Math.min(1, corpusTokens / 24);

  const raw = 0.25 + strength * 0.4 + separation * 0.25 + evidence * 0.1;
  return clampConfidence(raw);
}
