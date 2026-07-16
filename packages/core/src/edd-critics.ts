/**
 * EDD craft critics (Editor & Assembly R6). Advisory analyses that COMPLEMENT
 * lintEdd (which owns page-length / loudness / static-still / transition-runs):
 * a PACING critic (cut rhythm + medium monotony) and a CAPTION-RHYTHM critic
 * (reading speed, coverage gaps, flash pages). Each note carries a `suggestion`
 * so it maps to an op — surfaced in /edit and readable by the MVDA the same way
 * lintEdd is. Advisory only; never a blocker. Plus a pure edit-signal
 * classifier that turns a human's post-agent diff into learning-loop tags.
 *
 * Pure — no I/O.
 */
import type { EditDocument } from "./edd";
import { introOutroRuntime, transitionSecOf } from "./edd";

export type CraftNote = { rule: string; where: string; msg: string; suggestion: string };

// ── Pacing ────────────────────────────────────────────────────────────
/** Per-format healthy average seconds-per-clip. Shorts want faster cuts. */
const CUT_RHYTHM: Record<"long" | "short", { min: number; max: number }> = {
  long: { min: 2, max: 12 },
  short: { min: 1.2, max: 5 },
};
/** More than this many consecutive clips of the SAME source reads monotonous. */
const MAX_SOURCE_RUN = 3;

export function pacingCritique(doc: EditDocument): CraftNote[] {
  const notes: CraftNote[] = [];
  const clips = doc.tracks.video;
  if (clips.length === 0) return notes;

  // Cut rhythm — average clip length vs the format's healthy band.
  const body = clips.reduce((s, c) => s + Math.max(0, c.duration), 0);
  const avg = body / clips.length;
  const band = CUT_RHYTHM[doc.meta.format];
  if (avg > band.max) {
    notes.push({
      rule: "pacing.slowCuts",
      where: "timeline",
      msg: `average shot ${avg.toFixed(1)}s is slow for a ${doc.meta.format} (aim ≤ ${band.max}s)`,
      suggestion: "split the longest clips or trim dead air to quicken the cut",
    });
  } else if (avg < band.min) {
    notes.push({
      rule: "pacing.fastCuts",
      where: "timeline",
      msg: `average shot ${avg.toFixed(1)}s is very fast for a ${doc.meta.format} (aim ≥ ${band.min}s)`,
      suggestion: "hold key shots longer so beats land",
    });
  }

  // Medium monotony — a long run of the same source.
  let runStart = 0;
  for (let i = 1; i <= clips.length; i++) {
    if (i < clips.length && clips[i].source === clips[runStart].source) continue;
    const runLen = i - runStart;
    if (runLen > MAX_SOURCE_RUN) {
      notes.push({
        rule: "pacing.monotony",
        where: `clips ${runStart}–${i - 1}`,
        msg: `${runLen} clips in a row are all "${clips[runStart].source}" — visually monotonous`,
        suggestion: "vary the medium (a clip, a chart, or a motion-graphic) to break the run",
      });
    }
    runStart = i;
  }
  return notes;
}

// ── Caption rhythm ────────────────────────────────────────────────────
/** Comfortable reading speed ceiling (words/sec). Above this, captions blur. */
const MAX_WORDS_PER_SEC = 4.5;
/** A caption page shorter than this flashes and can't be read. */
const MIN_PAGE_SEC = 0.6;
/** A silent stretch (no caption page) longer than this on a captioned video
    reads as a dead gap. */
const MAX_CAPTION_GAP_SEC = 4;

