import type { OperatorStrategy } from "@/lib/db/types";

/**
 * Program growth targeting — pure helpers (no I/O) shared by the operator
 * engine and the homepage UI. The north star for a course/training program is
 * a compounding library: an enrollment floor, deep lesson watch-hours
 * (completion volume), and preview/micro-lesson view velocity (the enrollment
 * engine). The operator tilts the production mix between short micro-lessons /
 * previews and full lessons toward whichever target is nearer.
 *
 * Field mapping (kept on the existing analytics shape so adapters stay stable):
 *  - `subs`          → enrolled learners.
 *  - `watchHours365` → lesson watch-hours (completion volume, trailing 365d).
 *  - `shortsViews90` → preview / micro-lesson views, trailing 90d (reach).
 */

/** Enrollment floor before completion-led production compounds. */
export const LEARNERS_GOAL = 1000;
/** Lesson watch-hours goal (trailing 365d) — the completion-volume target. */
export const COMPLETION_HOURS_GOAL = 4000;
/** Preview / micro-lesson views goal (trailing 90d) — the enrollment engine. */
export const PREVIEW_VIEWS_GOAL = 1_000_000;

/** Micro-lesson share is tilted within a guard band so the mix stays
    preview-led (enrollment) but can flex toward the nearer growth target. */
export const MIX_MIN = 0.6;
export const MIX_MAX = 0.85;
const clampMix = (x: number) => Math.max(MIX_MIN, Math.min(MIX_MAX, x));

function previewViewsOf(strategy?: OperatorStrategy): number {
  return strategy?.formatPerf?.short?.views ?? strategy?.channel?.shortsViews90 ?? 0;
}

/**
 * The micro-lesson share to target next, given the program's learned strategy:
 *  • Preview views nearing the reach goal → push previews (enrollment in reach).
 *  • Below the enrollment floor → preview-led (previews recruit learners).
 *  • Enrollment met but completion short → full-lesson-led (lessons make
 *    watch-hours and finish the library).
 *  • Otherwise → the program's base mix.
 */
export function desiredMixShortsPct(baseMix: number, strategy?: OperatorStrategy): number {
  const ch = strategy?.channel;
  if (!ch) return clampMix(baseMix);
  if (previewViewsOf(strategy) / PREVIEW_VIEWS_GOAL >= 0.5) return clampMix(0.85);
  if (ch.subs < LEARNERS_GOAL) return clampMix(0.82);
  if (ch.watchHours365 < COMPLETION_HOURS_GOAL) return clampMix(0.6);
  return clampMix(baseMix);
}

/** "watch" = completion path (full lessons); "shorts" = enrollment path (previews). */
export type GrowthPath = "watch" | "shorts";
export type YppPath = GrowthPath; // legacy alias — UI imports still compile.

/** Which growth target is closer (drives the tilt + the UI). */
export function nearerPath(strategy?: OperatorStrategy): GrowthPath {
  const ch = strategy?.channel;
  const watchProgress = (ch?.watchHours365 ?? 0) / COMPLETION_HOURS_GOAL;
  const previewProgress = previewViewsOf(strategy) / PREVIEW_VIEWS_GOAL;
  return previewProgress > watchProgress ? "shorts" : "watch";
}

/** A short human label for why the mix is where it is. */
export function mixReason(strategy?: OperatorStrategy): string {
  const ch = strategy?.channel;
  if (!ch) return "default mix";
  if (previewViewsOf(strategy) / PREVIEW_VIEWS_GOAL >= 0.5) return "previews surging — more micro-lessons";
  if (ch.subs < LEARNERS_GOAL) return "growing enrollment — preview-led";
  if (ch.watchHours365 < COMPLETION_HOURS_GOAL) return "chasing completion — more full lessons";
  return "program healthy — balanced";
}

/**
 * Daily cadence cap. Off by default (steady 1/day). When ramp is enabled it can
 * rise as the program matures + proves out, hard-capped so the library grows at
 * a pace learners (and hosting platforms) can absorb.
 */
export function effectiveDailyCap(opts: {
  baseCap: number;
  maxCap: number;
  rampEnabled: boolean;
  ageDays: number;
  subs: number;
}): number {
  if (!opts.rampEnabled) return opts.baseCap;
  let cap = opts.baseCap;
  if (opts.ageDays >= 21 && opts.subs >= 100) cap = Math.max(cap, 2);
  return Math.min(opts.maxCap, cap);
}
