import { PIPELINE_STAGES, type VideoStatus } from "@studio/core";
import type { Video } from "./types";

/** Count videos at each pipeline stage for the FlowDiagram. */
export function stageCounts(videos: Video[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const stage of PIPELINE_STAGES) {
    counts[stage.key] = videos.filter((v) =>
      (stage.statuses as readonly VideoStatus[]).includes(v.status),
    ).length;
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
