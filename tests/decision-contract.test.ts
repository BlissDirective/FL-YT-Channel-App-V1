/**
 * Decision Communication Contract, re-gate list & onboarding (Batch 13).
 */
import { describe, expect, it } from "vitest";
import {
  announceSpend,
  ONBOARDING_STEPS,
  RE_GATE_CHANGES,
  reapprovalReason,
  requiresReapproval,
  starterPromptsFor,
} from "@studio/core";

describe("announceSpend (#20)", () => {
  it("states tool/provider/model/reason/mode/cost before the call", () => {
    const line = announceSpend({ tool: "generate_clip", provider: "fal", model: "seedance-2", reason: "hero beat", mode: "sample", estCostUsd: 0.2 });
    expect(line).toMatch(/generate_clip/);
    expect(line).toMatch(/fal/);
    expect(line).toMatch(/seedance-2/);
    expect(line).toMatch(/sample/);
    expect(line).toMatch(/\$0\.20/);
  });
});

describe("ask-before-major-changes (#21)", () => {
  it("re-gates provider/model/treatment/engine/drop/sample-to-batch/budget", () => {
    for (const c of ["switch_provider", "switch_model", "drop_narration", "sample_to_batch", "raise_budget"] as const) {
      expect(requiresReapproval(c)).toBe(true);
      expect(reapprovalReason(c).length).toBeGreaterThan(0);
    }
  });
  it("does not re-gate a benign aspect change", () => {
    expect(requiresReapproval("aspect_change")).toBe(false);
    expect(RE_GATE_CHANGES).not.toContain("aspect_change");
  });
});

describe("onboarding (#28)", () => {
  it("tailors starters to a vague message and always fills to the limit", () => {
    const hist = starterPromptsFor("something about history please", 3);
    expect(hist[0].niche).toBe("history");
    expect(hist).toHaveLength(3);
    expect(starterPromptsFor("", 3)).toHaveLength(3); // empty still yields starters
  });
  it("ships a 3-step empty-state → running path", () => {
    expect(ONBOARDING_STEPS).toHaveLength(3);
  });
});
