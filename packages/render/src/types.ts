import { INTRO_SEC, OUTRO_SEC, RENDER_FPS, SHORT_TAIL_SEC, eddTimeline, introOutroRuntime } from "@studio/core";
import type { EditDocument } from "@studio/core";
import type { StickCast, StickScene } from "./stick/types";

export type WordTiming = { w: string; start: number; end: number };

export type { StickCast, StickScene };
// Timing constants live in @studio/core (shared with the app's EDD compiler
// wrapper); re-exported so render code keeps importing from "./types".
export { INTRO_SEC, OUTRO_SEC, SHORT_TAIL_SEC };

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
  /** Tier 9 #4 — extra stills for a multi-image section. When a still beat is
      long enough (≥ MULTI_IMAGE_MIN_SEC) and this holds ≥2 entries, BeatScene
      cross-dissolves through them with varied Ken-Burns instead of holding one
      frame. imageUrl is always the first image; these are the additions. */
  images?: string[];
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
  /** Tier 9.5 — programmatic data-viz insert (D3). When set, the beat renders an
      animated chart reveal instead of footage/stills. */
  dataViz?: ChartSpec;
  /** Tier 9.5 — Lottie icon/diagram b-roll insert (animationData URL). */
  lottie?: LottieSpec;
};

// ── Tier 9.5 — programmatic b-roll (data-viz + Lottie) ─────────────────

export type ChartKind = "bar" | "ranking" | "line";
export type ChartPoint = { label: string; value: number };
/** A data-viz reveal. Figures are LLM-supplied and fact-checked upstream; when
    they can't be confirmed the chart is flagged `illustrative` and rendered with
    an on-screen "Illustrative" tag so it never implies sourced precision. */
export type ChartSpec = {
  kind: ChartKind;
  title: string;
  /** Value unit, e.g. "$B", "%", "M users". Shown on labels. */
  unit?: string;
  /** 2–6 data points, pre-ordered for ranking/bar. */
  points: ChartPoint[];
  /** Attribution or basis label (e.g. "Source: FRED, 2024" or "Illustrative"). */
  source?: string;
  illustrative?: boolean;
};

export type LottieSpec = {
  /** Signed URL (or storage path resolved upstream) to a Lottie JSON file. */
  url: string;
  loop?: boolean;
};

// ── EDD render payload (MVDA Phase A pt 2) ────────────────────────────
// buildProps attaches this when videos.edit_document_version is set. The doc
// is the cut; media/audio resolve its asset references to signed URLs. The
// legacy `beats` stay populated alongside (freebie Short, thumbnail pick and
// chart QC still read them) — only the LongForm/VerticalShort timeline
// switches to the document.

/** Per-asset resolved visual media — the same fields BeatScene consumes. */
export type EddClipMedia = {
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  videoDurationSec?: number;
  stickScene?: StickScene;
  dataViz?: ChartSpec;
  lottie?: LottieSpec;
};

export type EddPayload = {
  version: number;
  doc: EditDocument;
  /** clip assetId → resolved visual media (signed URLs). */
  media: Record<string, EddClipMedia>;
  /** audio assetId (VO / generated SFX) → signed URL. */
  audio: Record<string, string>;
  /** curated library SFX name → URL (empty until a licensed pack lands, D7). */
  sfxLibrary?: Record<string, string>;
  /** beat idx (stringified — inputProps JSON round-trip) → narration text,
      for the no-footage fallback card. */
  beatText?: Record<string, string>;
};

export type VideoProps = {
  title: string;
  projectName: string;
  brand: { primary: string; secondary: string };
  beats: RenderBeat[];
  /** The explicit timeline (EDD). When set, LongForm/VerticalShort render the
      document instead of the legacy beat derivation. */
  edd?: EddPayload;
  /** Render word-window captions. Default true; off pairs with Kinetic
      Highlights so the two text layers don't clutter the frame. */
  captions?: boolean;
  /** Stick Studio: the recurring character identity for stick-figure videos. */
  stickCast?: StickCast;
  /** Tier 9 #2 — narrated intro title card. Hero still/clip + a bold kinetic
      phrase of the topic at video start. All optional: missing fields degrade
      to the branded gradient + title (the legacy sting). */
  heroImageUrl?: string;
  heroVideoUrl?: string;
  introPhrase?: string;
  /** Short narrated hook line played over the intro card (≤ INTRO_SEC). */
  introVoUrl?: string;
  /** Song videos (children's-channel build): a full sung track that plays
      across the WHOLE video. Beats carry no VO in this mode — the song is
      the audio — so visuals are cut to the song instead of to narration. */
  songUrl?: string;
  /** Reusable branded channel intro (projects.brand_kit.heroIntro). When set,
      a procedural motion-graphics open plays FIRST, before the topic sting, for
      `seconds` — the same component brands every video of the channel. */
  channelIntro?: { title: string; tagline?: string; seconds: number };
};

export const FPS = RENDER_FPS;

export function longFormDurationSec(props: VideoProps): number {
  if (props.edd) return introOutroRuntime(props.edd.doc) + (props.channelIntro?.seconds ?? 0);
  return (
    (props.channelIntro?.seconds ?? 0) +
    INTRO_SEC +
    props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0) +
    OUTRO_SEC
  );
}

/** Full vertical short: all beats back-to-back plus the CTA tail. */
export function verticalShortDurationSec(props: VideoProps): number {
  if (props.edd) return introOutroRuntime(props.edd.doc);
  return (
    props.beats.reduce((s, b) => s + Math.max(1, b.durationSec), 0) + SHORT_TAIL_SEC
  );
}

/** Beat start offsets in the final long-form timeline — stored in the
    render asset's meta so retention curves can be mapped back to beats
    (idea #2 foundation). EDD videos map per-clip (finer attribution, §3). */
export function beatTimeline(
  props: VideoProps,
): { idx: number; start: number; end: number }[] {
  if (props.edd) return eddTimeline(props.edd.doc);
  let t = INTRO_SEC + (props.channelIntro?.seconds ?? 0);
  return props.beats.map((b) => {
    const start = t;
    t += Math.max(1, b.durationSec);
    return { idx: b.idx, start: round2(start), end: round2(t) };
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;
