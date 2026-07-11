/**
 * The Edit Decision Document (EDD) — the Master Video Development Agent's
 * explicit, versioned timeline. Shared by the app (authoring, /edit UI) and
 * the render package (buildProps → VideoComp). Pure types + a pure validator
 * + a pure legacy compiler; no I/O here (repo convention — cf. library.ts).
 *
 * Design + decisions: Fable-5-MVDA-Build-Plan.md §2 (schema), review pass 2
 * D5–D9. Full vocabulary from day one (D1). Nothing in here renders — the
 * render package consumes these types; the app validates against them.
 */

// ── Enums / small unions ──────────────────────────────────────────────
export type EddFormat = "long" | "short";
export type EddAspect = "16:9" | "9:16";
export type Ease = "linear" | "easeIn" | "easeOut" | "easeInOut";
export type Anchor = "center" | "top" | "bottom" | "left" | "right";
export type Emphasis = "none" | "pop" | "color" | "shake" | "scale";
export type CaptionPosition = "bottom" | "center" | "top";
export type EddSource = "still" | "stock" | "ai-clip" | "dataviz" | "stick";
export type EddAuthor = "agent" | "human" | "compiler";
export type EddStatus = "draft" | "previewed" | "approved" | "rendered" | "superseded";

// ── D5 — keyframe motion (presets emit keyframe tracks) ───────────────
export type MotionSpec =
  | { kind: "none" }
  | { kind: "kenburns"; fromScale: number; toScale: number; anchor: Anchor }
  | { kind: "heroHold"; rate: number }
  | { kind: "keyframes"; points: MotionKeyframe[] };

export type MotionKeyframe = { t: number; scale: number; x: number; y: number; ease: Ease };

// ── D6 — extensible transition registry (open union tail) ─────────────
export type Transition =
  | { kind: "cut" }
  | { kind: "crossfade"; sec: number }
  | { kind: "dissolve"; sec: number }
  | { kind: "slide"; sec: number; dir: "left" | "right" | "up" | "down" }
  | { kind: "whip"; sec: number }
  | { kind: "dipToBlack"; sec: number }
  | { kind: "zoomBlur"; sec: number }
  | { kind: string; sec?: number; params?: Record<string, unknown> };

/** Registry of renderable transitions: kind → its max duration. New kinds
    register here (+ a renderer in the render package) with NO schema change. */
export type TransitionRegistry = Record<string, { maxSec: number }>;

export const DEFAULT_TRANSITIONS: TransitionRegistry = {
  cut: { maxSec: 0 },
  crossfade: { maxSec: 1.5 },
  dissolve: { maxSec: 1.5 },
  slide: { maxSec: 1.0 },
  whip: { maxSec: 0.6 },
  dipToBlack: { maxSec: 1.2 },
  zoomBlur: { maxSec: 0.8 },
};

// ── D7 — SFX: curated library by default, generated on demand ─────────
export type SfxRef = { source: "library"; name: string } | { source: "generated"; assetId: string };
/** An SFX/overlay time anchor: absolute seconds, or pinned to a caption word
    (survives retiming). `captionToken` indexes the clip's caption tokens
    FLATTENED across every page overlapping the clip's time window, in page
    order — the validator and the renderer must resolve it identically. */
export type TimeAnchor =
  | { kind: "abs"; sec: number }
  | { kind: "word"; clipId: string; captionToken: number };

// ── D8 — music ducking (schema present; UI-gated OFF in v1) ───────────
export type DuckSpec =
  | { mode: "none" }
  | { mode: "fixed"; underVoDb: number }
  | { mode: "sidechain"; depthDb: number; attackMs: number; releaseMs: number };

// ── Tracks ────────────────────────────────────────────────────────────
export type VideoClip = {
  id: string; // stable within the doc ("v1", "v2"…)
  beatIdx: number; // provenance → script beat
  assetId: string | null; // assets.id; null = generation pending
  source: EddSource;
  start: number; // timeline seconds
  duration: number; // timeline seconds (the cut length — EXPLICIT, not VO-welded)
  trim: { in: number; out: number }; // source in/out point
  motion: MotionSpec;
  transitionOut: Transition; // boundary INTO the next clip
  /** Decision 1: narration is the default; a clip is silent only on purpose
      (a dramatic pause). validateEdd errors on a narrated beat lacking VO
      UNLESS its clip is flagged silent. */
  silent?: boolean;
};

