import "server-only";
import { createHash } from "node:crypto";
import {
  buildDirectedEddContext,
  compileDirectedEdd,
  directedInputFromAssets,
  directedRuntimeSec,
  insertEddVersion,
  parseDirectedScript,
  sectionSpokenText,
  specHash,
  validateEdd,
  type DirectedAssetRow,
  type DirectedClipSpec,
  type DirectedScript,
  type DirectedSection,
  type EddDb,
  type MusicPlan,
} from "@studio/core";
import type { createAdminClient } from "@/lib/supabase/admin";
import { recordCost } from "@/lib/pipeline/ledger";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import { generateHiggsfieldImage, HF_PRICES, isHiggsfieldLive, sanitizeCinemaControls } from "@/lib/adapters/higgsfield";
import { synthesizeSpeech, voiceProviderFor } from "@/lib/adapters/voice";
import { generateSoundEffect, isSfxLive } from "@/lib/adapters/sfx";
import { generateMusicBed, isMusicLive } from "@/lib/adapters/music";
import { resolveLockedModelId } from "@/lib/adapters/video-models";
import type { Project, Video } from "@/lib/db/types";

/**
 * Directed production — the app half (docs/production/directed-pipeline.md).
 *
 * A directed video carries a brief-authored script (core `DirectedScript`,
 * stored on scripts.metadata.directed) that runs VERBATIM: no Claude script,
 * no art-director rewrite, no shot router, no relevance re-rolls. This module
 * owns the directed asset stage (keyframes → voiced lines → SFX → music bed →
 * clip jobs), which is chunked + idempotent so a serverless request budget
 * never strands it: every call does as much as fits, skips what already
 * exists, and reports what remains. The clip worker then generates each
 * section from its exact spec and compiles the EDD when the last clip lands.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Catalog per-second price for Higgsfield video (the ledger records the real
    /estimate quote once a clip runs — this is only the pre-flight estimate). */
const HF_VIDEO_USD_PER_SEC = 0.2057;
const ELEVENLABS_USD_PER_1K_CHARS = 0.17;
const SFX_USD = 0.1;
const MUSIC_USD_PER_SEC = 0.0017;
/** Asset-stage calls in flight at once. */
const DIRECTED_CONCURRENCY = 4;

export type DirectedEstimate = {
  generatedSec: number;
  videoUsd: number;
  stillsUsd: number;
  voiceUsd: number;
  sfxUsd: number;
  musicUsd: number;
  totalUsd: number;
};

/** Pre-flight cost for a directed script (reused sections are free). */
export function estimateDirected(script: DirectedScript): DirectedEstimate {
  const gen = script.sections.filter((s) => !s.reuse);
  const generatedSec = gen.reduce((n, s) => n + s.sec, 0);
  const stills = gen.filter((s) => s.keyframePrompt).length + gen.filter((s) => s.endFrame && "prompt" in s.endFrame).length;
  const chars = script.sections.reduce((n, s) => n + sectionSpokenText(s).length, 0);
  const sfx = script.sections.reduce((n, s) => n + (s.sfx?.length ?? 0), 0);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const out = {
    generatedSec,
    videoUsd: r2(generatedSec * HF_VIDEO_USD_PER_SEC),
    stillsUsd: r2(stills * HF_PRICES.soulStandardPerImage),
    voiceUsd: r2((chars / 1000) * ELEVENLABS_USD_PER_1K_CHARS),
    sfxUsd: r2(sfx * SFX_USD),
    musicUsd: script.music ? r2(directedRuntimeSec(script) * MUSIC_USD_PER_SEC) : 0,
  };
  return { ...out, totalUsd: r2(out.videoUsd + out.stillsUsd + out.voiceUsd + out.sfxUsd + out.musicUsd) };
}

// ── Loading ───────────────────────────────────────────────────────────

type Loaded = { video: Video; project: Project; script: DirectedScript; scriptId: string; version: number };

export async function loadDirected(db: Db, videoId: string): Promise<Loaded | { error: string }> {
  const { data: video } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
  if (!video) return { error: "video not found" };
  if (!(video as Video).directed) return { error: "not a directed video" };
  const { data: project } = await db.from("projects").select("*").eq("id", (video as Video).project_id).maybeSingle();
  if (!project) return { error: "project not found" };
  const { data: row } = await db
    .from("scripts")
    .select("id, version, metadata")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = parseDirectedScript((row?.metadata as { directed?: unknown } | null)?.directed);
  if (!row || !parsed.ok) return { error: "directed script missing or invalid" };
  return { video: video as Video, project: project as Project, script: parsed.script, scriptId: row.id as string, version: row.version as number };
}

