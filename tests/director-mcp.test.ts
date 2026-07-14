/**
 * Director Mode D6 — MCP mode isolation (spec §8, §10.2.5). Autonomous mutating
 * tools refuse on a director project; director_* tools refuse on an autonomous
 * project. Tool handlers are driven directly with a fake DB (the heavy engine
 * primitives are stubbed to spies).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb, type FakeDb } from "./helpers/fake-db";

const spies = vi.hoisted(() => ({ decide: [] as string[], directed: [] as string[] }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("handlers receive an explicit db in tests");
  },
}));
vi.mock("@/lib/pipeline/engine", () => ({
  decideGate: async (opts: { videoId: string; decision: string }) => {
    spies.decide.push(`${opts.videoId}:${opts.decision}`);
    return { ok: true };
  },
  runDirectedStage: async (videoId: string) => {
    spies.directed.push(videoId);
    return { ok: true };
  },
  runStageReview: async () => ({ ok: true, score: 6, verdict: "fail", degraded: false, costUsd: 0 }),
  regenerateScript: async () => ({ ok: true }),
  fullAutoGenerate: async () => ({ ok: true }),
  retryClips: async () => ({ ok: true }),
}));
vi.mock("@/lib/pipeline/intelligence", () => ({ runIntelligence: async () => ({ created: 0 }) }));
vi.mock("@/lib/adapters/youtube", () => ({ estimateRevenueUsd: () => 0 }));

import { TOOLS } from "@/lib/mcp/tools";

const tool = (name: string) => TOOLS.find((t) => t.name === name)!;

function seed(mode: "director" | "autonomous"): FakeDb {
  return fakeDb({
    projects: [{ id: "p1", name: "Ch", pipeline_mode: mode }],
    videos: [{ id: "v1", project_id: "p1", status: "SCRIPT_READY", title: "V" }],
    operator_decisions: [],
    approvals: [],
  });
}

beforeEach(() => {
  spies.decide = [];
  spies.directed = [];
});

describe("autonomous tools refuse on a director project", () => {
  it("approve_gate throws in Director Mode", async () => {
    const db = seed("director");
    await expect(tool("approve_gate").handler({ videoId: "v1" }, db as never)).rejects.toThrow(
      /Director Mode/i,
    );
    expect(spies.decide).toEqual([]);
  });

  it("approve_gate works on an autonomous project", async () => {
    const db = seed("autonomous");
    const r = (await tool("approve_gate").handler({ videoId: "v1" }, db as never)) as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(spies.decide).toEqual(["v1:approved"]);
  });

  it("full_auto_generate throws in Director Mode", async () => {
    const db = seed("director");
    await expect(tool("full_auto_generate").handler({ videoId: "v1" }, db as never)).rejects.toThrow(
      /Director Mode/i,
    );
  });
});

describe("director_* tools refuse on an autonomous project", () => {
  it("director_advance throws on an autonomous project", async () => {
    const db = seed("autonomous");
    await expect(tool("director_advance").handler({ videoId: "v1" }, db as never)).rejects.toThrow(
      /Director-Mode projects/i,
    );
    expect(spies.decide).toEqual([]);
  });

  it("director_advance advances one gate + logs a decision in Director Mode", async () => {
    const db = seed("director");
    const r = (await tool("director_advance").handler({ videoId: "v1" }, db as never)) as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(spies.decide).toEqual(["v1:approved"]);
    expect(db.inserts("operator_decisions")).toHaveLength(1);
    expect(db.inserts("operator_decisions")[0]).toMatchObject({ action: "advance", stage: "script" });
  });

  it("director_run_stage runs one directed stage + logs", async () => {
    const db = seed("director");
    // put the video at a working status so a stage body would run
    db.tables.videos[0].status = "SCRIPTING";
    const r = (await tool("director_run_stage").handler({ videoId: "v1" }, db as never)) as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(spies.directed).toEqual(["v1"]);
    expect(db.inserts("operator_decisions")[0]).toMatchObject({ action: "generate" });
  });
});
