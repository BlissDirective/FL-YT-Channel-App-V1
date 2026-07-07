import "server-only";
import type { WatchVerdict } from "./watch-gate";
import { runWatchGate } from "./watch-runner";
import { isAutofixEnabled, type QualityGateConfig } from "./quality-gates";
import type { Project, Video } from "@/lib/db/types";

/**
 * The shared "settle a FINAL_REVIEW video" core (UI-Redesign v2 backlog;
 * Enhancement Plan Phase 7.4 completed "further"). Both owners — the
 * build-run finalizer (`finalizeAutoPilotVideos`, engine.ts) and the
 * operator's approval pass (`processOperatorApprovals`, operator.ts) —
 * consult these SAME rules before letting a video leave FINAL_REVIEW:
 *
 *  1. the auto-fix loop must have fully converged (done/held),
 *  2. the Self-Watch verdict is reused once its paid competitive dimension
 *     has been judged (a re-render resets it, so it correctly re-judges),
 *  3. a low overall or a content-policy risk blocks any auto-publish.
 *
 * The owners intentionally KEEP their distinct scoring paths (build-run
 * per-run QC thresholds vs operator publish floor + editorial guard) and
 * their own notification channels — only the invariants live here, so the
 * two can never drift apart again (the drift this module prevents is the
 * exact bug class §0.4 of the Enhancement audit fixed once already).
 */

type Db = Parameters<typeof runWatchGate>[0];

/** Rule 1 — don't settle a video the auto-fix loop is still improving. */
export function autofixSettled(
  project: Pick<Project, "autofix_enabled">,
  video: Pick<Video, "autofix_enabled" | "autofix_state">,
): boolean {
  if (!isAutofixEnabled(project, video)) return true;
  const status = (video.autofix_state as { status?: string } | null)?.status;
  return status === "done" || status === "held";
}

/** Rule 2 — reuse the stored Self-Watch verdict once its (paid) competitive
    dimension has been judged; otherwise run the gate at this settle point. */
export async function resolveWatchVerdict(
  db: Db,
  video: Video,
  project: Project,
): Promise<WatchVerdict | null> {
  const existing = video.watch_review;
  if (existing?.competitive?.evaluated) return existing;
  return runWatchGate(db, video, project, { competitive: true });
}

export type WatchBlock = {
  blocked: boolean;
  policyRisk: boolean;
};

/** Rule 3 — a non-degraded verdict blocks auto-publish when the overall
    score is under the floor OR the compliance criterion flagged policy risk
    (a degraded verdict never fakes a pass — the QC/grader rules hold it
    elsewhere). */
export function watchBlocksPublish(
  watch: WatchVerdict | null,
  qg: Pick<QualityGateConfig, "watchBlockPublishBelow">,
): WatchBlock {
  const policyRisk = Boolean(watch && watch.policyRisk);
  return {
    blocked: Boolean(
      watch &&
        !watch.degraded &&
        (watch.overall < qg.watchBlockPublishBelow || policyRisk),
    ),
    policyRisk,
  };
}

/** One phrasing for the Self-Watch hold reason, shared by both owners
    (each prefixes it with its own voice). */
export function watchHoldReason(
  watch: WatchVerdict,
  qg: Pick<QualityGateConfig, "watchBlockPublishBelow">,
): string {
  if (watch.policyRisk) {
    return "Self-Watch flagged a content-policy risk (transformative value / repetitious content) — human review required";
  }
  const fixes = watch.fixPlan
    .slice(0, 2)
    .map((f) => f.reason)
    .join("; ");
  return `Self-Watch ${watch.overall.toFixed(1)}/10 below the ${qg.watchBlockPublishBelow.toFixed(1)} floor${fixes ? ` — ${fixes}` : ""}`;
}