export function captionRhythmCritique(doc: EditDocument): CraftNote[] {
  const notes: CraftNote[] = [];
  const pages = doc.tracks.captions;
  if (pages.length === 0) return notes;
  const runtimeMs = introOutroRuntime(doc) * 1000;

  pages.forEach((page, p) => {
    const durSec = Math.max(0, (page.endMs - page.startMs) / 1000);
    if (durSec > 0 && durSec < MIN_PAGE_SEC) {
      notes.push({
        rule: "caption.flash",
        where: `captions[${p}]`,
        msg: `page shows for ${durSec.toFixed(2)}s — too brief to read`,
        suggestion: "extend the page or merge it with a neighbor",
      });
    }
    const wps = durSec > 0 ? page.tokens.length / durSec : Infinity;
    if (page.tokens.length >= 3 && wps > MAX_WORDS_PER_SEC) {
      notes.push({
        rule: "caption.readingSpeed",
        where: `captions[${p}]`,
        msg: `${wps.toFixed(1)} words/sec is faster than comfortable reading (~${MAX_WORDS_PER_SEC})`,
        suggestion: "split the page so fewer words share the time",
      });
    }
  });

  // Coverage gaps between consecutive pages (and after the last page).
  let prevEnd = pages[0].startMs;
  for (const page of pages) {
    const gap = (page.startMs - prevEnd) / 1000;
    if (gap > MAX_CAPTION_GAP_SEC) {
      notes.push({
        rule: "caption.gap",
        where: `~${(prevEnd / 1000).toFixed(1)}s`,
        msg: `${gap.toFixed(1)}s with no caption — long silent stretch`,
        suggestion: "carry a caption across the gap or shorten it",
      });
    }
    prevEnd = Math.max(prevEnd, page.endMs);
  }
  const tailGap = (runtimeMs - prevEnd) / 1000;
  if (tailGap > MAX_CAPTION_GAP_SEC) {
    notes.push({
      rule: "caption.gap",
      where: `~${(prevEnd / 1000).toFixed(1)}s`,
      msg: `${tailGap.toFixed(1)}s of tail with no caption`,
      suggestion: "extend captions toward the end card",
    });
  }
  return notes;
}

/** All craft critiques for a document (pacing + caption rhythm). */
export function craftCritique(doc: EditDocument): CraftNote[] {
  return [...pacingCritique(doc), ...captionRhythmCritique(doc)];
}

// ── Learning-loop: classify a human's post-agent edit diff ────────────
export type EditSignal = { tags: string[]; summary: string };

/** Classify what a human changed between two documents (e.g. a human's edit
    after an agent pass) into learning-loop tags — the signal the operator-
    signal mining turns into `editing`-namespace lessons over time. Pure. */
export function diffToEditSignal(before: EditDocument, after: EditDocument): EditSignal {
  const tags: string[] = [];
  const rtBefore = introOutroRuntime(before);
  const rtAfter = introOutroRuntime(after);
  if (rtAfter < rtBefore - 0.5) tags.push("shortened");
  else if (rtAfter > rtBefore + 0.5) tags.push("lengthened");

  const clipDelta = after.tracks.video.length - before.tracks.video.length;
  if (clipDelta > 0) tags.push("more-cuts");
  else if (clipDelta < 0) tags.push("fewer-cuts");

  const transitions = (d: EditDocument) => d.tracks.video.filter((c) => transitionSecOf(c.transitionOut) > 0).length;
  const trDelta = transitions(after) - transitions(before);
  if (trDelta < 0) tags.push("removed-transitions");
  else if (trDelta > 0) tags.push("added-transitions");

  // Per-clip craft changes (matched by id).
  const beforeById = new Map(before.tracks.video.map((c) => [c.id, c]));
  let mediumChanges = 0;
  let motionChanges = 0;
  let speedChanges = 0;
  for (const c of after.tracks.video) {
    const b = beforeById.get(c.id);
    if (!b) continue;
    if (b.source !== c.source) mediumChanges++;
    if (b.motion.kind !== c.motion.kind) motionChanges++;
    if ((b.speed ?? 1) !== (c.speed ?? 1)) speedChanges++;
  }
  if (mediumChanges > 0) tags.push("changed-medium");
  if (motionChanges > 0) tags.push("changed-motion");
  if (speedChanges > 0) tags.push("changed-speed");

  const summary = tags.length ? tags.join(", ") : "no material change";
  return { tags, summary };
}
