/**
 * competitive-judge.ts — the weighted scoring for the Self-Watch competitive-fit
 * dimension (#4). The LLM I/O isn't unit-tested, but the pure weight math that
 * turns per-criterion verdicts into a 0–10 score is gate-relevant.
 */
import { describe, expect, it } from "vitest";
import { scoreCompetitive, type WatchCriterionKey } from "@/lib/pipeline/watch-gate";

const all = (pass: boolean): Record<WatchCriterionKey, boolean> =>
  ({
    hook_competitive: pass,
    structure_retention_aligned: pass,
    angle_differentiated: pass,
    packaging_vs_winners: pass,
    faceless_policy_transformative: pass,
  }) as Record<WatchCriterionKey, boolean>;

describe("scoreCompetitive", () => {
  it("is 10 when every criterion passes and 0 when all fail", () => {
    expect(scoreCompetitive(all(true))).toBe(10);
    expect(scoreCompetitive(all(false))).toBe(0);
  });

  it("weights the heavier criteria (hook/angle/policy = 2) more than the light ones", () => {
    // Total weight = 2+1+2+1+2 = 8. Failing only packaging_vs_winners (weight 1)
    // → 7/8 = 8.75.
    const passed = { ...all(true), packaging_vs_winners: false };
    expect(scoreCompetitive(passed)).toBe(8.75);
    // Failing only the compliance criterion (weight 2) → 6/8 = 7.5.
    const noPolicy = { ...all(true), faceless_policy_transformative: false };
    expect(scoreCompetitive(noPolicy)).toBe(7.5);
  });
});
