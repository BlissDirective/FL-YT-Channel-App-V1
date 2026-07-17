/**
 * Canonical stage artifacts + checkpoint vocabulary + resumable progress
 * (Batch 2). Pure validation + the resume math.
 */
import { describe, expect, it } from "vitest";
import {
  CHECKPOINT_STATUSES,
  isCheckpointStatus,
  progressFraction,
  progressLabel,
  remainingUnits,
  reconcileCosts,
  validateStageArtifact,
} from "@studio/core";

describe("checkpoint vocabulary", () => {
  it("recognises the four statuses and rejects others", () => {
    for (const s of CHECKPOINT_STATUSES) expect(isCheckpointStatus(s)).toBe(true);
    expect(isCheckpointStatus("paused")).toBe(false);
  });
});

describe("partial progress", () => {
  it("labels and fractions with clamping", () => {
    expect(progressLabel({ done: 18, total: 30, label: "stills" })).toBe("18 of 30 stills");
    expect(progressFraction({ done: 15, total: 30 })).toBe(0.5);
    expect(progressFraction({ done: 40, total: 30 })).toBe(1);
    expect(progressFraction({ done: 1, total: 0 })).toBe(0);
  });
  it("computes the resume set of remaining units", () => {
    expect(remainingUnits(18, 30)).toHaveLength(12);
    expect(remainingUnits(18, 30)[0]).toBe(18);
    expect(remainingUnits(30, 30)).toEqual([]);
  });
});

describe("validateStageArtifact", () => {
  it("passes a well-formed brief", () => {
    const v = validateStageArtifact("brief", { topic: "Rome", angle: "why it fell", audience: "history buffs" });
    expect(v.ok).toBe(true);
  });
  it("flags missing + empty + wrong-type fields", () => {
    const v = validateStageArtifact("brief", { topic: "", angle: 5 });
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /topic/.test(e))).toBe(true);
    expect(v.errors.some((e) => /angle/.test(e))).toBe(true);
    expect(v.errors.some((e) => /audience/.test(e))).toBe(true);
  });
  it("requires non-empty arrays for scene_plan / asset_manifest", () => {
    expect(validateStageArtifact("scene_plan", { beats: [] }).ok).toBe(false);
    expect(validateStageArtifact("scene_plan", { beats: [{}] }).ok).toBe(true);
    expect(validateStageArtifact("asset_manifest", { assets: [{}] }).ok).toBe(true);
  });
  it("validates a render_report", () => {
    expect(validateStageArtifact("render_report", { durationSec: 63, variant: "long" }).ok).toBe(true);
    expect(validateStageArtifact("render_report", { durationSec: "x", variant: "long" }).ok).toBe(false);
  });
  it("passes kinds without a declared schema (script/edit_decisions)", () => {
    expect(validateStageArtifact("edit_decisions", { anything: true }).ok).toBe(true);
  });
  it("rejects a non-object artifact", () => {
    expect(validateStageArtifact("brief", null).ok).toBe(false);
  });
});

describe("reconcileCosts", () => {
  it("attributes ledger + asset spend per provider and surfaces drift", () => {
    const r = reconcileCosts(
      [
        { provider: "fal-video", usd: 0.6 },
        { provider: "elevenlabs", usd: 0.2 },
        { provider: "fal-video", usd: 0.4 },
      ],
      [
        { kind: "clip", provider: "fal-video", costUsd: 0.6 },
        { kind: "clip", provider: "fal-video", costUsd: 0.4 },
      ],
    );
    expect(r.ledgerTotal).toBe(1.2);
    expect(r.assetTotal).toBe(1.0);
    expect(r.unreconciledUsd).toBeCloseTo(0.2, 5); // the VO isn't in the asset manifest
    expect(r.byProvider.find((p) => p.provider === "fal-video")?.delta).toBe(0);
    expect(r.byAssetKind[0].kind).toBe("clip");
    expect(r.byAssetKind[0].count).toBe(2);
  });
});