// ── Import ────────────────────────────────────────────────────────────

/** Speakers with no voice on the project's cast (brand_kit.voiceCast; the
    narrator "N" falls back to projects.voice_id). */
export function missingVoices(script: DirectedScript, project: Pick<Project, "voice_id" | "brand_kit">): string[] {
  const cast = voiceCastOf(project);
  const speakers = new Set(script.sections.flatMap((s) => s.lines.map((l) => l.speaker)));
  return [...speakers].filter((sp) => !voiceFor(sp, cast, project.voice_id));
}

function voiceCastOf(project: Pick<Project, "brand_kit">): Record<string, string> {
  const raw = (project.brand_kit as { voiceCast?: unknown } | null)?.voiceCast;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"));
}

function voiceFor(speaker: string, cast: Record<string, string>, narrator: string | null | undefined): string | null {
  const hit = cast[speaker] ?? Object.entries(cast).find(([k]) => k.toLowerCase() === speaker.toLowerCase())?.[1];
  if (hit) return hit;
  if (speaker === "N" || /^narrator$/i.test(speaker)) return narrator || null;
  return null;
}

function beatsFor(script: DirectedScript) {
  return script.sections.map((s) => ({
    idx: s.idx,
    text: sectionSpokenText(s),
    visualPrompt: s.videoPrompt,
    shotType: "hero" as const,
    motion: "static" as const,
  }));
}

export async function importDirectedScript(
  db: Db,
  opts: { projectId: string; script: unknown },
): Promise<{ ok: true; videoId: string; estimate: DirectedEstimate; missingVoices: string[] } | { ok: false; errors: string[] }> {
  const parsed = parseDirectedScript(opts.script);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };
  const script = parsed.script;
  const { data: project } = await db.from("projects").select("*").eq("id", opts.projectId).maybeSingle();
  if (!project) return { ok: false, errors: ["project not found"] };
  const runtime = directedRuntimeSec(script);
  const { data: video, error } = await db
    .from("videos")
    .insert({
      project_id: opts.projectId,
      title: script.title,
      topic: script.topic ?? script.title,
      status: "SCRIPT_READY",
      kind: script.format,
      target_length_sec: Math.round(runtime),
      directed: true,
      enable_captions: script.captions !== false,
      enable_highlights: false,
    })
    .select("id")
    .single();
  if (error || !video) return { ok: false, errors: [error?.message ?? "could not create video"] };
  await db.from("scripts").insert({
    video_id: video.id,
    version: 1,
    body: script.sections.map((s) => sectionSpokenText(s)).filter(Boolean).join("\n\n"),
    beats: beatsFor(script),
    runtime_sec: Math.round(runtime),
    metadata: {
      titles: [script.title, ...(script.altTitles ?? [])],
      description: script.description ?? "",
      tags: script.tags ?? [],
      directed: script,
    },
  });
  return {
    ok: true,
    videoId: video.id as string,
    estimate: estimateDirected(script),
    missingVoices: missingVoices(script, project as Project),
  };
}

/** Save an edited directed script as a new version (revisions). */
async function saveScriptVersion(db: Db, videoId: string, version: number, script: DirectedScript): Promise<void> {
  await db.from("scripts").insert({
    video_id: videoId,
    version: version + 1,
    body: script.sections.map((s) => sectionSpokenText(s)).filter(Boolean).join("\n\n"),
    beats: beatsFor(script),
    runtime_sec: Math.round(directedRuntimeSec(script)),
    metadata: {
      titles: [script.title, ...(script.altTitles ?? [])],
      description: script.description ?? "",
      tags: script.tags ?? [],
      directed: script,
    },
  });
}

// ── Asset stage (chunked, idempotent) ─────────────────────────────────

export type DirectedStageResult = {
  ok: boolean;
  error?: string;
  done: boolean;
  /** Human log of what this call did. */
  did: string[];
  /** Paid steps still outstanding (0 = assets complete). */
  remaining: number;
  clipsQueued?: number;
  status?: string;
};

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const imageType = (b: Buffer) => (b[0] === 0xff && b[1] === 0xd8 ? { ct: "image/jpeg", ext: "jpg" } : b[0] === 0x52 && b[1] === 0x49 ? { ct: "image/webp", ext: "webp" } : { ct: "image/png", ext: "png" });

