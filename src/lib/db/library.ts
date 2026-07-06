/**
 * Library classification — the pure core of the per-project Library
 * (Fable-5-UI-Redesign.md §6, D-2..D-5, D-17). Maps every video onto:
 *
 *  - one library SECTION (Ideas → Script → Production → Ready → Published),
 *  - one PROGRESS-RAIL step (Idea ▸ Script ▸ Assets ▸ Render ▸ Final ▸
 *    Publish ▸ Tracking) for the Asset Canvas header and tile progress bars,
 *  - the tile badges: awaiting-you 🟠, failed 🔴, autopilot 🤖.
 *
 * Purely presentational derivation — reads the same columns the engine
 * writes, never mutates. Section membership is UI-only; the state machine
 * (`packages/core`) stays the single source of truth for behavior.
 */
import { GATE_FOR_STATUS, type VideoStatus } from "@studio/core";
import type { Video } from "./types";
import { isLive } from "./pipeline";

export const LIBRARY_SECTIONS = [
  { key: "ideas", label: "Ideas" },
  { key: "script", label: "Script" },
  { key: "production", label: "Production" },
  { key: "ready", label: "Ready to publish" },
  { key: "published", label: "Published" },
] as const;

export type LibrarySectionKey = (typeof LIBRARY_SECTIONS)[number]["key"];

/** The Asset Canvas progress rail (D-6): 4 gate checkpoints + render +
    publish + tracking. */
export const RAIL_STEPS = [
  { key: "idea", label: "Idea", gate: true },
  { key: "script", label: "Script", gate: true },
  { key: "assets", label: "Assets", gate: true },
  { key: "render", label: "Render", gate: false },
  { key: "final", label: "Final", gate: true },
  { key: "publish", label: "Publish", gate: false },
  { key: "tracking", label: "Tracking", gate: false },
] as const;

const RAIL_INDEX: Record<VideoStatus, number> = {
  IDEA: 0,
  IDEA_APPROVED: 0,
  SCRIPTING: 1,
  SCRIPT_READY: 1,
  GENERATING_ASSETS: 2,
  ASSETS_READY: 2,
  ASSEMBLING: 3,
  FINAL_REVIEW: 4,
  APPROVED: 5,
  TRACKING: 6,
  // Mid-revision videos are looping back through script generation — show
  // them at the Script step rather than dropping them from the rail.
  NEEDS_REVISION: 1,
  KILLED: -1,
};

type LibraryVideo = Pick<
  Video,
  | "status"
  | "youtube_video_id"
  | "published_at"
  | "paused_reason"
  | "publish_requested"
  | "auto_publish"
  | "scheduled_publish_at"
  | "auto_pilot_run"
  | "build_run_id"
  | "auto_finish"
  | "total_cost_usd"
>;

/** 0-based step on the canvas rail; -1 for killed. Live overrides status
    (a published video whose status lagged still reads as Tracking). */
export function railIndexFor(v: Pick<LibraryVideo, "status" | "youtube_video_id" | "published_at">): number {
  if (v.status === "KILLED") return -1;
  if (isLive(v)) return 6;
  return RAIL_INDEX[v.status] ?? 0;
}

/** Which library section a video renders in; null = excluded (killed). */
export function librarySectionFor(
  v: Pick<LibraryVideo, "status" | "youtube_video_id" | "published_at">,
): LibrarySectionKey | null {
  const idx = railIndexFor(v);
  if (idx < 0) return null;
  if (idx >= 6) return "published";
  if (idx === 5) return "ready";
  if (idx >= 2) return "production";
  if (idx === 1) return "script";
  return "ideas";
}

export type TileState = {
  section: LibrarySectionKey | null;
  railIndex: number;
  /** 0–100 for the tile's segmented progress bar. */
  progressPercent: number;
  /** 🟠 the operator must act: open gate, visible pause, or approved-but-
      not-queued-for-upload. */
  awaitingYou: boolean;
  /** 🔴 subset of awaiting-you where something failed (render ×3, stage
      threw) rather than politely waiting. */
  failed: boolean;
  /** 🤖 owned by an autonomous run (operator, build run, or full-auto). */
  autopilot: boolean;
};

export function tileState(v: LibraryVideo): TileState {
  const railIndex = railIndexFor(v);
  const section = librarySectionFor(v);
  const live = isLive(v);
  const paused = Boolean(v.paused_reason) && v.status !== "KILLED" && !live;
  const awaitingUpload =
    v.status === "APPROVED" &&
    !live &&
    !v.publish_requested &&
    !v.auto_publish &&
    !v.scheduled_publish_at;
  return {
    section,
    railIndex,
    progressPercent:
      railIndex < 0 ? 0 : Math.round((railIndex / (RAIL_STEPS.length - 1)) * 100),
    awaitingYou:
      GATE_FOR_STATUS[v.status] !== undefined || paused || awaitingUpload,
    failed: paused && /fail/i.test(v.paused_reason ?? ""),
    autopilot: Boolean(v.auto_pilot_run || v.build_run_id || v.auto_finish),
  };
}
