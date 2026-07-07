/**
 * Score-banded fixer routing (Self-Watch remediation, Layer 1). Spends fix
 * compute proportional to how close a render is to the pass threshold, forming a
 * natural escalation staircase across the bounded re-render attempts:
 *
 *   ≥ threshold       → pass (no fix)
 *   goal-line band    → Opus   (closest to the line — best model where a fix most
 *   [thr-1.5, thr)      reliably converts to a publish)
 *   mid band          → Sonnet (speculative lift into the goal-line band; cheaper
 *   [thr-3, thr-1.5)    model for a band that converts less certainly)
 *   < thr-3           → Opus   (heavy lift, one attempt; held if it doesn't move)
 *
 * The JUDGE stays consistent (see REJUDGE_MODEL) — only the FIXER is banded — so
 * scores are comparable across passes and the grader isn't the fixer's own tier.
 * Pure + unit-tested; models are env-overridable.
 */

export type FixTier = "sonnet" | "opus";

export const SONNET_MODEL = process.env.AUTOFIX_SONNET_MODEL?.trim() || "claude-sonnet-5";
export const OPUS_MODEL = process.env.AUTOFIX_OPUS_MODEL?.trim() || "claude-opus-4-8";
/** One consistent, strong, independent judge for the post-fix re-score. */
export const REJUDGE_MODEL = process.env.AUTOFIX_REJUDGE_MODEL?.trim() || "claude-opus-4-8";

export type FixRoute = { tier: FixTier; model: string; band: "goal-line" | "mid" | "low" };

/**
 * Which fixer model (if any) to use for a render at `score`. Returns null at or
 * above `threshold` — nothing to fix. Bands are relative to the threshold so a
 * tuned pass bar keeps its shape (default threshold 7 → goal-line 5.5–6.9, mid
 * 4.0–5.4, low <4.0).
 */
export function fixerModelForScore(score: number, threshold = 7): FixRoute | null {
  if (score >= threshold) return null;
  const goalLine = threshold - 1.5;
  const midFloor = threshold - 3;
  if (score >= goalLine) return { tier: "opus", model: OPUS_MODEL, band: "goal-line" };
  if (score >= midFloor) return { tier: "sonnet", model: SONNET_MODEL, band: "mid" };
  return { tier: "opus", model: OPUS_MODEL, band: "low" };
}
