import {
  DEFAULT_TRANSITIONS,
  introOutroRuntime,
  resolveWordAnchorSec,
  type AudioCue,
  type CaptionPage,
  type EddSource,
  type EditDocument,
  type Emphasis,
  type MotionKeyframe,
  type MotionSpec,
  type Overlay,
  type Transition,
  type VideoClip,
} from "./edd";

/**
 * Pure EDD editing operations (MVDA Phase B §5 + the agent's mutation layer,
 * Phase C C1 — the /edit inspector and the MVDA tools call the SAME ops).
 * Every operation returns a NEW document (the input is never mutated) that
 * keeps the D9 invariants — gapless video track, transitions that fit — so a
 * sequence of operations always yields a validateEdd-able document (the unit
 * tests assert exactly that). Client and server share these; the server
 * re-validates on save regardless.
 */

const FRAME = 1 / 30;
const clone = <T>(v: T): T => structuredClone(v);
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function clipIndex(doc: EditDocument, clipId: string): number {
  return doc.tracks.video.findIndex((c) => c.id === clipId);
}

/** Clamp a transition to its registry max and both adjacent clip durations. */
function clampTransition(clip: VideoClip, next: VideoClip | undefined): void {
  const t = clip.transitionOut;
  if (!("sec" in t) || typeof t.sec !== "number") return;
  const max = DEFAULT_TRANSITIONS[t.kind]?.maxSec ?? 0;
  const fit = Math.min(max, clip.duration, next?.duration ?? Infinity);
  t.sec = r3(Math.max(0, Math.min(t.sec, fit)));
}

/**
 * Retime a clip (the drag-edge / duration-field operation). Later clips
 * shift to stay gapless; audio cues, caption pages, and abs-anchored
 * overlays at or after the old boundary shift with them; the clip's own
 * held caption page stretches/shrinks; pages/tokens that no longer fit a
 * shortened clip are truncated or dropped. Word anchors survive untouched.
 */
export function retimeClip(doc: EditDocument, clipId: string, newDurationSec: number): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  const dur = r3(Math.max(1, newDurationSec)); // legacy 1s floor (A1)
  const delta = r3(dur - clip.duration);
  if (delta === 0) return d;

  const clipStart = clip.start;
  const oldEnd = r3(clip.start + clip.duration);
  const newEnd = r3(clip.start + dur);
  const oldEndMs = Math.round(oldEnd * 1000);
  const newEndMs = Math.round(newEnd * 1000);
  const deltaMs = Math.round(delta * 1000);
  const clipStartMs = Math.round(clipStart * 1000);

  clip.duration = dur;
  // The trim window is the source segment — clamp only when it would exceed
  // the new duration meaningfully for stills (video sources loop the window).
  clampTransition(clip, d.tracks.video[i + 1]);
  if (i > 0) clampTransition(d.tracks.video[i - 1], clip);

  for (let j = i + 1; j < d.tracks.video.length; j++) {
    d.tracks.video[j].start = r3(d.tracks.video[j].start + delta);
  }

  for (const cue of d.tracks.audio) {
    if (cue.kind === "sfx") {
      if (cue.at.kind === "abs" && cue.at.sec >= oldEnd - FRAME) cue.at.sec = r3(cue.at.sec + delta);
      continue;
    }
    if (cue.start >= oldEnd - FRAME) {
      cue.start = r3(cue.start + delta);
    } else if (cue.kind === "vo" && cue.trim && Math.abs(cue.start - clipStart) < FRAME) {
      // The clip's welded VO window follows the beat window (compiled docs).
      // The audible window is trim.in-relative — clamping against `dur`
      // alone would cut trim.in seconds too much off a front-trimmed VO.
      const oldOut = cue.trim.out;
      cue.trim.out = r3(Math.min(cue.trim.out, cue.trim.in + dur));
      if (delta > 0 && Math.abs(oldOut - r3(cue.trim.in + dur - delta)) < FRAME) {
        cue.trim.out = r3(cue.trim.in + dur); // window followed the beat — keep following on grow
      }
    }
  }

  const keptPages: CaptionPage[] = [];
  for (const p of d.tracks.captions) {
    if (p.startMs >= oldEndMs) {
      // A later clip's page — shift with its clip.
      p.startMs += deltaMs;
      p.endMs += deltaMs;
      for (const t of p.tokens) {
        t.fromMs += deltaMs;
        t.toMs += deltaMs;
      }
      keptPages.push(p);
      continue;
    }
    if (p.startMs >= clipStartMs) {
      // A page of the retimed clip.
      if (p.startMs >= newEndMs) continue; // no longer fits — drop
      p.tokens = p.tokens.filter((t) => t.fromMs < newEndMs);
      if (p.tokens.length === 0) continue;
      for (const t of p.tokens) t.toMs = Math.min(t.toMs, newEndMs);
      p.endMs = Math.min(Math.max(p.endMs, p.tokens[p.tokens.length - 1].toMs), newEndMs);
      // The clip's held tail page follows the boundary.
      if (p.endMs === Math.min(oldEndMs, newEndMs) || p.endMs > newEndMs - 1) p.endMs = newEndMs;
      keptPages.push(p);
      continue;
    }
    keptPages.push(p);
  }
  d.tracks.captions = keptPages;

  // Overlays: shift anything at/after the boundary; then clamp EVERYTHING to
  // the new runtime (a shrink can leave a window that used to fit dangling
  // past the end — the validator would reject the doc and lock Save).
  const newRuntime = introOutroRuntime(d);
  const newRuntimeMs = Math.round(newRuntime * 1000);
  d.tracks.overlays = d.tracks.overlays.filter((o) => {
    if (o.kind === "highlight") {
      if (o.startMs >= oldEndMs) {
        o.startMs += deltaMs;
        o.endMs += deltaMs;
        if (o.anchor.kind === "abs") o.anchor.sec = r3(o.anchor.sec + delta);
      }
      if (o.startMs >= newRuntimeMs - 400) return false; // no longer fits
      o.endMs = Math.min(o.endMs, newRuntimeMs);
      if (o.anchor.kind === "abs") o.anchor.sec = Math.min(o.anchor.sec, r3(newRuntime));
      return o.endMs > o.startMs;
    }
    if (o.kind === "lowerThird") {
      if (o.startSec >= oldEnd - FRAME) o.startSec = r3(o.startSec + delta);
      if (o.startSec >= newRuntime - 0.4) return false;
      o.durationSec = r3(Math.min(o.durationSec, newRuntime - o.startSec));
      return o.durationSec > 0;
    }
    return true;
  });

  // Word-anchored SFX whose token was dropped with the shrink no longer
  // resolve — drop them rather than hand the validator a dead anchor.
  d.tracks.audio = d.tracks.audio.filter(
    (cue) => cue.kind !== "sfx" || cue.at.kind !== "word" || resolveWordAnchorSec(d, cue.at) != null,
  );
  return d;
}