export type AudioCue =
  | { kind: "vo"; assetId: string; start: number; gainDb: number; trim?: { in: number; out: number } }
  | { kind: "sfx"; ref: SfxRef; at: TimeAnchor; gainDb: number }
  | { kind: "music"; assetId: string; start: number; gainDb: number; duck: DuckSpec };

export type CaptionToken = { text: string; fromMs: number; toMs: number; emphasis: Emphasis };
export type CaptionPage = {
  startMs: number;
  endMs: number;
  tokens: CaptionToken[];
  style: string; // named style from the brand kit / caption-style registry
  position: CaptionPosition;
};

export type Overlay =
  | {
      kind: "highlight";
      text: string;
      startMs: number;
      endMs: number;
      style: string; // a render highlight preset name (see DEFAULT_OVERLAY_STYLES)
      anchor: TimeAnchor;
      /** Optional presentation details carried over from the curated
          kinetic-highlight system so compiled documents stay faithful (audit
          A7). Hand/agent-authored overlays may omit them — the renderer falls
          back to the preset's defaults. */
      emphasisWord?: string;
      fontFamily?: string;
      emphasisColor?: string;
      position?: "center" | "upper-third" | "lower-third-safe";
      intensity?: "subtle" | "med" | "high";
      maxLines?: number;
    }
  | { kind: "lowerThird"; text: string; sub?: string; startSec: number; durationSec: number }
  | { kind: "progressBar"; style: string };

// ── Named-style registries (validation context defaults) ──────────────
// The render package owns the visual definitions; these are the NAMES the
// validator accepts. New styles are added here + a renderer entry — no
// schema migration (same pattern as DEFAULT_TRANSITIONS / D6).
export const DEFAULT_CAPTION_STYLES = ["clean"] as const;
export const DEFAULT_OVERLAY_STYLES = [
  "word-pop",
  "highlight-box-swipe",
  "stat-card",
  "quote-card",
  "typewriter",
  "color-flash-pop",
  "sticker-tag",
  "underline-swipe",
  "bar", // progress-bar style
] as const;
/** Curated SFX library: name → public URL. Empty until a licensed pack lands
    (D7) — generated (ElevenLabs) SFX reference an asset id instead and work
    today. The validator rejects library names not present here. */
export const DEFAULT_SFX_LIBRARY: Record<string, string> = {};

export type EditDocument = {
  meta: {
    schemaVersion: 1;
    format: EddFormat;
    fps: 30;
    aspect: EddAspect;
    targetDurationSec: number;
  };
  intro: { sting: boolean; sec: number };
  outro: { endCard: boolean; sec: number };
  tracks: {
    video: VideoClip[];
    audio: AudioCue[];
    captions: CaptionPage[];
    overlays: Overlay[];
  };
};

// ── Validation context + result ───────────────────────────────────────
export type EddAssetRef = { id: string; kind: string; durationSec?: number };
export type EddBeatRef = { idx: number; hasText: boolean };

export type EddContext = {
  assets: EddAssetRef[];
  beats: EddBeatRef[];
  transitions: TransitionRegistry;
  captionStyles: Set<string>;
  sfxLibrary: Set<string>;
  overlayStyles: Set<string>;
  musicEnabled: boolean; // D8 — false in v1
  /** Absolute runtime tolerance in seconds. The app passes 5% of target
      (D9 decision) — e.g. max(2, targetDurationSec * 0.05). */
  toleranceSec: number;
};

export type EddError = { rule: string; where: string; msg: string };
export type EddValidation = { ok: boolean; errors: EddError[] };

/** The aspect each format must render at. */
export const ASPECT_FOR_FORMAT: Record<EddFormat, EddAspect> = { long: "16:9", short: "9:16" };
/** One frame at 30fps, the epsilon for gapless timeline arithmetic. */
const FRAME = 1 / 30;

const near = (a: number, b: number, eps = FRAME) => Math.abs(a - b) <= eps;

/**
 * validateEdd — the pure, table-driven gate. Every rule is a hard error: an
 * invalid document cannot be committed (validation lives in the tool/action,
 * never in a prompt). Returns ALL violations (not fail-fast) so the editor can
 * surface them together.
 */
