/**
 * Scored provider/model selection (#1) — the pure 7-dimension selector. The
 * crux is: the winner is the best AFFORDABLE model, hero vs b-roll weighting
 * shifts the pick, live health can bench a provider, continuity prefers the
 * established family, and it never fails (falls back to the cheapest).
 */
import { describe, expect, it } from "vitest";
import {
  scoreProviders,
  SCORE_DIMENSIONS,
  type ProviderCandidate,
  type ProviderScoreContext,
} from "@studio/core";

const seedanceFast: ProviderCandidate = {
  id: "seedance-2-fast", label: "Seedance 2.0 Fast", family: "seedance",
  quality: 0.4, control: 0.6, reliability: 0.9, speed: 1, usdPerSec: 0.022,
  audio: false, minDurationSec: 4, maxDurationSec: 15,
};
const seedance: ProviderCandidate = {
  id: "seedance-2", label: "Seedance 2.0", family: "seedance",
  quality: 0.7, control: 0.7, reliability: 0.9, speed: 0.7, usdPerSec: 0.07,
  audio: true, minDurationSec: 4, maxDurationSec: 15,
};
const kling: ProviderCandidate = {
  id: "kling-2-5-turbo", label: "Kling v2.5-turbo Pro", family: "kling",
  quality: 0.75, control: 0.7, reliability: 0.85, speed: 0.6, usdPerSec: 0.07,
  audio: false, minDurationSec: 5, maxDurationSec: 10,
};
const veo: ProviderCandidate = {
  id: "veo-3-1", label: "Veo 3.1", family: "veo",
  quality: 1, control: 0.8, reliability: 0.8, speed: 0.3, usdPerSec: 0.4,
  audio: true, minDurationSec: 4, maxDurationSec: 8,
};
const ALL = [seedanceFast, seedance, kling, veo];

const ctx = (over: Partial<ProviderScoreContext> = {}): ProviderScoreContext => ({
  shot: "broll", targetSec: 6, budgetRemainingUsd: 100, ...over,
});

describe("scoreProviders — basics", () => {
  it("returns null for an empty candidate set", () => {
    expect(scoreProviders([], ctx())).toBeNull();
  });

  it("produces a full 7-dimension breakdown that stays within 0..1", () => {
    const d = scoreProviders(ALL, ctx())!;
    for (const s of [d.winner, ...d.alternatives]) {
      for (const dim of SCORE_DIMENSIONS) {
        expect(s.dims[dim]).toBeGreaterThanOrEqual(0);
        expect(s.dims[dim]).toBeLessThanOrEqual(1);
      }
      expect(s.total).toBeGreaterThanOrEqual(0);
      expect(s.total).toBeLessThanOrEqual(1);
    }
    // weights normalise to 1
    const wsum = SCORE_DIMENSIONS.reduce((s, dim) => s + d.weights[dim], 0);
    expect(wsum).toBeCloseTo(1, 5);
  });

  it("ranks alternatives best-first and excludes the winner", () => {
    const d = scoreProviders(ALL, ctx())!;
    expect(d.alternatives.map((a) => a.id)).not.toContain(d.winner.id);
    for (let i = 1; i < d.alternatives.length; i++) {
      expect(d.alternatives[i - 1].total).toBeGreaterThanOrEqual(d.alternatives[i].total);
    }
    expect(d.winner.total).toBeGreaterThanOrEqual(d.alternatives[0].total);
  });
});

describe("scoreProviders — shot role changes the winner", () => {
  it("b-roll favours the cheap/fast model", () => {
    const d = scoreProviders(ALL, ctx({ shot: "broll", targetSec: 6 }))!;
    expect(d.winner.id).toBe("seedance-2-fast");
  });

  it("a hero beat pulls toward higher quality, not the cheapest", () => {
    const d = scoreProviders(ALL, ctx({ shot: "hero", targetSec: 8 }))!;
    expect(d.winner.id).not.toBe("seedance-2-fast");
    expect(d.winner.dims.quality).toBeGreaterThan(seedanceFast.quality);
  });
});

describe("scoreProviders — budget", () => {
  it("never picks an unaffordable model when a cheaper one fits", () => {
    // Tiny budget: premium Veo (~$1.6 for 4s) is unaffordable; a Seedance fits.
    const d = scoreProviders(ALL, ctx({ shot: "hero", targetSec: 8, budgetRemainingUsd: 0.3 }))!;
    expect(d.winner.affordable).toBe(true);
    expect(d.winner.estCostUsd).toBeLessThanOrEqual(0.3 + 1e-9);
  });

  it("falls back to the cheapest (flagged not-affordable) when nothing fits", () => {
    const d = scoreProviders(ALL, ctx({ budgetRemainingUsd: 0 }))!;
    expect(d.winner.affordable).toBe(false);
    // cheapest per-second is Seedance Fast
    expect(d.winner.id).toBe("seedance-2-fast");
  });
});

describe("scoreProviders — audio need", () => {
  it("a dialogue hero that needs native audio avoids no-audio models", () => {
    const d = scoreProviders(ALL, ctx({ shot: "hero", targetSec: 8, needsAudio: true, budgetRemainingUsd: 100 }))!;
    const chosen = [seedance, veo].map((m) => m.id);
    expect(chosen).toContain(d.winner.id); // both carry audio
  });
});

describe("scoreProviders — reliability / live health benches a provider", () => {
  it("a flagged-down family drops out of contention", () => {
    // Without health, b-roll winner is seedance-fast; bench the whole seedance family.
    const base = scoreProviders(ALL, ctx())!;
    expect(base.winner.family).toBe("seedance");
    const d = scoreProviders(ALL, ctx({ health: { seedance: 0 } }))!;
    expect(d.winner.family).not.toBe("seedance");
    expect(d.winner.dims.reliability).toBeGreaterThan(0);
  });
});

describe("scoreProviders — continuity prefers the established family", () => {
  it("prefers the video's existing family when scores are otherwise close", () => {
    const near: ProviderCandidate[] = [
      { ...seedance, id: "a", label: "A", family: "famA" },
      { ...seedance, id: "b", label: "B", family: "famB" },
    ];
    const d = scoreProviders(near, ctx({ shot: "hero", preferredFamily: "famB", targetSec: 8 }))!;
    expect(d.winner.family).toBe("famB");
    expect(d.winner.dims.continuity).toBeGreaterThan(d.alternatives[0].dims.continuity);
  });
});

describe("scoreProviders — rationale is human-readable + logs alternatives", () => {
  it("names the winner and the runner-up in the rationale", () => {
    const d = scoreProviders(ALL, ctx({ shot: "hero", targetSec: 8 }))!;
    expect(d.rationale).toContain(d.winner.label);
    expect(d.rationale).toMatch(/score|wins/i);
    expect(d.alternatives.length).toBe(ALL.length - 1);
    expect(d.winner.reason).toMatch(/^\$/); // "$0.xx · …"
  });
});
