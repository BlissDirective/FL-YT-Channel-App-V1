/**
 * Directed production — an operator/director-authored script that the
 * pipeline executes VERBATIM (docs/production/directed-pipeline.md).
 *
 * The autonomous pipeline derives everything (Claude script → art-director
 * rewrite → VO-welded beat lengths → Ken-Burns cut). A directed script instead
 * pins every creative decision a production brief makes: exact section
 * seconds, per-character dialogue with timing, the literal video prompt and
 * keyframe prompt, model + look overrides, reference images, end frames
 * (loops), SFX cues, a music bed, on-screen labels, snap-zooms, the brand
 * sting and the outro. Nothing downstream may rewrite it.
 *
 * Pure: types + a validating parser + the EDD compiler. No I/O (repo
 * convention — the app, the clip worker and the render farm all import this).
 */
import type { AudioCue, CaptionPage, CaptionToken, EddContext, EditDocument, MotionSpec, Overlay, Transition, VideoClip } from "./edd";
import { ASPECT_FOR_FORMAT, DEFAULT_CAPTION_STYLES, DEFAULT_OVERLAY_STYLES, DEFAULT_TRANSITIONS } from "./edd";

// ── Spec ──────────────────────────────────────────────────────────────

/** A spoken line. `at` is seconds from the SECTION start. */
export type DirectedLine = { speaker: string; text: string; at: number };

/** A sound-effect cue, generated from its text prompt (ElevenLabs SFX). */
export type DirectedSfx = { at: number; prompt: string; durationSec?: number; gainDb?: number };

/** On-screen text composited at render (never baked into generated plates). */
export type DirectedLabel = {
  at: number;
  durationSec: number;
  text: string;
  position?: LabelPosition;
  style?: LabelStyle;
  /** Hex color; defaults to the brand primary. */
  color?: string;
};
export type LabelPosition = "top" | "center" | "bottom" | "lower-third";
export type LabelStyle = "label" | "title" | "caption-bold";

/** A snap-zoom punch-in at `at` (section seconds): 1.0 → toScale over overSec,
    held for holdSec, then eased back over overSec. */
export type DirectedZoom = { at: number; toScale?: number; overSec?: number; holdSec?: number };

export const DIRECTED_MODELS = ["hf-cinema-studio-4", "hf-seedance-2-5"] as const;
export type DirectedModel = (typeof DIRECTED_MODELS)[number];

export const DIRECTED_TRANSITIONS = ["cut", "whip", "crossfade", "dipToBlack"] as const;
export type DirectedTransition = (typeof DIRECTED_TRANSITIONS)[number];

export type DirectedSection = {
  /** Zero-based, contiguous. */
  idx: number;
  /** Target = generated seconds (4–120; >30 stitches seamlessly). */
  sec: number;
  label?: string;
  lines: DirectedLine[];
  /** Pasted verbatim into the video model — never paraphrased. */
  videoPrompt: string;
  /** SOUL keyframe (first frame). Omit → text-to-video. */
  keyframePrompt?: string;
  /** Landing frame (end_image_url, Seedance 2.5): another section's keyframe
      (a loop: `{ fromSection: 0 }`) or its own prompt. Final segment only. */
  endFrame?: { fromSection: number } | { prompt: string };
  /** Per-section model override (e.g. a CS4 set-piece in a Seedance channel). */
  model?: DirectedModel;
  /** Cinema Studio look overrides, merged over the channel's cinemaControls. */
  controls?: Record<string, string>;
  /** Reference images: Character Studio names or storage paths ("media/…"). */
  refs?: string[];
  /** Seedance native audio (ambience-only shots). Default false. */
  generateAudio?: boolean;
  sfx?: DirectedSfx[];
  labels?: DirectedLabel[];
  zooms?: DirectedZoom[];
  /** Words to color-emphasize in this section's captions. */
  highlightWords?: string[];
  transitionOut?: DirectedTransition;
  /** Reuse an already-generated clip (a channel ident/outro plate) instead of
      generating: the source video + section. */
  reuse?: { videoId: string; sectionIdx: number };
  /** Chained segments for a section longer than one generation (> 30s): each
      segment's own seconds (4–30) and verbatim motion prompt, generated in
      order from the previous segment's last frame. Seconds must sum to `sec`.
      Omit → the worker splits 30s + remainder with `videoPrompt` for all. */
  segments?: { sec: number; prompt: string }[];
  /** Play this section's generated clip time-reversed (a "B1 reversed"
      rewind beat). Generated forward, reversed by the worker. */
  reverse?: boolean;
};

