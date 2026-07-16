/**
 * Editor & Assembly R1 — the Segment model + segmentsToDocument compile path.
 * The crux: a granular, sub-beat/sequence plan compiles to a gapless, valid
 * EditDocument (the same doc /edit already edits), and the pure helpers
 * (split, cost, validate, router bridge, keyframe authoring) behave.
 */
import { describe, expect, it } from "vitest";
import {
  type Segment,
  type SegmentPlan,
  splitSegment,
  segDuration,
  segmentPlanCost,
  leafSegments,
  validateSegmentPlan,
  segmentsToDocument,
  segmentsFromShotPlan,
  mediumToSegmentMedium,
  motionForSegment,
  panZoomKeyframes,
  MEDIUM_EDD_SOURCE,
  validateEdd,
  introOutroRuntime,
  type EddContext,
  type ShotPlan,
} from "@studio/core";

const clip = (over: Partial<Segment>): Segment => ({
  id: "s",
  beatIdx: 0,
  startSec: 0,
  endSec: 5,
  kind: "clip",
  medium: "still",
  estCostUsd: 0.025,
  status: "planned",
  ...over,
});

// The operator's worked example: beat 1 split (hero still / Seedance clip),
// beat 2 a 3-Flux-still sequence with crossfades.
function examplePlan(): SegmentPlan {
  const b1: Segment[] = [
    clip({ id: "1a", beatIdx: 0, startSec: 0, endSec: 15, medium: "still", model: "flux-dev" }),
    clip({
      id: "1b",
      beatIdx: 0,
      startSec: 15,
      endSec: 30,
      medium: "ai-clip",
      model: "seedance-2.0-fast",
      transitionIn: { kind: "cut" },
      estCostUsd: 0.2,
    }),
  ];
  const seqChildren: Segment[] = [
    clip({ id: "2a-A", beatIdx: 1, startSec: 30, endSec: 36, medium: "still", model: "flux-dev" }),
    clip({ id: "2a-B", beatIdx: 1, startSec: 36, endSec: 42, medium: "still", model: "flux-dev", transitionIn: { kind: "crossfade", sec: 0.4 } }),
    clip({ id: "2a-C", beatIdx: 1, startSec: 42, endSec: 48, medium: "still", model: "flux-dev", transitionIn: { kind: "crossfade", sec: 0.4 } }),
  ];
  const b2: Segment[] = [
    { ...clip({ id: "2a", beatIdx: 1, startSec: 30, endSec: 48, medium: "still" }), kind: "sequence", children: seqChildren, estCostUsd: 0 },
  ];
  const plan: SegmentPlan = {
    beats: [
      { beatIdx: 0, segments: b1 },
      { beatIdx: 1, segments: b2 },
    ],
    version: 1,
    planCostUsd: 0,
  };
  plan.planCostUsd = segmentPlanCost(plan);
  return plan;
}

describe("segment helpers", () => {
  it("segDuration is endSec − startSec", () => {
    expect(segDuration(clip({ startSec: 2, endSec: 7 }))).toBe(5);
  });

  it("leafSegments expands sequences into children, passes clips through", () => {
    const leaves = leafSegments(examplePlan());
    // 1a, 1b, then the 3 sequence children = 5 leaves (not the sequence parent).
    expect(leaves.map((l) => l.id)).toEqual(["1a", "1b", "2a-A", "2a-B", "2a-C"]);
  });

  it("planCost sums leaf segments (sequence parent cost is ignored)", () => {
    // 0.025 + 0.2 + 3×0.025 = 0.3
    expect(segmentPlanCost(examplePlan())).toBeCloseTo(0.3, 5);
  });
});

describe("splitSegment", () => {
  it("splits a clip into two gapless halves", () => {
    const [a, b] = splitSegment(clip({ id: "x", startSec: 0, endSec: 10 }), 4);
    expect(a.endSec).toBe(4);
    expect(b.startSec).toBe(4);
    expect(b.id).not.toBe(a.id);
    expect(b.transitionIn).toEqual({ kind: "cut" });
  });

  it("refuses a cut outside the segment or on a sequence", () => {
    expect(splitSegment(clip({ startSec: 0, endSec: 10 }), 0).length).toBe(1);
    expect(splitSegment(clip({ startSec: 0, endSec: 10 }), 10).length).toBe(1);
    expect(splitSegment({ ...clip({}), kind: "sequence", children: [] }, 3).length).toBe(1);
  });
});

