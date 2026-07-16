/**
 * Pro-editor support utilities (Editor & Assembly R4) — pure, unit-tested, no
 * React. The editor wires these behind the editor.proEditor flag: an undo/redo
 * history, snapping for the retime drag, and frame-accurate transport steps.
 * With the flag off none of this runs and the editor is byte-identical.
 */
import type { EditDocument } from "@studio/core";

const FRAME = 1 / 30;

// ── Undo / redo history ───────────────────────────────────────────────
export type History<T> = { past: T[]; present: T; future: T[] };
const CAP = 100;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Replace the present WITHOUT recording history (flag-off edit path). */
export function setPresent<T>(h: History<T>, present: T): History<T> {
  return { ...h, present };
}

/** Record the current present and move to `next`, clearing the redo stack. */
export function pushHistory<T>(h: History<T>, next: T): History<T> {
  return { past: [...h.past, h.present].slice(-CAP), present: next, future: h.future.length ? [] : h.future };
}

export const canUndo = <T>(h: History<T>): boolean => h.past.length > 0;
export const canRedo = <T>(h: History<T>): boolean => h.future.length > 0;

export function undoHistory<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const present = h.past[h.past.length - 1];
  return { past: h.past.slice(0, -1), present, future: [h.present, ...h.future] };
}

export function redoHistory<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const present = h.future[0];
  return { past: [...h.past, h.present], present, future: h.future.slice(1) };
}

// ── Snapping (retime drag) ────────────────────────────────────────────
/** Snap `t` to the nearest candidate within `thresholdSec`, else return `t`. */
export function snapSec(t: number, candidates: number[], thresholdSec = 0.2): number {
  let best = t;
  let bestDist = thresholdSec + 1e-9;
  for (const c of candidates) {
    const d = Math.abs(c - t);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Structural snap targets on the timeline: intro end, every clip boundary,
    the outro start, and whole-second ticks up to the runtime. Deduped/sorted. */
export function snapTargets(doc: EditDocument): number[] {
  const set = new Set<number>();
  const round = (n: number) => Math.round(n / FRAME) * FRAME;
  set.add(round(doc.intro.sec));
  let cursor = doc.intro.sec;
  for (const c of doc.tracks.video) {
    set.add(round(cursor));
    cursor += c.duration;
    set.add(round(cursor));
  }
  const runtime = cursor + doc.outro.sec;
  for (let s = 0; s <= runtime + 1e-9; s += 1) set.add(s);
  return [...set].sort((a, b) => a - b);
}

/** Snap a clip's proposed new END time to the nearest structural target, then
    return the resulting duration (≥ 1 frame). Used by the retime drag. */
export function snapRetime(doc: EditDocument, clipStart: number, proposedDuration: number, thresholdSec = 0.2): number {
  const targets = snapTargets(doc).filter((t) => t > clipStart + FRAME);
  const snappedEnd = snapSec(clipStart + proposedDuration, targets, thresholdSec);
  return Math.max(FRAME, snappedEnd - clipStart);
}

// ── Transport ─────────────────────────────────────────────────────────
/** Step a time by N frames (can be negative), clamped to ≥ 0. */
export function frameStep(sec: number, frames: number, fps = 30): number {
  return Math.max(0, sec + frames / fps);
}
