import "server-only";
import type { FrameCritique } from "@/lib/stick-types";

/**
 * Tier-2 temporal vision (TwelveLabs Pegasus). The auto-fix loop runs the free
 * Tier-1 Claude-vision pass on every attempt and escalates to TwelveLabs ONLY
 * when Tier-1 flags something a still frame can't reveal — motion, timing, or
 * pacing. See docs/stick-studio/Vision-Optimizer-Loop.md and docs/Auto-Fix-Loop.md.
 *
 * Live when a TwelveLabs key is configured (the secret is verified by the
 * Verify Secrets workflow). The full index→Pegasus call needs a public/signed
 * URL for the rendered cut and async indexing (minutes); that upload step is the
 * documented next increment. Until then this adapter gates the escalation, marks
 * the attempt as tier-2 in the audit, and focuses the fix on the temporal issue.
 */

export function isTwelveLabsLive(): boolean {
  return Boolean(
    process.env.TWELVELABS_API_KEY ||
      process.env.TWELVE_LABS_API_KEY ||
      process.env.TL_API_KEY,
  );
}

const TEMPORAL_RE =
  /\b(motion|timing|pacing|speed|fast|slow|rushed|jerky|abrupt|choppy|frame.?rate|too quick|lingers?|drags?|stutter|temporal|transition|jump cut|dead air)\b/i;

/** Does this Tier-1 critique point at something only a temporal pass can judge? */
export function wantsTemporalPass(critique: Pick<FrameCritique, "issues">): boolean {
  return (critique.issues ?? []).some(
    (i) => TEMPORAL_RE.test(i.note ?? "") || TEMPORAL_RE.test(i.fix ?? ""),
  );
}
