import "server-only";
import {
  GATE_FOR_STATUS,
  GATE_LABELS,
  ON_APPROVE,
  REVISION_TARGET,
  type ApprovalGate,
  type AutonomyMode,
  type VideoStatus,
} from "@studio/core";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push";
import { generateScript } from "@/lib/adapters/script";
import { COPILOT_AUTO_APPROVE_SCORE, reviewGate } from "@/lib/adapters/qc";
import { canSynthesize, synthesizeSpeech, voiceProviderFor } from "@/lib/adapters/voice";
import { generateImage, isFalLive } from "@/lib/adapters/fal";
import { searchStockClip } from "@/lib/adapters/stock";
import { classifyLicense, type SourceCandidate } from "@/lib/adapters/sources";
import { uploadMedia } from "@/lib/storage";
import type { Project, ScriptBeat, Video } from "@/lib/db/types";
import { MOCK_COSTS } from "./mock-content";
import { DEFAULT_SCRIPT_TEMPLATE } from "./templates";

/**
 * Phase 3 orchestration backbone — a DB-driven engine with the same
 * waitpoint semantics the plan assigns to Trigger.dev: each stage runs,
 * lands the video on a review gate, and stops until a decision resolves
 * the waitpoint (a human in Assist mode, the engine itself in Autopilot).
 * Mock stages complete in seconds, so serverless execution suffices;
 * Phase 4 moves stage bodies onto Trigger.dev tasks behind this same
 * interface (see docs/DECISIONS.md).
 */

type Db = Awaited<ReturnType<typeof createClient>>;

export type EngineResult = { ok: boolean; error?: string };

const STAGE_DELAY_MS = 700; // lets Realtime dashboards show in-progress states

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getVideo(db: Db, id: string): Promise<Video | null> {
  const { data } = await db.from("videos").select("*").eq("id", id).maybeSingle();
  return (data as Video) ?? null;
}

async function getProject(db: Db, id: string): Promise<Project | null> {
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

export async function isKillSwitchOn(db?: Db): Promise<boolean> {
  const supabase = db ?? (await createClient());
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "kill_switch")
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean })?.enabled);
}

async function setStatus(db: Db, videoId: string, status: VideoStatus) {
  await db.from("videos").update({ status }).eq("id", videoId);
}

async function recordCost(
  db: Db,
  video: Video,
  cost: { provider: string; usd: number; description: string },
  detail?: string,
) {
  await db.from("cost_ledger").insert({
    project_id: video.project_id,
    video_id: video.id,
    provider: cost.provider,
    description: detail ? `${cost.description} — ${detail}` : cost.description,
    usd: cost.usd,
  });
  await db
    .from("videos")
    .update({ total_cost_usd: Number(video.total_cost_usd) + cost.usd })
    .eq("id", video.id);
  video.total_cost_usd = Number(video.total_cost_usd) + cost.usd;
}

