/**
 * ClickMax-transition Phase 1: the workspace action registry is the single
 * substrate both composer buttons and the chat intent router call (§3.1).
 * Pins the structural rules: every action has a description + typed params,
 * cost-bearing actions expose an estimator, params validate before execution,
 * and unknown actions are errors — never silent no-ops.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/push", () => ({
  isPushConfigured: () => false,
  sendPushToAll: async () => {},
}));
vi.mock("@/lib/storage", () => ({
  uploadMedia: async () => {},
  getSignedMediaUrl: async () => null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("registry tests must not reach a real client");
  },
}));
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import {
  executeWorkspaceAction,
  getWorkspaceAction,
  listWorkspaceActions,
} from "@/lib/workspace/registry";

describe("workspace action registry", () => {
  it("every action is fully described for the router (name, description, params)", () => {
    for (const a of listWorkspaceActions()) {
      expect(a.name).toMatch(/^[a-z_]+$/);
      expect(a.description.length).toBeGreaterThan(20);
      for (const spec of Object.values(a.params)) {
        expect(["string", "number", "boolean"]).toContain(spec.type);
        expect(spec.description.length).toBeGreaterThan(3);
      }
    }
  });

  it("covers the core workspace verbs (chat = 100% coverage rule)", () => {
    const names = listWorkspaceActions().map((a) => a.name);
    for (const required of [
      "continue",
      "regenerate_script",
      "regenerate_beat_visual",
      "regenerate_beat_vo",
      "regenerate_asset",
      "generate_beat_clip",
      "request_revision",
      "full_auto",
    ]) {
      expect(names).toContain(required);
    }
  });

  it("cost-bearing actions expose an estimator the confirm rule can print", () => {
    const clip = getWorkspaceAction("generate_beat_clip")!;
    expect(clip.costBearing).toBe(true);
    const est = clip.estimate({ modelId: "seedance-2-fast", durationSec: 10 });
    expect(est).toBeCloseTo(0.22, 2);
  });

  it("rejects unknown actions instead of silently no-oping", async () => {
    const r = await executeWorkspaceAction("launch_the_missiles", {});
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Unknown workspace action");
  });

  it("validates params before any executor runs", async () => {
    const missing = await executeWorkspaceAction("regenerate_beat_visual", {
      videoId: "v1",
    });
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain('Missing required param "beatIdx"');

    const wrongType = await executeWorkspaceAction("regenerate_beat_visual", {
      videoId: "v1",
      beatIdx: "four",
    });
    expect(wrongType.ok).toBe(false);
    expect(wrongType.error).toContain('"beatIdx" must be a number');
  });
});