/** Set the source trim window (video sources; the window loops per A10). */
export function setTrim(doc: EditDocument, clipId: string, tIn: number, tOut: number): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const inSec = r3(Math.max(0, tIn));
  d.tracks.video[i].trim = { in: inSec, out: r3(Math.max(inSec + FRAME, tOut)) };
  return d;
}

/** Swap the clip's visual to another live asset. */
export function swapClipAsset(
  doc: EditDocument,
  clipId: string,
  asset: { id: string; source: EddSource; durationSec?: number },
): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  clip.assetId = asset.id;
  clip.source = asset.source;
  clip.trim = { in: 0, out: r3(Math.max(FRAME, Math.min(clip.duration, asset.durationSec ?? clip.duration))) };
  return d;
}

export function setTransition(doc: EditDocument, clipId: string, transition: Transition): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  if (i === d.tracks.video.length - 1) {
    d.tracks.video[i].transitionOut = { kind: "cut" }; // validator: last clip cuts
    return d;
  }
  d.tracks.video[i].transitionOut = clone(transition);
  clampTransition(d.tracks.video[i], d.tracks.video[i + 1]);
  return d;
}

export function setMotion(doc: EditDocument, clipId: string, motion: MotionSpec): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  const m = clone(motion);
  if (m.kind === "keyframes" && m.points.length >= 2) {
    // Keyframes must cover the clip: pin the first to 0, the last to duration.
    m.points.sort((a, b) => a.t - b.t);
    m.points[0].t = 0;
    m.points[m.points.length - 1].t = clip.duration;
  }
  clip.motion = m;
  return d;
}

/** R5 — set a clip's footage playback speed (0.25–4×). ~1 clears the field
    (back to normal). No effect on stills at render time. */
export function setClipSpeed(doc: EditDocument, clipId: string, speed: number): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const s = Math.max(0.25, Math.min(4, speed));
  if (Math.abs(s - 1) < 1e-6) delete d.tracks.video[i].speed;
  else d.tracks.video[i].speed = Math.round(s * 100) / 100;
  return d;
}

/** Coerce a clip's motion to a keyframe track (from a preset or empty), so the
    keyframe editor / agent can add points. Endpoints stay pinned to the clip. */
