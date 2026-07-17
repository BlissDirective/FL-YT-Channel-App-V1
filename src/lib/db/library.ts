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

/**
 * Whether a video occupies a slot in the WORKING library (Clean House §5 —
 * the library-size guardrail). Counts everything in the pipeline (Ideas →
 * Ready) EXCEPT Published/Tracking (live), Killed, and Archived. A Ready
 * (APPROVED) asset still counts until it is published or archived. Pure. */
export function countsTowardLibraryLimit(
  v: Pick<LibraryVideo, "status" | "youtube_video_id" | "published_at"> & { archived?: boolean | null },
): boolean {
  if (v.archived) return false;
  if (v.status === "KILLED") return false;
  if (isLive(v)) return false; // published / tracking
  return true;
}

/** Count assets occupying the working library (for the guardrail). Pure. */
export function activeLibraryCount(
  videos: (Pick<LibraryVideo, "status" | "youtube_video_id" | "published_at"> & { archived?: boolean | null })[],
): number {
  return videos.reduce((n, v) => n + (countsTowardLibraryLimit(v) ? 1 : 0), 0);
}

/** At/over the guardrail limit → autonomous seeding should pause. Pure. */
export function isOverLibraryLimit(activeCount: number, limit: number): boolean {
  return limit > 0 && activeCount >= limit;
}

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
    // A published/live asset is DONE — it never awaits the operator, even if
    // its status field lagged at a gate (a stranded-publish row whose
    // youtube_video_id / published_at is set) or it carries a stale
    // paused_reason. Without this, such rows land in the Published section yet
    // show a "your turn" badge + gate quick-actions (the reported bug).
    awaitingYou:
      !live && (GATE_FOR_STATUS[v.status] !== undefined || paused || awaitingUpload),
    failed: !live && paused && /fail/i.test(v.paused_reason ?? ""),
    autopilot: Boolean(v.auto_pilot_run || v.build_run_id || v.auto_finish),
  };
}

/** Live progress label (+ optional fraction) for an actively-processing video
    (#3). Asset generation carries a real "N/M clips" fraction; other worker
    stages carry a descriptive label. Null for non-processing statuses. Pure. */
export function liveProgress(
  status: string,
  done: number,
  total: number | undefined,
): { label: string; done?: number; total?: number } | null {
  switch (status) {
    case "SCRIPTING":
      return { label: "Writing script…" };
    case "GENERATING_ASSETS":
      return total && total > 0
        ? { label: `Generating ${Math.min(done, total)}/${total} clips`, done: Math.min(done, total), total }
        : { label: "Generating assets…" };
    case "ASSEMBLING":
      return { label: "Rendering…" };
    case "NEEDS_REVISION":
      return { label: "Revising…" };
    default:
      return null;
  }
}