export type DirectedScript = {
  version: 1;
  format: "short" | "long";
  /** Generation resolution for every section (default 720p). Higgsfield
      bills 480p at $0.2056/s and 720p at $0.4622/s (Seedance 2.5 and
      Cinema Studio 4.0 alike), so this is the main spend lever. */
  resolution?: "480p" | "720p";
  title: string;
  altTitles?: string[];
  description?: string;
  tags?: string[];
  topic?: string;
  /** Speaker → display color (caption emphasis). Voices live on the project
      (brand_kit.voiceCast), so one cast serves every video. */
  cast?: Record<string, { color?: string }>;
  sections: DirectedSection[];
  music?: { prompt: string; gainDb?: number; underVoDb?: number };
  /** Brand sting overlaid AFTER the hook (never before frame 1). */
  sting?: { at: number; sec: number };
  /** Outro. `card` = a dedicated end card after the last section; `overlay` =
      a branded end beat over the final seconds (loop-safe: the picture keeps
      flowing into frame 1). */
  outro?: { mode: "card" | "overlay"; sec: number; cta?: string };
  watermark?: boolean;
  captions?: boolean;
  /** The brief's QC acceptance criteria, kept with the script for review. */
  qc?: string;
};

// ── Parser / validator ────────────────────────────────────────────────

export type DirectedParse = { ok: true; script: DirectedScript } | { ok: false; errors: string[] };

const MIN_SEC = 4;
const MAX_SEC = 120;
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Validate + normalize untrusted input (MCP tool args) into a DirectedScript.
 * Returns ALL problems at once so a brief can be fixed in one pass. Text is
 * preserved verbatim (only trimmed) — the whole point is fidelity.
 */