async function assetsOf(db: Db, videoId: string): Promise<DirectedAssetRow[]> {
  const { data } = await db.from("assets").select("id, kind, beat_index, storage_path, meta").eq("video_id", videoId);
  return (data ?? []) as DirectedAssetRow[];
}

const metaOf = (a: DirectedAssetRow) => (a.meta ?? {}) as Record<string, unknown>;

/** Insert an asset row and FAIL LOUDLY — a silently dropped row means the
    paid output is lost and the next run pays for it again. */
async function insertAsset(db: Db, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from("assets").insert(row);
  if (error) throw new Error(`asset insert (${String(row.kind)}) failed: ${error.message}`);
}

type Step = { key: string; label: string; run: () => Promise<void> };

/**
 * Run as much of the directed asset stage as fits in `budgetMs`. Order:
 * keyframes (so clips can start), end frames, voiced lines, SFX, music. Each
 * step is skipped when its asset already exists with the same content hash.
 * When nothing remains, the clip jobs are queued (or, with nothing to
 * generate, the EDD is compiled) and the video moves on.
 */
export async function runDirectedAssets(db: Db, videoId: string, opts: { budgetMs?: number } = {}): Promise<DirectedStageResult> {
  const started = Date.now();
  const budgetMs = opts.budgetMs ?? 40_000;
  const loaded = await loadDirected(db, videoId);
  if ("error" in loaded) return { ok: false, error: loaded.error, done: false, did: [], remaining: -1 };
  const { video, project, script } = loaded;
  if (!["GENERATING_ASSETS"].includes(video.status)) {
    return { ok: false, error: `directed asset stage runs at GENERATING_ASSETS (video is ${video.status})`, done: false, did: [], remaining: -1 };
  }
  const missing = missingVoices(script, project);
  if (missing.length) {
    return { ok: false, error: `no voice for speaker(s): ${missing.join(", ")} — design/save voices first`, done: false, did: [], remaining: -1 };
  }
  if (!isHiggsfieldLive() && script.sections.some((s) => s.keyframePrompt && !s.reuse)) {
    return { ok: false, error: "HIGGSFIELD_API_KEY not set — SOUL keyframes unavailable", done: false, did: [], remaining: -1 };
  }

  // Lease: only one asset-stage run per video at a time. A caller that
  // retries while a previous run is still working gets "busy" instead of
  // paying for the same generations twice.
  const leaseMs = budgetMs + 150_000;
  const now = new Date();
  const { data: leased } = await db
    .from("videos")
    .update({ directed_lease_until: new Date(now.getTime() + leaseMs).toISOString() })
    .eq("id", videoId)
    .or(`directed_lease_until.is.null,directed_lease_until.lt.${now.toISOString()}`)
    .select("id");
  if (!leased || leased.length === 0) {
    return { ok: true, done: false, did: [], remaining: -1, status: "busy — a previous run is still working; call again in a minute" };
  }
  try {
    return await runDirectedSteps(db, videoId, loaded, started, budgetMs);
  } finally {
    await db.from("videos").update({ directed_lease_until: null }).eq("id", videoId);
  }
}

