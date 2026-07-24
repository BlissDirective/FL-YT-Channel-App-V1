/**
 * Agent-training build (Steps 1, 2, 4): advisory-by-default QC, the exemplar
 * mining pipeline, and the outcome loop. Runs the REAL modules against the
 * fake query-builder with only leaf providers mocked/mock-mode.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fakeDb } from "./helpers/fake-db";

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
    throw new Error("tests must pass an explicit db");
  },
}));
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import { mineExemplars, runOutcomeLoop, getScriptExemplars } from "@/lib/pipeline/exemplars";
import { watchBlocksPublish } from "@/lib/pipeline/settle";
import {
  DEFAULT_QUALITY_GATES,
  invalidateQualityGateCache,
  mergeQualityGates,
} from "@/lib/pipeline/quality-gates";
import { routeHeuristic } from "@/lib/workspace/router";
import { getWorkspaceAction } from "@/lib/workspace/registry";
import { generateScript } from "@/lib/adapters/script";

const PROJECT = {
  id: "p1",
  name: "Train Ch",
  niche: "semiconductor supply chains",
  audience: "tech investors",
  angle: "hidden constraints",
  tone: "calm",
  status: "active",
  brand_kit: { thumbnailStyle: "bold" },
  voice_id: "mock-voice",
  autonomy: { IDEA: "autopilot", SCRIPT: "autopilot", ASSETS: "autopilot", FINAL: "autopilot" },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
};

function db(seed: Record<string, unknown[]> = {}) {
  return fakeDb({
    projects: [PROJECT as never],
    videos: [],
    exemplars: [],
    scripts: [],
    qc_reviews: [],
    analytics_snapshots: [],
    workspace_messages: [],
    app_settings: [],
    ...seed,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidateQualityGateCache();
});

/* ────────────────────────────────────────────────────────────────── */
/* Step 1 — advisory-by-default QC                                     */
/* ────────────────────────────────────────────────────────────────── */

describe("Step 1: advisory mode defaults + config plumbing", () => {
  it("advisory is ON by default and round-trips through mergeQualityGates", () => {
    expect(DEFAULT_QUALITY_GATES.advisory).toBe(true);
    const merged = mergeQualityGates({ advisory: false, runFloor: 6 }, { autofixThreshold: 8 });
    expect(merged.advisory).toBe(false);
    expect(merged.runFloor).toBe(6);
    expect(merged.autofixThreshold).toBe(8); // unsent keys preserved
    // Re-enabling round-trips too.
    expect(mergeQualityGates({ advisory: true }, merged).advisory).toBe(true);
  });

  it("watchBlocksPublish: a low SCORE no longer blocks in advisory mode, policy risk still does", () => {
    const lowScore = { degraded: false, overall: 3.2, policyRisk: false, fixPlan: [] } as never;
    const policy = { degraded: false, overall: 8.5, policyRisk: true, fixPlan: [] } as never;
    // Advisory: score floor is advisory-only.
    expect(watchBlocksPublish(lowScore, { watchBlockPublishBelow: 5, advisory: true }).blocked).toBe(false);
    // …but a content-policy risk ALWAYS blocks.
    expect(watchBlocksPublish(policy, { watchBlockPublishBelow: 5, advisory: true }).blocked).toBe(true);
    // Blocking mode keeps the legacy behavior.
    expect(watchBlocksPublish(lowScore, { watchBlockPublishBelow: 5, advisory: false }).blocked).toBe(true);
  });

  it("grader-down in advisory mode notes the thread and CONTINUES (blocking mode is pinned in safety-critical)", async () => {
    // Source-level pin: the arriveAtGate grader-down branch consults advisory
    // and posts an advisory_qc_down note instead of holding.
    const src = readFileSync("src/lib/pipeline/engine.ts", "utf8");
    expect(src).toMatch(/advisory_qc_down/);
    expect(src).toMatch(/advisory_script_qc/);
    expect(src).toMatch(/advisory_factcheck/);
    expect(src).toMatch(/advisory_final_qc/);
  });

  it("all four autofix subjective holds have advisory settle branches; the budget hold does not", () => {
    const src = readFileSync("src/lib/pipeline/autofix.ts", "utf8");
    for (const event of [
      "advisory_autofix_rescript",
      "advisory_autofix_lowband",
      "advisory_autofix_exhausted",
      "advisory_autofix_structural",
    ]) {
      expect(src).toContain(event);
    }
    // The deterministic budget hold stays unconditional.
    expect(src).toMatch(/Auto-fix held — \$\{projectBudget\.reason\}/);
  });

  it("operator publish floor defers to advisory; editorial fail still holds", () => {
    const src = readFileSync("src/lib/pipeline/operator.ts", "utf8");
    expect(src).toMatch(/qc < cfg\.publishFloorQc && !qg\.advisory/);
    expect(src).toMatch(/guard\.verdict === "fail"/);
  });
});

