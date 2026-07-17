/**
 * Motion craft codex (Batch 11): Disney rubric, kinetic-type presets, scene
 * mechanics composition, and the whiteboard move library.
 */
import { describe, expect, it } from "vitest";
import {
  composeScene,
  critiqueMotion,
  DISNEY_PRINCIPLES,
  getKineticType,
  kineticRevealMs,
  pickWhiteboardMove,
  WHITEBOARD_MOVES,
  type MotionParams,
} from "@studio/core";

describe("Disney motion rubric", () => {
  it("has all 12 principles", () => {
    expect(DISNEY_PRINCIPLES).toHaveLength(12);
  });
  it("rewards eased, anticipated, well-timed motion", () => {
    const good: MotionParams = { easing: "spring", hasAnticipation: true, hasFollowThrough: true, onArc: true, exaggeration: 0.3, durationMs: 400 };
    const bad: MotionParams = { easing: "linear", hasAnticipation: false, hasFollowThrough: false, onArc: false, exaggeration: 0, durationMs: 40 };
    expect(critiqueMotion(good).score).toBeGreaterThan(critiqueMotion(bad).score);
    expect(critiqueMotion(bad).notes.length).toBeGreaterThan(0);
  });
});

describe("kinetic typography", () => {
  it("computes total reveal time from stagger + duration", () => {
    const preset = getKineticType("word-cascade")!;
    expect(kineticRevealMs(preset, 1)).toBe(preset.durationMs);
    expect(kineticRevealMs(preset, 4)).toBe(preset.durationMs + 3 * preset.staggerMs);
  });
});

describe("scene mechanics composition", () => {
  it("accepts a valid enter→emphasize→exit chain", () => {
    const r = composeScene(["fade-rise", "pop-scale", "slide-out"]);
    expect(r.ok).toBe(true);
    expect(r.phases).toEqual(["enter", "emphasize", "exit"]);
  });
  it("rejects an out-of-order chain", () => {
    expect(composeScene(["slide-out", "fade-rise"]).ok).toBe(false);
  });
  it("rejects an unknown mechanic", () => {
    expect(composeScene(["nope"]).ok).toBe(false);
  });
});

describe("whiteboard moves", () => {
  it("picks a curated move by intent (never free-keyframes)", () => {
    expect(pickWhiteboardMove("this is wrong, a common myth").id).toBe("cross-out");
    expect(pickWhiteboardMove("draw a person").id).toBe("sketch-figure");
    expect(WHITEBOARD_MOVES.every((m) => m.durationSec > 0)).toBe(true);
  });
});
