import type React from "react";
import type { Anchor, Ease, MotionSpec } from "@studio/core";

/**
 * MotionSpec → camera transform (D5). Pure and frame-driven so it can be
 * unit-tested without a render. Keyframe x/y values are % of the frame
 * (matching the legacy pan moves, which translate ±3%).
 */

export type MotionSample = { scale: number; xPct: number; yPct: number };

export const clamp01 = (p: number) => Math.min(1, Math.max(0, p));

export function applyEase(ease: Ease, p: number): number {
  const t = clamp01(p);
  switch (ease) {
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    case "easeInOut":
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case "linear":
    default:
      return t;
  }
}

/** Sample the camera at tSec into a clip of durationSec. */
export function motionAt(motion: MotionSpec, tSec: number, durationSec: number): MotionSample {
  const p = durationSec > 0 ? clamp01(tSec / durationSec) : 0;
  switch (motion.kind) {
    case "none":
      return { scale: 1, xPct: 0, yPct: 0 };
    case "kenburns":
      return { scale: motion.fromScale + (motion.toScale - motion.fromScale) * p, xPct: 0, yPct: 0 };
    case "heroHold":
      // Hero clips keep the legacy default slow zoom (1.02 → 1.12); the
      // rate lives in playback, not the transform.
      return { scale: 1.02 + 0.1 * p, xPct: 0, yPct: 0 };
    case "keyframes": {
      const pts = motion.points;
      if (pts.length === 0) return { scale: 1, xPct: 0, yPct: 0 };
      if (tSec <= pts[0].t || pts.length === 1) {
        return { scale: pts[0].scale, xPct: pts[0].x, yPct: pts[0].y };
      }
      const last = pts[pts.length - 1];
      if (tSec >= last.t) return { scale: last.scale, xPct: last.x, yPct: last.y };
      let i = 0;
      while (i < pts.length - 2 && pts[i + 1].t <= tSec) i++;
      const a = pts[i];
      const b = pts[i + 1];
      const span = b.t - a.t;
      // The segment's ease is the DESTINATION keyframe's ease (b.ease) —
      // "ease into this point". Zero-length segments snap to b.
      const q = span > 0 ? applyEase(b.ease, (tSec - a.t) / span) : 1;
      return {
        scale: a.scale + (b.scale - a.scale) * q,
        xPct: a.x + (b.x - a.x) * q,
        yPct: a.y + (b.y - a.y) * q,
      };
    }
  }
}

/** Ken-Burns anchor → CSS transform-origin. */
export function anchorOrigin(anchor: Anchor): string {
  switch (anchor) {
    case "top":
      return "50% 0%";
    case "bottom":
      return "50% 100%";
    case "left":
      return "0% 50%";
    case "right":
      return "100% 50%";
    case "center":
    default:
      return "50% 50%";
  }
}

/** MotionSpec sampled at tSec → the style applied to the clip's visual. */
export function motionCss(motion: MotionSpec, tSec: number, durationSec: number): React.CSSProperties {
  const s = motionAt(motion, tSec, durationSec);
  const style: React.CSSProperties = {};
  const translate = s.xPct !== 0 || s.yPct !== 0 ? ` translateX(${s.xPct}%) translateY(${s.yPct}%)` : "";
  if (s.scale !== 1 || translate) style.transform = `scale(${s.scale})${translate}`;
  if (motion.kind === "kenburns") style.transformOrigin = anchorOrigin(motion.anchor);
  return style;
}
