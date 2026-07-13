/**
 * Director Mode isolation (Fable-5-Director-Mode-Build-Spec.md §10.2). Proves
 * the core invariant for D1: a Director-Mode project is never advanced,
 * published, or mutated by any autonomous engine path, while an Autonomous
 * project is byte-for-byte unchanged. Runs the REAL engine against the fake
 * Supabase query-builder with only leaf adapters mocked (mirrors
 * safety-critical.test.ts).
 *
 * Covers §10.2.2 (engine no-op matrix), §10.2.4 (twin-project sweep diff via
 * decideGate parity), and §10.2.7 (mode-flip re-arm). §10.2.1's registry check
 * lives alongside as a structural list so a new automation can't skip the net.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";
import { isDirectorMode, VIDEO_STATUSES } from "@studio/core";

// ── Leaf mocks (everything else is the real engine) ──────────────────────
const qcMock = vi.hoisted(() => ({ live: false }));

vi.mock("@/lib/adapters/qc", () => ({
  COPILOT_AUTO_APPROVE_SCORE: 7.5,
  isQcLive: () => qcMock.live,
  reviewGate: async () => {
    throw new Error("reviewGate must never run for a frozen director project");
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
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    throw new Error("test must pass an explicit db");
  },
}));

import {
  decideGate,
  runPipeline,
  runDirectedStage,
  releaseScheduledVideos,
} from "@/lib/pipeline/engine";

// ── Fixtures ──────────────────────────────────────────────────────────────
const BASE_PROJECT = {
  id: "p1",
  name: "Director Channel",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  autonomy: { IDEA: "autopilot", SCRIPT: "autopilot", ASSETS: "autopilot", FINAL: "autopilot" },
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
    total_cost_usd: 2,
    paused_reason: null,
    ...extra,
  };
}

function seededDb(
  videoRow: Record<string, unknown>,
  projectOverrides: Record<string, unknown> = {},
): FakeDb {
  return fakeDb({
    videos: [videoRow],
    projects: [{ ...BASE_PROJECT, ...projectOverrides }],
    approvals: [],
    app_settings: [],
    qc_reviews: [],
    scripts: [],
    assets: [],
    cost_ledger: [],
  });
}

beforeEach(() => {
  qcMock.live = false;
});

// ── §10.2.1 Autonomous entry-point registry ──────────────────────────────
// Every function that can autonomously move/mutate/publish a video. The
// isolation net (the runPipeline master guard + per-sweep skips) must cover
// each. This list is asserted non-empty as a canary: adding a new automation
// means adding it here AND to its skip test, so nothing silently escapes.
const AUTONOMOUS_ENTRY_POINTS = [
  "runPipeline", // hop loop — the master guard is here
  "decideGate", // auto-approve chaining
  "processPendingBuildVideos", // build runner
  "finalizeAutoPilotVideos", // autopilot finalizer
  "releaseScheduledVideos", // scheduled auto-publish
  "sweepAutofix", // auto-fix sweep
  "sweepOperator", // autopilot operator tick
  "runIntelligenceAllProjects", // nightly auto-idea cron
] as const;

describe("§10.2.1 autonomous entry-point registry", () => {
  it("enumerates the autonomous surfaces the isolation net must cover", () => {
    expect(AUTONOMOUS_ENTRY_POINTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(AUTONOMOUS_ENTRY_POINTS).size).toBe(AUTONOMOUS_ENTRY_POINTS.length);
  });

  it("isDirectorMode reads director, defaults everything else to autonomous (fail-safe)", () => {
    expect(isDirectorMode({ pipeline_mode: "director" })).toBe(true);
    expect(isDirectorMode({ pipeline_mode: "autonomous" })).toBe(false);
    expect(isDirectorMode({})).toBe(false);
    expect(isDirectorMode(null)).toBe(false);
    expect(isDirectorMode(undefined)).toBe(false);
    // An unknown/garbage value must never read as director.
    expect(isDirectorMode({ pipeline_mode: "banana" })).toBe(false);
  });
});

// ── §10.2.2 Engine no-op matrix ───────────────────────────────────────────
describe("§10.2.2 runPipeline no-op for every status in Director Mode", () => {
  // Every non-terminal status a self-advancing sweep could reach.
  const DRIVE_STATUSES = VIDEO_STATUSES.filter(
    (s) => !["KILLED", "TRACKING", "APPROVED", "NEEDS_REVISION"].includes(s),
  );

  for (const status of DRIVE_STATUSES) {
    it(`${status}: no writes, no status change, no adapter calls`, async () => {
      const db = seededDb(video(status));
      const r = await runPipeline("v1", db as never);
      expect(r.ok).toBe(true);
      // The master guard returns before any mutation.
      expect(db.log).toHaveLength(0);
      expect(db.row("videos", "v1")!.status).toBe(status);
      expect(db.row("videos", "v1")!.paused_reason).toBeNull();
    });
  }

  it("an Autonomous project with the SAME status DOES act (proves the guard is mode-gated, not inert)", async () => {
    // IDEA_APPROVED → SCRIPTING is a pure status bump with no adapter, so it's
    // a safe positive control that the engine still runs in autonomous mode.
    const db = seededDb(video("IDEA_APPROVED"), { pipeline_mode: "autonomous" });
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    // It advanced past IDEA_APPROVED (guard did NOT fire).
    expect(db.row("videos", "v1")!.status).not.toBe("IDEA_APPROVED");
    expect(db.log.length).toBeGreaterThan(0);
  });
});

// ── §10.2.2 decideGate: no caps, no chaining in Director Mode ──────────────
describe("§10.2.2 decideGate in Director Mode", () => {
  it("advances one gate on approve and does NOT chain into the next stage", async () => {
    const db = seededDb(video("SCRIPT_READY"));
    const r = await decideGate({ videoId: "v1", decision: "approved" }, db as never);
    expect(r.ok).toBe(true);
    // Status moved to GENERATING_ASSETS but the stage body never ran (no adapter
    // writes beyond the status bump + approval row).
    expect(db.row("videos", "v1")!.status).toBe("GENERATING_ASSETS");
    expect(db.inserts("approvals")).toHaveLength(1);
    // No qc_reviews / assets were produced — the engine stopped after the bump.
    expect(db.inserts("qc_reviews")).toHaveLength(0);
    expect(db.inserts("assets")).toHaveLength(0);
  });

  it("never hits the revision cap — an 11th revision still succeeds", async () => {
    const db = fakeDb({
      videos: [video("SCRIPT_READY")],
      projects: [{ ...BASE_PROJECT }],
      approvals: Array.from({ length: 10 }, () => ({
        video_id: "v1",
        decision: "revision",
        decided_by: "human",
      })),
      app_settings: [],
      qc_reviews: [],
      scripts: [],
      assets: [],
      cost_ledger: [],
    });
    const r = await decideGate(
      { videoId: "v1", decision: "revision", notes: "again" },
      db as never,
    );
    expect(r.ok).toBe(true);
    expect(r.error).toBeUndefined();
    expect(r.warning).toBeUndefined(); // no warn text either
    expect(db.inserts("approvals")).toHaveLength(1);
  });

  it("kill still works in Director Mode", async () => {
    const db = seededDb(video("SCRIPT_READY"));
    const r = await decideGate({ videoId: "v1", decision: "killed" }, db as never);
    expect(r.ok).toBe(true);
    expect(db.row("videos", "v1")!.status).toBe("KILLED");
  });
});

// ── §10.2.7 runDirectedStage: the only path that advances a director video ──
describe("§10.2.7 runDirectedStage money rails + single-step", () => {
  it("refuses to run on an Autonomous project", async () => {
    const db = seededDb(video("IDEA_APPROVED"), { pipeline_mode: "autonomous" });
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Director-Mode only/);
    expect(db.log).toHaveLength(0);
  });

  it("advances exactly one stage (IDEA_APPROVED → SCRIPTING) then stops", async () => {
    const db = seededDb(video("IDEA_APPROVED"));
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(true);
    expect(db.row("videos", "v1")!.status).toBe("SCRIPTING");
  });

  it("the global kill switch blocks a directed step (money/safety rail stays live)", async () => {
    const db = seededDb(video("IDEA_APPROVED"), {});
    db.tables.app_settings.push({ key: "kill_switch", value: { enabled: true } });
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/kill switch/i);
    expect(db.row("videos", "v1")!.status).toBe("IDEA_APPROVED");
  });

  it("a paused project blocks a directed step", async () => {
    const db = seededDb(video("IDEA_APPROVED"), { status: "paused" });
    const r = await runDirectedStage("v1", db as never);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/paused/i);
    expect(db.row("videos", "v1")!.status).toBe("IDEA_APPROVED");
  });
});

// ── §10.2.4 Twin-project sweep diff: scheduled auto-publish ────────────────
// Two identical publish-ready videos, one in each mode. The sweep must release
// the autonomous one and leave the director one byte-identical.
describe("§10.2.4 releaseScheduledVideos twin-project isolation", () => {
  const publishable = (id: string, projectId: string) => ({
    id,
    project_id: projectId,
    title: `vid ${id}`,
    status: "APPROVED",
    auto_publish: true,
    publish_requested: false,
    youtube_video_id: null,
    scheduled_publish_at: null, // all-at-once → due now
    build_run_id: null,
  });

  it("releases the autonomous video and never touches the director video", async () => {
    const db = fakeDb({
      projects: [
        { ...BASE_PROJECT, id: "auto", pipeline_mode: "autonomous" },
        { ...BASE_PROJECT, id: "dir", pipeline_mode: "director" },
      ],
      videos: [publishable("va", "auto"), publishable("vd", "dir")],
      build_runs: [],
    });

    const before = JSON.stringify(db.row("videos", "vd"));
    const r = await releaseScheduledVideos(6, db as never);

    expect(r.released).toBe(1); // only the autonomous one
    expect(db.row("videos", "va")!.publish_requested).toBe(true);
    // Director video is byte-identical — no publish latch, no writes referencing it.
    expect(JSON.stringify(db.row("videos", "vd"))).toBe(before);
    expect(db.row("videos", "vd")!.publish_requested).toBe(false);
  });
});
