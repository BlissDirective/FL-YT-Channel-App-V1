/**
 * ClickMax-transition Phase 0 safety net (Fable5-ClickMax-Transition-Build-Plan §6):
 * one video driven by the REAL engine — real runPipeline hop loop, real
 * arriveAtGate, real runScripting / runAssetGeneration / runAssembly in
 * mock-adapter mode — from the IDEA gate to the render-farm handoff, against
 * the fake query-builder. Every later phase refactors the engine's seams; this
 * pins the end-to-end behavior those refactors must preserve:
 *
 *   IDEA ─autopilot→ IDEA_APPROVED → SCRIPTING → SCRIPT_READY ─autopilot→
 *   GENERATING_ASSETS → ASSETS_READY ─autopilot→ ASSEMBLING (farm handoff)
 *
 * with a script written, per-beat mock assets produced, an approval per gate,
 * and a QC review recorded at each gate arrival. In mock mode the "render"
 * completes locally (provider mock:remotion), so the terminal state is
 * APPROVED — the whole machine, FINAL gate included.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/push", () => ({
  isPushConfigured: () => false,
  sendPushToAll: async () => {},
}));
const uploads: string[] = [];
vi.mock("@/lib/storage", () => ({
  uploadMedia: async (path: string) => {
    uploads.push(path);
  },
  getSignedMediaUrl: async () => null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("test must pass an explicit db");
  },
}));
// Governed-memory retrieval (pgvector RPC) is irrelevant to the mechanism.
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import { runPipeline } from "@/lib/pipeline/engine";

const PROJECT = {
  id: "p1",
  name: "Golden Path Ch",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  brand_kit: { thumbnailStyle: "bold, high-contrast" },
  voice_id: "mock-voice",
  // Fully autonomous: every gate advances on arrival (the transition's
  // Autopilot mode); Director-mode behavior is pinned separately below.
  autonomy: { IDEA: "autopilot", SCRIPT: "autopilot", ASSETS: "autopilot", FINAL: "autopilot" },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
} as never;

const VIDEO = {
  id: "v1",
  project_id: "p1",
  title: "What if tests ran the studio",
  topic: "an end-to-end golden path",
  format: "long",
  kind: "long",
  status: "IDEA",
  target_length_sec: 120,
  total_cost_usd: 0,
  paused_reason: null,
  auto_finish: false,
  enable_highlights: false,
  highlight_count: 0,
};

function seeded(over: Partial<typeof VIDEO> = {}, projectOver: Record<string, unknown> = {}) {
  return fakeDb({
    videos: [{ ...VIDEO, ...over } as never],
    projects: [{ ...(PROJECT as object), ...projectOver } as never],
    approvals: [],
    scripts: [],
    assets: [],
    qc_reviews: [],
    clip_jobs: [],
    prompt_templates: [],
    app_settings: [],
    cost_ledger: [],
    stage_artifacts: [],
    visual_refs: [],
    vo_cache: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  uploads.length = 0;
});

describe("golden path: IDEA → render-farm handoff (real engine, mock adapters)", () => {
  it("walks the full state machine, writing script, assets, approvals, and QC reviews", async () => {
    const db = seeded();
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);

    const v = db.row("videos", "v1")!;
    // Mock assembly completes locally, the FINAL gate autopilot-approves:
    // the machine runs to APPROVED with nothing paused.
    expect(v.status).toBe("APPROVED");
    expect(v.paused_reason).toBeNull();

    // One script, version 1, with beats the asset stage consumed.
    const scripts = db.inserts("scripts");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ video_id: "v1", version: 1 });
    const beats = scripts[0].beats as { idx: number }[];
    expect(beats.length).toBeGreaterThan(0);

    // Mock assets: VO, visuals per beat, captions, and the local mock render —
    // all tagged mock:* providers (no real spend).
    const assets = db.inserts("assets");
    const kinds = new Set(assets.map((a) => a.kind));
    expect(kinds.has("vo")).toBe(true);
    expect(kinds.has("render")).toBe(true);
    expect(assets.length).toBeGreaterThanOrEqual(beats.length);
    for (const a of assets) {
      expect(String(a.provider)).toMatch(/^mock:|^anthropic$/);
    }

    // Autopilot approved every gate: IDEA, SCRIPT, ASSETS, FINAL.
    const approvals = db.inserts("approvals");
    const approvedGates = approvals.map((a) => a.gate);
    expect(approvedGates).toEqual(
      expect.arrayContaining(["IDEA", "SCRIPT", "ASSETS", "FINAL"]),
    );
    for (const a of approvals) expect(a.decision).toBe("approved");

    // A QC review was recorded at every gate arrival.
    const reviews = db.inserts("qc_reviews");
    expect(reviews.map((r2) => r2.gate)).toEqual(
      expect.arrayContaining(["IDEA", "SCRIPT", "ASSETS", "FINAL"]),
    );
  });

  it("Director-mode projects never self-advance through runPipeline", async () => {
    const db = seeded({}, { pipeline_mode: "director" });
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.row("videos", "v1")!.status).toBe("IDEA");
    expect(db.inserts("approvals")).toHaveLength(0);
  });

  it("kill switch pauses instead of spending", async () => {
    const db = seeded({ status: "IDEA_APPROVED" });
    db.tables.app_settings.push({ key: "kill_switch", value: { enabled: true } } as never);
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(false);
    expect(db.row("videos", "v1")!.paused_reason).toContain("kill switch");
    expect(db.inserts("scripts")).toHaveLength(0);
  });
});
