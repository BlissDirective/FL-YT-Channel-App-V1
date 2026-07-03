import { PIPELINE_STAGES, type VideoStatus } from "@studio/core";
import type { Video } from "./types";

/** A video that has reached YouTube (uploaded / published / tracking) belongs
    to the terminal "Ready" stage no matter what its status field says — this
    keeps a published video whose status lagged (e.g. stuck at ASSEMBLING) from
    being counted at, and shown in, the wrong stage. */
export function isLive(v: Pick<Video, "youtube_video_id" | "published_at" | "status">): boolean {
  return Boolean(v.youtube_video_id) || Boolean(v.published_at) || v.status === "TRACKING";
}

/**
 * The single stage a video belongs to, used by BOTH the flow-diagram counts
 * and the review-queue filter so the badge number always equals the list you
 * see when you click it. Returns null for videos outside the pipeline lanes
 * (KILLED, NEEDS_REVISION — the latter shows only in the unfiltered queue).
 */
export function effectiveStageKey(
  v: Pick<Video, "status" | "youtube_video_id" | "published_at">,
): string | null {
  if (isLive(v)) return "ready";
  for (const stage of PIPELINE_STAGES) {
    if ((stage.statuses as readonly VideoStatus[]).includes(v.status)) return stage.key;
  }
  return null;
}

/** Count videos at each pipeline stage for the FlowDiagram. */
export function stageCounts(videos: Video[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const stage of PIPELINE_STAGES) counts[stage.key] = 0;
  for (const v of videos) {
    const key = effectiveStageKey(v);
    if (key && key in counts) counts[key] += 1;
  }
  return counts;
}

const ACTIVE_STAGE_ORDER = ["ready", "render", "assets", "script", "ideas"];

/** The stage to emphasize (dark node): the furthest-along stage that has
    work in it, mirroring the reference's highlighted "Inverter" node. */
export function emphasisStage(counts: Record<string, number>): string {
  for (const key of ACTIVE_STAGE_ORDER) {
    if (counts[key] > 0) return key;
  }
  return "assets";
}