/** Month-to-date spend for a project. */
async function monthSpend(db: Db, projectId: string): Promise<number> {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("project_id", projectId)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Budget guard — runs before every paid stage (standing rule 6). Returns
    a pause reason when a cap would be exceeded, null when clear. */
async function budgetPause(
  db: Db,
  video: Video,
  project: Project,
): Promise<string | null> {
  if (Number(video.total_cost_usd) >= project.budget.perVideoUsd) {
    return `Per-video budget reached ($${project.budget.perVideoUsd})`;
  }
  if ((await monthSpend(db, project.id)) >= project.budget.monthlyUsd) {
    return `Monthly budget reached ($${project.budget.monthlyUsd})`;
  }
  return null;
}

/** Gather what the QC agent needs to judge a gate arrival. */
async function qcContext(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
): Promise<Record<string, unknown>> {
  const base = {
    title: video.title,
    topic: video.topic,
    format: video.format,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    targetLengthSec: video.target_length_sec,
  };
  if (gate === "IDEA") return base;
  const { data: script } = await db
    .from("scripts")
    .select("beats, runtime_sec, metadata")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (gate === "SCRIPT") return { ...base, script };
  const { data: assets } = await db
    .from("assets")
    .select("kind, provider, beat_index, meta, cost_usd")
    .eq("video_id", video.id);
  const summary = (assets ?? []).map((a) => ({
    kind: a.kind,
    provider: a.provider,
    beat: a.beat_index,
    shotType: (a.meta as { shotType?: string }).shotType,
    durationSec: (a.meta as { durationSec?: number }).durationSec,
  }));
  return { ...base, beatsInScript: (script?.beats as unknown[])?.length, assets: summary };
}

/** A video arrived at a review gate: notify, then either wait for a human
    (Assist / Co-pilot until the Phase 8 QC agent exists) or auto-resolve
    the waitpoint (Autopilot). */
async function arriveAtGate(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
): Promise<void> {
  // QC agent reviews every arrival; failures degrade to a neutral verdict
  // and never block the gate.
  const mode: AutonomyMode = project.autonomy?.[gate] ?? "assist";
  let qcScore: number | null = null;
  try {
    const review = await reviewGate({
      gate,
      context: await qcContext(db, video, project, gate),
    });
    qcScore = review.score;
    const autoApprove =
      mode === "copilot" && review.score >= COPILOT_AUTO_APPROVE_SCORE;
    await db.from("qc_reviews").insert({
      video_id: video.id,
      gate,
      score: review.score,
      verdict: review.verdict,
      issues: review.issues,
      strengths: review.strengths,
      auto_approved: autoApprove,
    });
    if (review.costUsd > 0) {
      await recordCost(
        db,
        video,
        { provider: "anthropic", usd: review.costUsd, description: "QC review" },
        `${GATE_LABELS[gate]} gate`,
      );
    }
  } catch (err) {
    console.error("QC review failed:", err);
  }

  try {
    await sendPushToAll({
      title: `${GATE_LABELS[gate]} ready for review`,
      body: `“${video.title}” — ${project.name}${qcScore != null ? ` · QC ${qcScore.toFixed(1)}/10` : ""}`,
      url: `/projects/${project.id}/review`,
    });
  } catch (err) {
    // Push is best-effort — never let delivery problems block the pipeline.
    console.error("web-push delivery failed:", err);
  }

  const copilotApproved =
    mode === "copilot" && qcScore != null && qcScore >= COPILOT_AUTO_APPROVE_SCORE;
  if (mode !== "autopilot" && !copilotApproved) return;

  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: "approved",
    decided_by: mode === "autopilot" ? "autopilot" : "qc-agent",
    decided_at: new Date().toISOString(),
  });
  const current = (await getVideo(db, video.id))!;
  const next = ON_APPROVE[current.status];
  if (next) {
    await setStatus(db, video.id, next);
    await runPipeline(video.id);
  }
}

async function latestNotes(db: Db, videoId: string): Promise<string | undefined> {
  const { data } = await db
    .from("approvals")
    .select("notes")
    .eq("video_id", videoId)
    .eq("decision", "revision")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.notes as string) ?? undefined;
}

async function nextScriptVersion(db: Db, videoId: string): Promise<number> {
  const { data } = await db
    .from("scripts")
    .select("version")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

/** The project's active script template, falling back to the default. */
export async function getActiveTemplate(
  db: Db,
  projectId: string,
  kind = "script",
): Promise<string> {
  const { data } = await db
    .from("prompt_templates")
    .select("body")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.body as string) || DEFAULT_SCRIPT_TEMPLATE;
}

// ── Stage bodies (live adapters with mock fallback) ───────────────────

async function runScripting(db: Db, video: Video, project: Project) {
  const notes = await latestNotes(db, video.id);
  const template = await getActiveTemplate(db, project.id);

  const draft = await generateScript({
    title: video.title,
    topic: video.topic,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    format: video.format,
    targetLengthSec: video.target_length_sec,
    template,
    revisionNotes: notes,
  });

  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: draft.body,
    beats: draft.beats,
    runtime_sec: draft.runtimeSec,
    metadata: draft.metadata,
  });
  await recordCost(
    db,
    video,
    {
      provider: draft.provider === "anthropic" ? "anthropic" : "mock:anthropic",
      usd: draft.costUsd,
      description: `Script draft (${draft.provider === "anthropic" ? "Claude" : "mock"})`,
    },
    `“${video.title}”`,
  );
  await setStatus(db, video.id, "SCRIPT_READY");
}

/**
 * Synthesize live VO for one beat and persist it as a per-beat asset.
 * Identical text + voice within a project is synthesized once and reused
 * from `vo_cache` (e.g. the standard outro) — repeats are free.
 */
