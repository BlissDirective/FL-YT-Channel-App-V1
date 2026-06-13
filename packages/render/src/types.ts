export type WordTiming = { w: string; start: number; end: number };

export type RenderBeat = {
  idx: number;
  text: string;
  durationSec: number;
  words: WordTiming[];
  voUrl: string | null;
  /** Still image (FLUX) — gets a slow Ken Burns move. */
  imageUrl?: string;
  /** Stock footage (Pexels) — looped/trimmed to the beat. */
  videoUrl?: string;
  /** Source footage length, so loops cut cleanly. */
  videoDurationSec?: number;
  shotType: string;
};

export type VideoProps = {
  title: string;
  projectName: string;
  brand: { primary: string; secondary: string };
  beats: RenderBeat[];
};

export const FPS = 30;
export const INTRO_SEC = 2.5;
export const OUTRO_SEC = 4;

export function longFormDurationSec(props: VideoProps): number {
  return (
    INTRO_SEC +
    props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0) +
    OUTRO_SEC
  );
}

/** Beat start offsets in the final long-form timeline — stored in the
    render asset's meta so retention curves can be mapped back to beats
    (idea #2 foundation). */
export function beatTimeline(
  props: VideoProps,
): { idx: number; start: number; end: number }[] {
  let t = INTRO_SEC;
  return props.beats.map((b) => {
    const start = t;
    t += Math.max(1, b.durationSec);
    return { idx: b.idx, start: round2(start), end: round2(t) };
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;
