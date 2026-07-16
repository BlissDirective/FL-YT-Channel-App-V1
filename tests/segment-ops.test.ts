/**
 * Editor & Assembly R3 — the shared segment-plan op vocabulary. These are the
 * exact ops the Assembly UI (human) and the MVDA (agent) both edit through, so
 * the two can never diverge. Plus the proposal diff and the agent tool
 * dispatcher (a malformed tool call must never corrupt the plan).
 */
import { describe, expect, it } from "vitest";
import {
  type SegmentPlan,
  initialPlanFromBeats,
  segmentPlanCost,
  validateSegmentPlan,
  segDuration,
  splitSegmentInHalf,
  assignSegmentMedium,
  setSegmentMotion,
  setSegmentPrompt,
  removeSegment,
  makeSequence,
  addSequenceChild,
  removeSequenceChild,
  motionFromPreset,
  presetOfMotion,
  segmentPlanDiff,
  applySegmentTool,
  SEGMENT_TOOLS,
} from "@studio/core";

const base = (): SegmentPlan =>
  initialPlanFromBeats([
    { idx: 0, shotType: "broll" },
    { idx: 1, shotType: "hero" },
  ]);

const beatLeafCount = (p: SegmentPlan, idx: number) => {
  const b = p.beats.find((x) => x.beatIdx === idx)!;
  return b.segments.reduce((n, s) => n + (s.kind === "sequence" ? s.children?.length ?? 0 : 1), 0);
};

describe("motion presets round-trip", () => {
  it("preset → spec → preset is stable for the named presets", () => {
    for (const p of ["zoom-in", "zoom-out", "static", "pan-left", "pan-right", "none", "hero-hold"] as const) {
      expect(presetOfMotion(motionFromPreset(p, 5))).toBe(p);
    }
    expect(presetOfMotion(motionFromPreset("auto", 5))).toBe("auto");
  });
});

describe("ops keep the beat gapless + cost current", () => {
  it("splitSegmentInHalf → 2 gapless segments, plan still valid", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    const p1 = splitSegmentInHalf(p0, 0, id);
    expect(beatLeafCount(p1, 0)).toBe(2);
    expect(validateSegmentPlan(p1).ok).toBe(true);
    expect(p1.planCostUsd).toBe(segmentPlanCost(p1));
  });

  it("assignSegmentMedium updates medium, model, and cost", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    const p1 = assignSegmentMedium(p0, 0, id, "ai-clip", "seedance-2.0-fast");
    const s = p1.beats[0].segments[0];
    expect(s.medium).toBe("ai-clip");
    expect(s.model).toBe("seedance-2.0-fast");
    expect(s.estCostUsd).toBeGreaterThan(0);
    expect(p1.planCostUsd).toBe(segmentPlanCost(p1));
  });

  it("setSegmentMotion / setSegmentPrompt patch the target only", () => {
    const p0 = base();
    const id = p0.beats[1].segments[0].id;
    const p1 = setSegmentMotion(p0, 1, id, motionFromPreset("pan-left", segDuration(p0.beats[1].segments[0])));
    expect(presetOfMotion(p1.beats[1].segments[0].motion)).toBe("pan-left");
    const p2 = setSegmentPrompt(p1, 1, id, "a lone figure");
    expect(p2.beats[1].segments[0].prompt).toBe("a lone figure");
  });

  it("removeSegment is a no-op on a single-segment beat", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    expect(removeSegment(p0, 0, id)).toEqual(p0);
  });

  it("makeSequence → gapless children tiling the parent; add/remove child stays valid", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    let p = makeSequence(p0, 0, id, 3);
    expect(p.beats[0].segments[0].kind).toBe("sequence");
    expect(beatLeafCount(p, 0)).toBe(3);
    expect(validateSegmentPlan(p).ok).toBe(true);
    p = addSequenceChild(p, 0, id);
    expect(beatLeafCount(p, 0)).toBe(4);
    expect(validateSegmentPlan(p).ok).toBe(true);
    const childId = p.beats[0].segments[0].children![0].id;
    p = removeSequenceChild(p, 0, id, childId);
    expect(beatLeafCount(p, 0)).toBe(3);
    expect(validateSegmentPlan(p).ok).toBe(true);
  });
});

describe("segmentPlanDiff", () => {
  it("reports segment-count and cost changes; 'no structural change' otherwise", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    const p1 = splitSegmentInHalf(p0, 0, id);
    const d = segmentPlanDiff(p0, p1);
    expect(d.some((x) => /beat 1: 1 → 2/.test(x))).toBe(true);
    expect(segmentPlanDiff(p0, p0)).toEqual(["no structural change"]);
  });
});

describe("applySegmentTool (agent dispatcher)", () => {
  it("every tool schema dispatches to a real op", () => {
    const p0 = base();
    const id = p0.beats[0].segments[0].id;
    const byTool = (name: string, input: Record<string, unknown>) => applySegmentTool(p0, name, input);
    expect(beatLeafCount(byTool("split_segment", { beatIdx: 0, segId: id }), 0)).toBe(2);
    expect(byTool("assign_medium", { beatIdx: 0, segId: id, medium: "ai-clip" }).beats[0].segments[0].medium).toBe("ai-clip");
    expect(presetOfMotion(byTool("set_segment_motion", { beatIdx: 0, segId: id, preset: "zoom-out" }).beats[0].segments[0].motion)).toBe("zoom-out");
    expect(byTool("set_segment_prompt", { beatIdx: 0, segId: id, prompt: "x" }).beats[0].segments[0].prompt).toBe("x");
    expect(byTool("make_sequence", { beatIdx: 0, segId: id, count: 4 }).beats[0].segments[0].kind).toBe("sequence");
  });

  it("malformed calls return the plan unchanged (never corrupts it)", () => {
    const p0 = base();
    expect(applySegmentTool(p0, "split_segment", { beatIdx: 9, segId: "nope" })).toEqual(p0);
    expect(applySegmentTool(p0, "assign_medium", { beatIdx: 0, segId: p0.beats[0].segments[0].id, medium: "bogus" })).toEqual(p0);
    expect(applySegmentTool(p0, "unknown_tool", { beatIdx: 0, segId: p0.beats[0].segments[0].id })).toEqual(p0);
    expect(applySegmentTool(p0, "split_segment", {})).toEqual(p0);
  });

  it("the tool schema list is non-empty and every entry has a name + input_schema", () => {
    expect(SEGMENT_TOOLS.length).toBeGreaterThan(0);
    for (const t of SEGMENT_TOOLS) {
      expect(typeof t.name).toBe("string");
      expect(t.input_schema.type).toBe("object");
    }
  });
});