export async function synthesizeBeatVo(
  db: Db,
  video: Video,
  project: Project,
  beat: ScriptBeat,
): Promise<{ costUsd: number; cached: boolean; provider: string }> {
  const voiceId = project.voice_id ?? "";
  const textHash = createHash("sha256").update(beat.text.trim()).digest("hex");

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
  const provider = voiceProviderFor(voiceId);

  if (hit) {
    storagePath = hit.storage_path;
    durationSec = Number(hit.duration_sec ?? 0);
    words = hit.words ?? [];
  } else {
    const result = await synthesizeSpeech({ text: beat.text, voiceId });
    storagePath = `vo-cache/${project.id}/${textHash.slice(0, 24)}.${result.fileExt}`;
    await uploadMedia(storagePath, result.audio, result.contentType);
    durationSec = result.durationSec;
    words = result.words;
    costUsd = result.costUsd;
    await db.from("vo_cache").upsert(
      {
        project_id: project.id,
        voice_id: voiceId,
        text_hash: textHash,
        storage_path: storagePath,
        duration_sec: durationSec,
        words,
        cost_usd: costUsd,
      },
      { onConflict: "project_id,voice_id,text_hash" },
    );
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", beat.idx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "vo",
    provider,
    storage_path: storagePath,
    beat_index: beat.idx,
    meta: {
      durationSec,
      voice: project.voice_name ?? voiceId,
      words,
      cached: Boolean(hit),
    },
    cost_usd: costUsd,
  });
  return { costUsd, cached: Boolean(hit), provider };
}

async function runAssetGeneration(db: Db, video: Video, project: Project) {
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beats = (script?.beats ?? []) as ScriptBeat[];

  // Re-running after a revision replaces the previous attempt's assets.
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .in("kind", ["vo", "clip", "thumb", "captions"]);

  // VO, clips, and thumbnails generate in parallel; ledger writes happen
  // sequentially afterwards (recordCost mutates the running total).
  const liveVoice = canSynthesize(project.voice_id) && beats.length > 0;
  const [voResults, clipResults, thumbResults] = await Promise.all([
    liveVoice
      ? Promise.all(beats.map((beat) => synthesizeBeatVo(db, video, project, beat)))
      : Promise.resolve(null),
    Promise.all(beats.map((beat) => makeBeatClip(video, project, beat))),
    Promise.all(
      [0, 1, 2].map((variant) => makeThumbCandidate(video, project, variant)),
    ),
  ]);

  if (voResults) {
    for (const [i, r] of voResults.entries()) {
      await recordCost(
        db,
        video,
        {
          provider: r.provider,
          usd: r.costUsd,
          description: r.cached
            ? "Voiceover reused from cache — free"
            : "Voiceover synthesis",
        },
        `beat ${i + 1}`,
      );
    }
  } else {
    await sleep(STAGE_DELAY_MS);
    await db.from("assets").insert({
      video_id: video.id,
      kind: "vo",
      provider: "mock:elevenlabs",
      storage_path: `mock/${video.id}/vo.mp3`,
      meta: { durationSec: video.target_length_sec, voice: project.voice_name ?? "Sage" },
      cost_usd: MOCK_COSTS.voiceover.usd,
    });
    await recordCost(db, video, MOCK_COSTS.voiceover);
  }

  for (const clip of clipResults) {
    await db.from("assets").insert(clip.row);
    await recordCost(db, video, clip.cost, `beat ${(clip.row.beat_index ?? 0) + 1}`);
  }
  for (const thumb of thumbResults) {
    await db.from("assets").insert(thumb.row);
    await recordCost(db, video, thumb.cost, `candidate ${Number(thumb.row.meta.variant) + 1}`);
  }

  // Captions: aggregate the per-beat word timings into one track.
  if (voResults) {
    const { data: voAssets } = await db
      .from("assets")
      .select("beat_index, meta")
      .eq("video_id", video.id)
      .eq("kind", "vo")
      .order("beat_index", { ascending: true });
    let offset = 0;
    const track: { w: string; start: number; end: number }[] = [];
    for (const a of voAssets ?? []) {
      const meta = a.meta as { durationSec?: number; words?: typeof track };
      for (const w of meta.words ?? []) {
        track.push({ w: w.w, start: w.start + offset, end: w.end + offset });
      }
      offset += Number(meta.durationSec ?? 0);
    }
    const captionsPath = `videos/${video.id}/captions.json`;
    await uploadMedia(captionsPath, JSON.stringify(track), "application/json");
    await db.from("assets").insert({
      video_id: video.id,
      kind: "captions",
      provider: voiceProviderFor(project.voice_id),
      storage_path: captionsPath,
      meta: { words: track.length, durationSec: offset },
      cost_usd: 0,
    });
  } else {
    await db.from("assets").insert({
      video_id: video.id,
      kind: "captions",
      provider: "mock:elevenlabs",
      storage_path: `mock/${video.id}/captions.json`,
      meta: { words: 940 },
      cost_usd: 0,
    });
  }
  await setStatus(db, video.id, "ASSETS_READY");
}

