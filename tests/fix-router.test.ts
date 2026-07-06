/**
 * fix-router.ts — score-banded fixer routing (Self-Watch remediation, Layer 1).
 * The band boundaries and model selection gate real spend and the escalation
 * staircase, so they're exercised directly.
 */
import { describe, expect, it } from "vitest";
import { fixerModelForScore, OPUS_MODEL, SONNET_MODEL } from "@/lib/pipeline/fix-router";

describe("fixerModelForScore (default threshold 7)", () => {
  it("returns null at or above the pass threshold — nothing to fix", () => {
    expect(fixerModelForScore(7)).toBeNull();
    expect(fixerModelForScore(8.5)).toBeNull();
  });

  it("routes the goal-line band (5.5–6.9) to Opus", () => {
    expect(fixerModelForScore(6.9)).toMatchObject({ tier: "opus", model: OPUS_MODEL, band: "goal-line" });
    expect(fixerModelForScore(5.5)).toMatchObject({ tier: "opus", band: "goal-line" });
  });

  it("routes the mid band (4.0–5.4) to Sonnet (speculative lift)", () => {
    expect(fixerModelForScore(5.4)).toMatchObject({ tier: "sonnet", model: SONNET_MODEL, band: "mid" });
    expect(fixerModelForScore(4.0)).toMatchObject({ tier: "sonnet", band: "mid" });
  });

  it("routes the low band (<4.0) to Opus (heavy lift)", () => {
    expect(fixerModelForScore(3.9)).toMatchObject({ tier: "opus", model: OPUS_MODEL, band: "low" });
    expect(fixerModelForScore(1.0)).toMatchObject({ tier: "opus", band: "low" });
  });

  it("keeps band shape relative to a tuned threshold", () => {
    // threshold 8 → goal-line 6.5–7.9, mid 5.0–6.4, low <5.0
    expect(fixerModelForScore(7.9, 8)).toMatchObject({ band: "goal-line" });
    expect(fixerModelForScore(6.4, 8)).toMatchObject({ band: "mid" });
    expect(fixerModelForScore(4.9, 8)).toMatchObject({ band: "low" });
    expect(fixerModelForScore(8, 8)).toBeNull();
  });
});
