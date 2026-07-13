/**
 * Director Mode D2 — engine-level behaviors the stage actions rely on
 * (Fable-5-Director-Mode-Build-Spec.md §5, §4.1.4/§4.1.5, §3.3). Runs the REAL
 * engine against the fake Supabase query-builder with leaf adapters mocked
 * (mirrors safety-critical.test.ts / mode-isolation.test.ts).
 *
 * Pins:
 *  - the advisory review (runStageReview) records a score and NEVER advances
 *    or holds, even at score 0;
 *  - the fail-closed money rail blocks the directed asset stage when a paid
 *    provider is live but QC is not;
 *  - the budget rail blocks a directed paid stage;
 *  - operator_decisions logging + stage mapping are correct (pure helpers).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";
import { directorStageForStatus } from "@/lib/pipeline/decisions";

// ── Leaf mocks ────────────────────────────────────────────────────────────
const qcMock = vi.hoisted(() => ({ live: false, score: 0 }));
const falMock = vi.hoisted(() => ({ live: false }));

vi.mock("@/lib/adapters/qc", () => ({
  COPILOT_AUTO_APPROVE_SCORE: 7.5,
  isQcLive: () => qcMock.live,
  reviewGate: async () => ({
    score: qcMock.score,
    verdict: qcMock.score >= 7 ? "pass" : "revise",
    issues: [],
    strengths: [],
    criteria: [],
    judgeModel: "mock-judge",
    escalated: false,
    degraded: false,
    costUsd: 0,
  }),
}));
vi.mock("@/lib/adapters/fal", () => ({
  isFalLive: () => falMock.live,
  generateImage: async () => {
    throw new Error("not used");
  },
  generateVideo: async () => {
    throw new Error("not used");
  },
  FalVideoTimeoutError: class extends Error {},
}));
vi.mock("@/lib/push", () => ({ isPushConfigured: () => false, sendPushToAll: async () => {} }));
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

import { runStageReview, runDirectedStage } from "@/lib/pipeline/engine";

// ── Fixtures ──────────────────────────────────────────────────────────────
const PROJECT = {
  id: "p1",
  name: "Director Channel",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  autonomy: { IDEA: "assist", SCRIPT: "assist", ASSETS: "assist", FINAL: "assist" },
  budget: { perVideoUsd: 15, monthlyUsd: 150 },
  pipeline_mode: "director",
};

function video(status: string, extra: Record<string, unknown> = {}) {
  return {
    id: "v1",
    project_id: "p1",
    title: "Test video",
    topic: "testing",
    format: "long",
    kind: "long",
    status,
    target_length_sec: 300,
    total_cost_usd: 0,
    paused_reason: null,
    ...extra,
  };
}

function seededDb(
  videoRow: Record<string, unknown>,
  projectOverrides: Record<string, unknown> = {},
  settings: Record<string, unknown>[] = [],
): FakeDb {
  return fakeDb({
    videos: [videoRow],
    projects: [{ ...PROJECT, ...projectOverrides }],
    approvals: [],
    app_settings: settings,
    qc_reviews: [],
    scripts: [{ video_id: "v1", version: 1, beats: [], runtime_sec: 300, metadata: {} }],
    assets: [],
    cost_ledger: [],
    operator_decisions: [],
  });
}

beforeEach(() => {
  qcMock.live = false;
  qcMock.score = 0;
  falMock.live = false;
});

// ── directorStageForStatus (pure) ─────────────────────────────────────────
describe("directorStageForStatus", () => {
  it("maps each status to its console stage", () => {
    expect(directorStageForStatus("IDEA")).toBe("idea");
    expect(directorStageForStatus("IDEA_APPROVED")).toBe("idea");
    expect(directorStageForStatus("SCRIPTING")).toBe("script");
    expect(directorStageForStatus("SCRIPT_READY")).toBe("script");
    expect(directorStageForStatus("GENERATING_ASSETS")).toBe("visuals");
    expect(directorStageForStatus("ASSETS_READY")).toBe("visuals");
    expect(directorStageForStatus("ASSEMBLING")).toBe("edit");
    expect(directorStageForStatus("FINAL_REVIEW")).toBe("edit");
    expect(directorStageForStatus("APPROVED")).toBe("publish");
    expect(directorStageForStatus("TRACKING")).toBe("publish");
  });
});

// ── runStageReview: advisory only ─────────────────────────────────────────
describe("runStageReview is advisory — records a score, never advances/holds", () => {
  it("stores a qc_review and returns a score without changing status (score 0)", async () => {
    qcMock.live = true;
    qcMock.score = 0;
    const db = seededDb(video("SCRIPT_READY"));
    const r = await runStageReview("v1", db as never);
    expect(r.ok).toBe(true);
    expect(r.score).toBe(0);
    expect(r.verdict).toBe("fail"); // advisory verdict below floor
    // A review row was written…
    expect(db.inserts("qc_reviews")).toHaveLength(1);
    expect(db.inserts("qc_reviews")[0]).toMatchObject({ gate: "SCRIPT", auto_approved: false });
    // …but the video did NOT move and was NOT held.
    expect(db.row("videos", "v1")!.status).toBe("SCRIPT_READY");
    expect(db.row("videos", "v1")!.paused_reason).toBeNull();
  });

  it("refuses on an autonomous project", async () => {
    qcMock.live = true;
    const db = seededDb(video("SCRIPT_READY"), { pipeline_mode: "autonomous" });
    const r = await runStageReview("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Director-Mode only/);
    expect(db.inserts("qc_reviews")).toHaveLength(0);
  });
});

// ── Money rails on the directed asset stage ───────────────────────────────
describe("runDirectedStage money rails (kept in Director Mode)", () => {
  it("fail-closed: paid provider live + QC mocked blocks the asset stage", async () => {
    falMock.live = true; // paid image/video provider live
    qcMock.live = false; // grader NOT live
    const db = seededDb(video("GENERATING_ASSETS"));
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/blocked/i);
    expect(db.row("videos", "v1")!.paused_reason).toMatch(/QC model/i);
    // No generation happened — status unchanged.
    expect(db.row("videos", "v1")!.status).toBe("GENERATING_ASSETS");
  });

  it("budget cap blocks a directed paid stage", async () => {
    const db = seededDb(
      video("GENERATING_ASSETS", { total_cost_usd: 200 }), // already over the $150 monthly cap
      {},
    );
    // Seed the ledger so the monthly meter is over budget.
    db.tables.cost_ledger.push({ project_id: "p1", video_id: "v1", usd: 200 });
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(false);
    expect(db.row("videos", "v1")!.status).toBe("GENERATING_ASSETS");
  });
});