type AssetDraft = {
  row: {
    video_id: string;
    kind: string;
    provider: string;
    storage_path: string;
    beat_index?: number;
    meta: Record<string, unknown>;
    cost_usd: number;
  };
  cost: { provider: string; usd: number; description: string };
};

/** One beat's visual: stock beats search Pexels (free), hero beats get a
    premium FLUX render, b-roll gets the fast/cheap FLUX tier. Any provider
    failure degrades to a mock tile rather than failing the stage. */
async function makeBeatClip(
  video: Video,
  project: Project,
  beat: ScriptBeat,
): Promise<AssetDraft> {
  const prompt = `${beat.visualPrompt}. ${project.brand_kit.thumbnailStyle} style, cinematic 16:9, no text, no watermark`;
  try {
    if (beat.shotType === "stock") {
      const stock = await searchStockClip(beat.visualPrompt);
      if (stock) {
        return {
          row: {
            video_id: video.id,
            kind: "clip",
            provider: "pexels",
            storage_path: "",
            beat_index: beat.idx,
            meta: {
              shotType: beat.shotType,
              url: stock.url,
              posterUrl: stock.posterUrl,
              durationSec: stock.durationSec,
              pexelsId: stock.pexelsId,
              credit: stock.photographer,
            },
            cost_usd: 0,
          },
          cost: { provider: "pexels", usd: 0, description: "Licensed stock clip — free" },
        };
      }
      // No stock match → fall through to a generated still.
    }
    if (isFalLive()) {
      const quality = beat.shotType === "hero" ? "dev" : "schnell";
      const img = await generateImage({ prompt, quality });
      const path = `videos/${video.id}/beat-${beat.idx}.jpg`;
      await uploadMedia(path, img.image, "image/jpeg");
      return {
        row: {
          video_id: video.id,
          kind: "clip",
          provider: "fal.ai",
          storage_path: path,
          beat_index: beat.idx,
          meta: { shotType: beat.shotType, stillImage: true, model: `flux/${quality}` },
          cost_usd: img.costUsd,
        },
        cost: {
          provider: "fal.ai",
          usd: img.costUsd,
          description: quality === "dev" ? "Hero shot (FLUX dev)" : "B-roll still (FLUX schnell)",
        },
      };
    }
  } catch (err) {
    console.error(`beat ${beat.idx} visual generation failed:`, err);
  }
  const stock = beat.shotType === "stock";
  return {
    row: {
      video_id: video.id,
      kind: "clip",
      provider: stock ? "mock:pexels" : "mock:fal.ai",
      storage_path: `mock/${video.id}/clip-${beat.idx}.mp4`,
      beat_index: beat.idx,
      meta: { shotType: beat.shotType },
      cost_usd: stock ? MOCK_COSTS.stockClip.usd : MOCK_COSTS.clip.usd,
    },
    cost: stock ? MOCK_COSTS.stockClip : MOCK_COSTS.clip,
  };
}

const THUMB_ANGLES = [
  "extreme close-up, dramatic lighting, high emotional intensity",
  "wide symbolic scene, bold central subject, strong silhouette",
  "conceptual metaphor, minimal composition, one striking focal object",
];

