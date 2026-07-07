/**
 * Auto-Rescript Stage B, part 1 (spec §7 + open question §9.1): does the
 * re-script primitive run cleanly from FINAL_REVIEW? Runs the REAL
 * `autoRescriptFromFinal` — including the real `runScripting` in mock-adapter
 * mode — against the fake query-builder, and pins the exact side-effects:
 * one revision approval carrying the brief, a NEW script version, the video
 * landing at SCRIPT_READY with the full-auto continuation re-armed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/push", () => ({
  isPushConfigured: () => false,
  sendPushToAll: async () => {},
}));
vi.mock("@/lib/storage", () => ({
  uploadMedia: async () => {
    throw new Error("storage not available in tests");
  },
  getSignedMediaUrl: async () => null,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("test must pass an explicit db");
  },
}));
// Skip the governed-memory retrieval (pgvector RPC) — irrelevant to the
// mechanism under test.
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));
vi.mock("@/lib/adapters/qc", () => ({
  COPILOT_AUTO_APPROVE_SCORE: 7.5,
  isQcLive: () => false,
  reviewGate: async () => {
    throw new Error("not used here");
  },
}));

import { autoRescriptFromFinal } from "@/lib/pipeline/engine";

const PROJECT = {
  id: "p1",
  name: "Ch",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  autonomy: { IDEA: "assist", SCRIPT: "assist", ASSETS: "assist", FINAL: "assist" },
  budget: { perVideoUsd: 15, monthlyUsd: 150 },
} as never;

function video(status: string) {
  return {
    id: "v1",
    project_id: "p1",
    title: "Rescript me",
    topic: "structural failures",
    format: "long",
    kind: "long",
    status,
    target_length_sec: 300,
    total_cost_usd: 2,
    paused_reason: "Auto-fix held — structure",
    enable_highlights: false,
    highlight_count: 0,
  } as never;
}

function seeded(status = "FINAL_REVIEW") {
  return fakeDb({
    videos: [video(status) as never],
    projects: [PROJECT as never],
    approvals: [],
    scripts: [
      { video_id: "v1", version: 1, body: "old", beats: [{ idx: 0, text: "old beat" }], runtime_sec: 60, metadata: {} },
    ],
    qc_reviews: [],
    prompt_templates: [],
    app_settings: [],
    cost_ledger: [],
  });
}

const BRIEF = "Rewrite the hook to pay off the title in the first two lines; expand the starved middle section.";

beforeEach(() => vi.clearAllMocks());

describe("autoRescriptFromFinal (real runScripting, mock adapters)", () => {
  it("records the brief as an autopilot SCRIPT revision, writes a new script version, lands SCRIPT_READY, re-arms full-auto", async () => {
    const db = seeded();
    const r = await autoRescriptFromFinal(db as never, db.row("videos", "v1") as never, PROJECT, BRIEF);
    expect(r.ok).toBe(true);

    // 1. The revision approval carrying the brief (latestNotes reads it).
    const approvals = db.inserts("approvals");
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      video_id: "v1",
      gate: "SCRIPT",
      decision: "revision",
      decided_by: "autopilot",
      notes: BRIEF,
    });

    // 2. A NEW script version (v2) was written — the actual re-script.
    const scripts = db.inserts("scripts");
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toMatchObject({ video_id: "v1", version: 2 });
    expect((scripts[0].beats as unknown[]).length).toBeGreaterThan(0);

    // 3. The video landed at SCRIPT_READY with the continuation re-armed.
    const v = db.row("videos", "v1")!;
    expect(v.status).toBe("SCRIPT_READY");
    expect(v.auto_finish).toBe(true);
    expect(v.paused_reason).toBeNull();
  });

  it("truncates an over-long brief to 2000 chars in the approval", async () => {
    const db = seeded();
    await autoRescriptFromFinal(db as never, db.row("videos", "v1") as never, PROJECT, "x".repeat(5000));
    expect((db.inserts("approvals")[0].notes as string).length).toBe(2000);
  });

  it("refuses any status other than FINAL_REVIEW and writes nothing", async () => {
    for (const status of ["SCRIPT_READY", "ASSEMBLING", "APPROVED", "TRACKING"]) {
      const db = seeded(status);
      const r = await autoRescriptFromFinal(db as never, db.row("videos", "v1") as never, PROJECT, BRIEF);
      expect(r.ok).toBe(false);
      expect(db.log.filter((e) => e.op === "insert")).toHaveLength(0);
      expect(db.row("videos", "v1")!.status).toBe(status);
    }
  });
});
