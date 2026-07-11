/**
 * Per-capability unit tests for the EDD renderer's pure math (audit A8):
 * keyframe motion sampling (D5), transition timing/exit styles (D6), and the
 * word-anchor SFX resolution shared with the validator (A4/D7). The visual
 * layer around these is exercised by the CI sampled-frame goldens.
 */
import { describe, expect, it } from "vitest";
import type { MotionSpec, Transition } from "@studio/core";
import { applyEase, anchorOrigin, motionAt, motionCss } from "../packages/render/src/edd/motion";
import {
  dipToBlackOpacity,
  needsOverlap,
  transitionExitStyle,
  transitionSec,
} from "../packages/render/src/edd/transitions";

describe("EDD motion (D5)", () => {
  it("kenburns interpolates scale across the clip", () => {
    const m: MotionSpec = { kind: "kenburns", fromScale: 1.02, toScale: 1.12, anchor: "center" };
    expect(motionAt(m, 0, 10).scale).toBeCloseTo(1.02);
    expect(motionAt(m, 5, 10).scale).toBeCloseTo(1.07);
    expect(motionAt(m, 10, 10).scale).toBeCloseTo(1.12);
    // Clamps past the clip (transition overlap keeps the end pose).
    expect(motionAt(m, 12, 10).scale).toBeCloseTo(1.12);
  });

  it("keyframes interpolate between points with the destination ease", () => {
    const m: MotionSpec = {
      kind: "keyframes",
      points: [
        { t: 0, scale: 1.12, x: 3, y: 0, ease: "linear" },
        { t: 8, scale: 1.12, x: -3, y: 0, ease: "linear" },
      ],
    };
    expect(motionAt(m, 0, 8)).toEqual({ scale: 1.12, xPct: 3, yPct: 0 });
    expect(motionAt(m, 4, 8).xPct).toBeCloseTo(0);
    expect(motionAt(m, 8, 8).xPct).toBeCloseTo(-3);
  });

  it("keyframes with easeInOut land the midpoint at half the eased distance", () => {
    const m: MotionSpec = {
      kind: "keyframes",
      points: [
        { t: 0, scale: 1, x: 0, y: 0, ease: "linear" },
        { t: 4, scale: 2, x: 0, y: 0, ease: "easeInOut" },
      ],
    };
    // easeInOut(0.5) = 0.5 → scale 1.5; easeInOut(0.25) = 0.125 → 1.125.
    expect(motionAt(m, 2, 4).scale).toBeCloseTo(1.5);
    expect(motionAt(m, 1, 4).scale).toBeCloseTo(1.125);
  });

  it("eases are monotonic and hit the endpoints", () => {
    for (const ease of ["linear", "easeIn", "easeOut", "easeInOut"] as const) {
      expect(applyEase(ease, 0)).toBe(0);
      expect(applyEase(ease, 1)).toBe(1);
      let prev = -1;
      for (let p = 0; p <= 1.001; p += 0.05) {
        const v = applyEase(ease, p);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
      }
    }
  });

  it("hero-hold reproduces the legacy default slow zoom", () => {
    const m: MotionSpec = { kind: "heroHold", rate: 0.5 };
    expect(motionAt(m, 0, 10).scale).toBeCloseTo(1.02);
    expect(motionAt(m, 10, 10).scale).toBeCloseTo(1.12);
  });

  it("kenburns anchors map to transform-origin", () => {
    expect(anchorOrigin("top")).toBe("50% 0%");
    expect(anchorOrigin("right")).toBe("100% 50%");
    const css = motionCss({ kind: "kenburns", fromScale: 1, toScale: 1.2, anchor: "bottom" }, 5, 10);
    expect(css.transformOrigin).toBe("50% 100%");
    expect(css.transform).toContain("scale(1.1");
  });

  it("motion 'none' produces no transform", () => {
    expect(motionCss({ kind: "none" }, 3, 10)).toEqual({});
  });
});

describe("EDD transitions (D6)", () => {
  it("cut and dipToBlack need no clip overlap; animated exits do", () => {
    expect(needsOverlap({ kind: "cut" })).toBe(false);
    expect(needsOverlap({ kind: "dipToBlack", sec: 1 })).toBe(false);
    expect(needsOverlap({ kind: "crossfade", sec: 0.5 })).toBe(true);
    expect(needsOverlap({ kind: "whip", sec: 0.4 })).toBe(true);
    expect(needsOverlap({ kind: "crossfade", sec: 0 })).toBe(false);
  });

  it("crossfade fades the outgoing clip linearly", () => {
    const t: Transition = { kind: "crossfade", sec: 0.5 };
    expect(transitionExitStyle(t, 0).opacity).toBeCloseTo(1);
    expect(transitionExitStyle(t, 0.5).opacity).toBeCloseTo(0.5);
    expect(transitionExitStyle(t, 1).opacity).toBeCloseTo(0);
  });

  it("slide translates toward its direction", () => {
    const t: Transition = { kind: "slide", sec: 0.6, dir: "up" };
    expect(transitionExitStyle(t, 0.5).transform).toBe("translateY(-50%)");
    const right: Transition = { kind: "slide", sec: 0.6, dir: "right" };
    expect(transitionExitStyle(right, 1).transform).toBe("translateX(100%)");
  });

  it("whip blurs mid-transition and clears at the ends", () => {
    const t: Transition = { kind: "whip", sec: 0.4 };
    expect(transitionExitStyle(t, 0).filter).toBe("blur(0px)");
    const mid = transitionExitStyle(t, 0.5).filter as string;
    expect(Number(/blur\(([\d.]+)px\)/.exec(mid)?.[1])).toBeGreaterThan(10);
    expect(transitionExitStyle(t, 1).filter).toBe("blur(0px)");
  });

  it("zoom-blur scales up while fading out", () => {
    const s = transitionExitStyle({ kind: "zoomBlur", sec: 0.5 }, 1);
    expect(s.transform).toBe("scale(1.35)");
    expect(s.opacity).toBeCloseTo(0);
  });

  it("an unknown registry-extended kind degrades to a crossfade", () => {
    const s = transitionExitStyle({ kind: "glitch", sec: 0.3 }, 0.5);
    expect(s.opacity).toBeCloseTo(0.5);
  });

  it("dipToBlack ramps 0→1→0 across the straddled boundary", () => {
    expect(dipToBlackOpacity(0)).toBeCloseTo(0);
    expect(dipToBlackOpacity(0.5)).toBeCloseTo(1);
    expect(dipToBlackOpacity(1)).toBeCloseTo(0);
  });

  it("transitionSec reads sec safely from the open union", () => {
    expect(transitionSec({ kind: "cut" })).toBe(0);
    expect(transitionSec({ kind: "crossfade", sec: 0.5 })).toBe(0.5);
    expect(transitionSec({ kind: "custom" })).toBe(0);
  });
});
