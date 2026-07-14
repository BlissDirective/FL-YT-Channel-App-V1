/**
 * Director Mode D5 — on-demand agent passes (spec §6.4). Each button runs
 * exactly one bounded pass, asserts Director Mode, and logs an
 * operator_decisions row. Here we drive the real action wrappers with the
 * Supabase server client mocked to a fake DB and the underlying pipeline
 * passes stubbed to recording spies.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";

const spies = vi.hoisted(() => ({
  autofix: [] as string[],
  watch: [] as string[],
  brief: [] as string[],
  briefResult: null as null | { brief: string; costUsd: number },
}));

let DB: FakeDb;
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => DB }));

// The underlying passes are tested elsewhere; here they're recording stubs.
vi.mock("@/lib/pipeline/autofix", () => ({
  processAutofixForVideo: async (_db: unknown, video: { id: string }) => {
    spies.autofix.push(video.id);
    return { acted: true, kind: "fixed", score: 8.1, changes: ["tightened beat 2"] };
  },
}));
vi.mock("@/lib/pipeline/watch-runner", () => ({
  runWatchGate: async (_db: unknown, video: { id: string }) => {
    spies.watch.push(video.id);
    return { overall: 7.4 };
  },
}));
vi.mock("@/lib/adapters/fix-planner", () => ({
  composeRevisionBrief: async (opts: { issues: string[] }) => {
    spies.brief.push(opts.issues.join("|"));
    return spies.briefResult;
  },
}));
// Keep the engine + guardrails graph light — the agent-pass actions don't use them.
vi.mock("@/lib/pipeline/engine", () => ({
  decideGate: async () => ({ ok: true }),
  killVideo: async () => ({ ok: true }),
  regenerateScript: async () => ({ ok: true }),
  runDirectedStage: async () => ({ ok: true }),
  runStageReview: async () => ({ ok: true, score: null, verdict: null, degraded: false, costUsd: 0 }),
  stepBackStage: async () => ({ ok: true }),
}));
vi.mock("@/lib/adapters/guardrails", () => ({
  planNextTopic: async () => null,
  taxonomyFor: () => [],
}));

import {
  directorRunAutofixAction,
  directorRunSelfWatchAction,
  directorAutoRescriptProposalAction,
} from "@/lib/actions/director";

function seed(mode: "director" | "autonomous", status = "FINAL_REVIEW"): FakeDb {
  return fakeDb({
    projects: [{ id: "p1", name: "Ch", pipeline_mode: mode }],
    videos: [{ id: "v1", project_id: "p1", title: "V", status, total_cost_usd: 0 }],
    qc_reviews: [{ video_id: "v1", issues: ["weak hook", "flat middle"], created_at: "2026-07-01" }],
    operator_decisions: [],
    cost_ledger: [],
  });
}

beforeEach(() => {
  spies.autofix = [];
  spies.watch = [];
  spies.brief = [];
  spies.briefResult = null;
});

describe("directorRunAutofixAction", () => {
  it("runs one pass and logs a decision (director project)", async () => {
    DB = seed("director");
    const r = await directorRunAutofixAction("p1", "v1");
    expect(r.ok).toBe(true);
    expect(spies.autofix).toEqual(["v1"]); // exactly one pass
    const decisions = DB.inserts("operator_decisions");
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({ stage: "edit", action: "review" });
  });

  it("refuses on an autonomous project — no pass, no decision", async () => {
    DB = seed("autonomous");
    const r = await directorRunAutofixAction("p1", "v1");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not in Director Mode/i);
    expect(spies.autofix).toEqual([]);
    expect(DB.inserts("operator_decisions")).toHaveLength(0);
  });
});

describe("directorRunSelfWatchAction", () => {
  it("runs one watch pass and logs the overall score", async () => {
    DB = seed("director");
    const r = await directorRunSelfWatchAction("p1", "v1");
    expect(r.ok).toBe(true);
    expect(r.score).toBe(7.4);
    expect(spies.watch).toEqual(["v1"]);
    expect(DB.inserts("operator_decisions")[0]).toMatchObject({ action: "review", agent_score: 7.4 });
  });

  it("refuses on an autonomous project", async () => {
    DB = seed("autonomous");
    const r = await directorRunSelfWatchAction("p1", "v1");
    expect(r.ok).toBe(false);
    expect(spies.watch).toEqual([]);
  });
});

describe("directorAutoRescriptProposalAction", () => {
  it("returns a proposal from the recorded findings without applying it", async () => {
    DB = seed("director");
    spies.briefResult = { brief: "Lead with the payoff; cut the throat-clearing intro.", costUsd: 0.02 };
    const r = await directorAutoRescriptProposalAction("p1", "v1");
    expect(r.ok).toBe(true);
    expect(r.proposal).toMatch(/Lead with the payoff/);
    // It fed the recorded findings to the planner…
    expect(spies.brief[0]).toContain("weak hook");
    // …and logged the proposal as an advisory review, not a revise/rerender.
    expect(DB.inserts("operator_decisions")[0]).toMatchObject({ action: "review" });
    // No script mutation — proposal only.
  });

  it("returns a null proposal (mock mode) with a helpful note", async () => {
    DB = seed("director");
    spies.briefResult = null; // composeRevisionBrief returns null without a live model
    const r = await directorAutoRescriptProposalAction("p1", "v1");
    expect(r.ok).toBe(true);
    expect(r.proposal).toBeNull();
    expect(r.warning).toMatch(/needs a live QC model/i);
  });
});
