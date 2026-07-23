/**
 * Visual-grounding frame selection (Precision-Editing spec §C.1). Picks which
 * clips of a cut to render still frames for, so the MVDA cut agent can judge
 * framing / motion / b-roll "with its eyes" at the moments that matter — without
 * rendering the whole timeline. Pure + deterministic so it's unit-testable; the
 * agent worker does the actual Remotion `renderStill` for the returned specs.
 */

/** Minimal structural shape of a video clip needed to choose sample points. */
export type GroundingClip = {
  id: string;
  beatIdx: number;
  start: number; // timeline seconds
  duration: number; // seconds
  transitionOut?: { kind: string };
};

export type GroundingFrame = { beatIdx: number; clipId: string; atSec: number };

/**
 * Choose up to `maxFrames` clips to sample. Priority: always the first and last
 * clip (bookends), then every clip whose outgoing transition is a real cut-away
 * (a topic shift / decision point), then an even fill across the timeline. Each
 * sample is the clip's midpoint. Returned sorted by timeline position.
 */
export function selectGroundingFrames(clips: GroundingClip[], maxFrames = 6): GroundingFrame[] {
  const cap = Math.max(1, Math.floor(maxFrames));
  const at = (c: GroundingClip): GroundingFrame => ({
    beatIdx: c.beatIdx,
    clipId: c.id,
    atSec: Math.round((c.start + c.duration / 2) * 100) / 100,
  });
  if (clips.length === 0) return [];
  if (clips.length <= cap) return [...clips].sort((a, b) => a.start - b.start).map(at);

  const picks = new Map<string, GroundingClip>();
  const add = (c: GroundingClip | undefined) => {
    if (c && picks.size < cap) picks.set(c.id, c);
  };
  add(clips[0]);
  add(clips[clips.length - 1]);
  for (const c of clips) {
    if (c.transitionOut?.kind && c.transitionOut.kind !== "cut") add(c);
  }
  const step = Math.max(1, Math.ceil(clips.length / cap));
  for (let i = 0; i < clips.length && picks.size < cap; i += step) add(clips[i]);

  return [...picks.values()].sort((a, b) => a.start - b.start).map(at);
}
