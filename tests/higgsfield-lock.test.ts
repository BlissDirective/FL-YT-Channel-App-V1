/**
 * Operator locks (Sep 2026): Cinema Studio 4.0 for every AI-video section
 * with fal as the fallback chain, the full-coverage Cinema tier, suspended
 * spend caps, and the lean Claude profile.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pipeline/provider-health", () => ({ providerOutage: async () => ({ down: false }) }));

import { LOCKED_TIER, selectClipBeats, tierJobForSection } from "@/lib/adapters/auto-tiers";
import { selectBeatModel } from "@/lib/adapters/provider-selector";
import { tierCandidateIds } from "@/lib/adapters/provider-candidates";
import {
  getVideoModel,
  isVideoModelLocked,
  LOCKED_VIDEO_MODEL_ID,
  videoLedgerProvider,
  VIDEO_MODELS,
} from "@/lib/adapters/video-models";
import { spendCapsEnabled } from "@/lib/spend-caps";
import { nonCriticalAiAllowed, aiSpendProfile } from "@/lib/ai-spend";

afterEach(() => vi.unstubAllEnvs());

const beat = (idx: number, scriptSec = 20, shotType = "broll") => ({ idx, shotType, scriptSec });

describe("Cinema Studio 4.0 lock", () => {
  it("is on by default and is the first catalog model (UI default)", () => {
    expect(isVideoModelLocked({})).toBe(true);
    expect(VIDEO_MODELS[0].id).toBe(LOCKED_VIDEO_MODEL_ID);
    const m = getVideoModel(LOCKED_VIDEO_MODEL_ID)!;
    expect(m.provider).toBe("higgsfield");
    expect(m.t2v).toBe("higgsfield/cinema-studio/4.0");
    expect(videoLedgerProvider(m)).toBe("higgsfield-video");
    expect(videoLedgerProvider(getVideoModel("seedance-2")!)).toBe("fal-video");
  });

  it("every non-custom AI tier renders hero and b-roll on the locked model", () => {
    for (const tier of ["economy", "premium", "platinum", "director"] as const) {
      expect(tierJobForSection(tier, "hero", 20)?.model).toBe(LOCKED_VIDEO_MODEL_ID);
      expect(tierJobForSection(tier, "broll", 20)?.model).toBe(LOCKED_VIDEO_MODEL_ID);
    }
    expect(tierJobForSection("base", "hero", 20)).toBeNull();
  });

  it("custom keeps the operator's own picks", () => {
    const job = tierJobForSection("custom", "hero", 10, 60, {
      heroModel: "kling-2-5-turbo",
      brollModel: "seedance-2-fast",
      heroSec: 10,
      brollSec: 5,
      maxUsd: 5,
    } as never);
    expect(job?.model).toBe("kling-2-5-turbo");
  });

  it("the locked model wins every beat with fal models as the fallback chain", () => {
    const pool = tierCandidateIds("premium");
    expect(pool[0]).toBe(LOCKED_VIDEO_MODEL_ID);
    const choice = selectBeatModel({
      tier: "premium",
      shot: "broll",
      targetSec: 10,
      budgetRemainingUsd: 0.01, // a tight budget can't outvote the lock
      fallbackModel: LOCKED_VIDEO_MODEL_ID,
    });
    expect(choice.modelId).toBe(LOCKED_VIDEO_MODEL_ID);
    expect(choice.selection.operatorLocked).toBe(true);
    expect(choice.selection.alternatives.length).toBeGreaterThan(0);
    expect(choice.selection.alternatives.every((a) => !a.id.startsWith("hf-"))).toBe(true);
  });

  it("a Higgsfield outage hands the beat to a fal model", () => {
    const choice = selectBeatModel({
      tier: "premium",
      shot: "hero",
      targetSec: 10,
      budgetRemainingUsd: 100,
      fallbackModel: LOCKED_VIDEO_MODEL_ID,
      health: { higgsfield: 0.05 },
    });
    expect(choice.modelId.startsWith("hf-")).toBe(false);
  });

  it("sections longer than one 30s generation keep their full length (stitched)", () => {
    const choice = selectBeatModel({
      tier: "cinema",
      shot: "broll",
      targetSec: 48,
      budgetRemainingUsd: Number.POSITIVE_INFINITY,
      fallbackModel: LOCKED_VIDEO_MODEL_ID,
    });
    expect(choice.targetSec).toBe(48);
  });

  it("VIDEO_MODEL_LOCK=off restores the legacy per-tier mix", () => {
    vi.stubEnv("VIDEO_MODEL_LOCK", "off");
    expect(tierJobForSection("economy", "broll", 20)?.model).toBe("seedance-2-fast");
  });
});

describe("Cinema tier (full coverage)", () => {
  it("is the locked autonomous tier", () => {
    expect(LOCKED_TIER).toBe("cinema");
  });

  it("animates EVERY section, stock included, at the section's length", () => {
    const beats = [beat(0, 12, "hero"), beat(1, 25), beat(2, 40, "stock"), beat(3, 18, "hero")];
    const sel = selectClipBeats("cinema", beats, { maxUsd: Number.POSITIVE_INFINITY });
    expect(sel.clips.map((c) => c.idx).sort()).toEqual([0, 1, 2, 3]);
    expect(sel.clips.every((c) => c.job.model === LOCKED_VIDEO_MODEL_ID)).toBe(true);
    const stock = sel.clips.find((c) => c.idx === 2)!;
    expect(stock.job.targetSec).toBe(40);
    // 95s of footage at $0.2057/s — stitched sections bill their full length.
    expect(sel.totalUsd).toBeCloseTo(95 * 0.2057, 1);
  });
});

describe("spend caps + lean Claude profile", () => {
  it("monthly/per-video caps are suspended unless SPEND_CAPS_ENABLED=true", () => {
    expect(spendCapsEnabled({})).toBe(false);
    expect(spendCapsEnabled({ SPEND_CAPS_ENABLED: "true" })).toBe(true);
  });

  it("lean is the default and pauses non-critical Claude jobs", () => {
    expect(aiSpendProfile({})).toBe("lean");
    expect(nonCriticalAiAllowed("optimizer", {})).toBe(false);
    expect(nonCriticalAiAllowed("intelligence", {})).toBe(false);
    expect(nonCriticalAiAllowed("optimizer", { AI_ENABLE_JOBS: "optimizer, librarian" })).toBe(true);
    expect(nonCriticalAiAllowed("video-intel", { AI_SPEND_PROFILE: "full" })).toBe(true);
  });
});