export function validateEdd(doc: EditDocument, ctx: EddContext): EddValidation {
  const e: EddError[] = [];
  const add = (rule: string, where: string, msg: string) => e.push({ rule, where, msg });

  const video = doc.tracks.video;
  const beatSet = new Set(ctx.beats.map((b) => b.idx));
  const narratedBeats = new Set(ctx.beats.filter((b) => b.hasText).map((b) => b.idx));
  const assetById = new Map(ctx.assets.map((a) => [a.id, a]));
  const clipById = new Map(video.map((c) => [c.id, c]));

  // ── meta ──
  if (doc.meta.fps !== 30) add("meta.fps", "meta", "fps must be 30");
  if (doc.meta.aspect !== ASPECT_FOR_FORMAT[doc.meta.format]) {
    add("meta.aspect", "meta", `aspect ${doc.meta.aspect} invalid for format ${doc.meta.format}`);
  }
  if (!(doc.meta.targetDurationSec > 0)) add("meta.target", "meta", "targetDurationSec must be > 0");
  if (doc.intro.sec < 0) add("intro.sec", "intro", "intro.sec must be ≥ 0");
  if (doc.outro.sec < 0) add("outro.sec", "outro", "outro.sec must be ≥ 0");

  // ── structure & timeline (D9 gapless) ──
  if (video.length === 0) add("video.nonempty", "tracks.video", "video track is empty");
  const seenClipIds = new Set<string>();
  let cursor = doc.intro.sec; // clips start after the intro sting
  video.forEach((c, i) => {
    const w = `clip[${i}] ${c.id}`;
    if (seenClipIds.has(c.id)) add("clip.id.unique", w, `duplicate clip id ${c.id}`);
    seenClipIds.add(c.id);
    if (!beatSet.has(c.beatIdx)) add("clip.beat", w, `references missing beat ${c.beatIdx}`);
    if (!(c.duration > 0)) add("clip.duration", w, "duration must be > 0");
    if (!near(c.start, cursor)) {
      add("video.gapless", w, `expected start ${cursor.toFixed(3)}s, got ${c.start.toFixed(3)}s (gap/overlap)`);
    }
    cursor = c.start + c.duration;

    // assets & trim
    if (c.assetId !== null) {
      const a = assetById.get(c.assetId);
      if (!a) add("clip.asset", w, `asset ${c.assetId} missing or killed`);
      else if (c.trim.in < 0 || c.trim.out <= c.trim.in) add("clip.trim", w, "trim must satisfy 0 ≤ in < out");
      else if (a.durationSec != null && c.trim.out > a.durationSec + FRAME) {
        add("clip.trim", w, `trim.out ${c.trim.out}s exceeds source ${a.durationSec}s`);
      }
    }

    // motion (D5)
    validateMotion(c, w, add);

    // transitions (D6)
    const isLast = i === video.length - 1;
    validateTransition(c, video[i + 1], isLast, ctx.transitions, w, add);
  });

  // ── audio ──
  const runtimeSec = introOutroRuntime(doc);
  for (const [i, cue] of doc.tracks.audio.entries()) {
    const w = `audio[${i}] ${cue.kind}`;
    if (cue.kind === "vo") {
      const a = assetById.get(cue.assetId);
      if (!a || a.kind !== "vo") add("vo.asset", w, `vo asset ${cue.assetId} missing`);
      if (cue.start < 0 || cue.start > runtimeSec + FRAME) add("vo.range", w, "vo cue start out of runtime");
    } else if (cue.kind === "sfx") {
      if (cue.ref.source === "library" && !ctx.sfxLibrary.has(cue.ref.name)) {
        add("sfx.ref", w, `sfx "${cue.ref.name}" not in library`);
      }
      if (cue.ref.source === "generated" && !assetById.has(cue.ref.assetId)) {
        add("sfx.ref", w, `generated sfx asset ${cue.ref.assetId} missing`);
      }
      validateAnchor(cue.at, runtimeSec, clipById, doc, w, "sfx.anchor", add);
    } else if (cue.kind === "music") {
      if (!ctx.musicEnabled) add("music.gated", w, "music is disabled in this version (D8)");
    }
  }

  // vo coverage (Decision 1): every narrated beat needs a VO cue playing over
  // its clip's time window, unless the clip is explicitly silent. A VO cue is
  // mapped to a beat by TIME OVERLAP — a cue's asset is the VO asset, distinct
  // from the clip's visual asset, so they can't be matched by id.
  for (const c of video) {
    if (!narratedBeats.has(c.beatIdx) || c.silent) continue;
    const clipStart = c.start;
    const clipEnd = c.start + c.duration;
    const covered = doc.tracks.audio.some((cue) => {
      if (cue.kind !== "vo") return false;
      // A VO asset without a recorded duration gets the pipeline-wide 5s
      // default (same as buildProps' `?? 5`) — `?? 0` would make a cue that
      // starts exactly at its clip fail the strict overlap below, rejecting
      // documents the legacy path renders fine (audit A13).
      const voDur = cue.trim
        ? Math.max(FRAME, cue.trim.out - cue.trim.in)
        : (assetById.get(cue.assetId)?.durationSec ?? 5);
      const cueEnd = cue.start + Math.max(voDur, FRAME);
      return cue.start < clipEnd - FRAME && cueEnd > clipStart + FRAME;
    });
    if (!covered) {
      add("vo.coverage", `clip ${c.id}`, `beat ${c.beatIdx} has narration but no VO (set silent to intend a pause)`);
    }
  }

  // ── captions (no overlap, D-decision) ──
  let prevEnd = -1;
  for (const [i, p] of doc.tracks.captions.entries()) {
    const w = `caption[${i}]`;
    if (!(p.startMs < p.endMs)) add("caption.page", w, "startMs must be < endMs");
    if (p.startMs < 0 || p.endMs > runtimeSec * 1000 + 1) add("caption.page", w, "page outside runtime");
    if (p.startMs < prevEnd) add("caption.overlap", w, "caption pages must not overlap");
    prevEnd = p.endMs;
    if (!ctx.captionStyles.has(p.style)) add("caption.style", w, `unknown caption style "${p.style}"`);
    let tEnd = p.startMs - 1;
    for (const [j, tok] of p.tokens.entries()) {
      if (!(tok.fromMs < tok.toMs)) add("caption.tokens", `${w}.tok[${j}]`, "token fromMs must be < toMs");
      if (tok.fromMs < p.startMs - 1 || tok.toMs > p.endMs + 1) {
        add("caption.tokens", `${w}.tok[${j}]`, "token outside page bounds");
      }
      if (tok.fromMs < tEnd) add("caption.tokens", `${w}.tok[${j}]`, "tokens must be monotonic");
      tEnd = tok.toMs;
    }
  }

  // ── overlays ──
  for (const [i, o] of doc.tracks.overlays.entries()) {
    const w = `overlay[${i}] ${o.kind}`;
    if (o.kind === "highlight") {
      if (!(o.startMs < o.endMs)) add("overlay.highlight", w, "startMs must be < endMs");
      if (o.startMs < 0 || o.endMs > runtimeSec * 1000 + 1) add("overlay.highlight", w, "highlight outside runtime");
      if (!ctx.overlayStyles.has(o.style)) add("overlay.highlight", w, `unknown overlay style "${o.style}"`);
      validateAnchor(o.anchor, runtimeSec, clipById, doc, w, "overlay.highlight", add);
    } else if (o.kind === "lowerThird") {
      if (o.startSec < 0 || o.startSec > runtimeSec + FRAME) add("overlay.lowerThird", w, "startSec out of runtime");
      if (!(o.durationSec > 0)) add("overlay.lowerThird", w, "durationSec must be > 0");
    } else if (o.kind === "progressBar") {
      if (!ctx.overlayStyles.has(o.style)) add("overlay.progressBar", w, `unknown overlay style "${o.style}"`);
    }
  }

  // ── global runtime (±tolerance, D9/5%) ──
  const tol = Math.max(0, ctx.toleranceSec);
  if (Math.abs(runtimeSec - doc.meta.targetDurationSec) > tol + FRAME) {
    add(
      "runtime.total",
      "doc",
      `runtime ${runtimeSec.toFixed(2)}s outside target ${doc.meta.targetDurationSec}±${tol.toFixed(2)}s`,
    );
  }

  return { ok: e.length === 0, errors: e };
}

