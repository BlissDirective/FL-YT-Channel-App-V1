/**
 * Scene detection on generated clips (OpenMontage Remixed list1 #17).
 *
 * A generated clip often contains internal cut points (a model "cuts" mid-clip)
 * that the editor should respect. This detects those cut points from ffmpeg's
 * scene-change scores and turns them into retime/trim suggestions the MVDA can
 * use for tighter cuts — trim to the most stable/relevant sub-scene rather than
 * playing across a jarring internal cut.
 *
 * Pure — the adapter runs ffmpeg `scdet`/`select=gt(scene,…)`; this evaluates
 * the timestamps deterministically for the unit tests.
 */

export type SceneCut = { atSec: number; score: number };
export type Scene = { start: number; end: number; durationSec: number };

/** Turn detected cut points (+ clip duration) into contiguous scenes. Pure. */
export function scenesFromCuts(cuts: SceneCut[], durationSec: number, minScene = 0.4): Scene[] {
  const points = [...cuts.map((c) => c.atSec)]
    .filter((t) => t > 0 && t < durationSec)
    .sort((a, b) => a - b);
  const bounds = [0, ...points, durationSec];
  const scenes: Scene[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i];
    const end = bounds[i + 1];
    const dur = Math.round((end - start) * 100) / 100;
    if (dur >= minScene) scenes.push({ start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, durationSec: dur });
  }
  return scenes.length ? scenes : [{ start: 0, end: durationSec, durationSec }];
}

/**
 * Pick the trim window for a target duration: the longest single scene that can
 * cover `targetSec` (so the cut never crosses an internal jump), else the
 * longest scene. Returns an { in, out } trim in clip seconds. Pure.
 */
export function sceneTrimSuggestion(
  scenes: Scene[],
  targetSec: number,
): { in: number; out: number; crossedCut: boolean } {
  if (scenes.length === 0) return { in: 0, out: targetSec, crossedCut: false };
  const covering = scenes.filter((s) => s.durationSec >= targetSec).sort((a, b) => b.durationSec - a.durationSec);
  if (covering.length) {
    const s = covering[0];
    // Center the target window inside the scene.
    const pad = Math.max(0, (s.durationSec - targetSec) / 2);
    return { in: Math.round((s.start + pad) * 100) / 100, out: Math.round((s.start + pad + targetSec) * 100) / 100, crossedCut: false };
  }
  // No single scene is long enough — keep the longest and accept a shorter clip.
  const longest = [...scenes].sort((a, b) => b.durationSec - a.durationSec)[0];
  return { in: longest.start, out: longest.end, crossedCut: true };
}

/** Would playing `[in,out]` cross any detected cut? (retime/QC signal). Pure. */
export function trimCrossesCut(cuts: SceneCut[], inSec: number, outSec: number): boolean {
  return cuts.some((c) => c.atSec > inSec + 0.05 && c.atSec < outSec - 0.05);
}