export function parseDirectedScript(raw: unknown): DirectedParse {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  if (!isObj(raw)) return { ok: false, errors: ["script must be an object"] };

  const format = raw.format === "short" || raw.format === "long" ? raw.format : undefined;
  if (!format) err("format must be 'short' or 'long'");
  if (raw.resolution !== undefined && raw.resolution !== "480p" && raw.resolution !== "720p") err("resolution must be '480p' or '720p'");
  const title = str(raw.title);
  if (!title) err("title required");
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) {
    return { ok: false, errors: [...errors, "sections must be a non-empty array"] };
  }

  const sections: DirectedSection[] = raw.sections.map((s, i): DirectedSection => {
    const w = `sections[${i}]`;
    if (!isObj(s)) {
      err(`${w} must be an object`);
      return { idx: i, sec: MIN_SEC, lines: [], videoPrompt: "" };
    }
    const sec = num(s.sec);
    if (sec == null || sec < MIN_SEC || sec > MAX_SEC) err(`${w}.sec must be ${MIN_SEC}–${MAX_SEC}`);
    const videoPrompt = str(s.videoPrompt);
    const reuse = isObj(s.reuse) && str(s.reuse.videoId) && num(s.reuse.sectionIdx) != null
      ? { videoId: str(s.reuse.videoId)!, sectionIdx: num(s.reuse.sectionIdx)! }
      : undefined;
    if (!videoPrompt && !reuse) err(`${w}.videoPrompt required (or reuse)`);
    const lines: DirectedLine[] = [];
    for (const [j, l] of (Array.isArray(s.lines) ? s.lines : []).entries()) {
      const text = isObj(l) ? str(l.text) : undefined;
      const at = isObj(l) ? num(l.at) ?? 0 : 0;
      if (!isObj(l) || !text) {
        err(`${w}.lines[${j}] needs text`);
        continue;
      }
      if (sec != null && (at < 0 || at >= sec)) err(`${w}.lines[${j}].at must be inside the section`);
      lines.push({ speaker: str(l.speaker) ?? "N", text, at });
    }
    lines.sort((a, b) => a.at - b.at);
    const model = DIRECTED_MODELS.includes(s.model as DirectedModel) ? (s.model as DirectedModel) : undefined;
    if (s.model != null && !model) err(`${w}.model must be one of ${DIRECTED_MODELS.join(", ")}`);
    let endFrame: DirectedSection["endFrame"];
    if (isObj(s.endFrame)) {
      const from = num(s.endFrame.fromSection);
      const prompt = str(s.endFrame.prompt);
      if (from != null) {
        if (from < 0 || from >= (raw.sections as unknown[]).length) err(`${w}.endFrame.fromSection out of range`);
        endFrame = { fromSection: from };
      } else if (prompt) endFrame = { prompt };
      else err(`${w}.endFrame needs fromSection or prompt`);
    }
    const controls = isObj(s.controls)
      ? Object.fromEntries(Object.entries(s.controls).filter((e): e is [string, string] => typeof e[1] === "string"))
      : undefined;
    const refs = Array.isArray(s.refs) ? s.refs.map(str).filter((x): x is string => Boolean(x)) : undefined;
    const sfx = (Array.isArray(s.sfx) ? s.sfx : []).flatMap((c, j): DirectedSfx[] => {
      const prompt = isObj(c) ? str(c.prompt) : undefined;
      if (!isObj(c) || !prompt) {
        err(`${w}.sfx[${j}] needs prompt`);
        return [];
      }
      return [{ at: Math.max(0, num(c.at) ?? 0), prompt, durationSec: num(c.durationSec), gainDb: num(c.gainDb) }];
    });
    const labels = (Array.isArray(s.labels) ? s.labels : []).flatMap((c, j): DirectedLabel[] => {
      const text = isObj(c) ? str(c.text) : undefined;
      if (!isObj(c) || !text) {
        err(`${w}.labels[${j}] needs text`);
        return [];
      }
      const position = (["top", "center", "bottom", "lower-third"] as const).find((p) => p === c.position);
      const style = (["label", "title", "caption-bold"] as const).find((p) => p === c.style);
      return [{
        at: Math.max(0, num(c.at) ?? 0),
        durationSec: Math.max(0.3, num(c.durationSec) ?? 2),
        text,
        position,
        style,
        color: typeof c.color === "string" && /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : undefined,
      }];
    });
    const zooms = (Array.isArray(s.zooms) ? s.zooms : []).flatMap((c): DirectedZoom[] =>
      isObj(c) && num(c.at) != null
        ? [{ at: num(c.at)!, toScale: num(c.toScale), overSec: num(c.overSec), holdSec: num(c.holdSec) }]
        : [],
    );
    const transitionOut = DIRECTED_TRANSITIONS.find((t) => t === s.transitionOut);
    const highlightWords = Array.isArray(s.highlightWords)
      ? s.highlightWords.map(str).filter((x): x is string => Boolean(x))
      : undefined;
    let segments: DirectedSection["segments"];
    if (s.segments !== undefined) {
      if (!Array.isArray(s.segments) || s.segments.length < 2) err(`${w}.segments must list 2+ segments`);
      else {
        segments = s.segments.map((g, j) => {
          const gs = isObj(g) ? num(g.sec) : undefined;
          const gp = isObj(g) ? str(g.prompt) : undefined;
          if (gs == null || gs < MIN_SEC || gs > 30) err(`${w}.segments[${j}].sec must be ${MIN_SEC}–30`);
          if (!gp) err(`${w}.segments[${j}].prompt required`);
          return { sec: gs ?? MIN_SEC, prompt: gp ?? "" };
        });
        const total = segments.reduce((n, g) => n + g.sec, 0);
        if (sec != null && Math.abs(total - sec) > 0.01) err(`${w}.segments seconds sum to ${total}, section is ${sec}`);
      }
    }
    return {
      idx: i,
      sec: sec ?? MIN_SEC,
      label: str(s.label),
      lines,
      videoPrompt: videoPrompt ?? "",
      keyframePrompt: str(s.keyframePrompt),
      endFrame,
      model,
      controls,
      refs,
      generateAudio: s.generateAudio === true,
      sfx,
      labels,
      zooms,
      highlightWords,
      transitionOut,
      reuse,
      ...(segments ? { segments } : {}),
      ...(s.reverse === true ? { reverse: true } : {}),
    };
  });

  // A loop's end frame must reference a section that HAS a keyframe.
  for (const s of sections) {
    if (s.endFrame && "fromSection" in s.endFrame) {
      const src = sections[s.endFrame.fromSection];
      if (src && !src.keyframePrompt) err(`sections[${s.idx}].endFrame references section ${src.idx}, which has no keyframePrompt`);
    }
  }

  const music = isObj(raw.music) && str(raw.music.prompt)
    ? { prompt: str(raw.music.prompt)!, gainDb: num(raw.music.gainDb), underVoDb: num(raw.music.underVoDb) }
    : undefined;
  const sting = isObj(raw.sting) && num(raw.sting.at) != null
    ? { at: num(raw.sting.at)!, sec: Math.min(2, Math.max(0.3, num(raw.sting.sec) ?? 0.5)) }
    : undefined;
  let outro: DirectedScript["outro"];
  if (isObj(raw.outro)) {
    const mode = raw.outro.mode === "overlay" ? "overlay" : "card";
    outro = { mode, sec: Math.min(20, Math.max(1, num(raw.outro.sec) ?? 3)), cta: str(raw.outro.cta) };
  }
  const cast = isObj(raw.cast)
    ? Object.fromEntries(
        Object.entries(raw.cast).map(([k, v]) => [
          k,
          { color: isObj(v) && typeof v.color === "string" && /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : undefined },
        ]),
      )
    : undefined;
  const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => Boolean(x)) : undefined);

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    script: {
      version: 1,
      format: format!,
      ...(raw.resolution === "480p" ? { resolution: "480p" as const } : {}),
      title: title!,
      altTitles: strList(raw.altTitles),
      description: str(raw.description),
      tags: strList(raw.tags),
      topic: str(raw.topic),
      cast,
      sections,
      music,
      sting,
      outro,
      watermark: raw.watermark !== false,
      captions: raw.captions !== false,
      qc: str(raw.qc),
    },
  };
}

