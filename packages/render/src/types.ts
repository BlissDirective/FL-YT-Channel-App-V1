import type { StickCast, StickScene } from "./stick/types";

export type WordTiming = { w: string; start: number; end: number };

export type { StickCast, StickScene };

// ── Kinetic Highlights ────────────────────────────────────────────────
// Keep these unions in sync with src/lib/db/types.ts (the app owns curation;
// this package owns rendering and can't import app code).

export type HighlightPreset =
  | "word-pop"
  | "highlight-box-swipe"
  | "stat-card"
  | "quote-card"
  | "typewriter"
  | "color-flash-pop"
  | "sticker-tag"
  | "underline-swipe";

export type HighlightPosition = "center" | "upper-third" | "lower-third-safe";
export type HighlightIntensity = "subtle" | "med" | "high";

/** A highlight resolved for rendering: curated fields + beat-local timing
    (startMs/endMs relative to the beat's audio) computed in buildProps. */
export type Highlight = {
  id: string;
  text: string;
  emphasisWord?: string;
  stylePreset: HighlightPreset;
  fontFamily: string;
  emphasisColor?: string;
  position: HighlightPosition;
  intensity: HighlightIntensity;
  maxLines: number;
  /** Beat-local milliseconds. */
  startMs: number;
  endMs: number;
};

export type RenderBeat = {
  idx: number;
  text: string;
  durationSec: number;
  words: WordTiming[];
  voUrl: string | null;
  /** Still image (FLUX) — gets a slow Ken Burns move. */
  imageUrl?: string;
  /** Stock or generated footage — looped/held to the beat. */
  videoUrl?: string;
  /** Source footage length, so loops cut cleanly. */
  videoDurationSec?: number;
  /** Hero clip: slow-pan + stretch to fill the section instead of looping. */
  heroHold?: boolean;
  shotType: string;
  /** Art-director camera motion for stills/clips (default 'zoom-in' when unset):
      'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'static'. */
  motion?: string;
  /** Curated kinetic-highlight overlays anchored to this beat. */
  highlights?: Highlight[];
  /** Stick Studio: programmatic stick-figure scene for this beat. When set, the
      visual layer renders <StickStage> instead of footage/stills. */
  stickScene?: StickScene;
};

export type VideoProps = {
  title: string;
  projectName: string;
  brand: { primary: string; secondary: string };
  beats: RenderBeat[];
  /** Render word-window captions. Default true; off pairs with Kinetic
      Highlights so the two text layers don't clutter the frame. */
  captions?: boolean;
  /** Stick Studio: the recurring character identity for stick-figure videos. */
  stickCast?: StickCast;
};

export const FPS = 30;
export const INTRO_SEC = 2.5;
export const OUTRO_SEC = 4;
/** CTA tail appended after the last beat of a full vertical short. */
export const SHORT_TAIL_SEC = 1.5;

export function longFormDurationSec(props: VideoProps): number {
  return (
    INTRO_SEC +
    props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0) +
    OUTRO_SEC
  );
}

/** Full vertical short: all beats back-to-back plus the CTA tail. */
export function verticalShortDurationSec(props: VideoProps): number {
  return (
    props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0) + SHORT_TAIL_SEC
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
