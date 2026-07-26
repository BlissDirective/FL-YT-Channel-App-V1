/**
 * Song generation for children's channels: lyric writing (kid-safe rules),
 * the provider registry (MiniMax default / Lyria / ElevenLabs — Suno
 * deliberately absent), the engine flow that turns a song into a laid-out
 * video, and the catalog/registry/router surface. Runs the REAL modules in
 * mock mode against the fake query-builder.
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
  getSignedMediaUrl: async (p: string) => (p.startsWith("mock:") ? null : `https://signed/${p}`),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    if (!currentDb) throw new Error("no db seeded");
    return currentDb;
  },
}));
vi.mock("@/lib/pipeline/playbook", () => ({
  playbookForStage: async () => [],
  reflectScriptLessons: async () => {},
}));

import {
  DEFAULT_SONG_MODEL_ID,
  SONG_MODELS,
  estimateSongCost,
  generateSong,
  getSongModel,
  writeSongLyrics,
} from "@/lib/adapters/songs";
import { generateSongForVideo } from "@/lib/pipeline/engine";
import { estimateCost, modelCatalog } from "@/lib/models/catalog";
import { getWorkspaceAction } from "@/lib/workspace/registry";
import { routeHeuristic } from "@/lib/workspace/router";

let currentDb: unknown = null;

const PROJECT = {
  id: "p1",
  name: "Kids Ch",
  niche: "children's songs",
  audience: "toddlers",
  angle: "sing-along",
  tone: "warm",
  status: "active",
  brand_kit: { thumbnailStyle: "bright cartoon" },
  voice_id: "mock-voice",
  instructions: "Soft pastel animation, gentle ukulele.",
  autonomy: { IDEA: "assist", SCRIPT: "assist", ASSETS: "assist", FINAL: "assist" },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
};

function seeded(videoOver: Record<string, unknown> = {}) {
  const db = fakeDb({
    projects: [PROJECT as never],
    videos: [
      {
        id: "v1",
        project_id: "p1",
        title: "Untitled",
        topic: "counting to five",
        status: "IDEA_APPROVED",
        target_length_sec: 120,
        total_cost_usd: 0,
        paused_reason: null,
        ...videoOver,
      } as never,
    ],
    scripts: [],
    assets: [],
    asset_versions: [],
    cost_ledger: [],
    workspace_messages: [],
    app_settings: [],
  });
  currentDb = db;
  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentDb = null;
  delete process.env.FAL_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
});

describe("song provider registry", () => {
  it("registers MiniMax (default), Lyria, and ElevenLabs — and NOT Suno", () => {
    const ids = SONG_MODELS.map((m) => m.id);
    expect(ids).toEqual(["minimax-music-v2", "lyria-3-pro", "elevenlabs-song"]);
    expect(DEFAULT_SONG_MODEL_ID).toBe("minimax-music-v2");
    expect(ids.join(" ")).not.toMatch(/suno/i);
    // Every model must be able to sing supplied lyrics — that's the point.
    for (const m of SONG_MODELS) expect(m.supportsLyrics).toBe(true);
    // Exactly one advertises timed lyrics (the sing-along caption pick).
    expect(SONG_MODELS.filter((m) => m.timedLyrics).map((m) => m.id)).toEqual(["lyria-3-pro"]);
  });

  it("documents WHY Suno is excluded (no official API) so the decision survives", () => {
    const src = readFileSync("src/lib/adapters/songs.ts", "utf8");
    expect(src).toMatch(/SUNO IS DELIBERATELY NOT INTEGRATED/);
    // Phrase may wrap across comment lines — match with flexible whitespace.
    expect(src.replace(/\s*\n\s*\*\s*/g, " ")).toMatch(/no official public API/i);
  });

  it("prices per-song (fal) and per-minute (ElevenLabs) correctly", () => {
    expect(estimateSongCost(getSongModel("minimax-music-v2")!, 120)).toBeCloseTo(0.035, 3);
    // Flat per song — length doesn't change it.
    expect(estimateSongCost(getSongModel("minimax-music-v2")!, 30)).toBeCloseTo(0.035, 3);
    // Per-minute model scales with length.
    expect(estimateSongCost(getSongModel("elevenlabs-song")!, 120)).toBeCloseTo(0.6, 2);
    expect(estimateSongCost(getSongModel("elevenlabs-song")!, 60)).toBeCloseTo(0.3, 2);
    // Catalog agrees with the adapter.
    expect(estimateCost({ action: "song", modelId: "lyria-3-pro" })).toBe(
      estimateSongCost(getSongModel("lyria-3-pro")!, 120),
    );
  });

  it("degrades to mock with no provider keys", async () => {
    const out = await generateSong({
      model: getSongModel("minimax-music-v2")!,
      style: "gentle ukulele",
      lyrics: "la la la",
    });
    expect(out).toMatchObject({ provider: "mock", costUsd: 0 });
  });
});