async function makeThumbCandidate(
  video: Video,
  project: Project,
  variant: number,
): Promise<AssetDraft> {
  try {
    if (isFalLive()) {
      const prompt = `YouTube thumbnail background for a video titled "${video.title}" in the ${project.niche} niche. ${THUMB_ANGLES[variant]}. ${project.brand_kit.thumbnailStyle} style, color palette ${project.brand_kit.primary} and ${project.brand_kit.secondary}, ultra sharp, 16:9, no text, no watermark`;
      const img = await generateImage({ prompt, quality: "schnell" });
      const path = `videos/${video.id}/thumb-${variant}.jpg`;
      await uploadMedia(path, img.image, "image/jpeg");
      return {
        row: {
          video_id: video.id,
          kind: "thumb",
          provider: "fal.ai",
          storage_path: path,
          meta: { variant, style: project.brand_kit.thumbnailStyle },
          cost_usd: img.costUsd,
        },
        cost: { provider: "fal.ai", usd: img.costUsd, description: "Thumbnail candidate" },
      };
    }
  } catch (err) {
    console.error(`thumbnail ${variant} generation failed:`, err);
  }
  return {
    row: {
      video_id: video.id,
      kind: "thumb",
      provider: "mock:fal.ai",
      storage_path: `mock/${video.id}/thumb-${variant}.png`,
      meta: { variant, style: project.brand_kit.thumbnailStyle },
      cost_usd: MOCK_COSTS.thumbnail.usd,
    },
    cost: MOCK_COSTS.thumbnail,
  };
}

async function runAssembly(db: Db, video: Video): Promise<"external" | void> {
  // Live-asset videos are rendered by the GitHub Actions farm (cron, ≤10 min
  // pickup): leave the video at ASSEMBLING; the worker advances it to
  // FINAL_REVIEW when the MP4 + Short land in Storage.
  const { data: liveVo } = await db
    .from("assets")
    .select("id")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .not("provider", "like", "mock:%")
    .limit(1);
  if (liveVo && liveVo.length > 0) return "external";

  await db.from("assets").delete().eq("video_id", video.id).eq("kind", "render");
  await sleep(STAGE_DELAY_MS);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "render",
    provider: "mock:remotion",
    storage_path: `mock/${video.id}/final.mp4`,
    meta: { resolution: "1080p", durationSec: video.target_length_sec },
    cost_usd: MOCK_COSTS.render.usd,
  });
  await recordCost(db, video, MOCK_COSTS.render);
  await setStatus(db, video.id, "FINAL_REVIEW");
}

// ── Engine entry point ────────────────────────────────────────────────

/**
 * Advances a video through every stage it can run unattended, stopping at
 * the next review gate (or on a budget/kill pause). Safe to call after any
 * decision — it picks up from the video's current status.
 */
export async function runPipeline(videoId: string, dbArg?: Db): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());

  for (let hop = 0; hop < 8; hop++) {
    const video = await getVideo(db, videoId);
    if (!video) return { ok: false, error: "Video not found" };
    const project = await getProject(db, video.project_id);
    if (!project) return { ok: false, error: "Project not found" };

    if (await isKillSwitchOn(db)) {
      await db
        .from("videos")
        .update({ paused_reason: "Global kill switch is on" })
        .eq("id", videoId);
      return { ok: false, error: "Global kill switch is on" };
    }
    if (project.status !== "active") {
      await db
        .from("videos")
        .update({ paused_reason: "Project is paused" })
        .eq("id", videoId);
      return { ok: false, error: "Project is paused" };
    }

    const gate = GATE_FOR_STATUS[video.status];
    if (gate) {
      if (video.paused_reason)
        await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
      await arriveAtGate(db, video, project, gate);
      return { ok: true };
    }

    const paidStage = ["IDEA_APPROVED", "SCRIPTING", "GENERATING_ASSETS", "ASSEMBLING"]
      .includes(video.status);
    if (paidStage) {
      const pause = await budgetPause(db, video, project);
      if (pause) {
        await db.from("videos").update({ paused_reason: pause }).eq("id", videoId);
        return { ok: false, error: pause };
      }
      if (video.paused_reason)
        await db.from("videos").update({ paused_reason: null }).eq("id", videoId);
    }

    switch (video.status) {
      case "IDEA_APPROVED":
        await setStatus(db, videoId, "SCRIPTING");
        break;
      case "SCRIPTING":
        await runScripting(db, video, project);
        break;
      case "GENERATING_ASSETS":
        await runAssetGeneration(db, video, project);
        break;
      case "ASSEMBLING": {
        const result = await runAssembly(db, video);
        if (result === "external") return { ok: true }; // farm takes over
        break;
      }
      default:
        return { ok: true }; // APPROVED / TRACKING / KILLED / NEEDS_REVISION
    }
  }
  return { ok: true };
}