function asKeyframes(clip: EditDocument["tracks"]["video"][number]): MotionKeyframe[] {
  if (clip.motion.kind === "keyframes" && clip.motion.points.length >= 2) {
    return clip.motion.points.map((p) => ({ ...p }));
  }
  // Seed from the current preset's endpoints (scale-only), spanning the clip.
  const dur = clip.duration;
  if (clip.motion.kind === "kenburns") {
    return [
      { t: 0, scale: clip.motion.fromScale, x: 0, y: 0, ease: "linear" },
      { t: dur, scale: clip.motion.toScale, x: 0, y: 0, ease: "easeInOut" },
    ];
  }
  return [
    { t: 0, scale: 1, x: 0, y: 0, ease: "linear" },
    { t: dur, scale: 1, x: 0, y: 0, ease: "linear" },
  ];
}

/** Normalize a keyframe list onto a clip: sort by t, pin the endpoints to the
    clip window, guarantee ≥2 points. */
function pinKeyframes(points: MotionKeyframe[], duration: number): MotionKeyframe[] {
  const pts = points.map((p) => ({ ...p, t: Math.max(0, Math.min(duration, p.t)) })).sort((a, b) => a.t - b.t);
  if (pts.length < 2) {
    return [
      { t: 0, scale: pts[0]?.scale ?? 1, x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, ease: "linear" },
      { t: duration, scale: pts[0]?.scale ?? 1, x: pts[0]?.x ?? 0, y: pts[0]?.y ?? 0, ease: "linear" },
    ];
  }
  pts[0].t = 0;
  pts[pts.length - 1].t = duration;
  return pts;
}

/** R5 — add a motion keyframe to a clip (converting to a keyframe track if
    needed). Points are kept sorted with pinned endpoints. */
export function addMotionKeyframe(doc: EditDocument, clipId: string, point: MotionKeyframe): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  const pts = asKeyframes(clip);
  pts.push({ ...point });
  clip.motion = { kind: "keyframes", points: pinKeyframes(pts, clip.duration) };
  return d;
}

/** R5 — update a keyframe point (only meaningful for a keyframe track). */
export function updateMotionKeyframe(
  doc: EditDocument,
  clipId: string,
  index: number,
  patch: Partial<MotionKeyframe>,
): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  if (clip.motion.kind !== "keyframes" || index < 0 || index >= clip.motion.points.length) return d;
  const pts = clip.motion.points.map((p) => ({ ...p }));
  pts[index] = { ...pts[index], ...patch };
  clip.motion = { kind: "keyframes", points: pinKeyframes(pts, clip.duration) };
  return d;
}

/** R5 — remove a keyframe (keeps ≥2 points; endpoints stay pinned). */
export function removeMotionKeyframe(doc: EditDocument, clipId: string, index: number): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  if (clip.motion.kind !== "keyframes" || clip.motion.points.length <= 2) return d;
  const pts = clip.motion.points.filter((_, j) => j !== index);
  clip.motion = { kind: "keyframes", points: pinKeyframes(pts, clip.duration) };
  return d;
}