async function runDirectedSteps(
  db: Db,
  videoId: string,
  loaded: Loaded,
  started: number,
  budgetMs: number,
): Promise<DirectedStageResult> {
  const { video, project, script } = loaded;
  const aspect: "9:16" | "16:9" = script.format === "short" ? "9:16" : "16:9";
  const assets = await assetsOf(db, videoId);
  const steps: Step[] = [];
  const has = (kind: string, idx: number | null, key: string, val: string) =>
    assets.some((a) => a.kind === kind && a.beat_index === idx && metaOf(a)[key] === val);

  // 1) Keyframes + prompted end frames (SOUL Standard, native aspect).
  for (const s of script.sections) {
    if (s.reuse) continue;
    if (s.keyframePrompt) {
      const h = specHash([s.keyframePrompt, aspect]);
      if (!has("keyframe", s.idx, "promptHash", h)) {
        steps.push({ key: `kf${s.idx}`, label: `keyframe §${s.idx + 1}`, run: () => makeStill(db, video, "keyframe", s.idx, s.keyframePrompt!, aspect, h) });
      }
    }
    if (s.endFrame && "prompt" in s.endFrame) {
      const prompt = s.endFrame.prompt;
      const h = specHash([prompt, aspect]);
      if (!has("keyframe_end", s.idx, "promptHash", h)) {
        steps.push({ key: `ef${s.idx}`, label: `end frame §${s.idx + 1}`, run: () => makeStill(db, video, "keyframe_end", s.idx, prompt, aspect, h) });
      }
    }
  }

  // 2) Voiced lines (cached per voice + text across the whole project).
  const cast = voiceCastOf(project);
  for (const s of script.sections) {
    s.lines.forEach((line, j) => {
      const voiceId = voiceFor(line.speaker, cast, project.voice_id)!;
      const h = specHash([voiceId, line.text]);
      if (has("vo", s.idx, "lineHash", h) && assets.some((a) => a.kind === "vo" && a.beat_index === s.idx && metaOf(a).lineIdx === j && metaOf(a).lineHash === h)) return;
      steps.push({ key: `vo${s.idx}.${j}`, label: `line §${s.idx + 1}.${j + 1} (${line.speaker})`, run: () => makeLine(db, video, project, s, j, voiceId, h) });
    });
  }

  // 3) SFX cues (cached per prompt + length across the project).
  for (const s of script.sections) {
    for (const [j, cue] of (s.sfx ?? []).entries()) {
      const h = specHash([cue.prompt, cue.durationSec ?? null]);
      if (assets.some((a) => a.kind === "sfx" && a.beat_index === s.idx && metaOf(a).cueIdx === j && metaOf(a).promptHash === h)) continue;
      steps.push({ key: `sfx${s.idx}.${j}`, label: `sfx §${s.idx + 1}.${j + 1}`, run: () => makeSfx(db, video, project, s.idx, j, cue.prompt, cue.durationSec, h) });
    }
  }

  // 4) Music bed (one per video, runtime length).
  if (script.music) {
    const runtime = Math.ceil(directedRuntimeSec(script));
    const h = specHash([script.music.prompt, runtime]);
    if (!assets.some((a) => a.kind === "bgm" && metaOf(a).promptHash === h)) {
      steps.push({ key: "bgm", label: "music bed", run: () => makeMusic(db, video, script.music!.prompt, runtime, h) });
    }
  }

  // Parallel batches (Higgsfield/ElevenLabs tolerate a few concurrent calls);
  // a new batch starts only inside the budget, so one call stays well under
  // an MCP client's request timeout. Idempotent: re-call to continue.
  const did: string[] = [];
  let i = 0;
  while (i < steps.length) {
    if (Date.now() - started > budgetMs) break;
    const batch = steps.slice(i, i + DIRECTED_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((st) => st.run()));
    const failed = results.findIndex((r) => r.status === "rejected");
    results.forEach((r, k) => r.status === "fulfilled" && did.push(batch[k].label));
    if (failed >= 0) {
      const reason = (results[failed] as PromiseRejectedResult).reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      const label = batch[failed].label;
      await db.from("videos").update({ paused_reason: `directed ${label} failed — ${msg.slice(0, 200)}` }).eq("id", videoId);
      const remainingNow = steps.length - i - results.filter((r) => r.status === "fulfilled").length;
      return { ok: false, error: `${label}: ${msg}`, done: false, did, remaining: remainingNow };
    }
    i += batch.length;
  }
  const remaining = steps.length - i;
  if (did.length) await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
  if (remaining > 0) return { ok: true, done: false, did, remaining, status: "GENERATING_ASSETS" };

  const queued = await enqueueDirectedClips(db, videoId);
  if (!queued.ok) return { ok: false, error: queued.error, done: false, did, remaining: 0 };
  did.push(queued.queued > 0 ? `queued ${queued.queued} clip job(s)` : "no clips to generate — compiled the cut");
  return { ok: true, done: true, did, remaining: 0, clipsQueued: queued.queued, status: queued.status };
}

async function makeStill(db: Db, video: Video, kind: "keyframe" | "keyframe_end", idx: number, prompt: string, aspect: "9:16" | "16:9", h: string) {
  const out = await generateHiggsfieldImage({ prompt, aspectRatio: aspect });
  const t = imageType(out.image);
  const path = `videos/${video.id}/${kind}-${idx}-${h}.${t.ext}`;
  await uploadMedia(path, out.image, t.ct);
  await db.from("assets").delete().eq("video_id", video.id).eq("kind", kind).eq("beat_index", idx);
  await insertAsset(db, {
    video_id: video.id,
    kind,
    provider: "higgsfield",
    storage_path: path,
    beat_index: idx,
    meta: { promptHash: h, prompt, aspect, model: "soul/standard", seed: out.seed, stillImage: true },
    cost_usd: out.costUsd,
  });
  await recordCost(db, video, { provider: "higgsfield", usd: out.costUsd, description: `SOUL ${kind === "keyframe" ? "keyframe" : "end frame"}` }, `section ${idx + 1}`);
}

