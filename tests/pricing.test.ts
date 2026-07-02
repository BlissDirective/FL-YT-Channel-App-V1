/**
 * Pricing math for the AI-video ledger.
 *
 * Note: the plan lists `src/lib/adapters/pricing.ts` with `anthropicCostUsd`,
 * but that module does not exist in this branch — the Anthropic PRICING maps
 * are still module-private constants inside each adapter (script.ts,
 * guardrails.ts, ...; consolidation is Phase 2 item 6). The exported money
 * math that exists today lives in `src/lib/adapters/video-models.ts`, so
 * these tests pin that: per-clip cost, duration snapping, stitch/extend
 * estimates, and cent rounding.
 */
import { describe, expect, it } from "vitest";
import {
  VIDEO_MODELS,
  clampDuration,
  encodeDuration,
  estimateClipCost,
  estimateExtendCost,
  estimateStitchCost,
  getVideoModel,
  stitchSegments,
} from "@/lib/adapters/video-models";

const model = (id: string) => {
  const m = getVideoModel(id);
  if (!m) throw new Error(`missing model ${id}`);
  return m;
};

describe("getVideoModel", () => {
  it("resolves known models and returns undefined for unknown ids", () => {
    expect(model("seedance-2-fast").usdPerSec).toBe(0.022);
    expect(getVideoModel("gpt-video-9000")).toBeUndefined();
  });
});

describe("clampDuration / encodeDuration", () => {
  it("clamps free-range models to [min, max] and rounds", () => {
    const fast = model("seedance-2-fast"); // 4-15s
    expect(clampDuration(fast, 1)).toBe(4);
    expect(clampDuration(fast, 7.4)).toBe(7);
    expect(clampDuration(fast, 99)).toBe(15);
  });

  it("snaps discrete-duration models to the nearest allowed value", () => {
    const veo = model("veo-3-1"); // 4 / 6 / 8
    expect(clampDuration(veo, 1)).toBe(4);
    expect(clampDuration(veo, 7)).toBe(6); // ties keep the earlier option
    expect(clampDuration(veo, 30)).toBe(8);
    const kling = model("kling-2-5-turbo"); // 5 / 10
    expect(clampDuration(kling, 8)).toBe(10);
  });

  it("encodes per the model's API style", () => {
    expect(encodeDuration(model("seedance-2-fast"), 8)).toBe(8); // num
    expect(encodeDuration(model("kling-2-5-turbo"), 10)).toBe("10"); // str
    expect(encodeDuration(model("veo-3-1"), 8)).toBe("8s"); // secs
  });
});

describe("estimateClipCost", () => {
  it("bills usdPerSec x snapped duration for known models", () => {
    expect(estimateClipCost(model("seedance-2-fast"), 10)).toBe(0.22);
    expect(estimateClipCost(model("seedance-2"), 15)).toBe(1.05);
    expect(estimateClipCost(model("kling-2-5-turbo"), 10)).toBe(0.7);
    expect(estimateClipCost(model("veo-3-1"), 8)).toBe(3.2);
  });

  it("prices the clamped duration, not the requested one", () => {
    // 99s request on a 15s-max model bills 15s.
    expect(estimateClipCost(model("seedance-2-fast"), 99)).toBe(
      estimateClipCost(model("seedance-2-fast"), 15),
    );
  });

  it("rounds to whole cents (2dp)", () => {
    // 0.022 * 7 = 0.154 → 0.15
    expect(estimateClipCost(model("seedance-2-fast"), 7)).toBe(0.15);
    for (const m of VIDEO_MODELS) {
      const c = estimateClipCost(m, 9);
      expect(c).toBe(Math.round(c * 100) / 100);
    }
  });

  it("premium models cost more than draft for the same duration", () => {
    expect(estimateClipCost(model("veo-3-1"), 8)).toBeGreaterThan(
      estimateClipCost(model("seedance-2"), 8),
    );
    expect(estimateClipCost(model("seedance-2"), 8)).toBeGreaterThan(
      estimateClipCost(model("seedance-2-fast"), 8),
    );
  });
});

describe("stitch and extend estimates", () => {
  it("stitchSegments counts base segments to reach the target", () => {
    const fast = model("seedance-2-fast"); // max 15s
    expect(stitchSegments(fast, 15)).toBe(1);
    expect(stitchSegments(fast, 16)).toBe(2);
    expect(stitchSegments(fast, 45)).toBe(3);
    expect(stitchSegments(fast, 0)).toBe(1); // floor
  });

  it("estimateStitchCost bills every generated second and scales with length", () => {
    const fast = model("seedance-2-fast");
    expect(estimateStitchCost(fast, 30)).toBe(0.66); // 0.022 * 30
    expect(estimateStitchCost(fast, 60)).toBeGreaterThan(estimateStitchCost(fast, 30));
    expect(estimateStitchCost(fast, 0)).toBe(0.02); // 1s floor
  });

  it("estimateExtendCost snaps to the Veo extend chain lengths (8/15/22/29)", () => {
    expect(estimateExtendCost(29)).toBe(11.6); // 0.4 * 29
    expect(estimateExtendCost(30)).toBe(11.6); // snapped down to 29
    expect(estimateExtendCost(9)).toBe(3.2); // snapped to 8
  });
});