/* ────────────────────────────────────────────────────────────────── */
/* Step 2 — exemplar mining                                            */
/* ────────────────────────────────────────────────────────────────── */

describe("Step 2: exemplar mining (offline mock providers)", () => {
  it("mines niche winners into the exemplars table with hook + structure", async () => {
    const d = db();
    const r = await mineExemplars(d as never, PROJECT, { max: 4 });
    expect(r.ok).toBe(true);
    expect(r.mined).toBe(4);
    const rows = d.tables.exemplars as { origin: string; hook: string | null; structure: { beats: unknown[] }; source: { videoId: string }; score: number }[];
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.origin).toBe("mined");
      expect(row.source.videoId).toBeTruthy();
      expect(row.hook).toBeTruthy();
      expect(row.structure.beats.length).toBeGreaterThan(0);
      expect(row.score).toBeGreaterThan(0);
    }
  });

  it("re-mining is idempotent per source video (refresh, not duplicate)", async () => {
    const d = db();
    await mineExemplars(d as never, PROJECT, { max: 3 });
    await mineExemplars(d as never, PROJECT, { max: 3 });
    const rows = d.tables.exemplars as { source: { videoId: string } }[];
    const ids = rows.map((r) => r.source.videoId);
    expect(new Set(ids).size).toBe(ids.length); // no dupes
    expect(rows.length).toBe(3);
  });

  it("getScriptExemplars returns the top-scored few, shaped for the prompt", async () => {
    const d = db();
    await mineExemplars(d as never, PROJECT, { max: 6 });
    const ex = await getScriptExemplars(d as never, "p1", 3);
    expect(ex).toHaveLength(3);
    for (const e of ex) {
      expect(e.title).toBeTruthy();
      expect(e.structureSummary).toBeTruthy();
      expect(["mined", "own"]).toContain(e.origin);
    }
    // A missing table degrades to [] rather than throwing.
    const empty = fakeDb({ projects: [] });
    expect(await getScriptExemplars(empty as never, "p1")).toEqual([]);
  });

  it("generateScript accepts exemplars (mock mode) and the prompt wires the block in", async () => {
    const draft = await generateScript({
      title: "T",
      topic: "t",
      niche: "n",
      audience: "a",
      angle: "x",
      tone: "calm",
      format: "long",
      targetLengthSec: 120,
      template: "",
      exemplars: [
        { title: "Winner", hook: "Nobody expected this.", structureSummary: "1. Hook → 2. Twist", notes: null, origin: "mined" },
      ],
    });
    expect(draft.beats.length).toBeGreaterThan(0);
    // Source pin: the exemplar block is concatenated into the live prompt.
    const src = readFileSync("src/lib/adapters/script.ts", "utf8");
    expect(src).toMatch(/PROVEN WINNERS in this niche/);
    expect(src).toMatch(/\$\{prompt\}\$\{hardRules\}\$\{lessons\}\$\{projectInstructions\}\$\{exemplarBlock\}/);
  });

  it("router + registry expose mining and performance to chat", async () => {
    const mine = routeHeuristic("study the winners in this niche", {
      videoId: "v1",
      projectId: "p1",
      status: "IDEA",
      atGate: false,
      mode: "idea",
    });
    expect(mine).toMatchObject({ kind: "action", action: "mine_exemplars" });
    const perf = routeHeuristic("how are my videos performing?", {
      videoId: "v1",
      projectId: "p1",
      status: "TRACKING",
      atGate: false,
      mode: "idea",
    });
    expect(perf).toMatchObject({ kind: "action", action: "get_performance" });
    expect(getWorkspaceAction("mine_exemplars")).toBeDefined();
    expect(getWorkspaceAction("get_performance")).toBeDefined();
    expect(getWorkspaceAction("mine_exemplars")!.costBearing).toBe(true);
    expect(getWorkspaceAction("get_performance")!.costBearing).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────── */
/* Step 4 — the outcome loop                                           */
/* ────────────────────────────────────────────────────────────────── */

function trackedSeed() {
  const videos = [1, 2, 3, 4].map((i) => ({
    id: `v${i}`,
    project_id: "p1",
    title: `Video ${i}`,
    status: "TRACKING",
    youtube_video_id: `yt${i}`,
  }));
  // Views 100/200/400/10000 → v4 is the runaway winner (median 200-400 band).
  const views = { v1: 100, v2: 200, v3: 400, v4: 10000 } as Record<string, number>;
  return {
    videos: videos as never[],
    analytics_snapshots: videos.map((v) => ({
      video_id: v.id,
      views: views[v.id],
      captured_at: "2026-07-20T00:00:00Z",
    })) as never[],
    qc_reviews: videos.map((v, i) => ({
      video_id: v.id,
      gate: "FINAL",
      score: 5 + i, // 5,6,7,8 — correlated with views
      created_at: "2026-07-10T00:00:00Z",
    })) as never[],
    scripts: videos.map((v) => ({
      video_id: v.id,
      version: 1,
      beats: [
        { idx: 0, text: `The hook that carried ${v.title} to the top of the niche.` },
        { idx: 1, text: "The middle beat." },
      ],
      runtime_sec: 60,
      metadata: {},
    })) as never[],
  };
}

describe("Step 4: outcome loop", () => {
  it("correlates FINAL QC with views and promotes own winners as exemplars", async () => {
    const d = db(trackedSeed());
    const summary = await runOutcomeLoop(d as never, "p1");
    expect(summary.tracked).toBe(4);
    // Scores rise with views in the seed → strongly positive correlation.
    expect(summary.qcViewsCorrelation).not.toBeNull();
    expect(summary.qcViewsCorrelation!).toBeGreaterThan(0.5);
    expect(summary.avgQcTopHalf!).toBeGreaterThan(summary.avgQcBottomHalf!);
    // v4 (10000 views ≥ 1.5×median) promoted with its real hook.
    expect(summary.promotedOwnWinners).toBeGreaterThanOrEqual(1);
    const own = (d.tables.exemplars as { origin: string; hook: string; score: number; notes: string }[]).filter(
      (e) => e.origin === "own",
    );
    expect(own.length).toBe(summary.promotedOwnWinners);
    expect(own[0].hook).toContain("hook that carried");
    expect(own[0].notes).toContain("own winner");
  });

  it("own winners outrank mined exemplars in retrieval (they lead the prompt)", async () => {
    const d = db(trackedSeed());
    await mineExemplars(d as never, PROJECT, { max: 3 });
    await runOutcomeLoop(d as never, "p1");
    const top = await getScriptExemplars(d as never, "p1", 3);
    expect(top[0].origin).toBe("own");
  });

  it("re-running the loop never duplicates promoted winners", async () => {
    const d = db(trackedSeed());
    await runOutcomeLoop(d as never, "p1");
    const after1 = (d.tables.exemplars as unknown[]).length;
    await runOutcomeLoop(d as never, "p1");
    expect((d.tables.exemplars as unknown[]).length).toBe(after1);
  });

  it("degrades gracefully with no tracked videos or missing analytics", async () => {
    const empty = db();
    const s1 = await runOutcomeLoop(empty as never, "p1");
    expect(s1).toMatchObject({ tracked: 0, qcViewsCorrelation: null, promotedOwnWinners: 0 });
    // Tracked but zero snapshots → no promotion, no crash.
    const noStats = db({ videos: trackedSeed().videos });
    const s2 = await runOutcomeLoop(noStats as never, "p1");
    expect(s2.tracked).toBe(4);
    expect(s2.promotedOwnWinners).toBe(0);
  });
});
