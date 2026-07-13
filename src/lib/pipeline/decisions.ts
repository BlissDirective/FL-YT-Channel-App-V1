import "server-only";
import type { VideoStatus } from "@studio/core";

/**
 * Director decision ledger (Fable-5-Director-Mode-Build-Spec.md §3.3 / §7).
 *
 * Every operator action in Director Mode writes one append-only
 * `operator_decisions` row capturing the agent's score/verdict at decision
 * time. D6's disagreement mining reads these to calibrate judges to operator
 * taste; for now they are a faithful audit trail. Pure mapping helpers here are
 * unit-tested; the single DB write is `recordOperatorDecision`.
 */

type Db = { from: (t: string) => any };

/** The five operator-facing console stages (spec §5). */
export type DirectorStage = "idea" | "script" | "visuals" | "edit" | "publish";

export type DirectorAction =
  | "generate"
  | "review"
  | "revise"
  | "rerender"
  | "advance"
  | "step_back"
  | "publish"
  | "kill";

/** Map a pipeline status to its console stage. Terminal/transient statuses map
    to the nearest meaningful stage so a decision row always has a stage. */
export function directorStageForStatus(status: VideoStatus): DirectorStage {
  switch (status) {
    case "IDEA":
    case "IDEA_APPROVED":
      return "idea";
    case "SCRIPTING":
    case "SCRIPT_READY":
      return "script";
    case "GENERATING_ASSETS":
    case "ASSETS_READY":
      return "visuals";
    case "ASSEMBLING":
    case "FINAL_REVIEW":
      return "edit";
    case "APPROVED":
    case "TRACKING":
      return "publish";
    case "NEEDS_REVISION":
    case "KILLED":
    default:
      return "idea";
  }
}

export type OperatorDecisionInput = {
  projectId: string;
  videoId?: string | null;
  stage: DirectorStage;
  action: DirectorAction;
  /** Latest agent/judge score for the artifact at decision time (null if unreviewed). */
  agentScore?: number | null;
  /** 'pass' | 'fail' relative to the (advisory) floor, or null. */
  agentVerdict?: "pass" | "fail" | null;
  operatorNotes?: string | null;
  /** Which review findings were attached to a revise/re-render. */
  findingsApplied?: unknown;
  /** Actual USD this action cost (delta on the video's ledger). */
  costUsd?: number | null;
};

/** Insert one decision row. Best-effort: a logging failure must never fail the
    operator's action (the ledger is observational, not on the critical path). */
export async function recordOperatorDecision(
  db: Db,
  input: OperatorDecisionInput,
): Promise<void> {
  try {
    await db.from("operator_decisions").insert({
      project_id: input.projectId,
      video_id: input.videoId ?? null,
      stage: input.stage,
      action: input.action,
      agent_score: input.agentScore ?? null,
      agent_verdict: input.agentVerdict ?? null,
      operator_notes: input.operatorNotes ?? null,
      findings_applied: input.findingsApplied ?? null,
      cost_usd: input.costUsd ?? null,
    });
  } catch (err) {
    console.error("recordOperatorDecision failed (non-fatal):", err);
  }
}

/** Read a video's cumulative spend — used to compute the per-action cost delta
    (spend after − spend before) that a decision row records. */
export async function videoSpendUsd(db: Db, videoId: string): Promise<number> {
  const { data } = await db
    .from("videos")
    .select("total_cost_usd")
    .eq("id", videoId)
    .maybeSingle();
  return Number((data as { total_cost_usd?: number } | null)?.total_cost_usd ?? 0);
}
