import type { OperatorStrategy } from "@/lib/db/types";

/**
 * Campaign growth targeting — pure helpers (no I/O) shared by the operator
 * engine and the homepage UI. The north star for a GTM program is a compounding
 * distribution engine: an audience floor on the brand account, deep demo
 * watch-time (consideration), and short-ad view velocity (reach + testing
 * throughput). The operator tilts the production mix between short UGC ad
 * variants and long product demos toward whichever target is nearer.
 *
 * Field mapping (kept on the existing analytics shape so adapters stay stable):
 *  - `subs`          → brand-account audience (followers/subscribers).
 *  - `watchHours365` → accumulated demo watch-hours (deep consideration).
 *  - `shortsViews90` → short ad-variant views, trailing 90d (reach/testing).
 */

/** Audience floor before demo-led consideration compounds. */
export const AUDIENCE_GOAL = 1000;
/** Demo watch-hours goal (trailing 365d) — the consideration target. */
export const CONSIDERATION_HOURS_GOAL = 4000;
/** Short ad-variant views goal (trailing 90d) — the reach/testing target. */
export const AD_VIEWS_GOAL = 1_000_000;

/** Variant share is tilted within a guard band so the mix stays variant-led
    (testing throughput) but can flex toward the nearer growth target. */
export const MIX_MIN = 0.6;
export const MIX_MAX = 0.85;
const clampMix = (x: number) => Math.max(MIX_MIN, Math.min(MIX_MAX, x));

function adViewsOf(strategy?: OperatorStrategy): number {
  return strategy?.formatPerf?.short?.views ?? strategy?.channel?.shortsViews90 ?? 0;
}

/**
 * The short-variant share to target next, given the program's learned strategy:
 *  • Ad views nearing the reach goal → push variants (scale what's winning).
 *  • Below the audience floor → variant-led (short ads are the reach engine).
 *  • Audience met but consideration short → demo-led (demos build watch-time).
 *  • Otherwise → the program's base mix.
 */
export function desiredMixShortsPct(baseMix: number, strategy?: OperatorStrategy): number {
  const ch = strategy?.channel;
  if (!ch) return clampMix(baseMix);
  if (adViewsOf(strategy) / AD_VIEWS_GOAL >= 0.5) return clampMix(0.85);
  if (ch.subs < AUDIENCE_GOAL) return clampMix(0.82);
  if (ch.watchHours365 < CONSIDERATION_HOURS_GOAL) return clampMix(0.6);
  return clampMix(baseMix);
}

/** "watch" = consideration path (demos); "shorts" = reach path (ad variants). */
export type GrowthPath = "watch" | "shorts";
export type YppPath = GrowthPath; // legacy alias — UI imports still compile.

/** Which growth target is closer (drives the tilt + the UI). */
export function nearerPath(strategy?: OperatorStrategy): GrowthPath {
  const ch = strategy?.channel;
  const watchProgress = (ch?.watchHours365 ?? 0) / CONSIDERATION_HOURS_GOAL;
  const reachProgress = adViewsOf(strategy) / AD_VIEWS_GOAL;
  return reachProgress > watchProgress ? "shorts" : "watch";
}

/** A short human label for why the mix is where it is. */
export function mixReason(strategy?: OperatorStrategy): string {
  const ch = strategy?.channel;
  if (!ch) return "default mix";
  if (adViewsOf(strategy) / AD_VIEWS_GOAL >= 0.5) return "ad views surging — scaling winning variants";
  if (ch.subs < AUDIENCE_GOAL) return "building audience — variant-led testing";
  if (ch.watchHours365 < CONSIDERATION_HOURS_GOAL) return "chasing consideration — more demos";
  return "targets met — balanced program";
}

/**
 * Daily cadence cap. Off by default (steady 1/day). When ramp is enabled it can
 * rise as the program matures + proves out, hard-capped so ad accounts and
 * social channels never see a suspicious posting spike.
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
