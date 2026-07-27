/**
 * Character Studio Phase 3 — auto-injection (docs/Character-Studio-Build-Plan.md §7).
 *
 * Phase 1 could compose the prompt, Phase 2 could make a character. Phase 3 is
 * the part that actually matters: a locked character reaching a rendered frame.
 * What this pins, in the order it would hurt if it broke:
 *
 *  1. THE ACCEPTANCE CRITERION SURVIVES. A project with no cast renders the
 *     byte-identical FLUX prompt, on the byte-identical cache key, at the same
 *     price. Three phases in, this is still the thing most worth guarding.
 *  2. A beat with a locked character renders on the reference model, with the
 *     reference image actually attached to the call.
 *  3. Every degradation falls back to FLUX rather than failing the beat.
 *  4. The cache can't serve a reference render to a different reference set.
 *  5. The matcher's decisions are narrated and its corrections are honoured.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { fakeDb } from "./helpers/fake-db";

vi.mock("@/lib/push", () => ({
  isPushConfigured: () => false,
  sendPushToAll: async () => {},
}));
const uploads: string[] = [];
vi.mock("@/lib/storage", () => ({
  uploadMedia: async (path: string) => {
    uploads.push(path);
  },
  // Mock-mode looks (mock/…) have no signable URL — that is the degradation
  // path the tests below exercise.
  getSignedMediaUrl: async (p: string) => (p.startsWith("mock/") ? null : `https://signed.example/${p}`),
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
// Free stock search would rescue a failed FLUX render and mask the fallback.
vi.mock("@/lib/adapters/stock", () => ({
  searchStockClip: async () => null,
  searchStockPhotos: async () => [],
}));

import { buildVisualPrompt } from "@studio/core";
import { castNarration, makeBeatClip, runPipeline, setBeatCast } from "@/lib/pipeline/engine";
import { getWorkspaceAction } from "@/lib/workspace/registry";
import { routeHeuristic } from "@/lib/workspace/router";
import type { Project, ScriptBeat, Video } from "@/lib/db/types";

let currentDb: unknown = null;

const STYLE_STRING = "Soft pastel flat-vector picture-book illustration.";

const PROJECT = {
  id: "p1",
  name: "Mindful Minis",
  niche: "kids",
  audience: "preschool",
  angle: "calm",
  tone: "calm",
  status: "active",
  brand_kit: { thumbnailStyle: "bold, high-contrast" },
  voice_id: "mock-voice",
  instructions: null,
  presenter_image_path: null,
  character_image_model: null,
  autonomy: { IDEA: "autopilot", SCRIPT: "autopilot", ASSETS: "autopilot", FINAL: "autopilot" },
  budget: { perVideoUsd: 50, monthlyUsd: 500 },
  visual_bible: null,
};

const VIDEO = {
  id: "v1",
  project_id: "p1",
  title: "Breathing with Bo",
  topic: "calm breathing",
  format: "long",
  kind: "long",
  status: "SCRIPT_READY",
  target_length_sec: 120,
  total_cost_usd: 0,
  paused_reason: null,
  auto_finish: false,
  enable_highlights: false,
  highlight_count: 0,
  style_id: null,
  visual_bible: null,
};

const BEAT: ScriptBeat = {
  idx: 0,
  text: "Bo takes a slow breath in the meadow.",
  visualPrompt: "A sunny meadow at child eye level",
  shotType: "hero",
};

/** A project that has opted into the Character Studio: one style, one locked
    character with a real (signable) canonical image. */