describe("mediumToSegmentMedium + motion", () => {
  it("maps router mediums onto segment mediums", () => {
    expect(mediumToSegmentMedium("i2v")).toBe("ai-clip");
    expect(mediumToSegmentMedium("t2v")).toBe("ai-clip");
    expect(mediumToSegmentMedium("chart")).toBe("dataviz");
    expect(mediumToSegmentMedium("remotion")).toBe("scene");
    expect(mediumToSegmentMedium("still")).toBe("still");
  });

  it("stills get a ken-burns move; footage plays untransformed", () => {
    expect(motionForSegment(clip({ medium: "still" })).kind).toBe("kenburns");
    expect(motionForSegment(clip({ medium: "ai-clip" })).kind).toBe("none");
    expect(motionForSegment(clip({ medium: "stock" })).kind).toBe("none");
  });

  it("panZoomKeyframes builds a 2-point track ending at the duration", () => {
    const kf = panZoomKeyframes({ durationSec: 6, fromScale: 1.0, toScale: 1.15, to: { x: -3, y: 0 } });
    expect(kf).toHaveLength(2);
    expect(kf[0].t).toBe(0);
    expect(kf[1].t).toBe(6);
    expect(kf[1].scale).toBe(1.15);
    expect(kf[1].x).toBe(-3);
  });
});

describe("validateSegmentPlan", () => {
  it("accepts the gapless example plan", () => {
    expect(validateSegmentPlan(examplePlan()).ok).toBe(true);
  });

  it("flags a gap between segments in a beat", () => {
    const p = examplePlan();
    p.beats[0].segments[1].startSec = 16; // was 15 → gap
    const r = validateSegmentPlan(p);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /gap\/overlap/.test(e.msg))).toBe(true);
  });

  it("flags a sequence with < 2 children", () => {
    const p = examplePlan();
    p.beats[1].segments[0].children = [p.beats[1].segments[0].children![0]];
    expect(validateSegmentPlan(p).ok).toBe(false);
  });
});

describe("segmentsToDocument", () => {
  const opts = { format: "long" as const, introSec: 2, outroSec: 3 };
  const ctxFor = (doc: ReturnType<typeof segmentsToDocument>): EddContext => ({
    assets: [],
    beats: [
      { idx: 0, hasText: false },
      { idx: 1, hasText: false },
    ],
    transitions: { cut: { maxSec: 0 }, crossfade: { maxSec: 1.5 } },
    captionStyles: new Set(["clean"]),
    sfxLibrary: new Set(),
    overlayStyles: new Set(),
    musicEnabled: false,
    toleranceSec: Math.max(2, doc.meta.targetDurationSec * 0.05),
  });

  it("compiles 5 gapless clips (sequence expanded) that pass validateEdd", () => {
    const doc = segmentsToDocument(examplePlan(), opts);
    expect(doc.tracks.video).toHaveLength(5);
    // gapless from introSec
    let cursor = doc.intro.sec;
    for (const c of doc.tracks.video) {
      expect(c.start).toBeCloseTo(cursor, 5);
      cursor += c.duration;
    }
    expect(validateEdd(doc, ctxFor(doc)).ok).toBe(true);
  });

  it("maps mediums to sources and defaults motion", () => {
    const doc = segmentsToDocument(examplePlan(), opts);
    expect(doc.tracks.video[0].source).toBe(MEDIUM_EDD_SOURCE.still);
    expect(doc.tracks.video[1].source).toBe("ai-clip");
    expect(doc.tracks.video[1].motion.kind).toBe("none"); // footage
    expect(doc.tracks.video[0].motion.kind).toBe("kenburns"); // still
  });

  it("last clip ends on a cut; a child crossfade becomes the previous clip's transitionOut", () => {
    const doc = segmentsToDocument(examplePlan(), opts);
    const v = doc.tracks.video;
    expect(v[v.length - 1].transitionOut).toEqual({ kind: "cut" });
    // clip 3 (2a-A) → transitionOut is 2a-B's crossfade
    expect(v[2].transitionOut.kind).toBe("crossfade");
  });

  it("runtime = intro + Σ durations + outro", () => {
    const doc = segmentsToDocument(examplePlan(), opts);
    // body is 48s of segments; intro 2 + 48 + outro 3 = 53
    expect(introOutroRuntime(doc)).toBeCloseTo(53, 5);
  });

  it("is deterministic", () => {
    expect(segmentsToDocument(examplePlan(), opts)).toEqual(segmentsToDocument(examplePlan(), opts));
  });
});

describe("segmentsFromShotPlan (AUTO bridge)", () => {
  it("converts routed shots into gapless clip segments with carried cost", () => {
    const shotPlan: ShotPlan = {
      beats: [
        { beatIdx: 0, shots: [{ id: "0-i2v", beatIdx: 0, intent: "hero", medium: "i2v", durationSec: 4, estCostUsd: 0.2, reason: "hero" }] },
        { beatIdx: 1, shots: [{ id: "1-still", beatIdx: 1, intent: "detail", medium: "still", durationSec: 4, estCostUsd: 0.025, reason: "detail" }] },
      ],
      version: 1,
      planCostUsd: 0.225,
    };
    const seg = segmentsFromShotPlan(shotPlan);
    expect(seg.beats).toHaveLength(2);
    expect(seg.beats[0].segments[0].medium).toBe("ai-clip");
    expect(seg.beats[1].segments[0].medium).toBe("still");
    // 0.2 + 0.025 = 0.225, rounded to cents for display (matches V2 planCost).
    expect(seg.planCostUsd).toBe(0.23);
  });
});