/** Idea #3 — reroll a single beat's visual at the Assets gate, optionally
    steered by a note, without re-running the whole stage. */
export async function rerollBeatVisual(opts: {
  videoId: string;
  beatIdx: number;
  note?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find(
    (b) => b.idx === opts.beatIdx,
  );
  if (!beat) return { ok: false, error: "Beat not found" };

  const steered = opts.note?.trim()
    ? { ...beat, visualPrompt: `${beat.visualPrompt}. ${opts.note.trim()}` }
    : beat;
  const draft = await makeBeatClip(video, project, steered);
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert(draft.row);
  await recordCost(db, video, draft.cost, `reroll beat ${opts.beatIdx + 1}`);
  return { ok: true };
}

/** Phase 6.5 — apply a chosen licensed candidate to a beat. Images are
    copied into Storage so the render farm uses them and links never rot;
    videos keep their direct (licensed) file URL. Attribution metadata is
    stored on the asset for the ledger / Publish Kit. */
export async function applySourceClip(opts: {
  videoId: string;
  beatIdx: number;
  candidate: SourceCandidate;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const c = opts.candidate;

  // Re-screen the licence server-side — never trust a client-supplied verdict.
  const lic = classifyLicense(c.license.id, c.license.url);
  if (!lic) {
    return { ok: false, error: "That source's licence isn't usable for commercial remix." };
  }

  const meta: Record<string, unknown> = {
    shotType: "stock",
    sourceProvider: c.provider,
    sourceUrl: c.sourceUrl,
    author: c.author,
    license: lic,
    fromLibrary: true,
  };
  let storagePath = "";

  if (c.kind === "video") {
    meta.url = c.fullUrl; // OffthreadVideo streams the licensed file directly
    meta.posterUrl = c.thumbUrl;
    meta.durationSec = c.durationSec;
  } else {
    // Download the still into our bucket (small) so the render can pan it.
    const res = await fetch(c.fullUrl);
    if (!res.ok) return { ok: false, error: `Couldn't fetch the image (HTTP ${res.status}).` };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = c.fullUrl.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    storagePath = `videos/${video.id}/beat-${opts.beatIdx}-lib.${ext.slice(0, 4)}`;
    await uploadMedia(storagePath, buf, contentTypeFor(ext));
    meta.posterUrl = c.thumbUrl;
    meta.stillImage = true;
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: c.provider,
    storage_path: storagePath,
    beat_index: opts.beatIdx,
    meta,
    cost_usd: 0,
  });
  await recordCost(
    db,
    video,
    { provider: c.provider, usd: 0, description: `Licensed ${c.kind} (${lic.label}) — free` },
    `beat ${opts.beatIdx + 1}`,
  );
  return { ok: true };
}

/**
 * Gaming-compliant lane (Phase 10): attach an official **press-kit** or
 * **own-capture** asset to a beat by URL. Deliberately skips the automatic
 * licence screen — this lane is *manually gated*: the operator vouches that
 * the URL is a publisher-permitted press asset or their own recording. It is
 * never reachable by the autonomous agent. Attribution is required and flows
 * into the Publish Kit description.
 */
export async function applyPressKitClip(opts: {
  videoId: string;
  beatIdx: number;
  url: string;
  title: string;
  author: string;
  sourceUrl?: string;
  kind: "image" | "video";
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (!/^https?:\/\//i.test(opts.url)) {
    return { ok: false, error: "Enter a full https:// URL to the asset." };
  }

  const license = {
    id: "press-kit",
    label: "Official press kit / own-capture",
    url: opts.sourceUrl || undefined,
    requiresAttribution: true,
  };
  const meta: Record<string, unknown> = {
    shotType: "stock",
    sourceProvider: "press-kit",
    sourceUrl: opts.sourceUrl || opts.url,
    author: opts.author || "Publisher press kit",
    title: opts.title,
    license,
    fromLibrary: true,
    manualPressKit: true,
  };
  let storagePath = "";

  if (opts.kind === "video") {
    meta.url = opts.url;
    meta.posterUrl = opts.url;
  } else {
    const res = await fetch(opts.url);
    if (!res.ok) return { ok: false, error: `Couldn't fetch the asset (HTTP ${res.status}).` };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = opts.url.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    storagePath = `videos/${video.id}/beat-${opts.beatIdx}-presskit.${ext.slice(0, 4)}`;
    await uploadMedia(storagePath, buf, contentTypeFor(ext));
    meta.posterUrl = opts.url;
    meta.stillImage = true;
  }

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: "press-kit",
    storage_path: storagePath,
    beat_index: opts.beatIdx,
    meta,
    cost_usd: 0,
  });
  return { ok: true };
}

