/**
 * Auto-Rescript Stage B, part 2 (spec §7): the autofix call-site — runs the
 * REAL `processAutofixForVideo` against the fake query-builder with the
 * engine primitive stubbed, and pins:
 *   • fires only when env=on + auto_pilot_run + structural + brief + no kill
 *   • once per video (autoRescripted) — never a second re-script
 *   • dry mode logs would-rescript and still holds
 *   • fallbacks (env off / non-auto-pilot / kill switch / non-structural)
 *     keep the shipped Layer-2 guidance-hold, no approval side-effects
 *   • the outcome guard: a regressive re-script holds with the delta logged;
 *     an improved one continues to done.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";
import { invalidateQualityGateCache } from "@/lib/pipeline/quality-gates";

const rescript = vi.hoisted(() => ({
  calls: [] as string[],
  ok: true,
  killSwitch: false,
}));

vi.mock("@/lib/pipeline/engine", () => ({
  autoRescriptFromFinal: async (_db: never, video: { id: string }, _p: never, brief: string) => {
    rescript.calls.push(brief);
    return { ok: rescript.ok };
  },
  isKillSwitchOn: async () => rescript.killSwitch,
  makeBeatClip: async () => {
    throw new Error("not used");
  },
}));
vi.mock("@/lib/pipeline/watch-runner", () => ({ runWatchGate: async () => null }));
vi.mock("@/lib/pipeline/memory-service", () => ({
  recordNamespaceLesson: async () => {},
}));
vi.mock("@/lib/adapters/fix-planner", () => ({
  composeRevisionBrief: async () => ({
    brief: "Expand the starved middle section; land the title's promise in beat 1.",
    costUsd: 0,
  }),
  refineFixDirection: async () => null,
}));
vi.mock("@/lib/adapters/qc", () => ({
  COPILOT_AUTO_APPROVE_SCORE: 7.5,
  isQcLive: () => false,
  reviewGate: async () => {
    throw new Error("not used (animation loop reads vision_review)");
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("test must pass an explicit db");
  },
}));
vi.mock("@/lib/push", () => ({ isPushConfigured: () => false, sendPushToAll: async () => {} }));

import { processAutofixForVideo } from "@/lib/pipeline/autofix";

const PROJECT = {
  id: "p1",
  name: "Ch",
  niche: "testing",
  status: "active",
  visual_style: "stick",
  autofix_loop: "animation",
  autofix_enabled: true,
  autofix_config: { threshold: 7, maxRenders: 2, spendCapUsd: 5 },
  autofix_memory: {},
} as never;

// A critique whose ONLY issues are structural (STRUCTURAL_RE matches), so the
// visual planner produces zero changes and the Layer-2 branch is reached.
const structuralCritique = (at: string, score: number) => ({
  at,
  score,
  issues: [
    {
      beatIdx: 1,
      category: "other",
      severity: "high",
      note: "the middle section is missing — needs more content to reach the target length",
      fix: "expand the script with a substantive middle section",
    },
  ],
});

function video(extra: Record<string, unknown> = {}) {
  return {
    id: "v1",
    project_id: "p1",
    title: "Structural fail",
    topic: "testing",
    format: "long",
    kind: "long",
    status: "FINAL_REVIEW",
    target_length_sec: 300,
    total_cost_usd: 2,
    paused_reason: null,
    updated_at: "2026-07-07T00:00:00Z",
    auto_pilot_run: true,
    autofix_enabled: null,
    autofix_state: {},
    vision_review: structuralCritique("t1", 5.2),
    watch_review: null,
    ...extra,
  } as never;
}

function seeded(v = video()): FakeDb {
  return fakeDb({
    videos: [v as never],
    projects: [PROJECT as never],
    approvals: [],
    scripts: [{ video_id: "v1", version: 1, beats: [{ idx: 0, text: "b0" }, { idx: 1, text: "b1" }] }],
    assets: [],
    qc_reviews: [
      { video_id: "v1", gate: "FINAL", verdict: "Thin middle", issues: ["no substantive middle"], created_at: "2026-07-06T00:00:00Z" },
    ],
    autofix_runs: [],
    operator_events: [],
    // These specs pin the BLOCKING behavior — advisory mode (the new
    // default) is exercised in workspace-thread-status/advisory tests.
    app_settings: [{ key: "quality_gates", value: { advisory: false } }],
    cost_ledger: [],
  });
}

async function run(db: FakeDb) {
  return processAutofixForVideo(
    db as never,
    db.row("videos", "v1") as never,
    PROJECT,
  );
}

beforeEach(() => {
  invalidateQualityGateCache();
  rescript.calls = [];
  rescript.ok = true;
  rescript.killSwitch = false;
  process.env.AUTOFIX_AUTO_RESCRIPT = "on";
});
afterEach(() => {
  delete process.env.AUTOFIX_AUTO_RESCRIPT;
});

describe("fires exactly per the spec", () => {
  it("env=on + auto-pilot + structural → re-scripts once with the full bookkeeping", async () => {
    const db = seeded();
    const out = await run(db);
    expect(out).toMatchObject({ acted: true, kind: "fixed", changes: ["Auto-rescript from QC notes"] });
    expect(rescript.calls).toHaveLength(1);
    expect(rescript.calls[0]).toContain("starved middle");

    const state = db.updates("videos").map((u) => u.autofix_state).filter(Boolean).at(-1) as Record<string, unknown>;
    expect(state).toMatchObject({
      autoRescripted: true,
      rescriptFromScore: 5.2,
      rescriptSettled: false,
      status: "rerendering",
      actedOnAt: "t1",
    });
    expect(db.inserts("autofix_runs")[0]).toMatchObject({
      video_id: "v1",
      changes: ["Auto-rescript from QC notes"],
      status: "applied",
    });
    expect(db.inserts("operator_events")[0]).toMatchObject({ kind: "auto_rescript" });
  });

  it("once per video: an already-rescripted video falls back to the guidance-hold", async () => {
    const db = seeded(video({ autofix_state: { autoRescripted: true, rescriptSettled: true } }));
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
    const v = db.row("videos", "v1")!;
    expect(String(v.paused_reason)).toMatch(/script\/structure needs work/);
  });
});

describe("fallbacks keep the shipped guidance-hold", () => {
  it("env off (default) → hold, primitive never called", async () => {
    delete process.env.AUTOFIX_AUTO_RESCRIPT;
    const db = seeded();
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
    expect(db.inserts("operator_events")).toHaveLength(0);
  });

  it("non-auto-pilot video → hold (no continuation to re-flow it)", async () => {
    const db = seeded(video({ auto_pilot_run: false }));
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
  });

  it("global kill switch on → hold even with env=on", async () => {
    rescript.killSwitch = true;
    const db = seeded();
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
  });

  it("non-structural no-fix failure → plain hold, no brief-driven rescript", async () => {
    const db = seeded(
      video({
        vision_review: { at: "t1", score: 5.2, issues: [] }, // nothing actionable, nothing structural
      }),
    );
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
    const v = db.row("videos", "v1")!;
    expect(String(v.paused_reason)).toMatch(/no actionable fix/);
  });

  it("dry mode logs would-rescript to operator_events and still holds", async () => {
    process.env.AUTOFIX_AUTO_RESCRIPT = "dry";
    const db = seeded();
    const out = await run(db);
    expect(rescript.calls).toHaveLength(0);
    expect(out).toMatchObject({ acted: true, kind: "held" });
    const events = db.inserts("operator_events");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "auto_rescript_dry" });
    expect(String(events[0].message)).toMatch(/Would auto-rescript/);
  });
});

describe("outcome guard on the post-rescript return", () => {
  const returned = (score: number) =>
    video({
      autofix_state: {
        autoRescripted: true,
        rescriptSettled: false,
        rescriptFromScore: 5.2,
        status: "rerendering",
        actedOnAt: "t1",
      },
      vision_review: { at: "t2", score, issues: [] }, // fresh critique after the re-render
    });

  it("regressive re-script → held with the QC-delta logged; never re-attempts", async () => {
    const db = seeded(returned(4.8));
    const out = await run(db);
    expect(out).toMatchObject({ acted: true, kind: "held" });
    expect(rescript.calls).toHaveLength(0);
    const ev = db.inserts("operator_events");
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ kind: "auto_rescript" });
    expect(String(ev[0].message)).toContain("5.2 → 4.8");
    expect(String(db.row("videos", "v1")!.paused_reason)).toMatch(/did not improve QC/);
  });

  it("improved re-script → outcome logged, loop continues to done at threshold", async () => {
    const db = seeded(returned(8.1));
    const out = await run(db);
    expect(out).toMatchObject({ acted: true, kind: "done", score: 8.1 });
    const ev = db.inserts("operator_events");
    expect(ev).toHaveLength(1);
    expect(String(ev[0].message)).toContain("Δ+2.9");
  });
});
