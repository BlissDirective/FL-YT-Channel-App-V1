/**
 * ClickMax-transition Phase 1 (§4.3, §4.6): the user-facing model catalog and
 * the USD estimator printed on every generate button. The catalog is assembled
 * FROM the live adapter registries — a video model added to VIDEO_MODELS must
 * appear here without a second edit, and estimates must agree with the
 * adapters' own ledger costing.
 */
import { describe, expect, it } from "vitest";
import {
  catalogEntry,
  estimateCost,
  estimateStageCost,
  modelCatalog,
} from "@/lib/models/catalog";
import { VIDEO_MODELS, estimateClipCost, getVideoModel } from "@/lib/adapters/video-models";

describe("model catalog", () => {
  it("includes every registered video model plus image and voice tiers", () => {
    const ids = modelCatalog().map((e) => e.id);
    for (const m of VIDEO_MODELS) expect(ids).toContain(m.id);
    expect(ids).toEqual(expect.arrayContaining(["flux-schnell", "flux-dev", "elevenlabs", "kokoro"]));
  });

  it("every entry speaks plain language: description, pros, unit pricing", () => {
    for (const e of modelCatalog()) {
      expect(e.description.length).toBeGreaterThan(10);
      expect(e.pros.length).toBeGreaterThan(0);
      expect(e.unitUsd).toBeGreaterThan(0);
    }
  });

  it("clip estimates agree with the adapter's ledger costing", () => {
    const model = getVideoModel("kling-2-5-turbo")!;
    expect(estimateCost({ action: "clip", modelId: model.id, durationSec: 10 })).toBe(
      estimateClipCost(model, 10),
    );
  });

  it("estimateStageCost prices the NEXT stage from a status (the Continue label)", () => {
    const script = estimateStageCost({ status: "IDEA_APPROVED", targetLengthSec: 300 });
    const assets = estimateStageCost({ status: "SCRIPT_READY", targetLengthSec: 300 });
    expect(script).toBeGreaterThan(0);
    // The asset stage (VO + stills) costs more than scripting for the same video.
    expect(assets).toBeGreaterThan(script);
    // Terminal states are free.
    expect(estimateStageCost({ status: "APPROVED", targetLengthSec: 300 })).toBe(0);
  });

  it("unknown models estimate to zero rather than inventing a price", () => {
    expect(estimateCost({ action: "clip", modelId: "not-a-model", durationSec: 10 })).toBe(0);
    expect(catalogEntry("not-a-model")).toBeUndefined();
  });
});
