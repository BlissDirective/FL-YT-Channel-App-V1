/**
 * Scene detection on generated clips (Batch 10). Pure cut→scene grouping and
 * the trim suggestion that avoids crossing an internal cut.
 */
import { describe, expect, it } from "vitest";
import { scenesFromCuts, sceneTrimSuggestion, trimCrossesCut, type SceneCut } from "@studio/core";

const cuts: SceneCut[] = [
  { atSec: 3, score: 0.6 },
  { atSec: 7, score: 0.8 },
];

describe("scenesFromCuts", () => {
  it("splits a 10s clip at its cut points into contiguous scenes", () => {
    const scenes = scenesFromCuts(cuts, 10);
    expect(scenes.map((s) => [s.start, s.end])).toEqual([
      [0, 3],
      [3, 7],
      [7, 10],
    ]);
  });
  it("drops sub-minimum slivers and never returns empty", () => {
    expect(scenesFromCuts([{ atSec: 0.1, score: 0.9 }], 5)).toHaveLength(1);
    expect(scenesFromCuts([], 5)).toEqual([{ start: 0, end: 5, durationSec: 5 }]);
  });
});

describe("sceneTrimSuggestion", () => {
  it("picks a single scene that covers the target (no crossed cut)", () => {
    const scenes = scenesFromCuts(cuts, 10); // scenes of 3,4,3s
    const trim = sceneTrimSuggestion(scenes, 3);
    expect(trim.crossedCut).toBe(false);
    expect(trim.out - trim.in).toBeCloseTo(3, 5);
  });
  it("falls back to the longest scene when nothing covers the target", () => {
    const scenes = scenesFromCuts(cuts, 10);
    const trim = sceneTrimSuggestion(scenes, 8);
    expect(trim.crossedCut).toBe(true);
    // longest scene is [3,7]
    expect(trim.in).toBe(3);
    expect(trim.out).toBe(7);
  });
});

describe("trimCrossesCut", () => {
  it("detects a window that spans an internal cut", () => {
    expect(trimCrossesCut(cuts, 2, 5)).toBe(true); // crosses the cut at 3
    expect(trimCrossesCut(cuts, 3.1, 6.9)).toBe(false); // between cuts
  });
});
