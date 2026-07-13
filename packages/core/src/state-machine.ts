/**
 * Video production state machine — single source of truth for pipeline state.
 * See docs/Full-App-Development-plan.md §2.
 */

export const VIDEO_STATUSES = [
  "IDEA",
  "IDEA_APPROVED",
  "SCRIPTING",
  "SCRIPT_READY",
  "GENERATING_ASSETS",
  "ASSETS_READY",
  "ASSEMBLING",
  "FINAL_REVIEW",
  "APPROVED",
  "TRACKING",
  "NEEDS_REVISION",
  "KILLED",
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const APPROVAL_GATES = [
  "IDEA",
  "SCRIPT",
  "ASSETS",
  "FINAL",
] as const;

export type ApprovalGate = (typeof APPROVAL_GATES)[number];

/** Gate that pauses the pipeline at each reviewable status. */
export const GATE_FOR_STATUS: Partial<Record<VideoStatus, ApprovalGate>> = {
  IDEA: "IDEA",
  SCRIPT_READY: "SCRIPT",
  ASSETS_READY: "ASSETS",
  FINAL_REVIEW: "FINAL",
};

/** Forward transitions when a gate is approved. */
export const ON_APPROVE: Partial<Record<VideoStatus, VideoStatus>> = {
  IDEA: "IDEA_APPROVED",
  SCRIPT_READY: "GENERATING_ASSETS",
  ASSETS_READY: "ASSEMBLING",
  FINAL_REVIEW: "APPROVED",
};

/** Stage to re-run when a gate gets a revision request. The pipeline
    passes the reviewer's notes into the regenerated artifact. */
export const REVISION_TARGET: Record<ApprovalGate, VideoStatus> = {
  IDEA: "IDEA",
  SCRIPT: "SCRIPTING",
  ASSETS: "GENERATING_ASSETS",
  FINAL: "ASSEMBLING",
};

/** Reverse transitions — send a video back one stage to the previous gate
    (e.g. mid-asset-generation back to script approval) when the operator
    changes their mind. Each lands on a paused, reviewable status so the
    script can be edited/remixed or re-run through Full Auto. */
export const PREVIOUS_STAGE: Partial<Record<VideoStatus, VideoStatus>> = {
  SCRIPT_READY: "IDEA",
  GENERATING_ASSETS: "SCRIPT_READY",
  ASSETS_READY: "SCRIPT_READY",
  ASSEMBLING: "ASSETS_READY",
  FINAL_REVIEW: "ASSETS_READY",
};

/** Whether a video at this status can be stepped back to the previous stage. */
export function canStepBack(status: VideoStatus): boolean {
  return status in PREVIOUS_STAGE;
}

/** Human-readable gate names for cards and notifications. */
export const GATE_LABELS: Record<ApprovalGate, string> = {
  IDEA: "Idea",
  SCRIPT: "Script",
  ASSETS: "Assets",
  FINAL: "Final cut",
};

/** Pipeline stages as displayed on the project FlowDiagram. */
export const PIPELINE_STAGES = [
  { key: "ideas", label: "Ideas", statuses: ["IDEA", "IDEA_APPROVED"] },
  { key: "script", label: "Script", statuses: ["SCRIPTING", "SCRIPT_READY"] },
  { key: "assets", label: "Assets", statuses: ["GENERATING_ASSETS", "ASSETS_READY"] },
  { key: "render", label: "Render", statuses: ["ASSEMBLING", "FINAL_REVIEW"] },
  { key: "ready", label: "Ready", statuses: ["APPROVED", "TRACKING"] },
] as const;

export type AutonomyMode = "assist" | "copilot" | "autopilot";

/** Per-project orchestration mode (Director Mode spec §3.1). 'autonomous' is
    the engine-driven default; 'director' hands every transition to the
    operator. Kept in core so the engine, actions, and UI share one source. */
export type PipelineMode = "autonomous" | "director";

export const DEFAULT_PIPELINE_MODE: PipelineMode = "autonomous";

/** The single predicate every guard branches on. Treats a missing/unknown
    value as autonomous so a pre-migration row can never accidentally read as
    director (fail-safe toward today's behavior). */
export function isDirectorMode(
  project: { pipeline_mode?: string | null } | null | undefined,
): boolean {
  return project?.pipeline_mode === "director";
}
