import type React from "react";
import { transitionSecOf, type Transition } from "@studio/core";
import { applyEase, clamp01 } from "./motion";

/**
 * Transition renderers (D6). The schema's registry (`DEFAULT_TRANSITIONS` in
 * core) declares which kinds are valid and their max length; THIS module owns
 * how each kind looks. A new transition lands by adding a case here + a
 * registry entry — no schema migration.
 *
 * Timing model (documented for the /edit UI and the agent):
 * - A transition with sec > 0 occupies the HEAD of the incoming clip:
 *   [nextClip.start, nextClip.start + sec]. The outgoing clip is extended
 *   over that window on top of the incoming clip and animates OUT (fade,
 *   slide, whip, zoom-blur); the incoming clip is revealed beneath.
 * - `dipToBlack` instead straddles the boundary: a black overlay ramps
 *   0→1→0 across [boundary - sec/2, boundary + sec/2].
 * validateEdd's `transitionOut.sec ≤ min(adjacent durations)` keeps both
 * windows inside their clips.
 */

export const transitionSec = transitionSecOf;

/** Straddling transitions render a boundary overlay (centered on the cut)
    instead of extending the outgoing clip. New straddle-style kinds (a dip to
    white, a flash) register here + in straddleOverlayStyle — EddVideo consumes
    both generically, so the render layer stays registry-extensible (D6). */
const STRADDLE_KINDS = new Set(["dipToBlack"]);

/** True when the boundary needs the outgoing clip extended on top. */
export function needsOverlap(t: Transition): boolean {
  return transitionSec(t) > 0 && t.kind !== "cut" && !STRADDLE_KINDS.has(t.kind);
}

/** True when the boundary renders a straddling overlay instead. */
export function isStraddle(t: Transition): boolean {
  return transitionSec(t) > 0 && STRADDLE_KINDS.has(t.kind);
}

/** Overlay style for a straddling transition at progress p ∈ [0,1]. */
export function straddleOverlayStyle(t: Transition, progress: number): React.CSSProperties {
  // dipToBlack is the only straddle kind in v1.
  return { backgroundColor: "black", opacity: dipToBlackOpacity(progress) };
}

/**
 * Style applied to the OUTGOING clip's overlap window at progress p ∈ [0,1].
 * Unknown kinds (registry-extended without a renderer yet) degrade to a
 * crossfade — never a broken frame.
 */
export function transitionExitStyle(t: Transition, progress: number): React.CSSProperties {
  const p = clamp01(progress);
  switch (t.kind) {
    case "dissolve":
      return { opacity: 1 - applyEase("easeInOut", p) };
    case "slide": {
      const dir = "dir" in t ? t.dir : "left";
      const d = `${p * 100}%`;
      const transform =
        dir === "left"
          ? `translateX(-${d})`
          : dir === "right"
            ? `translateX(${d})`
            : dir === "up"
              ? `translateY(-${d})`
              : `translateY(${d})`;
      return { transform };
    }
    case "whip": {
      // Fast horizontal whip with motion blur peaking mid-transition.
      const blur = Math.round(24 * p * (1 - p) * 4 * 10) / 10;
      return { transform: `translateX(-${p * 120}%)`, filter: `blur(${blur}px)` };
    }
    case "zoomBlur":
      return {
        transform: `scale(${1 + 0.35 * p})`,
        opacity: 1 - p,
        filter: `blur(${Math.round(14 * p * 10) / 10}px)`,
      };
    case "crossfade":
    default:
      return { opacity: 1 - p };
  }
}

/** Black-overlay opacity for dipToBlack at progress p ∈ [0,1] across the
    straddling window (0 → 1 at the boundary → 0). */
export function dipToBlackOpacity(progress: number): number {
  const p = clamp01(progress);
  return p <= 0.5 ? p * 2 : (1 - p) * 2;
}
