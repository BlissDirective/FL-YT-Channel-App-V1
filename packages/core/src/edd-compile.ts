/**
 * compileEdd — the Phase A bridge (Fable-5-MVDA-Build-Plan.md §2.4). Turns
 * today's implicit timeline (script beats + their assets, where a beat's
 * duration IS its voiceover length) into a faithful EDD v1 that renders the
 * same cut: gapless clips, VO-driven durations, Ken-Burns default, hard cuts,
 * intro/outro constants, captions paginated from the stored word timings.
 *
 * Pure: the caller (render-path DB wrapper) assembles CompileInput from
 * scripts+assets and passes the render package's INTRO_SEC/OUTRO_SEC so core
 * needs no dependency on the render package. It INVENTS no edits — every new
 * capability (trims, transitions, keyframes, SFX) starts at its today-default,
 * leaving humans/the agent to add them in Phase B/C.
 */
import type { CaptionPage, CaptionToken, EddFormat, EditDocument, EddSource, MotionSpec, Overlay, VideoClip, AudioCue } from "./edd";
import { ASPECT_FOR_FORMAT } from "./edd";

export type CompileWord = { w: string; start: number; end: number }; // beat-local seconds

/** Is a clip asset's meta footage (vs a still)? Generated clips set isVideo;
    external (Pexels) clips carry a url. ONE definition shared by the render
    farm's media resolution and the compiler wrapper so the two can never
    classify an asset differently (audit A17). */
export function isVideoClipMeta(meta: { isVideo?: unknown; url?: unknown } | null | undefined): boolean {
  return Boolean(meta?.isVideo || meta?.url);
}

/** A curated kinetic highlight with beat-local timing already resolved (the
    caller runs resolveHighlightTiming so compiled timings match the legacy
    render exactly — audit A7). */
export type CompileHighlight = {
  text: string;
  startMs: number; // beat-local
  endMs: number; // beat-local
  stylePreset: string;
  emphasisWord?: string;
  fontFamily?: string;
  emphasisColor?: string;
  position?: "center" | "upper-third" | "lower-third-safe";
  intensity?: "subtle" | "med" | "high";
  maxLines?: number;
};

export type CompileBeat = {
  idx: number;
  text: string;
  durationSec: number; // VO length (today's welded duration)
  voAssetId: string | null;
  visualAssetId: string | null;
  source: EddSource;
  heroHold?: boolean;
  /** Art-director camera move from the script beat ('zoom-in' | 'zoom-out' |
      'pan-left' | 'pan-right' | 'pan-up' | 'static'; default zoom-in). The
      compiler maps it onto MotionSpec so the compiled cut keeps the legacy
      camera variety (audit A11). */
  motion?: string;
  /** Source length of the visual asset when known (video clips). The trim
      window is clamped to it — legacy LOOPS a shorter source across the beat
      (loop/rate live in the render path; trim is only the source window), so
      an unclamped trim.out would fail validateEdd (audit A3b). */
  visualDurationSec?: number;
  /** True when the visual is footage. Legacy applies the art-director camera
      move only to STILLS — non-hero footage plays untransformed — so the
      compiler emits {kind:"none"} for it (audit A12). */
  visualIsVideo?: boolean;
  words: CompileWord[];
  /** Curated highlights for this beat, timing-resolved (beat-local ms). */
  highlights?: CompileHighlight[];
};

export type CompileInput = {
  format: EddFormat;
  /** Target from the tier/brief. Omitted → the actual computed runtime, so a
      compiled v1 of ANY legacy video validates regardless of how far its VO
      drifted from the brief (audit A3). */
  targetDurationSec?: number;
  introSec: number; // long: render INTRO_SEC · short: 0 (VerticalShort has no sting)
  outroSec: number; // long: render OUTRO_SEC · short: SHORT_TAIL_SEC (compact end card)
  beats: CompileBeat[];
  /** Caption style name (must be a registered caption style). Default "clean". */
  captionStyle?: string;
  /** Words per caption page — mirrors today's ~5-word rolling window. */
  wordsPerPage?: number;
  /** Legacy LongForm renders a CTA lower-third at 70% of the runtime for 5s
      (VideoComp). The caller passes the copy (owned by the render package) so
      the compiled EDD owns the cue; omit for shorts, which have none. */
  ctaText?: string;
};