/** The D5 preset buttons: emit concrete specs the agent could also author. */
export function kenBurnsPreset(zoomIn = true): MotionSpec {
  return zoomIn
    ? { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" }
    : { kind: "kenburns", fromScale: 1.12, toScale: 1.02, anchor: "center" };
}
export function heroHoldPreset(): MotionSpec {
  return { kind: "heroHold", rate: 0.5 };
}

/** Flag a narrated clip as an intentional pause. The welded VO cue is MUTED
    (gain floor), not deleted, so un-toggling in the same session restores the
    narration — a one-way delete would strand the doc failing vo.coverage. */
const MUTE_DB = -60;
export function setClipSilent(doc: EditDocument, clipId: string, silent: boolean): EditDocument {
  const d = clone(doc);
  const i = clipIndex(d, clipId);
  if (i < 0) return d;
  const clip = d.tracks.video[i];
  clip.silent = silent || undefined;
  const end = clip.start + clip.duration;
  for (const cue of d.tracks.audio) {
    if (cue.kind === "vo" && cue.start >= clip.start - FRAME && cue.start < end - FRAME) {
      cue.gainDb = silent ? MUTE_DB : 0;
    }
  }
  return d;
}

export function setTokenEmphasis(
  doc: EditDocument,
  pageIdx: number,
  tokenIdx: number,
  emphasis: Emphasis,
): EditDocument {
  const d = clone(doc);
  const tok = d.tracks.captions[pageIdx]?.tokens[tokenIdx];
  if (tok) tok.emphasis = emphasis;
  return d;
}

export function setPageStyle(
  doc: EditDocument,
  pageIdx: number,
  patch: Partial<Pick<CaptionPage, "style" | "position">>,
): EditDocument {
  const d = clone(doc);
  const page = d.tracks.captions[pageIdx];
  if (page) Object.assign(page, patch);
  return d;
}

export function addAudioCue(doc: EditDocument, cue: AudioCue): EditDocument {
  const d = clone(doc);
  d.tracks.audio.push(clone(cue));
  return d;
}

/** Remove an audio cue by index (SFX only — VO removal goes through the
    silent flag so coverage stays honest). */
export function removeAudioCue(doc: EditDocument, index: number): EditDocument {
  const d = clone(doc);
  if (d.tracks.audio[index]?.kind === "sfx") d.tracks.audio.splice(index, 1);
  return d;
}

export function setAudioGain(doc: EditDocument, index: number, gainDb: number): EditDocument {
  const d = clone(doc);
  const cue = d.tracks.audio[index];
  if (cue) cue.gainDb = Math.max(-60, Math.min(12, r3(gainDb)));
  return d;
}

export function addOverlay(doc: EditDocument, overlay: Overlay): EditDocument {
  const d = clone(doc);
  d.tracks.overlays.push(clone(overlay));
  return d;
}

export function updateOverlay(doc: EditDocument, index: number, overlay: Overlay): EditDocument {
  const d = clone(doc);
  if (d.tracks.overlays[index]) d.tracks.overlays[index] = clone(overlay);
  return d;
}

export function removeOverlay(doc: EditDocument, index: number): EditDocument {
  const d = clone(doc);
  d.tracks.overlays.splice(index, 1);
  return d;
}

export function setIntroOutro(
  doc: EditDocument,
  patch: { sting?: boolean; endCard?: boolean },
): EditDocument {
  const d = clone(doc);
  if (patch.sting != null) d.intro.sting = patch.sting;
  if (patch.endCard != null) d.outro.endCard = patch.endCard;
  return d;
}

/** Human edits re-pin the target to the actual runtime (the human IS the
    authority on length; the agent keeps the brief target in Phase C), so the
    ±5% tolerance can never block an intentional re-cut. */
export function normalizeTarget(doc: EditDocument): EditDocument {
  const d = clone(doc);
  d.meta.targetDurationSec = r3(introOutroRuntime(d));
  return d;
}

/** Human-readable version diff for the history strip. */
export function diffSummary(a: EditDocument, b: EditDocument): string[] {
  const out: string[] = [];
  const av = a.tracks.video;
  const bv = b.tracks.video;
  if (av.length !== bv.length) out.push(`clips ${av.length} → ${bv.length}`);
  const n = Math.min(av.length, bv.length);
  for (let i = 0; i < n; i++) {
    const x = av[i];
    const y = bv[i];
    const changes: string[] = [];
    if (x.assetId !== y.assetId) changes.push("visual swapped");
    if (Math.abs(x.duration - y.duration) > FRAME) changes.push(`${x.duration}s → ${y.duration}s`);
    if (x.trim.in !== y.trim.in || x.trim.out !== y.trim.out) changes.push("trim");
    if (x.motion.kind !== y.motion.kind) changes.push(`motion ${x.motion.kind} → ${y.motion.kind}`);
    if (x.transitionOut.kind !== y.transitionOut.kind)
      changes.push(`transition ${x.transitionOut.kind} → ${y.transitionOut.kind}`);
    if (Boolean(x.silent) !== Boolean(y.silent)) changes.push(y.silent ? "muted" : "unmuted");
    if (changes.length) out.push(`clip ${y.id} (beat ${y.beatIdx}): ${changes.join(", ")}`);
  }
  const emphA = a.tracks.captions.flatMap((p) => p.tokens).filter((t) => t.emphasis !== "none").length;
  const emphB = b.tracks.captions.flatMap((p) => p.tokens).filter((t) => t.emphasis !== "none").length;
  if (emphA !== emphB) out.push(`kinetic emphases ${emphA} → ${emphB}`);
  const sfxA = a.tracks.audio.filter((c) => c.kind === "sfx").length;
  const sfxB = b.tracks.audio.filter((c) => c.kind === "sfx").length;
  if (sfxA !== sfxB) out.push(`SFX cues ${sfxA} → ${sfxB}`);
  if (a.tracks.overlays.length !== b.tracks.overlays.length)
    out.push(`overlays ${a.tracks.overlays.length} → ${b.tracks.overlays.length}`);
  if (a.intro.sting !== b.intro.sting) out.push(`intro sting ${b.intro.sting ? "on" : "off"}`);
  if (a.outro.endCard !== b.outro.endCard) out.push(`end card ${b.outro.endCard ? "on" : "off"}`);
  const ra = introOutroRuntime(a);
  const rb = introOutroRuntime(b);
  if (Math.abs(ra - rb) > FRAME) out.push(`runtime ${ra.toFixed(1)}s → ${rb.toFixed(1)}s`);
  return out.length ? out : ["no structural changes"];
}