function seededWithCast(over: {
  projectOver?: Record<string, unknown>;
  lookPath?: string | null;
  characterStatus?: "draft" | "locked";
  extraCharacters?: Record<string, unknown>[];
} = {}) {
  const db = fakeDb({
    projects: [{ ...PROJECT, ...(over.projectOver ?? {}) } as never],
    videos: [{ ...VIDEO } as never],
    scripts: [],
    assets: [],
    approvals: [],
    qc_reviews: [],
    clip_jobs: [],
    prompt_templates: [],
    app_settings: [],
    cost_ledger: [],
    stage_artifacts: [],
    visual_refs: [],
    vo_cache: [],
    flux_cache: [],
    workspace_messages: [],
    styles: [
      {
        id: "s1",
        project_id: "p1",
        name: "Style A",
        style_string: STYLE_STRING,
        palette: {},
        composition_rules: null,
        exclusions: "No text, no logos.",
        is_default: true,
      } as never,
    ],
    characters: [
      {
        id: "c-bo",
        name: "Bo",
        aliases: [],
        role: "cast",
        description: "Bo, a cheerful 4-year-old boy with warm brown skin.",
        identity_anchor: "mustard-yellow tee with a white star",
        status: over.characterStatus ?? "locked",
        version: 3,
      } as never,
      ...((over.extraCharacters ?? []) as never[]),
    ],
    project_characters: [
      { project_id: "p1", character_id: "c-bo", sort_order: 0 } as never,
      ...((over.extraCharacters ?? []).map(
        (c) => ({ project_id: "p1", character_id: (c as { id: string }).id, sort_order: 1 }) as never,
      )),
    ],
    character_looks:
      over.lookPath === null
        ? []
        : [
            {
              id: "l1",
              character_id: "c-bo",
              style_id: "s1",
              look_type: "illustration",
              canonical_image_path: over.lookPath ?? "characters/c-bo/s1/illustration-1.png",
              sheet_image_path: null,
              extra_ref_paths: [],
              stale: false,
              status: "locked",
              version: 1,
            } as never,
          ],
  });
  currentDb = db;
  return db;
}

/** A project that never opted in — the acceptance-criterion baseline. */
function seededPlain() {
  const db = fakeDb({
    projects: [{ ...PROJECT } as never],
    videos: [{ ...VIDEO } as never],
    assets: [],
    flux_cache: [],
    cost_ledger: [],
    workspace_messages: [],
    styles: [],
    characters: [],
    project_characters: [],
    character_looks: [],
  });
  currentDb = db;
  return db;
}

let falCalls: { url: string; body: Record<string, unknown> }[] = [];

/** Serves both fal endpoints (FLUX and the reference model) plus downloads. */
function stubFal(opts: { failRefModel?: boolean; failFlux?: boolean } = {}) {
  falCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: string }) => {
      const u = String(url);
      if (u.startsWith("https://fal.run/")) {
        falCalls.push({ url: u, body: JSON.parse(init?.body ?? "{}") });
        const isFlux = u.includes("fal-ai/flux/");
        if ((isFlux && opts.failFlux) || (!isFlux && opts.failRefModel)) {
          return { ok: false, status: 500, text: async () => "boom" } as never;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ images: [{ url: "https://fal.example/out.png" }] }),
          text: async () => "",
        } as never;
      }
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(32) } as never;
    }),
  );
}

const refCalls = () => falCalls.filter((c) => !c.url.includes("fal-ai/flux/"));
const fluxCalls = () => falCalls.filter((c) => c.url.includes("fal-ai/flux/"));