describe("kid-safe lyric writing", () => {
  it("mock lyrics are structured, repetitive, and scene-matched", async () => {
    const l = await writeSongLyrics({ topic: "counting to five" });
    expect(l.provider).toBe("mock");
    expect(l.title).toContain("counting to five");
    // A repeating chorus is the core children's-song mechanic.
    expect(l.lyrics.match(/\[Chorus\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(l.style).toMatch(/bpm/);
    expect(l.scenes.length).toBeGreaterThanOrEqual(3);
    expect(l.costUsd).toBe(0);
  });

  it("the system prompt encodes the child-safety constraints", () => {
    const src = readFileSync("src/lib/adapters/songs.ts", "utf8");
    for (const rule of [
      "Nothing frightening",
      "No romance",
      "no trademarked characters",
      "unsafely imitate",
      "repeating chorus",
    ]) {
      expect(src).toContain(rule);
    }
  });
});

describe("generateSongForVideo (engine, mock mode)", () => {
  it("stores the song, lays the video out as its scenes, and skips VO", async () => {
    const db = seeded();
    const r = await generateSongForVideo({ videoId: "v1", topic: "counting to five" });
    expect(r.ok).toBe(true);

    // 1. The song landed as the video's single music asset.
    const music = (db.tables.assets as { kind: string; meta: Record<string, unknown> }[]).filter(
      (a) => a.kind === "music",
    );
    expect(music).toHaveLength(1);
    expect(music[0].meta.song).toBe(true);
    expect(String(music[0].meta.lyrics)).toContain("[Chorus]");

    // 2. A script whose beats are the song's scenes — with EMPTY text so the
    //    asset stage generates no narration over the song.
    const scripts = db.inserts("scripts");
    expect(scripts).toHaveLength(1);
    const beats = scripts[0].beats as { idx: number; text: string; visualPrompt: string }[];
    expect(beats.length).toBeGreaterThanOrEqual(3);
    for (const b of beats) {
      expect(b.text).toBe("");
      expect(b.visualPrompt.length).toBeGreaterThan(10);
    }
    expect(beats[0].idx).toBe(0);

    // 3. Video renamed to the song and moved to SCRIPT_READY.
    const v = db.row("videos", "v1")!;
    expect(String(v.title)).toContain("counting to five");
    expect(v.status).toBe("SCRIPT_READY");

    // 4. The thread narrates it.
    expect(db.inserts("workspace_messages").some((n) => String(n.content).includes("scenes laid out"))).toBe(true);
  });

  it("falls back to the video's own topic when none is given", async () => {
    const db = seeded();
    const r = await generateSongForVideo({ videoId: "v1" });
    expect(r.ok).toBe(true);
    expect(String(db.row("videos", "v1")!.title)).toContain("counting to five");
  });

  it("asks for a topic when the video has none", async () => {
    seeded({ topic: null, title: "" });
    const r = await generateSongForVideo({ videoId: "v1" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("song topic");
  });

  it("rejects an unknown song model", async () => {
    seeded();
    const r = await generateSongForVideo({ videoId: "v1", modelId: "suno-v5" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Unknown song model");
  });

  it("re-running replaces the song rather than stacking duplicates", async () => {
    const db = seeded();
    await generateSongForVideo({ videoId: "v1" });
    await generateSongForVideo({ videoId: "v1" });
    const music = (db.tables.assets as { kind: string }[]).filter((a) => a.kind === "music");
    expect(music).toHaveLength(1);
    // The superseded song is preserved in take history.
    expect((db.tables.asset_versions as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});

describe("render + surface wiring", () => {
  it("the renderer plays a song across the whole video and treats it as audio-ready", () => {
    const types = readFileSync("packages/render/src/types.ts", "utf8");
    expect(types).toMatch(/songUrl\?: string/);
    const comp = readFileSync("packages/render/src/VideoComp.tsx", "utf8");
    // Root-level (non-Sequence) audio in both compositions.
    expect(comp.match(/props\.songUrl && <Audio src=\{props\.songUrl\} \/>/g)?.length).toBe(2);
    const queue = readFileSync("packages/render/src/render-queue.ts", "utf8");
    // A song satisfies the "not silent" readiness check.
    expect(queue).toMatch(/if \(!songUrl && !beats\.some\(\(b\) => b\.voUrl\)\) return null;/);
  });

  it("catalog exposes song models with plain-language pros and correct units", () => {
    const songs = modelCatalog("song");
    expect(songs).toHaveLength(SONG_MODELS.length);
    expect(songs.find((s) => s.id === "minimax-music-v2")!.unit).toBe("song");
    expect(songs.find((s) => s.id === "elevenlabs-song")!.unit).toBe("min");
    for (const s of songs) expect(s.pros.length).toBeGreaterThan(0);
  });

  it("registry + chat expose song writing with model selection", () => {
    const action = getWorkspaceAction("write_song")!;
    expect(action.costBearing).toBe(true);
    expect(action.estimate({ modelId: "minimax-music-v2" })).toBeCloseTo(0.035, 3);

    const ctx = { videoId: "v1", projectId: "p1", status: "IDEA", atGate: false, mode: "idea" as const };
    const basic = routeHeuristic("write a song about sharing toys", ctx);
    expect(basic).toMatchObject({ kind: "action", action: "write_song" });
    expect((basic as { params: { topic?: string } }).params.topic).toBe("sharing toys");

    const lyria = routeHeuristic("make a song about the rainbow with lyria", ctx);
    expect((lyria as { params: { modelId?: string } }).params.modelId).toBe("lyria-3-pro");
  });
});
