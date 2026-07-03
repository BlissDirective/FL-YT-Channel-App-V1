/**
 * best-of-n.ts — the pure pairwise selection harness (Harness C2). The judge
 * is injected, so a deterministic mock scorer exercises the selection math,
 * order-swap de-biasing, and dedup.
 */
import { describe, expect, it } from "vitest";
import { normalizeCandidates, selectBest, type PairScorer } from "@/lib/pipeline/best-of-n";

describe("normalizeCandidates", () => {
  it("trims, drops blanks, and dedups case-insensitively preserving order", () => {
    expect(normalizeCandidates([" A ", "a", "", "B", "b ", "C"])).toEqual(["A", "B", "C"]);
  });
  it("caps at max", () => {
    expect(normalizeCandidates(["a", "b", "c", "d", "e", "f"], 3)).toEqual(["a", "b", "c"]);
  });
});

describe("selectBest", () => {
  it("returns the sole candidate without judging", async () => {
    let calls = 0;
    const scorer: PairScorer = async () => {
      calls++;
      return 1;
    };
    const r = await selectBest(["only"], scorer);
    expect(r?.winner).toBe("only");
    expect(calls).toBe(0);
  });

  it("picks the candidate a transitive judge always prefers", async () => {
    // Preference A > B > C: score = P(x beats y) by rank index (lower = better).
    const rank = new Map([["A", 0], ["B", 1], ["C", 2]]);
    const scorer: PairScorer = async (a, b) => (rank.get(a)! < rank.get(b)! ? 1 : 0);
    const r = await selectBest(["C", "B", "A"], scorer);
    expect(r?.winner).toBe("A");
    expect(r?.ranked.map((x) => x.candidate)).toEqual(["A", "B", "C"]);
  });

  it("cancels position bias via order-swap", async () => {
    // A biased judge that ALWAYS prefers whichever option is presented first.
    // Order-swap must neutralize it → a tie, no artificial winner.
    const firstPref: PairScorer = async () => 1; // "A" (the first arg) always wins
    const r = await selectBest(["X", "Y"], firstPref);
    // Both meet once; order-swap makes each win-share 0.5 → first stays winner
    // only by tie-break, but neither dominates.
    expect(r?.ranked[0].winShare).toBeCloseTo(0.5, 5);
    expect(r?.ranked[1].winShare).toBeCloseTo(0.5, 5);
  });

  it("survives a throwing judge (treated as a tie)", async () => {
    const scorer: PairScorer = async () => {
      throw new Error("judge down");
    };
    const r = await selectBest(["A", "B", "C"], scorer);
    expect(r).not.toBeNull();
    for (const x of r!.ranked) expect(x.winShare).toBeCloseTo(0.5, 5);
  });

  it("returns null for an empty pool", async () => {
    expect(await selectBest([], async () => 1)).toBeNull();
  });
});
