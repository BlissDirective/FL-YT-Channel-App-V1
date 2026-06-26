import type { OperatorStrategy } from "@/lib/db/types";

/**
 * Monetization targeting (Phase E) — pure helpers (no I/O) shared by the
 * operator engine and the homepage UI. The north star is reaching the YouTube
 * Partner Program: 1,000 subscribers + EITHER 4,000 watch-hours (trailing 365d)
 * OR 10,000,000 Shorts views (trailing 90d). See
 * docs/Auto-Pilot-Operator-build-plan.md.
 */

export const YPP_SUBS = 1000;
export const YPP_WATCH_HOURS = 4000;
export const YPP_SHORTS_VIEWS = 10_000_000;

/** Shorts share is tilted within a guard band so the mix stays Shorts-led but
    can flex toward the nearer monetization path. */
export const MIX_MIN = 0.6;
export const MIX_MAX = 0.85;
const clampMix = (x: number) => Math.max(MIX_MIN, Math.min(MIX_MAX, x));

function shortsViewsOf(strategy?: OperatorStrategy): number {
  return strategy?.formatPerf?.short?.views ?? strategy?.channel?.shortsViews90 ?? 0;
}

/**
 * The Shorts share to target next, given the channel's learned strategy:
 *  • Shorts views nearing 10M → push Shorts (that path is in reach).
 *  • Below 1,000 subs → Shorts-led (Shorts are the subscriber-growth engine).
 *  • Subs met but watch-hours short → long-form-led (long-form makes watch-hours).
 *  • Otherwise → the channel's base mix.
 */
export function desiredMixShortsPct(baseMix: number, strategy?: OperatorStrategy): number {
  const ch = strategy?.channel;
  if (!ch) return clampMix(baseMix);
  if (shortsViewsOf(strategy) / YPP_SHORTS_VIEWS >= 0.5) return clampMix(0.85);
  if (ch.subs < YPP_SUBS) return clampMix(0.82);
  if (ch.watchHours365 < YPP_WATCH_HOURS) return clampMix(0.6);
  return clampMix(baseMix);
}

export type YppPath = "watch" | "shorts";

/** Which monetization path is closer (drives the tilt + the UI). */
export function nearerPath(strategy?: OperatorStrategy): YppPath {
  const ch = strategy?.channel;
  const watchProgress = (ch?.watchHours365 ?? 0) / YPP_WATCH_HOURS;
  const shortsProgress = shortsViewsOf(strategy) / YPP_SHORTS_VIEWS;
  return shortsProgress > watchProgress ? "shorts" : "watch";
}

/** A short human label for why the mix is where it is. */
export function mixReason(strategy?: OperatorStrategy): string {
  const ch = strategy?.channel;
  if (!ch) return "default mix";
  if (shortsViewsOf(strategy) / YPP_SHORTS_VIEWS >= 0.5) return "Shorts surging — pushing Shorts";
  if (ch.subs < YPP_SUBS) return "chasing subscribers — Shorts-led";
  if (ch.watchHours365 < YPP_WATCH_HOURS) return "chasing watch-hours — more long-form";
  return "monetized track — balanced";
}

/**
 * Daily cadence cap. Off by default (steady 1/day). When ramp is enabled it can
 * rise as the channel matures + proves out, hard-capped for ban-safety.
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