/**
 * Map the legacy art-director motion string onto a MotionSpec that renders
 * the SAME camera move (audit A11 — VideoComp.motionStyle is the reference:
 * zoom-in 1.02→1.12, zoom-out 1.12→1.02, static 1.04→1.06, pans hold scale
 * 1.12 and translate ±3% across the beat). Pans become keyframe tracks; x/y
 * keyframe values are % of the frame. Exported so goldens can assert it.
 */
export function legacyMotionToSpec(motion: string | undefined, durationSec: number): MotionSpec {
  switch (motion) {
    case "zoom-out":
      return { kind: "kenburns", fromScale: 1.12, toScale: 1.02, anchor: "center" };
    case "static":
      return { kind: "kenburns", fromScale: 1.04, toScale: 1.06, anchor: "center" };
    case "pan-left":
      return {
        kind: "keyframes",
        points: [
          { t: 0, scale: 1.12, x: 3, y: 0, ease: "linear" },
          { t: durationSec, scale: 1.12, x: -3, y: 0, ease: "linear" },
        ],
      };
    case "pan-right":
      return {
        kind: "keyframes",
        points: [
          { t: 0, scale: 1.12, x: -3, y: 0, ease: "linear" },
          { t: durationSec, scale: 1.12, x: 3, y: 0, ease: "linear" },
        ],
      };
    case "pan-up":
      return {
        kind: "keyframes",
        points: [
          { t: 0, scale: 1.12, x: 0, y: 3, ease: "linear" },
          { t: durationSec, scale: 1.12, x: 0, y: -3, ease: "linear" },
        ],
      };
    case "zoom-in":
    default:
      return { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" };
  }
}

export function compileEdd(input: CompileInput): EditDocument {
  const captionStyle = input.captionStyle ?? "clean";
  const perPage = Math.max(1, input.wordsPerPage ?? 5);

  const video: VideoClip[] = [];
  const audio: AudioCue[] = [];
  const captions: CaptionPage[] = [];
  const overlays: Overlay[] = [];

  let cursor = input.introSec; // clips begin after the intro sting (0 for shorts)
  input.beats.forEach((b, i) => {
    const id = `v${i + 1}`;
    const start = cursor;
    // Legacy floors every beat at 1s — Math.max(1, durationSec) in
    // beatTimeline/longFormDurationSec/VideoComp — so the compiler must too,
    // or every start after a sub-1s beat drifts (audit A1).
    const duration = Math.max(1, b.durationSec);
    const narrated = b.text.trim().length > 0;

    video.push({
      id,
      beatIdx: b.idx,
      assetId: b.visualAssetId,
      source: b.source,
      start,
      duration,
      trim: { in: 0, out: Math.max(1 / 30, Math.min(duration, b.visualDurationSec ?? duration)) },
      // heroHold renders the default slow zoom at 0.5× playback (a per-clip
      // pan on a hero clip is not representable in v1 — documented exclusion).
      // Non-hero footage plays untransformed, exactly like the legacy path
      // (A12); stills get the art-director move (A11).
      motion: b.heroHold
        ? { kind: "heroHold", rate: 0.5 }
        : b.visualIsVideo
          ? { kind: "none" }
          : legacyMotionToSpec(b.motion, duration),
      transitionOut: { kind: "cut" }, // faithful: today's beats are hard cuts
      // narrated beats without VO would fail validation; today the pipeline
      // guarantees VO for narrated beats, so silence is only for empty beats.
      silent: !narrated || b.voAssetId === null,
    });

    if (b.voAssetId) {
      // trim = the beat's window. Legacy hard-cuts VO at the beat boundary
      // (its <Audio> lived inside the beat's Sequence); without this a VO
      // file longer than its recorded duration bleeds over the next beat's
      // narration (audit A14).
      audio.push({ kind: "vo", assetId: b.voAssetId, start, gainDb: 0, trim: { in: 0, out: duration } });
    }

    // Captions: sanitize the beat's word timings first — ASR word timestamps
    // routinely overlap by a few ms or run past the VO duration, and the
    // validator hard-rejects overlap/non-monotonic tokens (audit A15). Then
    // paginate into ≤perPage-word pages in absolute ms. Pages HOLD until the
    // next page starts (last page: to the clip end), matching the legacy
    // sliding window, which keeps the current chunk on screen until the next
    // begins (audit A15b). Verticals center their captions (audit A16).
    const clipStartMs = Math.round(start * 1000);
    const clipEndMs = Math.round((start + duration) * 1000);
    let prevTokEnd = clipStartMs;
    const cleanWords: CaptionToken[] = [];
    for (const word of b.words) {
      const rawFrom = Math.round((start + word.start) * 1000);
      const rawTo = Math.round((start + word.end) * 1000);
      const fromMs = Math.max(rawFrom, prevTokEnd);
      const toMs = Math.min(Math.max(rawTo, fromMs + 1), clipEndMs);
      if (fromMs >= clipEndMs || toMs <= fromMs) continue; // degenerate / outside the beat
      cleanWords.push({ text: word.w, fromMs, toMs, emphasis: "none" });
      prevTokEnd = toMs;
    }
    const beatPages: CaptionPage[] = [];
    for (let w = 0; w < cleanWords.length; w += perPage) {
      const tokens = cleanWords.slice(w, w + perPage);
      beatPages.push({
        startMs: tokens[0].fromMs,
        endMs: tokens[tokens.length - 1].toMs, // extended below
        tokens,
        style: captionStyle,
        position: input.format === "short" ? "center" : "bottom",
      });
    }
    for (let p = 0; p < beatPages.length; p++) {
      beatPages[p].endMs = p + 1 < beatPages.length ? beatPages[p + 1].startMs : clipEndMs;
    }
    captions.push(...beatPages);

    // Curated kinetic highlights → highlight overlays (absolute ms, style =
    // the render preset name, abs-anchored at their resolved start — A7).
    for (const h of b.highlights ?? []) {
      overlays.push({
        kind: "highlight",
        text: h.text,
        startMs: Math.round(start * 1000 + h.startMs),
        endMs: Math.round(start * 1000 + h.endMs),
        style: h.stylePreset,
        anchor: { kind: "abs", sec: start + h.startMs / 1000 },
        emphasisWord: h.emphasisWord,
        fontFamily: h.fontFamily,
        emphasisColor: h.emphasisColor,
        position: h.position,
        intensity: h.intensity,
        maxLines: h.maxLines,
      });
    }

    cursor = start + duration;
  });

  const runtimeSec = cursor + input.outroSec; // intro + Σ clips + outro

  // Faithful CTA lower-third: LongForm shows it at 70% of the total for 5s.
  if (input.ctaText) {
    overlays.push({
      kind: "lowerThird",
      text: input.ctaText,
      startSec: runtimeSec * 0.7,
      durationSec: 5,
    });
  }

  return {
    meta: {
      schemaVersion: 1,
      format: input.format,
      fps: 30,
      aspect: ASPECT_FOR_FORMAT[input.format],
      targetDurationSec: input.targetDurationSec ?? runtimeSec,
    },
    // Shorts have neither sting nor a full end card — the flags follow the
    // durations the caller passed (audit A2): long = INTRO_SEC/OUTRO_SEC,
    // short = 0/SHORT_TAIL_SEC (the compact CTA tail).
    intro: { sting: input.introSec > 0, sec: input.introSec },
    outro: { endCard: input.outroSec > 0, sec: input.outroSec },
    tracks: { video, audio, captions, overlays },
  };
}