async function makeLine(db: Db, video: Video, project: Project, s: DirectedSection, j: number, voiceId: string, h: string) {
  const line = s.lines[j];
  const textHash = sha(line.text.trim());
  const { data: hit } = await db
    .from("vo_cache")
    .select("storage_path, duration_sec, words")
    .eq("project_id", project.id)
    .eq("voice_id", voiceId)
    .eq("text_hash", textHash)
    .maybeSingle();
  let storagePath: string;
  let durationSec: number;
  let words: unknown;
  let costUsd = 0;
  if (hit) {
    storagePath = hit.storage_path as string;
    durationSec = Number(hit.duration_sec ?? 0);
    words = hit.words ?? [];
  } else {
    const r = await synthesizeSpeech({ text: line.text, voiceId });
    storagePath = `vo-cache/${project.id}/${textHash.slice(0, 24)}-${voiceId.slice(0, 8)}.${r.fileExt}`;
    await uploadMedia(storagePath, r.audio, r.contentType);
    durationSec = r.durationSec;
    words = r.words;
    costUsd = r.costUsd;
    await db.from("vo_cache").upsert(
      { project_id: project.id, voice_id: voiceId, text_hash: textHash, storage_path: storagePath, duration_sec: durationSec, words, cost_usd: costUsd },
      { onConflict: "project_id,voice_id,text_hash" },
    );
  }
  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "vo").eq("beat_index", s.idx).filter("meta->>lineIdx", "eq", String(j));
  await insertAsset(db, {
    video_id: video.id,
    kind: "vo",
    provider: voiceProviderFor(voiceId),
    storage_path: storagePath,
    beat_index: s.idx,
    meta: { lineIdx: j, lineHash: h, speaker: line.speaker, at: line.at, durationSec, words, cached: Boolean(hit), directed: true },
    cost_usd: costUsd,
  });
  await recordCost(db, video, { provider: voiceProviderFor(voiceId), usd: costUsd, description: `Line (${line.speaker})` }, `section ${s.idx + 1}`);
}

async function makeSfx(db: Db, video: Video, project: Project, idx: number, j: number, prompt: string, durationSec: number | undefined, h: string) {
  if (!isSfxLive()) throw new Error("ElevenLabs not configured (SFX)");
  // Project-wide cache: the vo_cache table keyed by a reserved voice id.
  const { data: hit } = await db
    .from("vo_cache")
    .select("storage_path, duration_sec")
    .eq("project_id", project.id)
    .eq("voice_id", "sfx")
    .eq("text_hash", h)
    .maybeSingle();
  let path: string;
  let dur: number;
  let cost = 0;
  if (hit) {
    path = hit.storage_path as string;
    dur = Number(hit.duration_sec ?? 0);
  } else {
    const r = await generateSoundEffect({ prompt, durationSec });
    path = `sfx-cache/${project.id}/${h}.${r.fileExt}`;
    await uploadMedia(path, r.audio, r.contentType);
    dur = r.durationSec;
    cost = r.costUsd;
    await db.from("vo_cache").upsert(
      { project_id: project.id, voice_id: "sfx", text_hash: h, storage_path: path, duration_sec: dur, words: [], cost_usd: cost },
      { onConflict: "project_id,voice_id,text_hash" },
    );
  }
  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "sfx").eq("beat_index", idx).filter("meta->>cueIdx", "eq", String(j));
  await insertAsset(db, {
    video_id: video.id,
    kind: "sfx",
    provider: "elevenlabs-sfx",
    storage_path: path,
    beat_index: idx,
    meta: { cueIdx: j, promptHash: h, prompt, durationSec: dur, cached: Boolean(hit) },
    cost_usd: cost,
  });
  await recordCost(db, video, { provider: "elevenlabs-sfx", usd: cost, description: "Sound effect" }, `section ${idx + 1}`);
}