function validateMotion(c: VideoClip, w: string, add: (r: string, wh: string, m: string) => void) {
  const m = c.motion;
  if (m.kind === "kenburns") {
    if (!(m.fromScale > 0) || !(m.toScale > 0)) add("motion.preset", w, "ken-burns scales must be > 0");
  } else if (m.kind === "keyframes") {
    if (m.points.length < 2) add("motion.keyframes", w, "keyframes need ≥ 2 points");
    let prevT = -Infinity;
    for (const p of m.points) {
      if (p.t < -FRAME || p.t > c.duration + FRAME) add("motion.keyframes", w, `keyframe t ${p.t} outside clip`);
      if (p.t < prevT) add("motion.keyframes", w, "keyframes must be sorted by t");
      if (!(p.scale > 0)) add("motion.keyframes", w, "keyframe scale must be > 0");
      prevT = p.t;
    }
    const first = m.points[0];
    const last = m.points[m.points.length - 1];
    if (first && !near(first.t, 0)) add("motion.keyframes", w, "first keyframe must be at t=0");
    if (last && !near(last.t, c.duration)) add("motion.keyframes", w, "last keyframe must cover the clip");
  }
}

function validateTransition(
  c: VideoClip,
  next: VideoClip | undefined,
  isLast: boolean,
  registry: TransitionRegistry,
  w: string,
  add: (r: string, wh: string, m: string) => void,
) {
  const t = c.transitionOut;
  if (isLast) {
    if (t.kind !== "cut") add("transition.lastCut", w, "final clip must end on a cut");
    return;
  }
  if (!(t.kind in registry)) {
    add("transition.registered", w, `unknown transition "${t.kind}"`);
    return;
  }
  const sec = "sec" in t && typeof t.sec === "number" ? t.sec : 0;
  const max = registry[t.kind].maxSec;
  if (sec < 0) add("transition.fits", w, "transition sec must be ≥ 0");
  if (sec > max + FRAME) add("transition.maxSec", w, `transition ${t.kind} exceeds max ${max}s`);
  const nextDur = next ? next.duration : Infinity;
  if (sec > Math.min(c.duration, nextDur) + FRAME) {
    add("transition.fits", w, `transition ${t.kind} longer than an adjacent clip`);
  }
}

