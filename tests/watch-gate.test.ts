/**
 * watch-gate.ts — the Self-Watch gate pure core (Fable5-Self-Watch-Loop-Plan.md,
 * Phase 0–1). Timing (#3) is deterministic from the render timeline + media-QC;
 * script-match (#2) reads the per-beat relevance verdicts. Both, the overall
 * roll-up, the degraded-never-blocks rule, and the fix-plan derivation are pure
 * and gate-critical, so they're exercised directly.
 */
import { describe, expect, it } from "vitest";
import {
  assembleVerdict,
  checkScriptMatch,
  checkTiming,
  checkTransitions,
  deriveFixPlan,
  foldTemporal,
  rerollActions,
  transitionBoundaries,
  type CompetitiveInput,
  type WatchInputs,
} from "@/lib/pipeline/watch-gate";

const T = { timingFloor: 7, scriptMatchFloor: 6, transitionFloor: 6 };

const inputs = (over: Partial<WatchInputs> = {}): WatchInputs => ({
  targetLengthSec: over.targetLengthSec ?? 60,
  durationSec: over.durationSec ?? 60,
  captionsOn: over.captionsOn ?? true,
  beats: over.beats ?? [
    { idx: 0, start: 0, end: 10, narrated: true },
    { idx: 1, start: 10, end: 25, narrated: true },
    { idx: 2, start: 25, end: 60, narrated: true },
  ],
  clips: over.clips ?? [
    { beatIdx: 0, relevance: 8 },
    { beatIdx: 1, relevance: 9 },
    { beatIdx: 2, relevance: 7 },
  ],
  silencePass: over.silencePass ?? true,
});

describe("checkTiming", () => {
  it("passes a clean render (coverage, hook density, no dead air, length, cadence)", () => {
    const r = checkTiming(inputs(), T);
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.score).toBe(10);
  });

  it("flags a narrated beat with no visual (coverage)", () => {
    const r = checkTiming(inputs({ clips: [{ beatIdx: 0, relevance: 8 }, { beatIdx: 1, relevance: 8 }] }), T);
    expect(r.issues.some((i) => i.criterion === "beat_visual_coverage" && i.beatIdx === 2)).toBe(true);
    expect(r.pass).toBe(false);
  });

  it("flags a thin hook (fewer than 2 visual changes in the first 30s)", () => {
    const r = checkTiming(
      inputs({
        beats: [
          { idx: 0, start: 0, end: 40, narrated: true },
          { idx: 1, start: 40, end: 60, narrated: true },
        ],
        clips: [{ beatIdx: 0, relevance: 8 }, { beatIdx: 1, relevance: 8 }],
      }),
      T,
    );
    expect(r.issues.some((i) => i.criterion === "hook_density_30s")).toBe(true);
  });

  it("flags dead air from the media-QC silence check, and skips the check when media-QC didn't run", () => {
    expect(checkTiming(inputs({ silencePass: false }), T).issues.some((i) => i.criterion === "no_dead_air")).toBe(true);
    const skipped = checkTiming(inputs({ silencePass: null }), T);
    expect(skipped.issues.some((i) => i.criterion === "no_dead_air")).toBe(false);
  });

  it("flags an out-of-band runtime (>25% off target)", () => {
    const r = checkTiming(inputs({ durationSec: 90, targetLengthSec: 60 }), T);
    expect(r.issues.some((i) => i.criterion === "length_in_band")).toBe(true);
  });

  it("flags a shot held longer than 45s", () => {
    const r = checkTiming(
      inputs({ beats: [{ idx: 0, start: 0, end: 12, narrated: true }, { idx: 1, start: 12, end: 70, narrated: true }] }),
      T,
    );
    expect(r.issues.some((i) => i.criterion === "pattern_interrupt_cadence" && i.beatIdx === 1)).toBe(true);
  });
});

describe("checkScriptMatch", () => {
  it("passes when every beat clears the relevance floor", () => {
    const r = checkScriptMatch(inputs(), T);
    expect(r.pass).toBe(true);
    expect(r.evaluated).toBe(true);
  });

  it("flags an off-topic beat below the floor and targets it for a re-roll", () => {
    const r = checkScriptMatch(inputs({ clips: [{ beatIdx: 0, relevance: 8 }, { beatIdx: 1, relevance: 3 }] }), T);
    expect(r.pass).toBe(false);
    expect(r.issues[0]).toMatchObject({ criterion: "beat_frame_relevance", beatIdx: 1 });
  });

  it("is not evaluated (and never blocks) when no relevance data exists", () => {
    const r = checkScriptMatch(inputs({ clips: [{ beatIdx: 0, relevance: null }] }), T);
    expect(r.evaluated).toBe(false);
    expect(r.pass).toBe(true);
  });
});

describe("deriveFixPlan", () => {
  it("turns an off-topic beat into a re-roll and timing failures into flags", () => {
    const timing = checkTiming(inputs({ durationSec: 90 }), T); // length flag
    const scriptMatch = checkScriptMatch(inputs({ clips: [{ beatIdx: 2, relevance: 2 }] }), T);
    const plan = deriveFixPlan(timing, scriptMatch);
    expect(plan.some((f) => f.kind === "reroll" && f.beatIdx === 2)).toBe(true);
    expect(plan.some((f) => f.kind === "flag" && f.scope === "script")).toBe(true);
  });
});