beforeEach(() => {
  vi.clearAllMocks();
  uploads.length = 0;
  currentDb = null;
  delete process.env.FAL_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ────────────────────────────────────────────────────────────── */
/* 1. The acceptance criterion, three phases in                    */
/* ────────────────────────────────────────────────────────────── */

describe("a project with no cast is untouched by all of Phase 1–3", () => {
  it("renders the byte-identical FLUX prompt on the byte-identical cache key", async () => {
    process.env.FAL_KEY = "k";
    const db = seededPlain();
    stubFal();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });

    const expected = buildVisualPrompt(BEAT.visualPrompt, PROJECT.brand_kit.thumbnailStyle, null);
    const request = (draft.row.meta as { request: { prompt: string } }).request;
    expect(request.prompt).toBe(expected);
    expect(draft.row.meta).toMatchObject({ model: "flux/dev" });
    expect(draft.row.meta).not.toHaveProperty("cast");
    expect(draft.cast).toBeUndefined();

    // The cache key is still sha256("<prompt>|dev") — every entry written
    // before the Character Studio existed still hits.
    const cached = db.inserts("flux_cache")[0] ?? (db.tables.flux_cache ?? [])[0];
    expect(cached?.cache_key).toBe(
      createHash("sha256").update(`${expected}|dev`).digest("hex"),
    );
    // FLUX only — the premium model was never called.
    expect(refCalls()).toHaveLength(0);
    expect(fluxCalls()).toHaveLength(1);
  });

  it("charges the FLUX price, not the premium one", async () => {
    process.env.FAL_KEY = "k";
    const db = seededPlain();
    stubFal();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });
    expect(draft.cost.usd).toBeLessThan(0.05);
    expect(draft.cost.description).toMatch(/FLUX/);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 2. Injection: a locked character reaches the frame              */
/* ────────────────────────────────────────────────────────────── */

describe("a beat with a locked character", () => {
  it("renders on the reference model with the locked image attached", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast();
    stubFal();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });

    const call = refCalls()[0];
    expect(call.url).toBe("https://fal.run/fal-ai/nano-banana-pro/edit");
    expect(call.body.image_urls).toEqual([
      "https://signed.example/characters/c-bo/s1/illustration-1.png",
    ]);
    // The prompt is STYLE + CHARACTER + ANCHOR + SCENE + EXCLUSIONS.
    const prompt = String(call.body.prompt);
    expect(prompt).toContain(STYLE_STRING);
    expect(prompt).toContain("cheerful 4-year-old boy");
    expect(prompt).toContain("Always keep: mustard-yellow tee with a white star.");
    expect(prompt).toContain("A sunny meadow at child eye level");
    expect(prompt).toContain("No text, no logos.");
    // FLUX was never asked.
    expect(fluxCalls()).toHaveLength(0);

    expect(draft.row.meta).toMatchObject({ model: "nano-banana-pro" });
    expect((draft.row.meta as { cast: { characterIds: string[]; versions: Record<string, number> } }).cast)
      .toMatchObject({ characterIds: ["c-bo"], versions: { "c-bo": 3 } });
    expect(draft.cost.description).toMatch(/Cast shot \(nano-banana-pro, 1 ref\)/);
    expect(draft.cost.usd).toBeCloseTo(0.15, 3);
  });

  it("honours the project's cheaper model choice", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast({ projectOver: { character_image_model: "flux-2-pro" } });
    stubFal();
    const draft = await makeBeatClip(
      VIDEO as unknown as Video,
      { ...PROJECT, character_image_model: "flux-2-pro" } as unknown as Project,
      BEAT,
      { db: db as never },
    );
    expect(refCalls()[0].url).toBe("https://fal.run/fal-ai/flux-2-pro/edit");
    expect(draft.cost.usd).toBeCloseTo(0.03, 3);
  });

  it("records the reference paths so the render can be reproduced", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast();
    stubFal();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });
    const request = (draft.row.meta as { request: { referencePaths?: string[] } }).request;
    expect(request.referencePaths).toEqual(["characters/c-bo/s1/illustration-1.png"]);
  });

  it("keys the cache on the reference set, so a different cast can't be served a cached frame", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast();
    stubFal();
    await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, { db: db as never });
    const firstKey = (db.tables.flux_cache ?? [])[0]?.cache_key as string;

    // Same prompt, different locked image → a different key.
    (db.tables.character_looks ?? [])[0].canonical_image_path = "characters/c-bo/s1/illustration-2.png";
    (db.tables.flux_cache ?? []).length = 0;
    stubFal();
    await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, { db: db as never });
    const secondKey = (db.tables.flux_cache ?? [])[0]?.cache_key as string;

    expect(firstKey).toBeTruthy();
    expect(secondKey).toBeTruthy();
    expect(secondKey).not.toBe(firstKey);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 3. Every degradation ends in a rendered beat                    */
/* ────────────────────────────────────────────────────────────── */

