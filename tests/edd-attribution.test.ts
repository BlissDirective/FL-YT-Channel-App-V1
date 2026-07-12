/**
 * Retention → EDD attribution (Phase E): dips on the audience-retention curve
 * map to the exact clip/transition/caption elements of the cut.
 */
import { describe, expect, it } from "vitest";
import {
  CTA_TEXT,
  INTRO_SEC,
  OUTRO_SEC,
  attributeRetentionToEdd,
  compileEdd,
  describeDip,
  introOutroRuntime,
  setTransition,
  type CompileInput,
  type RetentionPoint,
} from "@studio/core";

function input(n = 4): CompileInput {
  return {
    format: "long",
    introSec: INTRO_SEC,
    outroSec: OUTRO_SEC,
    ctaText: CTA_TEXT,
    beats: Array.from({ length: n }, (_, idx) => ({
      idx,
      text: `Beat ${idx} narration text.`,
      durationSec: 6,
      voAssetId: `vo-${idx}`,
      visualAssetId: `img-${idx}`,
      source: "still" as const,
      words: [
        { w: "alpha", start: 0.2, end: 0.9 },
        { w: "beta", start: 0.9, end: 1.6 },
      ],
    })),
  };
}

/** Flat curve with a cliff at `dipRatio` of `dropPts` percentage points. */
function curveWithDip(dipRatio: number, dropPts: number, samples = 50): RetentionPoint[] {
  const points: RetentionPoint[] = [];
  let ratioWatched = 1;
  for (let i = 0; i < samples; i++) {
    const ratio = i / (samples - 1);
    if (ratio >= dipRatio && ratioWatched === 1) ratioWatched = 1 - dropPts / 100;
    points.push({ ratio, watchRatio: ratioWatched });
  }
  return points;
}

describe("attributeRetentionToEdd", () => {
  it("maps a mid-video cliff onto the clip playing at that moment", () => {
    const doc = compileEdd(input());
    const runtime = introOutroRuntime(doc);
    // Aim the dip at the middle of beat 2's clip.
    const clip = doc.tracks.video.find((c) => c.beatIdx === 2)!;
    const dipRatio = (clip.start + clip.duration / 2) / runtime;
    const dips = attributeRetentionToEdd(doc, curveWithDip(dipRatio, 8));
    expect(dips).toHaveLength(1);
    expect(dips[0].clipId).toBe(clip.id);
    expect(dips[0].beatIdx).toBe(2);
    expect(dips[0].source).toBe("still");
    expect(dips[0].dropPts).toBeGreaterThanOrEqual(7);
    expect(dips[0].transitionInto).toBeNull(); // mid-clip, not a boundary
  });

  it("blames the transition when the dip lands at a clip boundary", () => {
    let doc = compileEdd(input());
    const clips = doc.tracks.video;
    const target = clips.find((c) => c.beatIdx === 2)!;
    const prev = clips[clips.indexOf(target) - 1];
    doc = setTransition(doc, prev.id, { kind: "whip", sec: 0.4 });
    const runtime = introOutroRuntime(doc);
    const dipRatio = (target.start + 0.4) / runtime; // within BOUNDARY_SEC of the head
    const dips = attributeRetentionToEdd(doc, curveWithDip(dipRatio, 6));
    expect(dips[0]?.clipId).toBe(target.id);
    expect(dips[0]?.transitionInto).toBe("whip");
  });

  it("ignores the universal intro cliff and sub-threshold noise", () => {
    const doc = compileEdd(input());
    // 20pt cliff inside the first 6% — packaging territory, not the cut's.
    expect(attributeRetentionToEdd(doc, curveWithDip(0.02, 20))).toHaveLength(0);
    // 1pt wiggle mid-video — under the default 3pt threshold.
    expect(attributeRetentionToEdd(doc, curveWithDip(0.5, 1))).toHaveLength(0);
  });

  it("caps the report and dedupes multiple samples inside one clip", () => {
    const doc = compileEdd(input(6));
    // Steady decay: every adjacent sample drops 4pts → many qualifying dips.
    const points: RetentionPoint[] = Array.from({ length: 26 }, (_, i) => ({
      ratio: i / 25,
      watchRatio: 1 - i * 0.04,
    }));
    const dips = attributeRetentionToEdd(doc, points, { maxDips: 3 });
    expect(dips.length).toBeLessThanOrEqual(3);
    const clipIds = dips.map((d) => d.clipId);
    expect(new Set(clipIds).size).toBe(clipIds.length); // one dip per clip
  });

  it("returns [] on empty/short curves", () => {
    const doc = compileEdd(input());
    expect(attributeRetentionToEdd(doc, [])).toEqual([]);
    expect(attributeRetentionToEdd(doc, [{ ratio: 0, watchRatio: 1 }])).toEqual([]);
  });

  it("describeDip phrases the pattern for a lesson", () => {
    const text = describeDip({
      atSec: 42.5,
      dropPts: 6.2,
      clipId: "v3",
      beatIdx: 2,
      source: "still",
      motionKind: "none",
      transitionInto: "whip",
      captionStyle: "clean",
      emphasisCount: 2,
    });
    expect(text).toContain("6.2pts");
    expect(text).toContain("beat 2");
    expect(text).toContain("whip");
    expect(text).toContain("static still");
    expect(text).toContain("clean (2 emphasized)");
  });
});
