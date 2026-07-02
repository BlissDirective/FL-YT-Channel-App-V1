import { describe, expect, it } from "vitest";
import { DEDUP_THRESHOLD, findNearDuplicate, titleSimilarity } from "@/lib/pipeline/dedup";

describe("titleSimilarity", () => {
  it("identical titles score 1 (case/punctuation-insensitive)", () => {
    expect(titleSimilarity("10 AI Tools", "10 AI Tools")).toBe(1);
    expect(titleSimilarity("10 AI Tools!", "10 ai tools")).toBe(1);
  });

  it("unrelated titles score near 0", () => {
    const s = titleSimilarity("Quantum Computing Explained Simply", "Best Pasta Recipes Ever");
    expect(s).toBeLessThan(DEDUP_THRESHOLD);
    expect(s).toBeLessThan(0.2);
  });

  it("stopwords and short tokens are ignored at the token level", () => {
    // "the", "best", "for", "your" are stopwords; the meaningful tokens match exactly.
    expect(titleSimilarity("AI Tools 2025", "The Best AI Tools For Your 2025")).toBe(1);
  });

  it("empty or stopword-only strings score 0", () => {
    expect(titleSimilarity("", "10 AI Tools")).toBe(0);
    expect(titleSimilarity("10 AI Tools", "")).toBe(0);
  });

  it("takes the max of token- and trigram-Jaccard", () => {
    // No shared tokens >1 char after normalization, but heavy character overlap.
    const s = titleSimilarity("moneymaking", "money making");
    expect(s).toBeGreaterThan(0.5); // trigram channel carries it
  });
});

describe("findNearDuplicate at DEDUP_THRESHOLD", () => {
  it("flags an identical title as a duplicate with score 1", () => {
    const hit = findNearDuplicate("10 AI Tools", ["Something Else", "10 AI Tools"]);
    expect(hit).toEqual({ title: "10 AI Tools", score: 1 });
  });

  it("does not flag unrelated titles", () => {
    expect(findNearDuplicate("Quantum Computing Explained", ["Best Pasta Recipes"])).toBeNull();
  });

  it("catches rewordings that differ only by stopwords/word order", () => {
    const hit = findNearDuplicate("Top 10 AI Tools for Business", [
      "10 Best AI Tools For Your Business",
    ]);
    expect(hit).not.toBeNull();
    expect(hit!.score).toBeGreaterThanOrEqual(DEDUP_THRESHOLD);
  });

  it("documented trade-off: looser paraphrases with new content words stay under the default threshold", () => {
    // The module doc cites '"10 AI Tools" vs "Ten AI Tools You Need"' as a
    // catchable rewording, but "10"→"Ten" plus the extra "need" token puts the
    // actual score at 0.4 — below DEDUP_THRESHOLD, so it is NOT flagged today.
    const score = titleSimilarity("10 AI Tools", "Ten AI Tools You Need");
    expect(score).toBeCloseTo(0.4, 5);
    expect(findNearDuplicate("10 AI Tools", ["Ten AI Tools You Need"])).toBeNull();
  });

  it("the threshold is inclusive (score === threshold is a dupe)", () => {
    const a = "alpha beta";
    const b = "alpha gamma";
    const score = titleSimilarity(a, b); // 1 shared of 3 distinct tokens
    expect(score).toBeCloseTo(1 / 3, 10);
    expect(findNearDuplicate(a, [b], score)).toEqual({ title: b, score });
    expect(findNearDuplicate(a, [b], score + 1e-9)).toBeNull();
  });

  it("returns the closest match among several and skips empty entries", () => {
    const hit = findNearDuplicate("10 AI Tools", ["", "10 AI Tools for Coders", "10 AI Tools"]);
    expect(hit!.title).toBe("10 AI Tools");
    expect(hit!.score).toBe(1);
  });

  it("returns null on an empty catalog", () => {
    expect(findNearDuplicate("10 AI Tools", [])).toBeNull();
  });
});
