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
import type { CaptionPage, CaptionToken, EddFormat, EditDocument, EddSource, MotionSpec, VideoClip, AudioCue } from "./edd";
import { ASPECT_FOR_FORMAT } from "./edd";

export type CompileWord = { w: string; start: number; end: number }; // beat-local seconds

export type CompileBeat = {
  idx: number;
  text: string;
  durationSec: number; // VO length (today's welded duration)
  voAssetId: string | null;
  visualAssetId: string | null;
  source: EddSource;
  heroHold?: boolean;
  words: CompileWord[];
};

export type CompileInput = {
  format: EddFormat;
  targetDurationSec: number;
  introSec: number; // render INTRO_SEC
  outroSec: number; // render OUTRO_SEC
  beats: CompileBeat[];
  /** Caption style name (must be a registered caption style). Default "clean". */
  captionStyle?: string;
  /** Words per caption page — mirrors today's ~5-word rolling window. */
  wordsPerPage?: number;
};

/** Today's Ken-Burns default (VideoComp: slow 1.0 → 1.12 zoom, centered). */
const KENBURNS_DEFAULT: MotionSpec = { kind: "kenburns", fromScale: 1.0, toScale: 1.12, anchor: "center" };

export function compileEdd(input: CompileInput): EditDocument {
  const captionStyle = input.captionStyle ?? "clean";
  const perPage = Math.max(1, input.wordsPerPage ?? 5);

  const video: VideoClip[] = [];
  const audio: AudioCue[] = [];
  const captions: CaptionPage[] = [];

  let cursor = input.introSec; // clips begin after the intro sting
  input.beats.forEach((b, i) => {
    const id = `v${i + 1}`;
    const start = cursor;
    const duration = Math.max(1 / 30, b.durationSec);
    const narrated = b.text.trim().length > 0;

    video.push({
      id,
      beatIdx: b.idx,
      assetId: b.visualAssetId,
      source: b.source,
      start,
      duration,
      trim: { in: 0, out: duration },
      motion: b.heroHold ? { kind: "heroHold", rate: 0.5 } : KENBURNS_DEFAULT,
      transitionOut: { kind: "cut" }, // faithful: today's beats are hard cuts
      // narrated beats without VO would fail validation; today the pipeline
      // guarantees VO for narrated beats, so silence is only for empty beats.
      silent: !narrated || b.voAssetId === null,
    });

    if (b.voAssetId) audio.push({ kind: "vo", assetId: b.voAssetId, start, gainDb: 0 });

    // Captions: paginate this beat's words into ≤perPage-word pages, converting
    // beat-local seconds → absolute ms (offset by the clip start).
    for (let w = 0; w < b.words.length; w += perPage) {
      const slice = b.words.slice(w, w + perPage);
      if (slice.length === 0) continue;
      const tokens: CaptionToken[] = slice.map((word) => ({
        text: word.w,
        fromMs: Math.round((start + word.start) * 1000),
        toMs: Math.round((start + word.end) * 1000),
        emphasis: "none",
      }));
      captions.push({
        startMs: tokens[0].fromMs,
        endMs: tokens[tokens.length - 1].toMs,
        tokens,
        style: captionStyle,
        position: "bottom",
      });
    }

    cursor = start + duration;
  });

  return {
    meta: {
      schemaVersion: 1,
      format: input.format,
      fps: 30,
      aspect: ASPECT_FOR_FORMAT[input.format],
      targetDurationSec: input.targetDurationSec,
    },
    intro: { sting: true, sec: input.introSec },
    outro: { endCard: true, sec: input.outroSec },
    tracks: { video, audio, captions, overlays: [] },
  };
}
