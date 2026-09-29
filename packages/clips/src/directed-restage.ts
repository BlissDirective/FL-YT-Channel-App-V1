/**
 * A directed cut is compiled when a video's last open clip lands. A revision
 * round can queue a new clip in the moment between that check and the
 * compile, so the cut is staged without it (the section renders as an empty
 * plate) and, because the video already left ASSETS_READY, the new clip's own
 * landing never re-compiles it. INKLIGHT INK-03 (9/29) rendered 8 s of blank
 * frames this way.
 *
 * The rule: when a clip lands and nothing else is pending, a directed video
 * past ASSETS_READY whose newest cut is older than its newest clip gets its
 * cut re-compiled. Whichever order the race goes, the last clip to land
 * triggers a compile that includes it.
 */
export interface RestageInput {
  directed: boolean;
  status: string;
  openJobs: number;
  /** created_at of the newest edit document, or null when none exists. */
  latestCutAt: string | null;
  /** created_at of the newest clip asset, or null when none exists. */
  latestClipAt: string | null;
}

const PAST_ASSETS = new Set(["ASSEMBLING", "FINAL_REVIEW"]);

export function cutIsStale(v: RestageInput): boolean {
  if (!v.directed || v.openJobs > 0 || !PAST_ASSETS.has(v.status) || !v.latestClipAt) return false;
  if (!v.latestCutAt) return true;
  return Date.parse(v.latestClipAt) > Date.parse(v.latestCutAt);
}