/** Total generated body seconds (sections only). */
export function directedBodySec(script: Pick<DirectedScript, "sections">): number {
  return script.sections.reduce((s, x) => s + x.sec, 0);
}

/** Runtime = sections + a card outro (an overlay outro sits inside the body). */
export function directedRuntimeSec(script: Pick<DirectedScript, "sections" | "outro">): number {
  return directedBodySec(script) + (script.outro?.mode === "card" ? script.outro.sec : 0);
}

/** Spoken text of a section (captions, QC, beat.text). */
export function sectionSpokenText(s: Pick<DirectedSection, "lines">): string {
  return s.lines.map((l) => l.text).join(" ");
}

// ── Compiler → EDD ────────────────────────────────────────────────────

export type DirectedWord = { w: string; start: number; end: number }; // line-local seconds

export type DirectedCompileInput = {
  script: DirectedScript;
  /** Per section: the landed visual. */
  sections: {
    idx: number;
    assetId: string | null;
    /** Footage length when known (trim clamp). */
    sourceSec?: number;
    isVideo: boolean;
  }[];
  /** Synthesized lines (section idx + line index → the VO asset). */
  lines: { sectionIdx: number; lineIdx: number; assetId: string; durationSec: number; words: DirectedWord[] }[];
  sfx: { sectionIdx: number; cueIdx: number; assetId: string }[];
  music?: { assetId: string } | null;
  brand: { primary: string };
  channelName: string;
};

const FRAME = 1 / 30;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Snap-zoom keyframes over a clip (clip-local seconds). Zooms that don't fit
    are dropped rather than failing validation. */
