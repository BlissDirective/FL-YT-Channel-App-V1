/**
 * outcome-audit.ts — the pure correlation core (Harness C3). Spearman ρ
 * between QC scores and outcomes is the anti-reward-hacking signal, so the
 * math needs to be exactly right (tie handling included).
 */
import { describe, expect, it } from "vitest";
import { averageRanks, spearman } from "@/lib/pipeline/outcome-audit";

describe("averageRanks", () => {
  it("ranks distinct values 1..n", () => {
    expect(averageRanks([30, 10, 20])).toEqual([3, 1, 2]);
  });
  it("gives tied values the average of their ranks", () => {
    // Two 10s occupy ranks 1 and 2 → both get 1.5; the 20 gets 3.
    expect(averageRanks([10, 10, 20])).toEqual([1.5, 1.5, 3]);
  });
});

describe("spearman", () => {
  it("is +1 for a perfectly monotonic increasing relation", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBe(1);
  });
  it("is -1 for a perfectly monotonic decreasing relation", () => {
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBe(-1);
  });
  it("is ~0 for an unrelated series", () => {
    const r = spearman([1, 2, 3, 4, 5, 6], [3, 1, 4, 1, 5, 2]);
    expect(r).not.toBeNull();
    expect(Math.abs(r!)).toBeLessThan(0.5);
  });
  it("returns null below n=3", () => {
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
  it("returns null when a series has no variance (undefined correlation)", () => {
    expect(spearman([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull();
  });
  it("handles monotonic-with-ties near +1", () => {
    const r = spearman([1, 2, 2, 3], [10, 20, 20, 30]);
    expect(r).toBe(1);
  });
});