function validateAnchor(
  at: TimeAnchor,
  runtimeSec: number,
  clipById: Map<string, VideoClip>,
  doc: EditDocument,
  w: string,
  rule: string,
  add: (r: string, wh: string, m: string) => void,
) {
  if (at.kind === "abs") {
    if (at.sec < 0 || at.sec > runtimeSec + FRAME) add(rule, w, "absolute anchor outside runtime");
    return;
  }
  // word anchor: must resolve through the SAME function the renderer uses
  // (A4 — captionToken indexes the clip's tokens flattened across every page
  // overlapping the clip's window, in page order).
  if (!clipById.has(at.clipId)) {
    add(rule, w, `word-anchor clip ${at.clipId} not found`);
    return;
  }
  if (resolveWordAnchorSec(doc, at) === null) {
    add(rule, w, `word-anchor token ${at.captionToken} does not resolve on clip ${at.clipId}`);
  }
}

/**
 * Resolve a time anchor to absolute seconds. Word anchors return the anchored
 * token's fromMs (A4 semantics: `captionToken` indexes the clip's caption
 * tokens flattened across every page overlapping the clip's time window, in
 * page order). Returns null when the anchor doesn't resolve — validateEdd
 * rejects such documents, so the renderer can treat null as unreachable.
 * SHARED by validateEdd and the render package so the two can never disagree.
 */
export function resolveWordAnchorSec(doc: EditDocument, at: TimeAnchor): number | null {
  if (at.kind === "abs") return at.sec;
  const clip = doc.tracks.video.find((c) => c.id === at.clipId);
  if (!clip) return null;
  const startMs = clip.start * 1000;
  const endMs = (clip.start + clip.duration) * 1000;
  let idx = at.captionToken;
  if (idx < 0) return null;
  for (const p of doc.tracks.captions) {
    if (!(p.startMs < endMs && p.endMs > startMs)) continue;
    if (idx < p.tokens.length) return p.tokens[idx].fromMs / 1000;
    idx -= p.tokens.length;
  }
  return null;
}

/** Retention timeline for an EDD render: one entry per clip, mapped to its
    script beat — supersedes the legacy beat timeline in the render asset's
    meta (plan §3: dips attribute to explicit clips, not just beats). */
export function eddTimeline(doc: EditDocument): { idx: number; start: number; end: number }[] {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return doc.tracks.video.map((c) => ({ idx: c.beatIdx, start: r2(c.start), end: r2(c.start + c.duration) }));
}

/** Total runtime = intro + Σ clip durations + outro. */
export function introOutroRuntime(doc: EditDocument): number {
  const body = doc.tracks.video.reduce((s, c) => s + Math.max(0, c.duration), 0);
  return doc.intro.sec + body + doc.outro.sec;
}
