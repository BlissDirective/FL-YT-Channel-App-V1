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

/** Pipeline stages as displayed on the project FlowDiagram. */
export const PIPELINE_STAGES = [
  { key: "ideas", label: "Ideas", statuses: ["IDEA", "IDEA_APPROVED"] },
  { key: "script", label: "Script", statuses: ["SCRIPTING", "SCRIPT_READY"] },
  { key: "assets", label: "Assets", statuses: ["GENERATING_ASSETS", "ASSETS_READY"] },
  { key: "render", label: "Render", statuses: ["ASSEMBLING", "FINAL_REVIEW"] },
  { key: "ready", label: "Ready", statuses: ["APPROVED", "TRACKING"] },
] as const;

export type AutonomyMode = "assist" | "copilot" | "autopilot";
