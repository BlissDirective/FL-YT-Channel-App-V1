/**
 * Trust-the-chat status (ClickMax de-clutter): pipeline events post into the
 * workspace thread as agent messages instead of persistent banner chrome.
 * Runs the REAL engine on the fake query-builder and pins:
 *  - autopilot gate approvals narrate themselves ("approved automatically")
 *  - a holding gate (assist mode) posts "ready for your review"
 *  - a thrown stage posts the pause into the thread, not just paused_reason
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    throw new Error("test must pass an explicit db");
  },
}));
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import { runPipeline } from "@/lib/pipeline/engine";

const project = (autonomy: string, over: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Thread Ch",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  brand_kit: { thumbnailStyle: "bold" },
  voice_id: "mock-voice",
  autonomy: { IDEA: autonomy, SCRIPT: autonomy, ASSETS: autonomy, FINAL: autonomy },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
  ...over,
});

const video = (status: string) => ({
  id: "v1",
  project_id: "p1",
  title: "Thread status test",
  topic: "narrated pipeline",
  format: "long",
  kind: "long",
  status,
  target_length_sec: 120,
  total_cost_usd: 0,
  paused_reason: null,
  auto_finish: false,
  enable_highlights: false,
  highlight_count: 0,
});

function seeded(autonomy: string, status: string, projectOver: Record<string, unknown> = {}) {
  return fakeDb({
    videos: [video(status) as never],
    projects: [project(autonomy, projectOver) as never],
    approvals: [],
    scripts: [],
    assets: [],
    qc_reviews: [],
    clip_jobs: [],
    prompt_templates: [],
    app_settings: [],
    cost_ledger: [],
    workspace_messages: [],
    stage_artifacts: [],
    visual_refs: [],
    vo_cache: [],
  });
}

beforeEach(() => vi.clearAllMocks());

describe("trust-the-chat: pipeline events post to workspace_messages", () => {
  it("autopilot narrates each gate approval into the thread", async () => {
    const db = seeded("autopilot", "IDEA");
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    const notes = db.inserts("workspace_messages");
    expect(notes.length).toBeGreaterThanOrEqual(4); // IDEA/SCRIPT/ASSETS/FINAL
    for (const n of notes) {
      expect(n.role).toBe("agent");
      expect(n.project_id).toBe("p1");
      expect(n.video_id).toBe("v1");
    }
    const auto = notes.filter((n) => String(n.content).includes("approved automatically"));
    expect(auto.length).toBeGreaterThanOrEqual(4);
    expect((auto[0].intent as { event?: string })?.event).toBe("gate_auto_approved");
  });

  it("a holding gate (assist) posts 'ready for your review' with guidance", async () => {
    const db = seeded("assist", "IDEA");
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);
    // Held at the IDEA gate — status untouched, one hold note in the thread.
    expect(db.row("videos", "v1")!.status).toBe("IDEA");
    const notes = db.inserts("workspace_messages");
    expect(notes).toHaveLength(1);
    expect(String(notes[0].content)).toContain("ready for your review");
    expect(String(notes[0].content)).toContain("continue");
    expect((notes[0].intent as { event?: string })?.event).toBe("gate_hold");
  });

  it("a thrown stage posts the pause into the thread (not just paused_reason)", async () => {
    // A null brand_kit makes the asset stage throw (the exact failure mode
    // found in Phase 0 debugging) — a realistic stage crash.
    const db = seeded("autopilot", "GENERATING_ASSETS", { brand_kit: null });
    db.tables.scripts.push({
      video_id: "v1",
      version: 1,
      body: "b",
      beats: [{ idx: 0, text: "Beat", visualPrompt: "vp", shotType: "broll" }],
      runtime_sec: 60,
      metadata: {},
    } as never);
    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(false);
    expect(db.row("videos", "v1")!.paused_reason).toBeTruthy();
    const paused = db
      .inserts("workspace_messages")
      .filter((n) => (n.intent as { event?: string })?.event === "stage_paused");
    expect(paused).toHaveLength(1);
    expect(String(paused[0].content)).toContain("I hit a problem");
    expect(String(paused[0].content)).toContain("generating assets paused");
  });
});