async function makeMusic(db: Db, video: Video, prompt: string, runtimeSec: number, h: string) {
  if (!isMusicLive()) throw new Error("ElevenLabs not configured (music)");
  const plan: MusicPlan = { enabled: true, mood: "epic", tempoBpm: 90, intensity: 0.5, duck: { mode: "fixed", underVoDb: -10 }, prompt };
  const bed = await generateMusicBed(plan, runtimeSec);
  if (!bed.audio) throw new Error("ElevenLabs Music returned no audio");
  const path = `videos/${video.id}/bgm-${h}.mp3`;
  await uploadMedia(path, Buffer.from(bed.audio), bed.contentType);
  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "bgm");
  await insertAsset(db, {
    video_id: video.id,
    kind: "bgm",
    provider: "elevenlabs-music",
    storage_path: path,
    beat_index: null,
    meta: { promptHash: h, prompt, durationSec: bed.durationSec },
    cost_usd: bed.costUsd,
  });
  await recordCost(db, video, { provider: "elevenlabs-music", usd: bed.costUsd, description: "Music bed" });
}

// ── Clip jobs ─────────────────────────────────────────────────────────

/** The exact request for a section (clip_jobs.spec) — pure given its inputs. */
export function directedClipSpec(
  script: DirectedScript,
  s: DirectedSection,
  assets: DirectedAssetRow[],
  channelControls: Record<string, string>,
  model: string,
): DirectedClipSpec {
  const aspect: "9:16" | "16:9" = script.format === "short" ? "9:16" : "16:9";
  const kf = assets.find((a) => a.kind === "keyframe" && a.beat_index === s.idx);
  let endFramePath: string | undefined;
  if (s.endFrame && "fromSection" in s.endFrame) {
    endFramePath = assets.find((a) => a.kind === "keyframe" && a.beat_index === (s.endFrame as { fromSection: number }).fromSection)?.storage_path ?? undefined;
  } else if (s.endFrame) {
    endFramePath = assets.find((a) => a.kind === "keyframe_end" && a.beat_index === s.idx)?.storage_path ?? undefined;
  }
  const controls = model === "hf-cinema-studio-4"
    ? (sanitizeCinemaControls({ ...channelControls, ...(s.controls ?? {}) }) as Record<string, string>)
    : undefined;
  const base = {
    directed: true as const,
    prompt: s.videoPrompt,
    aspect,
    keyframePath: kf?.storage_path ?? undefined,
    endFramePath,
    refPaths: s.refs?.length ? s.refs : undefined,
    controls,
    generateAudio: s.generateAudio === true,
  };
  return { ...base, hash: specHash([model, s.sec, base]) };
}

export async function enqueueDirectedClips(
  db: Db,
  videoId: string,
  onlySections?: number[],
): Promise<{ ok: true; queued: number; status: string } | { ok: false; error: string }> {
  const loaded = await loadDirected(db, videoId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { video, project, script } = loaded;
  const assets = await assetsOf(db, videoId);
  const channelControls = ((project.brand_kit as { cinemaControls?: Record<string, string> } | null)?.cinemaControls ?? {}) as Record<string, string>;
  const locked = resolveLockedModelId(project.preferred_video_model ?? null);
  const { data: open } = await db.from("clip_jobs").select("beat_idx").eq("video_id", videoId).in("status", ["queued", "running"]);
  const busy = new Set(((open ?? []) as { beat_idx: number }[]).map((j) => j.beat_idx));

  const rows: Record<string, unknown>[] = [];
  for (const s of script.sections) {
    if (onlySections && !onlySections.includes(s.idx)) continue;
    if (busy.has(s.idx)) continue;
    if (s.reuse) {
      await reuseClip(db, video, s);
      continue;
    }
    const model = s.model ?? locked;
    const spec = directedClipSpec(script, s, assets, channelControls, model);
    const landed = assets.find((a) => a.kind === "clip" && a.beat_index === s.idx && metaOf(a).isVideo && metaOf(a).specHash === spec.hash);
    if (landed && !onlySections) continue;
    rows.push({
      video_id: videoId,
      project_id: video.project_id,
      beat_idx: s.idx,
      method: s.sec > 30 ? "stitch-seamless" : "stitch",
      model,
      target_sec: s.sec,
      hero_hold: false,
      status: "queued",
      spec,
    });
  }
  if (rows.length) {
    const { error } = await db.from("clip_jobs").insert(rows);
    // 23505 = the one-open-job-per-section index: another run queued it first.
    if (error && error.code !== "23505") return { ok: false, error: error.message };
    await db.from("videos").update({ status: "ASSETS_READY", auto_finish: true, paused_reason: null }).eq("id", videoId);
    return { ok: true, queued: rows.length, status: "ASSETS_READY" };
  }
  if (busy.size > 0) {
    await db.from("videos").update({ status: "ASSETS_READY", auto_finish: true }).eq("id", videoId);
    return { ok: true, queued: 0, status: "ASSETS_READY" };
  }
  const staged = await stageDirectedCut(db, videoId);
  return staged.ok ? { ok: true, queued: 0, status: "ASSEMBLING" } : { ok: false, error: staged.error };
}

/** Copy a previously generated clip (a channel ident / outro plate). */
async function reuseClip(db: Db, video: Video, s: DirectedSection) {
  const src = s.reuse!;
  const { data } = await db
    .from("assets")
    .select("storage_path, provider, meta")
    .eq("video_id", src.videoId)
    .eq("kind", "clip")
    .eq("beat_index", src.sectionIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.storage_path) throw new Error(`reuse source ${src.videoId} §${src.sectionIdx + 1} has no clip`);
  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "clip").eq("beat_index", s.idx);
  await insertAsset(db, {
    video_id: video.id,
    kind: "clip",
    provider: data.provider,
    storage_path: data.storage_path,
    beat_index: s.idx,
    meta: { ...(data.meta as Record<string, unknown>), reusedFrom: src },
    cost_usd: 0,
  });
}