function contentTypeFor(ext: string): string {
  if (ext.startsWith("png")) return "image/png";
  if (ext.startsWith("gif")) return "image/gif";
  if (ext.startsWith("webp")) return "image/webp";
  return "image/jpeg";
}

/** Inline script edit: saves a new script version with the edited beat and
    re-synthesizes VO for just that beat (live mode only). */
export async function editScriptBeat(opts: {
  videoId: string;
  beatIdx: number;
  text: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const { data: script } = await db
    .from("scripts")
    .select("*")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!script) return { ok: false, error: "No script to edit" };

  const beats = (script.beats as ScriptBeat[]).map((b) =>
    b.idx === opts.beatIdx ? { ...b, text: opts.text } : b,
  );
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtime_sec: script.runtime_sec,
    metadata: script.metadata,
  });

  // Regenerate VO only for the edited section, and only if VO exists yet
  // (i.e. the video has passed the asset stage at least once).
  const { data: voAsset } = await db
    .from("assets")
    .select("id")
    .eq("video_id", video.id)
    .eq("kind", "vo")
    .eq("beat_index", opts.beatIdx)
    .maybeSingle();
  if (voAsset && canSynthesize(project.voice_id)) {
    const beat = beats.find((b) => b.idx === opts.beatIdx)!;
    const r = await synthesizeBeatVo(db, video, project, beat);
    await recordCost(
      db,
      video,
      {
        provider: r.provider,
        usd: r.costUsd,
        description: r.cached
          ? "Voiceover reused from cache — free"
          : "Voiceover re-synthesis (edited beat)",
      },
      `beat ${opts.beatIdx + 1}`,
    );
  }
  return { ok: true };
}

/** Title/description edits from the script review screen — versioned like
    any other script change. */
export async function editVideoMetadata(opts: {
  videoId: string;
  title: string;
  description: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };

  const { data: script } = await db
    .from("scripts")
    .select("*")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!script) return { ok: false, error: "No script yet" };

  const metadata = {
    ...(script.metadata as Record<string, unknown>),
    titles: [
      opts.title,
      ...(((script.metadata as { titles?: string[] }).titles ?? []).filter(
        (t) => t !== opts.title,
      )),
    ].slice(0, 3),
    description: opts.description,
  };
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: script.body,
    beats: script.beats,
    runtime_sec: script.runtime_sec,
    metadata,
  });
  await db.from("videos").update({ title: opts.title }).eq("id", video.id);
  return { ok: true };
}

/** Resolve a gate decision, then let the engine continue. */
export async function decideGate(
  opts: {
    videoId: string;
    decision: "approved" | "revision" | "killed";
    notes?: string;
  },
  dbArg?: Db,
  decidedBy: "human" | "mcp" = "human",
): Promise<EngineResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };

  const gate = GATE_FOR_STATUS[video.status];
  if (!gate) return { ok: false, error: `No open gate for status ${video.status}` };

  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: opts.decision,
    decided_by: decidedBy,
    notes: opts.notes ?? null,
    decided_at: new Date().toISOString(),
  });

  if (opts.decision === "killed") {
    await setStatus(db, video.id, "KILLED");
    return { ok: true };
  }

  if (opts.decision === "revision") {
    // Visible NEEDS_REVISION blip, then loop back to the prior stage with
    // the notes injected by the stage body.
    await setStatus(db, video.id, "NEEDS_REVISION");
    await sleep(400);
    const target = REVISION_TARGET[gate];
    if (gate === "IDEA") {
      // Revising an idea sharpens it in place rather than re-running a stage.
      await db
        .from("videos")
        .update({ status: target, topic: video.topic })
        .eq("id", video.id);
      return { ok: true };
    }
    await setStatus(db, video.id, target);
    return runPipeline(video.id, db);
  }

  const next = ON_APPROVE[video.status];
  if (!next) return { ok: false, error: "No approve transition" };
  await setStatus(db, video.id, next);
  return runPipeline(video.id, db);
}