describe("assembleVerdict", () => {
  const NOW = "2026-07-05T00:00:00.000Z";

  it("rolls up a clean render to a high overall and an empty fix plan", () => {
    const v = assembleVerdict(inputs(), T, NOW);
    expect(v.overall).toBeGreaterThanOrEqual(8);
    expect(v.fixPlan).toHaveLength(0);
    expect(v.degraded).toBe(false);
    expect(v.criteriaVersion).toBe("watch-v1");
  });

  it("averages only the evaluated dimensions (script-match absent → timing only)", () => {
    const v = assembleVerdict(inputs({ clips: [{ beatIdx: 0, relevance: null }, { beatIdx: 1, relevance: null }, { beatIdx: 2, relevance: null }] }), T, NOW);
    expect(v.scriptMatch.evaluated).toBe(false);
    expect(v.overall).toBe(v.timing.score);
  });

  it("drops the overall when a bad beat drags script-match down", () => {
    const clean = assembleVerdict(inputs(), T, NOW).overall;
    const dirty = assembleVerdict(inputs({ clips: [{ beatIdx: 0, relevance: 2 }, { beatIdx: 1, relevance: 2 }, { beatIdx: 2, relevance: 2 }] }), T, NOW).overall;
    expect(dirty).toBeLessThan(clean);
  });

  it("folds a competitive dimension into the roll-up and propagates policyRisk", () => {
    const competitive: CompetitiveInput = {
      result: { score: 4, pass: false, evaluated: true, issues: [{ criterion: "angle_differentiated", beatIdx: null, detail: "saturated topic" }] },
      policyRisk: true,
      suggestions: ["Sharpen the angle"],
    };
    const v = assembleVerdict(inputs(), T, NOW, [], competitive);
    expect(v.competitive.evaluated).toBe(true);
    expect(v.policyRisk).toBe(true);
    expect(v.competitiveSuggestions).toContain("Sharpen the angle");
    // A competitive failure surfaces as a script-altitude flag.
    expect(v.fixPlan.some((f) => f.kind === "flag" && f.scope === "script")).toBe(true);
    // Overall now averages three evaluated dimensions, so a weak competitive drags it.
    expect(v.overall).toBeLessThan(assembleVerdict(inputs(), T, NOW).overall);
  });

  it("leaves competitive un-evaluated (and out of the roll-up) when no judge ran", () => {
    const v = assembleVerdict(inputs(), T, NOW);
    expect(v.competitive.evaluated).toBe(false);
    expect(v.policyRisk).toBe(false);
  });
});

describe("checkTransitions (structural Tier-1)", () => {
  it("passes a clean cut sequence with a clean open", () => {
    const r = checkTransitions(inputs(), T);
    expect(r.pass).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("flags a flicker cut (a shot that flashes by)", () => {
    const r = checkTransitions(
      inputs({ beats: [{ idx: 0, start: 0, end: 0.6, narrated: true }, { idx: 1, start: 0.6, end: 30, narrated: true }] }),
      T,
    );
    expect(r.issues.some((i) => i.criterion === "boundary_not_jarring" && i.beatIdx === 0)).toBe(true);
    expect(r.pass).toBe(false); // baseline criterion
  });

  it("flags an abrupt open (first beat starts late)", () => {
    const r = checkTransitions(
      inputs({ beats: [{ idx: 0, start: 3, end: 30, narrated: true }, { idx: 1, start: 30, end: 60, narrated: true }] }),
      T,
    );
    expect(r.issues.some((i) => i.criterion === "intro_outro_framing")).toBe(true);
  });
});

describe("transitionBoundaries", () => {
  it("returns a boundary at each shot-type change", () => {
    const b = transitionBoundaries([
      { idx: 0, start: 0, end: 10, narrated: true, shotType: "wide" },
      { idx: 1, start: 10, end: 20, narrated: true, shotType: "wide" },
      { idx: 2, start: 20, end: 30, narrated: true, shotType: "close" },
    ]);
    expect(b).toEqual([{ afterBeat: 1, atSec: 20 }]);
  });

  it("treats every cut as a boundary when shot types aren't tagged", () => {
    const b = transitionBoundaries([
      { idx: 0, start: 0, end: 10, narrated: true },
      { idx: 1, start: 10, end: 20, narrated: true },
    ]);
    expect(b).toHaveLength(1);
  });
});

describe("foldTemporal", () => {
  const structural = { score: 10, pass: true, evaluated: true, issues: [] };
  it("returns the structural verdict unchanged when the temporal pass didn't run", () => {
    expect(foldTemporal(structural, { score: 0, evaluated: false, issues: [] }, 6)).toBe(structural);
  });

  it("takes the (authoritative, lower) temporal score and merges issues when the pass ran", () => {
    const folded = foldTemporal(structural, { score: 4, evaluated: true, issues: [{ criterion: "motion_continuity", beatIdx: null, detail: "stutter at 12s" }] }, 6);
    expect(folded.score).toBe(4); // temporal is authoritative (worst-link)
    expect(folded.issues).toHaveLength(1);
    expect(folded.pass).toBe(false); // 4 < floor 6
  });
});

describe("rerollActions", () => {
  const NOW = "2026-07-05T00:00:00.000Z";
  it("extracts only the re-rollable (off-topic beat) fixes for the autofix loop", () => {
    const v = assembleVerdict(
      inputs({ clips: [{ beatIdx: 1, relevance: 3 }, { beatIdx: 2, relevance: 2 }], durationSec: 200 }),
      T,
      NOW,
    );
    const rerolls = rerollActions(v);
    expect(rerolls.map((r) => r.beatIdx).sort()).toEqual([1, 2]);
    // The out-of-band length flag is NOT a re-roll.
    expect(rerolls.every((r) => typeof r.beatIdx === "number")).toBe(true);
  });
});
