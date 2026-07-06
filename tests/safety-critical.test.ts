/**
 * UI-Redesign Phase 0 — safety-critical engine paths.
 *
 * These are the behaviors a UI rewire could silently orphan (Fable-5-UI-
 * Redesign.md §3): the revision hard-cap, the approvals audit trail, the
 * global kill switch, gate arrival writing qc_reviews and waiting for a
 * human, the grader-down hold, autopilot auto-resolution, and the budget
 * pause. They run the REAL engine (decideGate / runPipeline / killVideo)
 * against the fake Supabase query-builder, with only the leaf adapters
 * (QC judge, push, storage, server client) mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";

// ── Leaf mocks (everything else is the real engine) ──────────────────────
const qcMock = vi.hoisted(() => ({
  live: false,
  impl: null as null | (() => Promise<Record<string, unknown>>),
}));

vi.mock("@/lib/adapters/qc", () => ({
  COPILOT_AUTO_APPROVE_SCORE: 7.5,
  isQcLive: () => qcMock.live,
  reviewGate: async () => {
    if (!qcMock.impl) throw new Error("reviewGate not stubbed for this test");
    return qcMock.impl();
  },
}));

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

// The engine always receives an explicit db in these tests; a bare
// createClient() call would mean a test accidentally left the fake behind.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("test must pass an explicit db");
  },
}));

import { decideGate, killVideo, runPipeline } from "@/lib/pipeline/engine";

// ── Fixtures ──────────────────────────────────────────────────────────────
const PROJECT = {
  id: "p1",
  name: "Test Channel",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  autonomy: { IDEA: "assist", SCRIPT: "assist", ASSETS: "assist", FINAL: "assist" },
  budget: { perVideoUsd: 15, monthlyUsd: 150 },
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
    total_cost_usd: 2,
    paused_reason: null,
    ...extra,
  };
}

function seededDb(videoRow: Record<string, unknown>, opts: {
  project?: Record<string, unknown>;
  approvals?: Record<string, unknown>[];
  settings?: Record<string, unknown>[];
} = {}): FakeDb {
  return fakeDb({
    videos: [videoRow],
    projects: [{ ...PROJECT, ...(opts.project ?? {}) }],
    approvals: opts.approvals ?? [],
    app_settings: opts.settings ?? [],
    qc_reviews: [],
    scripts: [],
    assets: [],
    cost_ledger: [],
  });
}

const revisionRow = (decided_by: string) => ({
  video_id: "v1",
  decision: "revision",
  decided_by,
});

beforeEach(() => {
  qcMock.live = false;
  qcMock.impl = null;
});

// ── decideGate: revision caps + audit trail ───────────────────────────────
describe("decideGate revision cap (quality_gates defaults: warn 3, hard-cap 4)", () => {
  it("hard-blocks the 5th human revision and writes NOTHING", async () => {
    const db = seededDb(video("SCRIPT_READY"), {
      approvals: [1, 2, 3, 4].map(() => revisionRow("human")),
    });
    const r = await decideGate(
      { videoId: "v1", decision: "revision", notes: "again" },
      db as never,
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Revision limit reached \(4 revisions/);
    expect(db.log).toHaveLength(0); // no approval row, no status change
    expect(db.row("videos", "v1")!.status).toBe("SCRIPT_READY");
  });

  it("autopilot's own revisions don't count toward the human cap", async () => {
    const db = seededDb(video("IDEA"), {
      approvals: [1, 2, 3, 4].map(() => revisionRow("autopilot")),
    });
    const r = await decideGate(
      { videoId: "v1", decision: "revision", notes: "sharpen" },
      db as never,
    );
    expect(r.ok).toBe(true);
    expect(db.inserts("approvals")).toHaveLength(1);
  });

  it("warns from revision #3 and records the approval audit row", async () => {
    const db = seededDb(video("IDEA"), {
      approvals: [revisionRow("human"), revisionRow("mcp")],
    });
    const r = await decideGate(
      { videoId: "v1", decision: "revision", notes: "tighter hook" },
      db as never,
    );
    expect(r.ok).toBe(true);
    expect(r.warning).toMatch(/revision #3/);
    const rows = db.inserts("approvals");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      video_id: "v1",
      gate: "IDEA",
      decision: "revision",
      decided_by: "human",
      notes: "tighter hook",
    });
    // IDEA revision sharpens in place: NEEDS_REVISION blip → back to IDEA.
    expect(db.row("videos", "v1")!.status).toBe("IDEA");
  });

  it("refuses to decide when there is no open gate", async () => {
    const db = seededDb(video("TRACKING"));
    const r = await decideGate({ videoId: "v1", decision: "approved" }, db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No open gate for status TRACKING/);
    expect(db.log).toHaveLength(0);
  });

  it("human FINAL approve writes the audit row and advances to APPROVED", async () => {
    const db = seededDb(video("FINAL_REVIEW"));
    const r = await decideGate({ videoId: "v1", decision: "approved" }, db as never);
    expect(r.ok).toBe(true);
    expect(db.inserts("approvals")[0]).toMatchObject({
      gate: "FINAL",
      decision: "approved",
      decided_by: "human",
    });
    expect(db.row("videos", "v1")!.status).toBe("APPROVED");
  });
});

// ── killVideo: works from any status, audit-trailed at gates ──────────────
describe("killVideo", () => {
  it("kills at a gate with an approvals audit row", async () => {
    const db = seededDb(video("SCRIPT_READY"));
    const r = await killVideo("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.inserts("approvals")[0]).toMatchObject({ gate: "SCRIPT", decision: "killed" });
    expect(db.row("videos", "v1")!.status).toBe("KILLED");
  });

  it("kills outside a gate (no approvals row — approvals.gate is NOT NULL)", async () => {
    const db = seededDb(video("TRACKING"));
    const r = await killVideo("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.inserts("approvals")).toHaveLength(0);
    expect(db.row("videos", "v1")!.status).toBe("KILLED");
  });

  it("is idempotent on an already-killed video", async () => {
    const db = seededDb(video("KILLED"));
    const r = await killVideo("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.log).toHaveLength(0);
  });
});

// ── runPipeline: kill switch, budget pause, gate arrival ─────────────────
describe("runPipeline safety rails", () => {
  it("global kill switch blocks every stage and surfaces a visible pause", async () => {
    const db = seededDb(video("SCRIPTING"), {
      settings: [{ key: "kill_switch", value: { enabled: true } }],
    });
    const r = await runPipeline("v1", db as never);
    expect(r).toMatchObject({ ok: false, error: "Global kill switch is on" });
    expect(db.row("videos", "v1")!.paused_reason).toBe("Global kill switch is on");
    expect(db.row("videos", "v1")!.status).toBe("SCRIPTING"); // held, not advanced
  });

  it("a paused project holds its videos with a visible reason", async () => {
    const db = seededDb(video("SCRIPTING"), { project: { status: "paused" } });
    const r = await runPipeline("v1", db as never);
    expect(r).toMatchObject({ ok: false, error: "Project is paused" });
    expect(db.row("videos", "v1")!.paused_reason).toBe("Project is paused");
  });

  it("budget pause: a paid stage never starts past the per-video cap", async () => {
    const db = seededDb(video("SCRIPTING", { total_cost_usd: 20 }));
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Per-video budget reached \(\$15\)/);
    expect(db.row("videos", "v1")!.paused_reason).toMatch(/Per-video budget reached/);
    expect(db.row("videos", "v1")!.status).toBe("SCRIPTING");
  });

  it("gate arrival inserts a qc_reviews row and WAITS for a human in assist", async () => {
    qcMock.impl = async () => ({
      score: 6.2,
      verdict: "Solid start",
      issues: ["hook is slow"],
      strengths: ["clear premise"],
      criteria: [],
      judgeModel: "mock",
      escalated: false,
      costUsd: 0,
      degraded: false,
    });
    const db = seededDb(video("SCRIPT_READY"));
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.inserts("qc_reviews")[0]).toMatchObject({
      video_id: "v1",
      gate: "SCRIPT",
      score: 6.2,
      auto_approved: false,
    });
    expect(db.inserts("approvals")).toHaveLength(0); // waits for the human
    expect(db.row("videos", "v1")!.status).toBe("SCRIPT_READY");
  });

  it("grader-down on an auto-advancing gate holds for a human (never publishes blind)", async () => {
    qcMock.live = true; // QC is configured live…
    qcMock.impl = async () => {
      throw new Error("anthropic 529");
    }; // …but the call fails
    const db = seededDb(video("FINAL_REVIEW"), {
      project: { autonomy: { ...PROJECT.autonomy, FINAL: "autopilot" } },
    });
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.row("videos", "v1")!.paused_reason).toMatch(/QC unavailable — held for manual review/);
    expect(db.inserts("approvals")).toHaveLength(0);
    expect(db.row("videos", "v1")!.status).toBe("FINAL_REVIEW"); // did NOT advance
  });

  it("autopilot auto-resolves a passing FINAL gate with an audited approval", async () => {
    qcMock.impl = async () => ({
      score: 9.1,
      verdict: "Ship it",
      issues: [],
      strengths: ["tight"],
      criteria: [],
      judgeModel: "mock",
      escalated: false,
      costUsd: 0,
      degraded: false,
    });
    const db = seededDb(video("FINAL_REVIEW"), {
      project: { autonomy: { ...PROJECT.autonomy, FINAL: "autopilot" } },
    });
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.inserts("approvals")[0]).toMatchObject({
      gate: "FINAL",
      decision: "approved",
      decided_by: "autopilot",
    });
    expect(db.row("videos", "v1")!.status).toBe("APPROVED");
  });
});
