/**
 * mergeQualityGates — the Settings-save fix. Regression guard for the bug
 * where saving thresholds wiped keys the UI didn't send (revisionWarnAt,
 * coldStartMin) back to their defaults. Also pins the clamps so the save
 * action and getQualityGateConfig can never disagree on ranges.
 */
import { describe, expect, it } from "vitest";
import { GATE_CLAMPS, mergeQualityGates } from "@/lib/pipeline/quality-gates";

describe("mergeQualityGates", () => {
  it("preserves stored keys the UI did NOT send (the reported bug)", () => {
    // Operator previously tuned revisionWarnAt=2 & coldStartMin=8 in the DB.
    const existing = { runFloor: 7, revisionWarnAt: 2, coldStartMin: 8 };
    // A Settings save that only changes runFloor (older UI without those fields).
    const out = mergeQualityGates({ runFloor: 8 }, existing);
    expect(out.revisionWarnAt).toBe(2); // NOT wiped back to the default (3)
    expect(out.coldStartMin).toBe(8); //  NOT wiped back to the default (5)
    expect(out.runFloor).toBe(8); //      the actual change applied
  });

  it("now round-trips revisionWarnAt & coldStartMin from the UI", () => {
    const out = mergeQualityGates({ revisionWarnAt: 2, coldStartMin: 12 }, null);
    expect(out.revisionWarnAt).toBe(2);
    expect(out.coldStartMin).toBe(12);
  });

  it("clamps per GATE_CLAMPS: scores 0–10 keep decimals, int knobs round", () => {
    const out = mergeQualityGates(
      {
        runFloor: 99, //            → clamped to 10
        ideaFloor: 6.5, //          → decimal kept
        revisionHardCap: 3.7, //    → int rounds to 4
        watchTemporalEscalateAt: 0, // → clamped up to 1
        playbookAutoGraduateConfidence: 5, // → clamped to 1
      },
      null,
    );
    expect(out.runFloor).toBe(10);
    expect(out.ideaFloor).toBe(6.5);
    expect(out.revisionHardCap).toBe(4);
    expect(out.watchTemporalEscalateAt).toBe(1);
    expect(out.playbookAutoGraduateConfidence).toBe(1);
  });

  it("drops absent / non-finite inputs (they can't erase a stored value)", () => {
    const existing = { runFloor: 7 };
    const out = mergeQualityGates(
      { runFloor: undefined, ideaFloor: NaN as unknown as number },
      existing,
    );
    expect(out.runFloor).toBe(7); // preserved
    expect("ideaFloor" in out).toBe(false); // NaN dropped, not written
  });

  it("every clamp key is a real config key (no typos)", () => {
    // Guards against a key in GATE_CLAMPS that getQualityGateConfig never reads.
    const known = new Set([
      "ideaFloor", "revisionWarnAt", "revisionHardCap", "qcLessonBelow",
      "coldStartMin", "seedVisionFloor", "varietyMinDistance", "autofixThreshold",
      "runFloor", "runPublic", "factRiskMax", "beatRelevanceFloor", "timingFloor",
      "watchBlockPublishBelow", "competitiveFloor", "transitionFloor",
      "watchTemporalEscalateAt", "playbookShadowMinEvidence",
      "playbookAutoGraduateConfidence",
    ]);
    for (const key of Object.keys(GATE_CLAMPS)) expect(known.has(key)).toBe(true);
    expect(Object.keys(GATE_CLAMPS).length).toBe(known.size);
  });
});
