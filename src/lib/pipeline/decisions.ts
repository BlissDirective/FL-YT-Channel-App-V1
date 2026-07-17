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

// ── Decision audit trail (#9) + regenerable-asset provenance (C2) ──────────

/** The kinds of choice the studio logs. Free-form by design (a new provider
    category never needs a migration) — these are the ones the pipeline writes. */
export type DecisionKind =
  | "model" // which video model won the beat (from #1's scored selector)
  | "provider" // which provider/service was used
  | "medium" // remotion / still / i2v / t2v (the shot router)
  | "tier" // the auto-generate quality tier
  | "voice" // the narration voice
  | "music" // the soundtrack / bed
  | "style" // the visual style / bible
  | "fallback" // a fallback taken after a primary failed
  | "regenerate"; // an operator/agent re-roll of a single asset

export type DecisionAlternative = {
  id: string;
  label: string;
  /** 0..1 score if the choice was scored (e.g. the provider selector). */
  score?: number;
  costUsd?: number;
};

export type DecisionInput = {
  projectId?: string | null;
  videoId: string;
  /** Set for per-beat choices (model/still); omit for video-level ones. */
  beatIdx?: number | null;
  kind: DecisionKind;
  /** The option chosen (label or id). */
  choice: string;
  alternatives?: DecisionAlternative[];
  /** 0..1 confidence (e.g. the winner's normalised score). */
  confidence?: number | null;
  reasoning?: string | null;
  costUsd?: number | null;
  /** Exact request needed to reproduce the asset (C2). */
  params?: Record<string, unknown> | null;
};

/**
 * Append one decision to the per-video audit trail (#9). Best-effort: a logging
 * failure must never break generation (the trail is observational). Every mode
 * — autonomous, copilot, director — writes here, unlike the Director-only
 * `operator_decisions` ledger above.
 */
export async function recordDecision(db: Db, input: DecisionInput): Promise<void> {
  try {
    await db.from("decisions").insert({
      project_id: input.projectId ?? null,
      video_id: input.videoId,
      beat_idx: input.beatIdx ?? null,
      kind: input.kind,
      choice: input.choice,
      alternatives: input.alternatives ?? [],
      confidence: input.confidence ?? null,
      reasoning: input.reasoning ?? null,
      cost_usd: input.costUsd ?? null,
      params: input.params ?? {},
    });
  } catch (err) {
    console.error("recordDecision failed (non-fatal):", err);
  }
}

/** Batch insert (one round-trip for a whole beat plan). Best-effort. */
export async function recordDecisions(db: Db, inputs: DecisionInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await db.from("decisions").insert(
      inputs.map((input) => ({
        project_id: input.projectId ?? null,
        video_id: input.videoId,
        beat_idx: input.beatIdx ?? null,
        kind: input.kind,
        choice: input.choice,
        alternatives: input.alternatives ?? [],
        confidence: input.confidence ?? null,
        reasoning: input.reasoning ?? null,
        cost_usd: input.costUsd ?? null,
        params: input.params ?? {},
      })),
    );
  } catch (err) {
    console.error("recordDecisions failed (non-fatal):", err);
  }
}