/** Compile + stage the cut (app side — the worker does the same when the last
    clip lands). Validates first; an invalid document pauses, never renders. */
export async function stageDirectedCut(db: Db, videoId: string): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  const loaded = await loadDirected(db, videoId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { project, script, scriptId } = loaded;
  const assets = await assetsOf(db, videoId);
  const doc = compileDirectedEdd(
    directedInputFromAssets(script, assets, { primary: (project.brand_kit as { primary?: string } | null)?.primary ?? "#F5B829" }, project.name),
  );
  const v = validateEdd(doc, buildDirectedEddContext(assets, script));
  if (!v.ok) {
    const msg = v.errors.slice(0, 4).map((e) => `${e.rule}: ${e.msg}`).join("; ");
    await db.from("videos").update({ paused_reason: `directed cut invalid — ${msg}` }).eq("id", videoId);
    return { ok: false, error: msg };
  }
  const ins = await insertEddVersion(db as unknown as EddDb, { videoId, scriptId, doc, author: "compiler", note: "directed compile", parentVersion: null });
  if (!ins.ok) return { ok: false, error: ins.error };
  await db
    .from("videos")
    .update({ edit_document_version: ins.version, status: "ASSEMBLING", auto_finish: false, paused_reason: null })
    .eq("id", videoId);
  return { ok: true, version: ins.version };
}

// ── Revisions ─────────────────────────────────────────────────────────

export type SectionRevision = {
  idx: number;
  videoPrompt?: string;
  keyframePrompt?: string;
  /** Re-roll the keyframe even when its prompt is unchanged. */
  rerollKeyframe?: boolean;
};

/**
 * One targeted revision round: apply prompt edits, re-roll the named
 * keyframes, re-queue ONLY those sections' clips; the worker re-compiles and
 * the farm re-renders back to Final review. No round cap (operator decision:
 * no per-video limits on quality) — rounds are counted for reporting only.
 */
