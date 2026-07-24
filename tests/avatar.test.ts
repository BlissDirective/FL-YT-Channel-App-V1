/**
 * AI Avatar build (phase A: Kling v2 default via fal; phase B: sync.so
 * re-sync; optional VEED Fabric / OmniHuman / InfiniTalk). Drives the REAL
 * engine + adapters in mock mode against the fake query-builder, and pins
 * the catalog/registry/router surface so chat coverage is structural.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/push", () => ({
  isPushConfigured: () => false,
  sendPushToAll: async () => {},
}));
const uploads: { path: string }[] = [];
vi.mock("@/lib/storage", () => ({
  uploadMedia: async (path: string) => {
    uploads.push({ path });
  },
  getSignedMediaUrl: async (p: string) => (p.startsWith("mock:") ? null : `https://signed.example/${p}`),
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
  AVATAR_MODELS,
  DEFAULT_AVATAR_MODEL_ID,
  estimateAvatarCost,
  generateAvatarVideo,
  getAvatarModel,
  isSyncLive,
  resyncLipsync,
} from "@/lib/adapters/avatar";
import { generateBeatAvatar, resyncBeatAvatar } from "@/lib/pipeline/engine";
import { estimateCost, modelCatalog } from "@/lib/models/catalog";
import { getWorkspaceAction } from "@/lib/workspace/registry";
import { routeHeuristic } from "@/lib/workspace/router";

let currentDb: unknown = null;

const PROJECT = {
  id: "p1",
  name: "Avatar Ch",
  niche: "testing",
  audience: "devs",
  angle: "qa",
  tone: "calm",
  status: "active",
  brand_kit: { thumbnailStyle: "bold" },
  voice_id: "mock-voice",
  presenter_image_path: "presenters/p1/presenter-abc.png",
  autonomy: { IDEA: "assist", SCRIPT: "assist", ASSETS: "assist", FINAL: "assist" },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
};

function seeded(projectOver: Record<string, unknown> = {}, assets: Record<string, unknown>[] = []) {
  const db = fakeDb({
    projects: [{ ...PROJECT, ...projectOver } as never],
    videos: [
      {
        id: "v1",
        project_id: "p1",
        title: "Avatar test",
        status: "ASSETS_READY",
        target_length_sec: 120,
        total_cost_usd: 0,
        paused_reason: null,
      } as never,
    ],
    scripts: [
      {
        video_id: "v1",
        version: 1,
        beats: [
          { idx: 0, text: "Hook beat.", visualPrompt: "vp0", shotType: "hero" },
          { idx: 1, text: "Middle beat.", visualPrompt: "vp1", shotType: "broll" },
        ],
        runtime_sec: 60,
        metadata: {},
      } as never,
    ],
    assets: assets as never[],
    asset_versions: [],
    cost_ledger: [],
    workspace_messages: [],
    app_settings: [],
  });
  currentDb = db;
  return db;
}

const VO_ASSET = {
  id: "a-vo-0",
  video_id: "v1",
  kind: "vo",
  provider: "mock:elevenlabs",
  storage_path: "vo-cache/p1/hash0.mp3",
  beat_index: 0,
  meta: { durationSec: 12 },
  cost_usd: 0,
  created_at: "2026-07-20T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  uploads.length = 0;
  currentDb = null;
  delete process.env.FAL_KEY;
  delete process.env.SYNC_SO_API_KEY;
});

describe("avatar adapter", () => {
  it("registers all five models with Kling v2 as the default", () => {
    const ids = AVATAR_MODELS.map((m) => m.id);
    expect(ids).toEqual([
      "kling-avatar-v2",
      "veed-fabric-480",
      "veed-fabric-720",
      "omnihuman-1-5",
      "infinitalk",
    ]);
    expect(DEFAULT_AVATAR_MODEL_ID).toBe("kling-avatar-v2");
    for (const m of AVATAR_MODELS) {
      expect(m.usdPerSec).toBeGreaterThan(0);
      expect(m.maxClipSec).toBeGreaterThan(0);
      expect(m.endpoint).toMatch(/\//);
    }
  });

  it("estimates cost from VO duration, clamped to the model's clip cap", () => {
    const kling = getAvatarModel("kling-avatar-v2")!;
    expect(estimateAvatarCost(kling, 10)).toBeCloseTo(0.56, 2);
    // Clamped at the cap rather than billing an impossible clip.
    expect(estimateAvatarCost(kling, 500)).toBeCloseTo(kling.usdPerSec * kling.maxClipSec, 2);
    // Catalog estimator agrees with the adapter.
    expect(estimateCost({ action: "avatar", modelId: "kling-avatar-v2", durationSec: 10 })).toBe(
      estimateAvatarCost(kling, 10),
    );
  });

  it("degrades to mock without FAL_KEY (no credentials → no network, no cost)", async () => {
    const out = await generateAvatarVideo({
      model: getAvatarModel("kling-avatar-v2")!,
      imageUrl: "https://x/img.png",
      audioUrl: "https://x/vo.mp3",
      durationSec: 8,
    });
    expect(out).toMatchObject({ provider: "mock", costUsd: 0 });
  });

  it("sync.so degrades to mock without SYNC_SO_API_KEY", async () => {
    expect(isSyncLive()).toBe(false);
    const out = await resyncLipsync({ videoUrl: "https://x/v.mp4", audioUrl: "https://x/a.mp3", durationSec: 8 });
    expect(out).toMatchObject({ provider: "mock", costUsd: 0 });
  });
});

describe("generateBeatAvatar (engine, mock mode)", () => {
  it("replaces the beat's clip with an avatar shot synced to its VO, archiving the old take", async () => {
    const db = seeded({}, [
      VO_ASSET,
      {
        id: "a-clip-0",
        video_id: "v1",
        kind: "clip",
        provider: "mock:fal.ai",
        storage_path: "mock:still-0",
        beat_index: 0,
        meta: { isVideo: false },
        cost_usd: 0,
        created_at: "2026-07-20T00:00:00Z",
      },
    ]);
    const r = await generateBeatAvatar({ videoId: "v1", beatIdx: 0 });
    expect(r.ok).toBe(true);
    const clips = (db.tables.assets as { kind: string; beat_index: number | null; meta: { avatar?: boolean }; provider: string }[]).filter(
      (a) => a.kind === "clip" && a.beat_index === 0,
    );
    expect(clips).toHaveLength(1);
    expect(clips[0].meta.avatar).toBe(true);
    expect(clips[0].provider).toBe("mock:fal-avatar");
    // Old clip archived to version history before replacement.
    expect((db.tables.asset_versions as unknown[]).length).toBeGreaterThanOrEqual(1);
    // The thread narrates the change.
    const notes = db.inserts("workspace_messages");
    expect(notes.some((n) => String(n.content).includes("avatar shot"))).toBe(true);
  });

  it("requires a presenter image with a settings-pointing message", async () => {
    seeded({ presenter_image_path: null }, [VO_ASSET]);
    const r = await generateBeatAvatar({ videoId: "v1", beatIdx: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("presenter image");
    expect(r.error).toContain("Project Settings");
  });

  it("requires the beat's VO (the avatar lip-syncs to it by definition)", async () => {
    seeded({}, []);
    const r = await generateBeatAvatar({ videoId: "v1", beatIdx: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("VO");
  });

  it("rejects a VO longer than the model's clip cap with actionable guidance", async () => {
    seeded({}, [{ ...VO_ASSET, meta: { durationSec: 90 } }]);
    const r = await generateBeatAvatar({ videoId: "v1", beatIdx: 0, modelId: "veed-fabric-480" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("caps at 30s");
  });

  it("rejects an unknown model id", async () => {
    seeded({}, [VO_ASSET]);
    const r = await generateBeatAvatar({ videoId: "v1", beatIdx: 0, modelId: "not-a-model" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Unknown avatar model");
  });
});

describe("resyncBeatAvatar (engine)", () => {
  const AVATAR_CLIP = {
    id: "a-clip-av",
    video_id: "v1",
    kind: "clip",
    provider: "fal-avatar",
    storage_path: "avatars/v1/beat-0-x.mp4",
    beat_index: 0,
    meta: { isVideo: true, avatar: true, model: "kling-avatar-v2", durationSec: 12 },
    cost_usd: 0.67,
    created_at: "2026-07-20T00:00:00Z",
  };

  it("refuses when the beat has no avatar clip", async () => {
    seeded({}, [VO_ASSET]);
    const r = await resyncBeatAvatar({ videoId: "v1", beatIdx: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("no avatar clip");
  });

  it("without SYNC_SO_API_KEY it explains the key and the fallback", async () => {
    seeded({}, [VO_ASSET, AVATAR_CLIP]);
    const r = await resyncBeatAvatar({ videoId: "v1", beatIdx: 0 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("SYNC_SO_API_KEY");
  });
});

describe("catalog / registry / router surface", () => {
  it("the catalog lists avatar models with plain-language pros", () => {
    const avatars = modelCatalog("avatar");
    expect(avatars.map((a) => a.id)).toContain("kling-avatar-v2");
    expect(avatars).toHaveLength(AVATAR_MODELS.length);
    for (const a of avatars) {
      expect(a.pros.length).toBeGreaterThan(0);
      expect(a.unitUsd).toBeGreaterThan(0);
    }
  });

  it("registry exposes generate + resync as cost-bearing actions with estimates", () => {
    const gen = getWorkspaceAction("generate_beat_avatar")!;
    expect(gen.costBearing).toBe(true);
    expect(gen.estimate({ modelId: "kling-avatar-v2", durationSec: 10 })).toBeCloseTo(0.56, 2);
    const resync = getWorkspaceAction("resync_beat_avatar")!;
    expect(resync.costBearing).toBe(true);
    expect(resync.estimate({})).toBeGreaterThan(0);
  });

  it("chat routes avatar requests, model choices, and re-syncs", () => {
    const ctx = { videoId: "v1", projectId: "p1", status: "ASSETS_READY", atGate: false, mode: "video" as const };
    expect(routeHeuristic("make beat 2 an avatar shot", ctx)).toMatchObject({
      kind: "action",
      action: "generate_beat_avatar",
      params: { beatIdx: 1 },
    });
    const omni = routeHeuristic("render beat 1 as an avatar with omnihuman", ctx);
    expect(omni).toMatchObject({ kind: "action", action: "generate_beat_avatar" });
    expect((omni as { params: { modelId?: string } }).params.modelId).toBe("omnihuman-1-5");
    expect(routeHeuristic("resync beat 3's avatar", ctx)).toMatchObject({
      kind: "action",
      action: "resync_beat_avatar",
      params: { beatIdx: 2 },
    });
  });
});