describe("degradations never cost the beat its visual", () => {
  it("a character with no locked look is described in the prompt but rendered on FLUX", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast({ lookPath: null });
    stubFal();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });
    expect(refCalls()).toHaveLength(0);
    expect(fluxCalls()).toHaveLength(1);
    // The description still went in — identity via text is better than nothing.
    expect(String(fluxCalls()[0].body.prompt)).toContain("cheerful 4-year-old boy");
    expect(draft.cast?.textOnlyNames).toEqual(["Bo"]);
  });

  it("a mock-mode look (no signable URL) falls back rather than paying premium for nothing", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast({ lookPath: "mock/characters/c-bo/illustration-1.png" });
    stubFal();
    await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, { db: db as never });
    expect(refCalls()).toHaveLength(0);
    expect(fluxCalls()).toHaveLength(1);
  });

  it("a reference-model outage falls back to FLUX with the same prompt", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast();
    stubFal({ failRefModel: true });
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });
    expect(refCalls().length).toBeGreaterThan(0);
    expect(fluxCalls()).toHaveLength(1);
    expect(String(fluxCalls()[0].body.prompt)).toContain(STYLE_STRING);
    expect(draft.row.meta).toMatchObject({ model: "flux/dev" });
    // Still tagged with who was in it, so the narration and the card agree.
    expect((draft.row.meta as { cast?: unknown }).cast).toBeTruthy();
  });

  it("a missing character_looks table degrades to no-cast instead of throwing", async () => {
    process.env.FAL_KEY = "k";
    const db = seededWithCast();
    delete (db.tables as Record<string, unknown>).character_looks;
    stubFal();
    await expect(
      makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, { db: db as never }),
    ).resolves.toBeTruthy();
  });

  it("with no FAL_KEY at all the beat still produces a mock tile, cast attached", async () => {
    const db = seededWithCast();
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, BEAT, {
      db: db as never,
    });
    expect(draft.row.provider).toMatch(/^mock:/);
    expect(draft.cast?.names).toEqual(["Bo"]);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 4. Narration — the matcher is never silent                      */
/* ────────────────────────────────────────────────────────────── */

describe("cast narration", () => {
  const base = {
    prompt: "",
    referencePaths: [] as string[],
    characterIds: [] as string[],
    names: [] as string[],
    versions: {},
    droppedNames: [] as string[],
    staleNames: [] as string[],
    textOnlyNames: [] as string[],
    draftNames: [] as string[],
  };

  it("is null when nobody was injected — no noise on faceless channels", () => {
    expect(castNarration([{ ...base }])).toBeNull();
    expect(castNarration([])).toBeNull();
  });

  it("counts beats per character and reports how many used real references", () => {
    const note = castNarration([
      { ...base, names: ["Bo"], characterIds: ["c-bo"], referencePaths: ["p1"] },
      { ...base, names: ["Bo", "Breeze"], characterIds: ["c-bo", "c-br"], referencePaths: ["p1", "p2"] },
    ])!;
    expect(note).toContain("Bo (2 beats)");
    expect(note).toContain("Breeze (1 beat)");
    expect(note).toContain("2 beats were rendered against locked reference images");
  });

  it("surfaces every degradation by name, and how to override a drop", () => {
    const note = castNarration([
      {
        ...base,
        names: ["Bo"],
        characterIds: ["c-bo"],
        textOnlyNames: ["Poppy"],
        draftNames: ["Wobble"],
        staleNames: ["Breeze"],
        droppedNames: ["Rumble"],
      },
    ])!;
    expect(note).toContain("Poppy");
    expect(note).toContain("Wobble");
    expect(note).toContain("Breeze");
    expect(note).toContain("Rumble");
    expect(note).toMatch(/add <name> to beat N/);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 5. Per-beat corrections                                         */
/* ────────────────────────────────────────────────────────────── */

describe("per-beat cast overrides", () => {
  function seedScript(beats: ScriptBeat[] = [BEAT, { ...BEAT, idx: 1, text: "A quiet pond." }]) {
    const db = seededWithCast({
      extraCharacters: [
        {
          id: "c-breeze",
          name: "Breeze",
          aliases: ["the bunny"],
          role: "cast",
          description: "Breeze, a lilac-grey bunny.",
          identity_anchor: null,
          status: "locked",
          version: 1,
        },
      ],
    });
    (db.tables.scripts ??= []).push({
      id: "sc1",
      video_id: "v1",
      version: 1,
      beats,
      runtime_sec: 60,
      metadata: {},
    } as never);
    return db;
  }

  it("resolves names and aliases to ids, and marks the beat's visual stale", async () => {
    const db = seedScript();
    (db.tables.assets ??= []).push({
      id: "a1",
      video_id: "v1",
      kind: "clip",
      beat_index: 1,
      provider: "fal.ai",
      storage_path: "x.jpg",
      meta: {},
      cost_usd: 0,
    } as never);

    const r = await setBeatCast({ videoId: "v1", beatIdx: 1, add: ["the bunny"] });
    expect(r.ok).toBe(true);
    const beats = (db.tables.scripts![0].beats as ScriptBeat[])!;
    expect(beats[1].cast).toEqual({ add: ["c-breeze"], remove: [] });
    // Changing who's in the frame invalidates the frame — but never spends.
    expect(db.row("assets", "a1")!.stale).toBe(true);
    expect(db.tables.cost_ledger).toHaveLength(0);
  });

  it("refuses an unknown name instead of silently doing nothing", async () => {
    const db = seedScript();
    const r = await setBeatCast({ videoId: "v1", beatIdx: 0, add: ["Gandalf"] });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/No character named Gandalf/);
    expect((db.tables.scripts![0].beats as ScriptBeat[])[0].cast).toBeUndefined();
  });

  it("clearing corrections hands the beat back to the matcher", async () => {
    const db = seedScript();
    await setBeatCast({ videoId: "v1", beatIdx: 0, add: ["Breeze"] });
    expect((db.tables.scripts![0].beats as ScriptBeat[])[0].cast).toBeTruthy();
    await setBeatCast({ videoId: "v1", beatIdx: 0 });
    expect((db.tables.scripts![0].beats as ScriptBeat[])[0].cast).toBeUndefined();
  });

  it("merge mode lets a later instruction reverse an earlier one", async () => {
    const db = seedScript();
    await setBeatCast({ videoId: "v1", beatIdx: 0, add: ["Breeze"], merge: true });
    await setBeatCast({ videoId: "v1", beatIdx: 0, remove: ["Breeze"], merge: true });
    const cast = (db.tables.scripts![0].beats as ScriptBeat[])[0].cast!;
    expect(cast.add).toEqual([]);
    expect(cast.remove).toEqual(["c-breeze"]);
  });

  it("without merge the chips' full set replaces whatever was there", async () => {
    const db = seedScript();
    await setBeatCast({ videoId: "v1", beatIdx: 0, add: ["Breeze"] });
    await setBeatCast({ videoId: "v1", beatIdx: 0, remove: ["Bo"] });
    const cast = (db.tables.scripts![0].beats as ScriptBeat[])[0].cast!;
    expect(cast.add).toEqual([]);
    expect(cast.remove).toEqual(["c-bo"]);
  });

  it("an override actually changes who is rendered", async () => {
    process.env.FAL_KEY = "k";
    const db = seedScript();
    stubFal();
    // Bo is named in the text, but this beat isn't about him.
    const overridden: ScriptBeat = { ...BEAT, cast: { remove: ["c-bo"] } };
    const draft = await makeBeatClip(VIDEO as unknown as Video, PROJECT as unknown as Project, overridden, {
      db: db as never,
    });
    // Nobody left in the frame → nothing to record or narrate for this beat.
    expect(draft.cast).toBeUndefined();
    expect(refCalls()).toHaveLength(0);
    expect(String(fluxCalls()[0].body.prompt)).not.toContain("cheerful 4-year-old boy");
    // The style still applies — removing a character isn't opting out of the look.
    expect(String(fluxCalls()[0].body.prompt)).toContain(STYLE_STRING);
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 6. Chat coverage                                                */
/* ────────────────────────────────────────────────────────────── */

describe("chat can do it too (the registry is the coverage boundary)", () => {
  const ctx = {
    projectId: "p1",
    videoId: "v1",
    status: "ASSETS_READY",
    atGate: false,
    mode: "script" as const,
    targetLengthSec: 120,
  };

  it("registers set_beat_cast as a free action", () => {
    const action = getWorkspaceAction("set_beat_cast")!;
    expect(action).toBeTruthy();
    expect(action.costBearing).toBe(false);
    expect(action.estimate({})).toBeNull();
  });

  it("routes “add Breeze to beat 3”", () => {
    const r = routeHeuristic("add Breeze to beat 3", ctx)!;
    expect(r).toMatchObject({ kind: "action", action: "set_beat_cast" });
    expect(r.kind === "action" && r.params).toMatchObject({ beatIdx: 2, add: "Breeze" });
  });

  it("routes “remove Poppy from beat 2”", () => {
    const r = routeHeuristic("remove Poppy from beat 2", ctx)!;
    expect(r.kind === "action" && r.params).toMatchObject({ beatIdx: 1, remove: "Poppy" });
  });

  it("handles more than one name at a time", () => {
    const r = routeHeuristic("add Bo and Breeze to beat 1", ctx)!;
    expect(r.kind === "action" && r.params).toMatchObject({ add: "Bo,Breeze" });
  });

  it("does NOT hijack an ordinary visual re-roll", () => {
    const r = routeHeuristic("regenerate beat 3 visual", ctx)!;
    expect(r.kind === "action" && r.action).toBe("regenerate_beat_visual");
  });
});

/* ────────────────────────────────────────────────────────────── */
/* 7. End to end: Phases 1+2+3 through the real pipeline           */
/* ────────────────────────────────────────────────────────────── */

describe("end to end — a cast video through the real engine", () => {
  it("stamps the character versions onto the video and narrates the cast into the thread", async () => {
    const db = seededWithCast();
    (db.tables.scripts ??= []).push({
      id: "sc1",
      video_id: "v1",
      version: 1,
      beats: [
        { idx: 0, text: "Bo takes a slow breath.", visualPrompt: "a meadow", shotType: "hero" },
        { idx: 1, text: "Bo waves at the sky.", visualPrompt: "the sky", shotType: "broll" },
        { idx: 2, text: "A quiet pond, nobody around.", visualPrompt: "a pond", shotType: "broll" },
      ],
      runtime_sec: 90,
      metadata: {},
    } as never);

    const r = await runPipeline("v1", db as never);
    expect(r.ok).toBe(true);

    // Q5: the video remembers WHICH version of Bo it was made with.
    const v = db.row("videos", "v1")!;
    expect(v.character_versions).toEqual({ "c-bo": 3 });

    // The thread says who was in it, and that beat 3 had nobody.
    const notes = (db.tables.workspace_messages ?? []) as { content: string }[];
    const castNote = notes.find((m) => m.content.startsWith("Cast in this video:"));
    expect(castNote).toBeTruthy();
    expect(castNote!.content).toContain("Bo (2 beats)");

    // Every beat still got a visual — the cast machinery never blocks a render.
    const clips = db.inserts("assets").filter((a) => a.kind === "clip");
    expect(clips.length).toBeGreaterThanOrEqual(3);
  });

  it("a project with no cast posts no cast note and stamps nothing", async () => {
    const db = seededPlain();
    (db.tables.scripts ??= []).push({
      id: "sc1",
      video_id: "v1",
      version: 1,
      beats: [{ idx: 0, text: "Bo takes a slow breath.", visualPrompt: "a meadow", shotType: "hero" }],
      runtime_sec: 30,
      metadata: {},
    } as never);
    (db.tables.approvals ??= []) as never[];
    (db.tables.qc_reviews ??= []) as never[];
    (db.tables.clip_jobs ??= []) as never[];
    (db.tables.stage_artifacts ??= []) as never[];
    (db.tables.vo_cache ??= []) as never[];
    (db.tables.visual_refs ??= []) as never[];
    (db.tables.prompt_templates ??= []) as never[];
    (db.tables.app_settings ??= []) as never[];

    await runPipeline("v1", db as never);
    const notes = (db.tables.workspace_messages ?? []) as { content: string }[];
    expect(notes.some((m) => m.content.startsWith("Cast in this video:"))).toBe(false);
    expect(db.row("videos", "v1")!.character_versions).toBeUndefined();
  });
});