export async function reviseDirectedSections(
  db: Db,
  opts: { videoId: string; sections: SectionRevision[]; note: string },
): Promise<{ ok: true; round: number; queued: number; did: string[] } | { ok: false; error: string }> {
  const loaded = await loadDirected(db, opts.videoId);
  if ("error" in loaded) return { ok: false, error: loaded.error };
  const { video, script, version } = loaded;
  if (!["FINAL_REVIEW", "ASSETS_READY"].includes(video.status)) {
    return { ok: false, error: `revise from Final review or Assets (video is ${video.status})` };
  }
  if (!opts.sections.length) return { ok: false, error: "no sections given" };
  const { count } = await db
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("video_id", opts.videoId)
    .eq("decision", "revision")
    .like("notes", "[directed revision]%");
  const round = (count ?? 0) + 1;
  const next: DirectedScript = JSON.parse(JSON.stringify(script));
  for (const r of opts.sections) {
    const s = next.sections[r.idx];
    if (!s) return { ok: false, error: `section ${r.idx} does not exist` };
    if (r.videoPrompt?.trim()) s.videoPrompt = r.videoPrompt.trim();
    if (r.keyframePrompt?.trim()) s.keyframePrompt = r.keyframePrompt.trim();
  }
  const reparsed = parseDirectedScript(next);
  if (!reparsed.ok) return { ok: false, error: reparsed.errors.join("; ") };
  if (JSON.stringify(reparsed.script) !== JSON.stringify(script)) {
    await saveScriptVersion(db, opts.videoId, version, reparsed.script);
  }

  const did: string[] = [];
  const aspect: "9:16" | "16:9" = script.format === "short" ? "9:16" : "16:9";
  for (const r of opts.sections) {
    const s = reparsed.script.sections[r.idx];
    if (s.keyframePrompt && (r.rerollKeyframe || r.keyframePrompt)) {
      await makeStill(db, video, "keyframe", s.idx, s.keyframePrompt, aspect, specHash([s.keyframePrompt, aspect, Date.now()]));
      did.push(`keyframe §${s.idx + 1} re-rolled`);
    }
  }
  await db.from("approvals").insert({
    video_id: opts.videoId,
    gate: video.status === "FINAL_REVIEW" ? "FINAL" : "ASSETS",
    decision: "revision",
    decided_by: "mcp",
    notes: `[directed revision] round ${round}: sections ${opts.sections.map((s) => s.idx + 1).join(", ")} — ${opts.note}`.slice(0, 2000),
    decided_at: new Date().toISOString(),
  });
  const q = await enqueueDirectedClips(db, opts.videoId, opts.sections.map((s) => s.idx));
  if (!q.ok) return { ok: false, error: q.error };
  did.push(`queued ${q.queued} clip job(s)`);
  return { ok: true, round, queued: q.queued, did };
}

// ── Reference stills + media ──────────────────────────────────────────

/** A SOUL reference still (cast sheet, set plate) stored per project, for a
    section's `refs` (Cinema Studio image_urls). */
export async function makeReferenceStill(
  db: Db,
  opts: { projectId: string; name: string; prompt: string; aspect?: "16:9" | "9:16" },
): Promise<{ ok: true; path: string; url: string | null; costUsd: number } | { ok: false; error: string }> {
  if (!isHiggsfieldLive()) return { ok: false, error: "HIGGSFIELD_API_KEY not set" };
  const slug = opts.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "ref";
  const out = await generateHiggsfieldImage({ prompt: opts.prompt, aspectRatio: opts.aspect ?? "16:9" });
  const t = imageType(out.image);
  const path = `refs/${opts.projectId}/${slug}-${Date.now().toString(36)}.${t.ext}`;
  await uploadMedia(path, out.image, t.ct);
  await db.from("cost_ledger").insert({
    project_id: opts.projectId,
    video_id: null,
    provider: "higgsfield",
    description: `SOUL reference still — ${opts.name}`,
    usd: out.costUsd,
  });
  return { ok: true, path, url: await getSignedMediaUrl(path, 3600), costUsd: out.costUsd };
}

/** Signed URLs for everything a reviewer needs to QC a directed video. */
export async function directedMedia(db: Db, videoId: string) {
  const { data: video } = await db.from("videos").select("id, title, status, kind, total_cost_usd, paused_reason, edit_document_version").eq("id", videoId).maybeSingle();
  if (!video) return { error: "video not found" };
  const { data: assets } = await db
    .from("assets")
    .select("kind, beat_index, storage_path, provider, meta, cost_usd")
    .eq("video_id", videoId)
    .in("kind", ["render", "clip", "keyframe", "keyframe_end", "vo", "sfx", "bgm"]);
  const { data: jobs } = await db
    .from("clip_jobs")
    .select("beat_idx, status, model, target_sec, attempts, error, cost_usd, quote_usd, quote_credits, created_at")
    .eq("video_id", videoId)
    .order("created_at", { ascending: true });
  const out: { kind: string; section: number | null; url: string | null; provider: string; costUsd: number; meta: Record<string, unknown> }[] = [];
  for (const a of assets ?? []) {
    const m = (a.meta ?? {}) as Record<string, unknown>;
    const { words: _w, prompt: _p, selection: _s, ...lean } = m;
    out.push({
      kind: a.kind as string,
      section: a.beat_index as number | null,
      url: a.storage_path && !String(a.storage_path).startsWith("mock/") ? await getSignedMediaUrl(a.storage_path as string, 7200) : null,
      provider: a.provider as string,
      costUsd: Number(a.cost_usd ?? 0),
      meta: lean,
    });
  }
  return { video, assets: out, clipJobs: jobs ?? [] };
}
