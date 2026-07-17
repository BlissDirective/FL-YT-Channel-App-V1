/**
 * Free-corpus documentary retrieval (Batch 9) — eligibility, CLIP/keyword
 * ranking, and the router's new free_footage medium.
 */
import { describe, expect, it } from "vitest";
import {
  bestFreeFootage,
  isEligible,
  rankFreeFootage,
  routeMedium,
  MEDIUM_COST,
  type FootageCandidate,
  type RouteContext,
} from "@studio/core";

const cands: FootageCandidate[] = [
  { id: "a", corpus: "archive", title: "Roman ruins", url: "u1", durationSec: 8, license: "Public Domain", tags: ["rome", "ruins", "ancient"] },
  { id: "b", corpus: "pexels", title: "City street", url: "u2", durationSec: 6, license: "Pexels License", tags: ["city", "street"] },
  { id: "c", corpus: "wikimedia", title: "Copyrighted clip", url: "u3", durationSec: 8, license: "All rights reserved", tags: ["rome"] },
  { id: "d", corpus: "archive", title: "Too short", url: "u4", durationSec: 1, license: "CC0", tags: ["rome"] },
];

describe("eligibility", () => {
  it("requires an open license and a minimum length", () => {
    expect(isEligible(cands[0])).toBe(true);
    expect(isEligible(cands[2])).toBe(false); // all rights reserved
    expect(isEligible(cands[3])).toBe(false); // too short
  });
});

describe("rankFreeFootage", () => {
  it("ranks the relevant open clip first and drops ineligible ones", () => {
    const ranked = rankFreeFootage("ancient rome ruins", cands);
    expect(ranked[0].candidate.id).toBe("a");
    expect(ranked.find((r) => r.candidate.id === "c")).toBeUndefined();
    expect(ranked.find((r) => r.candidate.id === "d")).toBeUndefined();
  });
  it("prefers a higher CLIP score when the adapter provides one", () => {
    const withClip = [
      { ...cands[1], clipScore: 0.95 },
      { ...cands[0], clipScore: 0.2 },
    ];
    expect(bestFreeFootage("anything", withClip)?.candidate.id).toBe("b");
  });
});

describe("router free_footage medium", () => {
  const base: RouteContext = { budgetRemainingUsd: 100, freeFootageAllowed: true };
  it("is free", () => {
    expect(MEDIUM_COST.free_footage).toBe(0);
  });
  it("routes establish + motion beats to free footage when allowed", () => {
    expect(routeMedium({ beatIdx: 0, intent: "establish" }, base).medium).toBe("free_footage");
    expect(routeMedium({ beatIdx: 1, intent: "motion" }, base).medium).toBe("free_footage");
  });
  it("does NOT change routing when free footage is not allowed", () => {
    const off: RouteContext = { budgetRemainingUsd: 100 };
    expect(routeMedium({ beatIdx: 0, intent: "establish" }, off).medium).toBe("still");
    expect(routeMedium({ beatIdx: 1, intent: "motion" }, off).medium).toBe("i2v");
  });
  it("still sends hero beats to premium i2v, not free footage", () => {
    expect(routeMedium({ beatIdx: 0, intent: "hero", hero: true }, base).medium).toBe("i2v");
  });
});
