/**
 * bandit.ts — Thompson-sampling core for format selection (Harness C5). The
 * posterior draw, arm selection, reward mapping, and arm-key bucketing decide
 * where the operator spends its daily slot, so the math is exercised directly
 * with a deterministic injected RNG.
 */
import { describe, expect, it } from "vitest";
import {
  armKey,
  formatOfArm,
  lengthBand,
  median,
  rewardFromOutcome,
  sampleArms,
  standardNormal,
  thompsonDraw,
  type ArmStats,
} from "@/lib/pipeline/bandit";

describe("thompsonDraw", () => {
  it("centers on the posterior mean when z=0", () => {
    // successes 8 / trials 10 → α=9, β=3 → mean 9/12 = 0.75.
    expect(thompsonDraw({ successes: 8, trials: 10 }, 0)).toBeCloseTo(0.75, 6);
  });
  it("a flat prior (no data) sits at 0.5 when z=0", () => {
    expect(thompsonDraw({ successes: 0, trials: 0 }, 0)).toBeCloseTo(0.5, 6);
  });
  it("clamps to [0,1]", () => {
    expect(thompsonDraw({ successes: 1, trials: 1 }, 5)).toBeLessThanOrEqual(1);
    expect(thompsonDraw({ successes: 0, trials: 1 }, -5)).toBeGreaterThanOrEqual(0);
  });
  it("a well-sampled winner outdraws a well-sampled loser at the mean", () => {
    const win = thompsonDraw({ successes: 45, trials: 50 }, 0);
    const lose = thompsonDraw({ successes: 5, trials: 50 }, 0);
    expect(win).toBeGreaterThan(lose);
  });
});

describe("sampleArms", () => {
  it("ranks a strong arm above a weak one with z=0 draws", () => {
    const arms = new Map<string, ArmStats>([
      ["long:m:economy", { successes: 40, trials: 50 }],
      ["short:s:base", { successes: 10, trials: 50 }],
    ]);
    const ranked = sampleArms(arms, () => 0);
    expect(ranked[0].key).toBe("long:m:economy");
    expect(ranked[0].exploring).toBe(false);
  });
  it("flags under-explored arms and boosts them optimistically", () => {
    const arms = new Map<string, ArmStats>([
      ["long:m:economy", { successes: 1, trials: 1 }],
    ]);
    const ranked = sampleArms(arms, () => 0, 5);
    expect(ranked[0].exploring).toBe(true);
    // Optimistic bump lifts a 1/1 arm above its raw mean (0.66...).
    expect(ranked[0].score).toBeGreaterThan(thompsonDraw({ successes: 1, trials: 1 }, 0));
  });
});

describe("rewardFromOutcome", () => {
  it("is 1 when the outcome meets or beats a positive baseline", () => {
    expect(rewardFromOutcome(1200, 1000)).toBe(1);
    expect(rewardFromOutcome(1000, 1000)).toBe(1);
  });
  it("is 0 below the baseline", () => {
    expect(rewardFromOutcome(800, 1000)).toBe(0);
  });
});

describe("median", () => {
  it("handles odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("arm keys", () => {
  it("buckets lengths into coarse bands", () => {
    expect(lengthBand(60)).toBe("s");
    expect(lengthBand(180)).toBe("m");
    expect(lengthBand(500)).toBe("l");
    expect(lengthBand(900)).toBe("xl");
  });
  it("round-trips the format", () => {
    const k = armKey("long", 180, "premium");
    expect(k).toBe("long:m:premium");
    expect(formatOfArm(k)).toBe("long");
    expect(formatOfArm(armKey("short", 45, "base"))).toBe("short");
  });
});

describe("standardNormal", () => {
  it("returns finite values and ~0 at the symmetric point", () => {
    expect(Number.isFinite(standardNormal(0.5, 0.5))).toBe(true);
    // cos(2π·0.25) = 0 → exactly 0 regardless of magnitude.
    expect(standardNormal(0.5, 0.25)).toBeCloseTo(0, 6);
  });
});