export function snapZoomMotion(zooms: DirectedZoom[], duration: number): MotionSpec {
  const pts: { t: number; scale: number }[] = [{ t: 0, scale: 1 }];
  let cursor = 0;
  for (const z of [...zooms].sort((a, b) => a.at - b.at)) {
    const over = Math.max(FRAME * 2, z.overSec ?? 0.2);
    const hold = Math.max(0, z.holdSec ?? 1.2);
    const to = Math.max(1.05, Math.min(2, z.toScale ?? 1.35));
    const t0 = Math.max(z.at, cursor + FRAME);
    const t1 = t0 + over;
    const t2 = t1 + hold;
    const t3 = t2 + over;
    if (t3 > duration - FRAME) continue;
    pts.push({ t: t0, scale: 1 }, { t: t1, scale: to }, { t: t2, scale: to }, { t: t3, scale: 1 });
    cursor = t3;
  }
  if (pts.length === 1) return { kind: "none" };
  pts.push({ t: duration, scale: 1 });
  return {
    kind: "keyframes",
    points: pts.map((p) => ({ t: r3(p.t), scale: p.scale, x: 0, y: 0, ease: "easeOut" as const })),
  };
}

function transitionFor(t: DirectedTransition | undefined, isLast: boolean, dur: number, nextDur: number): Transition {
  if (isLast || !t || t === "cut") return { kind: "cut" };
  const cap = Math.min(dur, nextDur) - FRAME;
  if (t === "whip") return { kind: "whip", sec: Math.min(0.35, cap) };
  if (t === "crossfade") return { kind: "crossfade", sec: Math.min(0.6, cap) };
  return { kind: "dipToBlack", sec: Math.min(0.6, cap) };
}

/**
 * Compile a directed script + its landed assets into an EDD. Every duration
 * is the brief's (never the VO's). Lines play at their scripted offsets;
 * captions paginate from the synthesized word timings (monotonic across
 * overlapping speakers); labels, the sting, the watermark and an overlay
 * outro become overlays; a card outro reserves doc.outro.
 */
