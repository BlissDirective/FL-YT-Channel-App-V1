import { GATE_FOR_STATUS, PIPELINE_STAGES, type VideoStatus } from "@studio/core";
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

/**
 * Why an approved video has/hasn't published yet — derived purely from its
 * DB state so the operator isn't left guessing. The common full-auto stall is
 * an approved video that either was never queued for auto-publish (manual
 * approval doesn't request publish) or is queued but the render farm can't
 * upload it (YouTube OAuth not configured on the farm).
 */
export function publishDiagnosis(
  v: Pick<Video, "status" | "youtube_video_id" | "published_at" | "publish_requested" | "auto_publish" | "scheduled_publish_at" | "updated_at">,
): { state: "live" | "queued" | "scheduled" | "manual" | "stalled"; message: string } {
  if (isLive(v)) return { state: "live", message: "Published to YouTube." };
  if (v.status !== "APPROVED") return { state: "manual", message: "" };

  if (v.scheduled_publish_at && new Date(v.scheduled_publish_at).getTime() > Date.now()) {
    return { state: "scheduled", message: `Scheduled to publish ${new Date(v.scheduled_publish_at).toLocaleString()}.` };
  }
  if (v.publish_requested) {
    // Queued for the render farm's upload pass. If it's been a while, the farm
    // likely can't upload — almost always missing YouTube OAuth on the farm.
    const ageMin = (Date.now() - new Date(v.updated_at).getTime()) / 60000;
    return ageMin > 45
      ? {
          state: "stalled",
          message:
            "Queued for upload but not published after 45+ min — the render farm can't upload. Check the render workflow's YOUTUBE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN secrets, or publish manually.",
        }
      : { state: "queued", message: "Queued — the render farm uploads on its next pass (usually within ~30 min)." };
  }
  if (v.auto_publish) {
    return { state: "queued", message: "Approved for auto-publish — waiting for its scheduled slot to be released." };
  }
  return {
    state: "manual",
    message: "Approved but not queued for auto-publish. Open the Publish Kit to upload to YouTube (or mark it uploaded).",
  };
}

/** Statuses an agent is actively working right now (a lane "lights up"). */
const PROCESSING_STATUSES = new Set<VideoStatus>([
  "SCRIPTING",
  "GENERATING_ASSETS",
  "ASSEMBLING",
  "NEEDS_REVISION",
]);

export type BacklotStage = {
  key: string;
  label: string;
  /** Videos currently in this lane. */
  total: number;
  /** Of those, how many an agent is actively working (drives the lane glow). */
  active: number;
  /** Of those, how many are waiting on the operator at a gate (your turn). */
  awaiting: number;
};

/**
 * Per-lane live stats for the Backlot production board (#8). One entry per
 * PIPELINE_STAGE, in order. `active` powers the pulsing "work happening here"
 * glow; `awaiting` powers the amber "your turn" pip. NEEDS_REVISION has no
 * pipeline stage of its own — it loops back through Script, so we count it
 * there (matching the library rail). Pure: derives from the videos only.
 */
export function backlotStages(videos: Video[]): BacklotStage[] {
  return PIPELINE_STAGES.map((stage) => {
    const inStage = videos.filter((v) => {
      if (v.status === "NEEDS_REVISION") return stage.key === "script";
      return effectiveStageKey(v) === stage.key;
    });
    return {
      key: stage.key,
      label: stage.label,
      total: inStage.length,
      active: inStage.filter((v) => PROCESSING_STATUSES.has(v.status)).length,
      awaiting: inStage.filter(
        (v) => !isLive(v) && GATE_FOR_STATUS[v.status] !== undefined,
      ).length,
    };
  });
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