export function compileDirectedEdd(input: DirectedCompileInput): EditDocument {
  const { script } = input;
  const format = script.format;
  const video: VideoClip[] = [];
  const audio: AudioCue[] = [];
  const captions: CaptionPage[] = [];
  const overlays: Overlay[] = [];
  const perPage = format === "short" ? 3 : 5;
  const byIdx = new Map(input.sections.map((s) => [s.idx, s]));

  // Section start times (gapless, intro = 0: a long-form ident is a section).
  const starts: number[] = [];
  let cursor = 0;
  for (const s of script.sections) {
    starts.push(cursor);
    cursor += s.sec;
  }
  const bodyEnd = cursor;
  const outroCardSec = script.outro?.mode === "card" ? script.outro.sec : 0;
  const runtime = bodyEnd + outroCardSec;

  let prevTokEnd = 0;
  const pageTokens: CaptionToken[] = [];

  script.sections.forEach((s, i) => {
    const start = starts[i];
    const land = byIdx.get(s.idx);
    const next = script.sections[i + 1];
    const isLast = i === script.sections.length - 1;
    video.push({
      id: `v${i + 1}`,
      beatIdx: s.idx,
      assetId: land?.assetId ?? null,
      source: land?.isVideo ? "ai-clip" : "still",
      start: r3(start),
      duration: s.sec,
      trim: { in: 0, out: Math.max(FRAME, Math.min(s.sec, land?.sourceSec ?? s.sec)) },
      motion: s.zooms?.length
        ? snapZoomMotion(s.zooms, s.sec)
        : land?.isVideo
          ? { kind: "none" }
          : { kind: "kenburns", fromScale: 1.02, toScale: 1.1, anchor: "center" },
      transitionOut: transitionFor(s.transitionOut, isLast, s.sec, next?.sec ?? 0),
      silent: s.lines.length === 0,
      ...(s.generateAudio && land?.isVideo ? { sourceAudioDb: s.lines.length ? -12 : -4 } : {}),
    });

    const emphasis = new Set((s.highlightWords ?? []).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")));
    s.lines.forEach((line, j) => {
      const syn = input.lines.find((l) => l.sectionIdx === s.idx && l.lineIdx === j);
      if (!syn) return;
      const lineStart = start + line.at;
      audio.push({ kind: "vo", assetId: syn.assetId, start: r3(lineStart), gainDb: 0 });
      for (const w of syn.words) {
        const from = Math.max(Math.round((lineStart + w.start) * 1000), prevTokEnd);
        const to = Math.max(from + 1, Math.round((lineStart + w.end) * 1000));
        if (from >= runtime * 1000) continue;
        const key = w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        pageTokens.push({ text: w.w, fromMs: from, toMs: Math.min(to, Math.round(runtime * 1000)), emphasis: emphasis.has(key) ? "color" : "none" });
        prevTokEnd = pageTokens[pageTokens.length - 1].toMs;
      }
    });

    for (const [j, cue] of (s.sfx ?? []).entries()) {
      const syn = input.sfx.find((x) => x.sectionIdx === s.idx && x.cueIdx === j);
      if (!syn) continue;
      const at = Math.min(start + cue.at, runtime - FRAME);
      audio.push({ kind: "sfx", ref: { source: "generated", assetId: syn.assetId }, at: { kind: "abs", sec: r3(at) }, gainDb: cue.gainDb ?? -3 });
    }

    for (const l of s.labels ?? []) {
      const at = start + l.at;
      if (at >= runtime) continue;
      overlays.push({
        kind: "label",
        text: l.text,
        startSec: r3(at),
        durationSec: r3(Math.min(l.durationSec, runtime - at)),
        position: l.position ?? "center",
        style: l.style ?? "label",
        color: l.color,
      });
    }
  });

  // Caption pages: ≤perPage tokens, broken at sentence ends and at gaps > 0.6s;
  // each page holds until the next begins (capped at +1.2s past its last word).
  const pages: CaptionToken[][] = [];
  let cur: CaptionToken[] = [];
  for (const tok of pageTokens) {
    const prev = cur[cur.length - 1];
    if (cur.length >= perPage || (prev && (tok.fromMs - prev.toMs > 600 || /[.!?…]$/.test(prev.text)))) {
      pages.push(cur);
      cur = [];
    }
    cur.push(tok);
  }
  if (cur.length) pages.push(cur);
  pages.forEach((tokens, p) => {
    const startMs = tokens[0].fromMs;
    const lastEnd = tokens[tokens.length - 1].toMs;
    const nextStart = pages[p + 1]?.[0].fromMs ?? Math.round(runtime * 1000);
    captions.push({
      startMs,
      endMs: Math.max(lastEnd, Math.min(nextStart, lastEnd + 1200)),
      tokens,
      style: "clean",
      position: format === "short" ? "center" : "bottom",
    });
  });

  if (input.music) {
    audio.push({
      kind: "music",
      assetId: input.music.assetId,
      start: 0,
      gainDb: script.music?.gainDb ?? -14,
      duck: { mode: "fixed", underVoDb: script.music?.underVoDb ?? -10 },
      // A loop Short (overlay outro) must not fade to silence at the loop point.
      ...(script.outro?.mode === "overlay" ? { fadeOutSec: 0 } : {}),
    });
  }

  if (script.sting && script.sting.at < bodyEnd) {
    overlays.push({ kind: "sting", startSec: r3(script.sting.at), durationSec: script.sting.sec });
  }
  if (script.watermark !== false) {
    overlays.push({ kind: "watermark", text: input.channelName, opacity: 0.6 });
  }
  if (script.outro?.mode === "overlay") {
    const sec = Math.min(script.outro.sec, bodyEnd);
    overlays.push({ kind: "endBeat", startSec: r3(bodyEnd - sec), durationSec: sec, cta: script.outro.cta });
  }

  return {
    meta: { schemaVersion: 1, format, fps: 30, aspect: ASPECT_FOR_FORMAT[format], targetDurationSec: runtime },
    intro: { sting: false, sec: 0 },
    outro: { endCard: outroCardSec > 0, sec: outroCardSec, ...(script.outro?.cta && outroCardSec > 0 ? { cta: script.outro.cta } : {}) },
    tracks: { video, audio, captions, overlays },
  };
}

/** Validation context for a directed EDD: like buildEddContext, but music is
    enabled (a directed bed is an explicit brief decision, not an agent guess)
    and the runtime is exact (the compiler derives it from the brief). */
export function buildDirectedEddContext(
  assets: { id: string; kind: string; meta?: Record<string, unknown> | null }[],
  script: Pick<DirectedScript, "sections">,
): EddContext {
  return {
    assets: assets.map((a) => ({
      id: a.id,
      kind: a.kind,
      durationSec:
        typeof (a.meta as { durationSec?: unknown } | null)?.durationSec === "number"
          ? (a.meta as { durationSec: number }).durationSec
          : undefined,
    })),
    beats: script.sections.map((s) => ({ idx: s.idx, hasText: s.lines.length > 0 })),
    transitions: DEFAULT_TRANSITIONS,
    captionStyles: new Set<string>(DEFAULT_CAPTION_STYLES),
    sfxLibrary: new Set<string>(),
    overlayStyles: new Set<string>(DEFAULT_OVERLAY_STYLES),
    musicEnabled: true,
    toleranceSec: 0.5,
  };
}

// ── Asset conventions (shared by the app stage, the clip worker, render) ──
//   keyframe      kind 'keyframe'      beat_index = section  (first frame, persistent)
//   end frame     kind 'keyframe_end'  beat_index = section
//   section clip  kind 'clip'          beat_index = section  (meta.isVideo once landed)
//   spoken line   kind 'vo'            beat_index = section  meta.lineIdx, words
//   sfx cue       kind 'sfx'           beat_index = section  meta.cueIdx
//   music bed     kind 'bgm'           beat_index = null
export type DirectedAssetRow = {
  id: string;
  kind: string;
  beat_index: number | null;
  storage_path?: string | null;
  meta: Record<string, unknown> | null;
};

/** Build the compiler input from a directed video's asset rows. A section
    whose clip never landed falls back to its keyframe still. */
export function directedInputFromAssets(
  script: DirectedScript,
  assets: DirectedAssetRow[],
  brand: { primary: string },
  channelName: string,
): DirectedCompileInput {
  const m = (a: DirectedAssetRow) => (a.meta ?? {}) as Record<string, unknown>;
  const sections = script.sections.map((s) => {
    const clip = assets.find((a) => a.kind === "clip" && a.beat_index === s.idx && m(a).isVideo);
    if (clip) {
      const d = Number(m(clip).durationSec);
      return { idx: s.idx, assetId: clip.id, isVideo: true, sourceSec: Number.isFinite(d) && d > 0 ? d : undefined };
    }
    const still =
      assets.find((a) => a.kind === "clip" && a.beat_index === s.idx) ??
      assets.find((a) => a.kind === "keyframe" && a.beat_index === s.idx);
    return { idx: s.idx, assetId: still?.id ?? null, isVideo: false };
  });
  const lines = assets
    .filter((a) => a.kind === "vo" && a.beat_index != null && typeof m(a).lineIdx === "number")
    .map((a) => ({
      sectionIdx: a.beat_index as number,
      lineIdx: m(a).lineIdx as number,
      assetId: a.id,
      durationSec: Number(m(a).durationSec ?? 0),
      words: (Array.isArray(m(a).words) ? m(a).words : []) as DirectedWord[],
    }));
  const sfx = assets
    .filter((a) => a.kind === "sfx" && a.beat_index != null && typeof m(a).cueIdx === "number")
    .map((a) => ({ sectionIdx: a.beat_index as number, cueIdx: m(a).cueIdx as number, assetId: a.id }));
  const bgm = assets.find((a) => a.kind === "bgm");
  return { script, sections, lines, sfx, music: bgm ? { assetId: bgm.id } : null, brand, channelName };
}

/** Stable short hash (FNV-1a) — change detection for prompts/specs without a
    crypto dependency in core. */
export function specHash(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** The exact generation request for one directed section (clip_jobs.spec). */
export type DirectedClipSpec = {
  directed: true;
  prompt: string;
  aspect: "16:9" | "9:16";
  /** Absent = 720p (keeps pre-existing spec hashes stable). */
  resolution?: "480p";
  /** Per-segment seconds + prompts for a chained section (see DirectedSection.segments). */
  segments?: { sec: number; prompt: string }[];
  /** Reverse the finished clip (video and audio). */
  reverse?: true;
  keyframePath?: string;
  endFramePath?: string;
  refPaths?: string[];
  controls?: Record<string, string>;
  generateAudio?: boolean;
  hash: string;
};

/** Higgsfield $/s at a resolution (Seedance 2.5 and Cinema Studio 4.0 bill
    the same token rate: $0.0214 per 1,000 tokens, tokens = w×h×24/1024 per s). */
export const HF_USD_PER_SEC: Record<"480p" | "720p", number> = { "480p": 0.2056, "720p": 0.4622 };

// ── Pre-flight checks (lessons from test batch 01) ────────────────────

/**
 * Non-fatal problems a brief can carry that would otherwise be silently
 * absorbed at compile time: a snap-zoom that can't finish inside its section
 * (the compiler drops it), a label or SFX cue that runs past its section,
 * dialogue crowding the section end. Surfaced by estimate_directed / import
 * so the script is fixed BEFORE money is spent.
 */
export function directedWarnings(script: DirectedScript): string[] {
  const out: string[] = [];
  for (const s of script.sections) {
    const w = `section ${s.idx + 1}${s.label ? ` (${s.label})` : ""}`;
    for (const z of s.zooms ?? []) {
      const end = z.at + 2 * Math.max(2 / 30, z.overSec ?? 0.2) + Math.max(0, z.holdSec ?? 1.2);
      if (end > s.sec - 1 / 30) out.push(`${w}: zoom at ${z.at}s ends at ${end.toFixed(2)}s, past the ${s.sec}s section — it would be dropped`);
    }
    if (s.sec > 30 && !s.segments && !s.reuse) {
      out.push(`${w}: ${s.sec}s is generated as chained segments (30s + remainder) all from ONE prompt — add \`segments\` with a prompt per segment`);
    }
    for (const l of s.labels ?? []) {
      if (l.at + l.durationSec > s.sec + 0.05) out.push(`${w}: label "${l.text}" runs ${(l.at + l.durationSec - s.sec).toFixed(2)}s past the section end`);
    }
    for (const c of s.sfx ?? []) {
      if (c.at >= s.sec) out.push(`${w}: sfx "${c.prompt.slice(0, 40)}" starts after the section ends`);
    }
    if (script.format === "short" && s.sec > 30 && !s.model) {
      out.push(`${w}: ${s.sec}s is stitched from ${Math.ceil(s.sec / 30)} segments — check the seam at 30s in QC`);
    }
  }
  return out;
}

/**
 * Voiced-line overlap check, run after lines are synthesized and BEFORE any
 * clip is queued (clips are ~95% of spend). Returns each line that is still
 * speaking when the next line starts (absolute timeline seconds).
 */
export function lineOverlaps(
  script: Pick<DirectedScript, "sections">,
  lines: { sectionIdx: number; lineIdx: number; durationSec: number }[],
  toleranceSec = 0.15,
): { sectionIdx: number; lineIdx: number; overlapSec: number }[] {
  const starts: number[] = [];
  let t = 0;
  for (const s of script.sections) {
    starts.push(t);
    t += s.sec;
  }
  const timed = script.sections
    .flatMap((s, si) =>
      s.lines.map((l, li) => {
        const syn = lines.find((x) => x.sectionIdx === s.idx && x.lineIdx === li);
        return { sectionIdx: s.idx, lineIdx: li, start: starts[si] + l.at, end: starts[si] + l.at + (syn?.durationSec ?? 0) };
      }),
    )
    .sort((a, b) => a.start - b.start);
  const out: { sectionIdx: number; lineIdx: number; overlapSec: number }[] = [];
  for (let i = 0; i < timed.length - 1; i++) {
    const over = timed[i].end - timed[i + 1].start;
    if (over > toleranceSec) out.push({ sectionIdx: timed[i].sectionIdx, lineIdx: timed[i].lineIdx, overlapSec: Math.round(over * 100) / 100 });
  }
  return out;
}
