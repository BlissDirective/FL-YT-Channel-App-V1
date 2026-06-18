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
import {
  generateScript,
  remixScript,
  remixBeat,
  classifyShotTypes,
  type RemixSettings,
  type ScriptRemix,
  type BeatRemix,
} from "@/lib/adapters/script";
import { curateHighlights, defaultHighlightCount } from "@/lib/adapters/highlights";
import type { CuratedHighlight } from "@/lib/db/types";
import { COPILOT_AUTO_APPROVE_SCORE, reviewGate } from "@/lib/adapters/qc";
import { canSynthesize, synthesizeSpeech, voiceProviderFor } from "@/lib/adapters/voice";
import { generateImage, generateVideo, isFalLive } from "@/lib/adapters/fal";
import {
  clampDuration,
  estimateClipCost,
  getVideoModel,
  VIDEO_MONTHLY_CAP_USD,
  VIDEO_PROVIDER,
} from "@/lib/adapters/video-models";
import { selectClipBeats, type AutoTier } from "@/lib/adapters/auto-tiers";
import { searchStockClip } from "@/lib/adapters/stock";
import { classifyLicense, type SourceCandidate } from "@/lib/adapters/sources";
import { getSignedMediaUrl, uploadMedia } from "@/lib/storage";
import type { CustomSpec, Project, ScriptBeat, Video } from "@/lib/db/types";
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
  // Full Auto owns advancement past the Assets gate (it pauses here so the
  // generated clips can replace the stills before the render runs).
  if (gate === "ASSETS" && video.auto_finish) return;
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
    // Thread the same client — a fresh createClient() runs unauthenticated
    // under the service role (MCP/cron/autopilot), which RLS blocks → stall.
    await runPipeline(video.id, db);
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

  // Opt-in: curate kinetic highlights off the fresh script (auto when enabled).
  if (video.enable_highlights) {
    try {
      await runHighlightCuration(db, video, project, draft.beats);
    } catch (err) {
      // Never block the script gate on the highlight pass.
      console.error("highlight curation failed:", err);
    }
  }

  await setStatus(db, video.id, "SCRIPT_READY");
}

/** Curate highlights for a set of beats and persist them on the video. */
async function runHighlightCuration(
  db: Db,
  video: Video,
  project: Project,
  beats: ScriptBeat[],
): Promise<CuratedHighlight[]> {
  const targetCount =
    video.highlight_count > 0
      ? video.highlight_count
      : defaultHighlightCount(video.target_length_sec);
  const result = await curateHighlights({
    title: video.title,
    niche: project.niche,
    topic: video.topic,
    tone: project.tone,
    format: video.format,
    beats,
    targetCount,
    brandPrimary: project.brand_kit?.primary ?? "#F5B829",
  });
  await db.from("videos").update({ highlights: result.highlights }).eq("id", video.id);
  await recordCost(
    db,
    video,
    {
      provider: result.provider === "anthropic" ? "anthropic" : "mock:anthropic",
      usd: result.costUsd,
      description: `Highlight curation (${result.provider === "anthropic" ? "Claude" : "mock"})`,
    },
    `${result.highlights.length} highlights`,
  );
  return result.highlights;
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
  // Visual-only sections have no narration — nothing to synthesize.
  if (!beat.text.trim()) return { costUsd: 0, cached: false, provider: voiceProviderFor(voiceId) };
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

/** Run an async fn over items with bounded concurrency — keeps us under
    provider rate/concurrency limits (e.g. ElevenLabs caps simultaneous TTS
    requests, which otherwise 429s and strands the whole stage). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
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
    // VO is the only unguarded provider call here — cap concurrency so a long
    // script can't 429 ElevenLabs and reject the whole stage.
    liveVoice
      ? mapLimit(beats, 2, (beat) => synthesizeBeatVo(db, video, project, beat))
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
  const short = video.kind === "short";
  await db.from("assets").insert({
    video_id: video.id,
    kind: "render",
    provider: "mock:remotion",
    storage_path: `mock/${video.id}/${short ? "short" : "final"}.mp4`,
    meta: {
      variant: short ? "short" : "long",
      resolution: short ? "1080x1920" : "1080p",
      durationSec: video.target_length_sec,
    },
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

    try {
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
    } catch (err) {
      // A thrown stage (e.g. a live provider error) must never leave the video
      // silently stuck. Record a visible, retryable pause reason instead.
      const msg = err instanceof Error ? err.message : String(err);
      const stage = video.status.replace(/_/g, " ").toLowerCase();
      await db
        .from("videos")
        .update({ paused_reason: `${stage} failed: ${msg.slice(0, 180)}` })
        .eq("id", videoId);
      console.error(`pipeline stage ${video.status} failed for ${videoId}:`, err);
      return { ok: false, error: msg };
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

// ── Beat shot-type (hero / broll / stock) ─────────────────────────────
// shotType is metadata (it doesn't change VO), so we update the latest
// script row in place rather than spawning a new version.

export async function setBeatShotType(opts: {
  videoId: string;
  beatIdx: number;
  shotType: ScriptBeat["shotType"];
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).map((b) =>
    b.idx === opts.beatIdx ? { ...b, shotType: opts.shotType } : b,
  );
  await db.from("scripts").update({ beats }).eq("id", script.id);
  return { ok: true };
}

export type ClassifyResult =
  | { ok: true; shots: { idx: number; shotType: ScriptBeat["shotType"] }[] }
  | { ok: false; error: string };

export async function autoClassifyShotTypes(
  opts: { videoId: string },
  dbArg?: Db,
): Promise<ClassifyResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to classify" };

  const beats = script.beats as ScriptBeat[];
  const { classifications, costUsd } = await classifyShotTypes({
    niche: project.niche,
    beats: beats.map((b) => ({ idx: b.idx, text: b.text, visualPrompt: b.visualPrompt })),
  });
  const map = new Map(classifications.map((c) => [c.idx, c.shotType]));
  const updated = beats.map((b) => ({ ...b, shotType: map.get(b.idx) ?? b.shotType }));
  await db.from("scripts").update({ beats: updated }).eq("id", script.id);
  if (costUsd > 0) {
    await recordCost(db, video, { provider: "anthropic", usd: costUsd, description: "Auto-classify shot types" });
  }
  return { ok: true, shots: classifications };
}

// ── Section (beat) editing — add / delete / move / merge ──────────────
// Beats live in the latest script's `beats` jsonb; edits update it in place
// and re-index. Visual-only sections carry empty narration (skipped by VO).

function reindex(beats: ScriptBeat[]): ScriptBeat[] {
  return beats.map((b, i) => ({ ...b, idx: i }));
}

async function saveBeats(db: Db, scriptId: string, beats: ScriptBeat[]) {
  await db.from("scripts").update({ beats: reindex(beats) }).eq("id", scriptId);
}

export async function addBeat(opts: {
  videoId: string;
  afterIdx: number;
  beat: { text: string; visualPrompt: string; shotType: ScriptBeat["shotType"] };
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).slice();
  const pos = Math.min(Math.max(opts.afterIdx + 1, 0), beats.length);
  beats.splice(pos, 0, { idx: pos, ...opts.beat });
  await saveBeats(db, script.id, beats);
  return { ok: true };
}

export async function deleteBeat(opts: { videoId: string; beatIdx: number }): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).filter((b) => b.idx !== opts.beatIdx);
  if (beats.length === 0) return { ok: false, error: "A video needs at least one section" };
  await saveBeats(db, script.id, beats);
  // Drop any assets tied to the removed section.
  await db.from("assets").delete().eq("video_id", opts.videoId).eq("beat_index", opts.beatIdx);
  return { ok: true };
}

export async function moveBeat(opts: {
  videoId: string;
  beatIdx: number;
  dir: "up" | "down";
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const beats = (script.beats as ScriptBeat[]).slice().sort((a, b) => a.idx - b.idx);
  const i = beats.findIndex((b) => b.idx === opts.beatIdx);
  const j = opts.dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= beats.length) return { ok: true }; // edge — no-op
  [beats[i], beats[j]] = [beats[j], beats[i]];
  await saveBeats(db, script.id, beats);
  return { ok: true };
}

/** Merge sections start..end into one (concatenated narration, first beat's
    visual direction). Used by the auto-stitch "merge sections" flow. */
export async function mergeBeats(opts: {
  videoId: string;
  startIdx: number;
  endIdx: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const script = await loadLatestScript(db, opts.videoId);
  if (!script) return { ok: false, error: "No script to edit" };
  const lo = Math.min(opts.startIdx, opts.endIdx);
  const hi = Math.max(opts.startIdx, opts.endIdx);
  const beats = (script.beats as ScriptBeat[]).slice().sort((a, b) => a.idx - b.idx);
  if (lo < 0 || hi >= beats.length || hi <= lo) return { ok: false, error: "Pick a valid section range" };
  const span = beats.slice(lo, hi + 1);
  const merged: ScriptBeat = {
    idx: lo,
    text: span.map((b) => b.text).filter(Boolean).join(" "),
    visualPrompt: span[0].visualPrompt,
    shotType: span[0].shotType,
  };
  const next = [...beats.slice(0, lo), merged, ...beats.slice(hi + 1)];
  await saveBeats(db, script.id, next);
  // Old per-section assets in the merged range are now stale.
  for (let k = lo; k <= hi; k++) {
    await db.from("assets").delete().eq("video_id", opts.videoId).eq("beat_index", k);
  }
  return { ok: true };
}

// ── Long-clip jobs (Veo-extend / auto-stitch) → background worker ──────

export type EnqueueResult = { ok: true; jobId: string } | { ok: false; error: string };

export async function enqueueLongClip(opts: {
  videoId: string;
  beatIdx: number;
  method: "veo-extend" | "stitch" | "stitch-seamless";
  model: string;
  targetSec: number;
  estCostUsd: number;
  heroHold?: boolean;
}): Promise<EnqueueResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const spent = await monthVideoSpend(db);
  if (spent + opts.estCostUsd > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `Monthly video budget reached ($${VIDEO_MONTHLY_CAP_USD}). $${spent.toFixed(2)} used; this clip needs ~$${opts.estCostUsd.toFixed(2)}.`,
    };
  }
  const { data, error } = await db
    .from("clip_jobs")
    .insert({
      video_id: opts.videoId,
      project_id: video.project_id,
      beat_idx: opts.beatIdx,
      method: opts.method,
      model: opts.model,
      target_sec: opts.targetSec,
      hero_hold: Boolean(opts.heroHold),
      status: "queued",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not queue clip" };
  return { ok: true, jobId: data.id as string };
}

// ── Full Auto-Generate — one tap → whole video, pause at Final ────────

export type FullAutoResult =
  | { ok: true; enqueued: number; estCostUsd: number }
  | { ok: false; error: string };

export async function fullAutoGenerate(
  opts: {
    videoId: string;
    tier: AutoTier;
    /** Custom-tier recipe (models + lengths + price cap). Ignored otherwise. */
    custom?: CustomSpec;
  },
  dbArg?: Db,
): Promise<FullAutoResult> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (video.status !== "SCRIPT_READY") {
    return { ok: false, error: "Full Auto runs from the Script gate — approve later stages manually." };
  }

  // 1) Classify shot types so the smart mix targets the right sections.
  await autoClassifyShotTypes({ videoId: opts.videoId }, db);

  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, opts.videoId);
  const beats = (script?.beats ?? []) as ScriptBeat[];
  const voDur = await voDurations(db, opts.videoId);
  const secFor = (b: ScriptBeat) =>
    voDur.get(b.idx) || Math.max(4, b.text.trim().split(/\s+/).length / 2.5);

  // 2) Plan which beats get AI video: hero bookends + length-scaled b-roll,
  //    packed under the per-video budget. Un-picked beats keep their free
  //    still/stock. Economy honours the project's ai_clip_cap; Custom uses its
  //    own models + price cap (and pauses rather than downgrading on overrun).
  const custom = opts.tier === "custom" ? opts.custom : undefined;
  if (opts.tier === "custom" && !custom) {
    return { ok: false, error: "Custom tier needs a model recipe (hero, b-roll, lengths, price cap)." };
  }
  const maxUsd = custom ? custom.maxUsd : Number(project.max_video_usd ?? 8);
  const selection = selectClipBeats(
    opts.tier,
    beats.map((b) => ({ idx: b.idx, shotType: b.shotType, scriptSec: secFor(b) })),
    {
      clipCap: opts.tier === "economy" ? Number(project.ai_clip_cap ?? 3) : undefined,
      maxUsd,
      custom,
      // Native Shorts animate densely (motion the whole way through).
      shortMode: video.kind === "short",
    },
  );
  // Custom pauses (does not silently downgrade) when the plan exceeds the cap.
  if (custom && selection.overBudget) {
    return {
      ok: false,
      error: `Your selections (~$${selection.requestedUsd.toFixed(2)}) exceed the $${maxUsd.toFixed(2)} price cap. Raise the cap, or pick cheaper models / shorter clips.`,
    };
  }
  const { clips, totalUsd: estCostUsd } = selection;
  const spent = await monthVideoSpend(db);
  if (spent + estCostUsd > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `This run (~$${estCostUsd.toFixed(2)}) would exceed the $${VIDEO_MONTHLY_CAP_USD}/mo cap ($${spent.toFixed(2)} used).`,
    };
  }

  // Default kinetic highlights ON for auto-generated videos (the operator can
  // still edit/clear them in the highlights editor). Curate now from the
  // script — timing is resolved from the VO word timings at render. Skip if the
  // operator already enabled them (runScripting curated at the Script gate),
  // and never block the run on it.
  if (!video.enable_highlights) {
    try {
      await db.from("videos").update({ enable_highlights: true }).eq("id", opts.videoId);
      video.enable_highlights = true;
      await runHighlightCuration(db, video, project, beats);
    } catch (err) {
      console.error("full-auto highlight curation failed:", err);
    }
  }

  // 3) Mark auto-finish FIRST so the Assets gate holds (arriveAtGate sees it)
  //    while clips generate — the worker advances to render once they land.
  await db.from("videos").update({ auto_finish: true }).eq("id", opts.videoId);

  // 4) Approve the script gate → runs VO + stock + base stills → ASSETS_READY.
  await decideGate({ videoId: opts.videoId, decision: "approved" }, db);

  // 5) Enqueue a clip job only for the selected beats.
  for (const c of clips) {
    await db.from("clip_jobs").insert({
      video_id: opts.videoId,
      project_id: video.project_id,
      beat_idx: c.idx,
      method: "stitch",
      model: c.job.model,
      target_sec: c.job.targetSec,
      hero_hold: c.job.heroHold,
      status: "queued",
    });
  }
  return { ok: true, enqueued: clips.length, estCostUsd };
}

/**
 * Retry a video's clip jobs after a provider outage (e.g. fal balance
 * exhausted). Any beat whose keyframe degraded to a mock placeholder is
 * re-rendered as a real still now that the provider is live again (cheap —
 * skips beats that already hold a real still or a finished video clip), then
 * the errored clip jobs are requeued for the worker. VO is untouched.
 */
export async function retryClips(
  opts: { videoId: string },
  dbArg?: Db,
): Promise<{ ok: true; regenerated: number; requeued: number } | { ok: false; error: string }> {
  const db = dbArg ?? (await createClient());
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  const script = await loadLatestScript(db, opts.videoId);
  const beats = (script?.beats ?? []) as ScriptBeat[];
  const { data: existing } = await db
    .from("assets")
    .select("beat_index, provider, meta")
    .eq("video_id", opts.videoId)
    .eq("kind", "clip");

  let regenerated = 0;
  for (const beat of beats) {
    const cur = (existing ?? []).find((a) => a.beat_index === beat.idx);
    // Keep finished video clips and real (non-mock) stills/stock as-is.
    if ((cur?.meta as { isVideo?: boolean } | undefined)?.isVideo) continue;
    if (cur && !String(cur.provider).startsWith("mock")) continue;
    const draft = await makeBeatClip(video, project, beat);
    await db
      .from("assets")
      .delete()
      .eq("video_id", opts.videoId)
      .eq("kind", "clip")
      .eq("beat_index", beat.idx);
    await db.from("assets").insert(draft.row);
    await recordCost(db, video, draft.cost, `beat ${beat.idx + 1} (retry)`);
    regenerated += 1;
  }

  const { data: requeuedRows } = await db
    .from("clip_jobs")
    .update({ status: "queued", error: null })
    .eq("video_id", opts.videoId)
    .eq("status", "error")
    .lt("attempts", 3) // don't requeue jobs that already exhausted their retries
    .select("id");
  return { ok: true, regenerated, requeued: (requeuedRows ?? []).length };
}

async function voDurations(db: Db, videoId: string): Promise<Map<number, number>> {
  const { data } = await db
    .from("assets")
    .select("beat_index, meta")
    .eq("video_id", videoId)
    .eq("kind", "vo");
  const m = new Map<number, number>();
  for (const a of data ?? []) {
    if (a.beat_index !== null) m.set(a.beat_index, Number((a.meta as { durationSec?: number }).durationSec ?? 0));
  }
  return m;
}

// ── Phase B — generated video clips (Kling / Veo / Seedance via fal) ───

export type VideoGenResult =
  | { ok: true; url: string | null; costUsd: number }
  | { ok: false; error: string };

/** Portfolio-wide AI video-generation spend this month (drives the cap). */
async function monthVideoSpend(db: Db): Promise<number> {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();
  const { data } = await db
    .from("cost_ledger")
    .select("usd")
    .eq("provider", VIDEO_PROVIDER)
    .gte("at", monthStart);
  return (data ?? []).reduce((s, r) => s + Number(r.usd ?? 0), 0);
}

/** Generate an original video clip for one beat — image-to-video from our own
    FLUX keyframe when present, else text-to-video. Guarded by the $100/mo video
    cap; replaces the beat's existing clip asset and ledgers the spend. */
export async function generateBeatVideo(opts: {
  videoId: string;
  beatIdx: number;
  modelId: string;
  durationSec: number;
}): Promise<VideoGenResult> {
  const db = await createClient();
  if (!isFalLive()) {
    return { ok: false, error: "Video generation needs FAL_KEY (currently mock mode)." };
  }
  const model = getVideoModel(opts.modelId);
  if (!model) return { ok: false, error: "Unknown video model." };
  const dur = clampDuration(model, opts.durationSec);

  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };

  // $100/mo portfolio cap (estimate-gated before we spend).
  const est = estimateClipCost(model, dur);
  const spent = await monthVideoSpend(db);
  if (spent + est > VIDEO_MONTHLY_CAP_USD) {
    return {
      ok: false,
      error: `Monthly video budget reached ($${VIDEO_MONTHLY_CAP_USD}). $${spent.toFixed(2)} used this month; this clip needs ~$${est.toFixed(2)}.`,
    };
  }

  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beat = ((script?.beats ?? []) as ScriptBeat[]).find((b) => b.idx === opts.beatIdx);
  if (!beat) return { ok: false, error: "Beat not found" };

  // Prefer image-to-video from our own keyframe still, if one exists.
  const { data: still } = await db
    .from("assets")
    .select("storage_path, meta")
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const isStill = still?.storage_path && !(still.meta as { isVideo?: boolean })?.isVideo;
  const imageUrl = isStill ? (await getSignedMediaUrl(still!.storage_path)) ?? undefined : undefined;

  const prompt = `${beat.visualPrompt}. ${project.brand_kit.thumbnailStyle} style, cinematic 16:9, no text, no watermark`;
  const out = await generateVideo({ model, prompt, imageUrl, durationSec: dur });

  const path = `videos/${video.id}/beat-${opts.beatIdx}-video.mp4`;
  await uploadMedia(path, out.video, "video/mp4");

  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .eq("kind", "clip")
    .eq("beat_index", opts.beatIdx);
  await db.from("assets").insert({
    video_id: video.id,
    kind: "clip",
    provider: VIDEO_PROVIDER,
    storage_path: path,
    beat_index: opts.beatIdx,
    meta: {
      shotType: beat.shotType,
      isVideo: true,
      videoModel: model.id,
      model: model.label,
      durationSec: dur,
    },
    cost_usd: out.costUsd,
  });
  await recordCost(
    db,
    video,
    { provider: VIDEO_PROVIDER, usd: out.costUsd, description: `AI video clip (${model.label})` },
    `beat ${opts.beatIdx + 1}`,
  );

  return { ok: true, url: await getSignedMediaUrl(path), costUsd: out.costUsd };
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

// ── Script Remix ──────────────────────────────────────────────────────
// "Propose → accept": a remix call produces a proposed revision WITHOUT
// touching the saved script. The token cost is real either way, so it is
// logged at propose time; persistence happens only on accept.

async function loadLatestScript(db: Db, videoId: string) {
  const { data } = await db
    .from("scripts")
    .select("*")
    .eq("video_id", videoId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export type ScriptRemixResult =
  | { ok: true; remix: ScriptRemix }
  | { ok: false; error: string };

export async function proposeScriptRemix(opts: {
  videoId: string;
  notes: string;
  settings: RemixSettings;
}): Promise<ScriptRemixResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to remix yet" };

  const remix = await remixScript({
    title: video.title,
    niche: project.niche,
    audience: project.audience,
    angle: project.angle,
    tone: project.tone,
    beats: script.beats as ScriptBeat[],
    metadata: script.metadata as ScriptRemix["metadata"],
    runtimeSec: script.runtime_sec ?? video.target_length_sec,
    notes: opts.notes,
    settings: opts.settings,
  });
  if (remix.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: remix.provider, usd: remix.costUsd, description: "Script remix (whole)" },
      "proposed",
    );
  }
  return { ok: true, remix };
}

export type BeatRemixResult =
  | { ok: true; remix: BeatRemix }
  | { ok: false; error: string };

export async function proposeBeatRemix(opts: {
  videoId: string;
  beatIdx: number;
  notes: string;
  settings: RemixSettings;
}): Promise<BeatRemixResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  const project = await getProject(db, video.project_id);
  if (!project) return { ok: false, error: "Project not found" };
  const script = await loadLatestScript(db, video.id);
  if (!script) return { ok: false, error: "No script to remix yet" };

  const remix = await remixBeat({
    title: video.title,
    niche: project.niche,
    tone: project.tone,
    beats: script.beats as ScriptBeat[],
    targetIdx: opts.beatIdx,
    notes: opts.notes,
    settings: opts.settings,
  });
  if (remix.costUsd > 0) {
    await recordCost(
      db,
      video,
      { provider: remix.provider, usd: remix.costUsd, description: "Script remix (section)" },
      `beat ${opts.beatIdx + 1} proposed`,
    );
  }
  return { ok: true, remix };
}

/** Accept a whole-script remix: persist it as a new script version. Asset/VO
    re-sync is intentionally left to the existing per-beat re-voice flow — a
    whole remix is expected at the SCRIPT review stage, before VO exists. */
export async function applyScriptRemix(opts: {
  videoId: string;
  beats: ScriptBeat[];
  runtimeSec: number | null;
  metadata: ScriptRemix["metadata"];
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };
  if (!opts.beats.length) return { ok: false, error: "Remix has no sections" };

  const beats = opts.beats.map((b, idx) => ({ ...b, idx }));
  await db.from("scripts").insert({
    video_id: video.id,
    version: await nextScriptVersion(db, video.id),
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtime_sec: opts.runtimeSec,
    metadata: opts.metadata,
  });
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

// ── Kinetic Highlights ────────────────────────────────────────────────

/** Toggle the opt-in / set the operator target count for a video. */
export async function setHighlightOptions(opts: {
  videoId: string;
  enabled: boolean;
  count: number;
}): Promise<EngineResult> {
  const db = await createClient();
  const { error } = await db
    .from("videos")
    .update({
      enable_highlights: opts.enabled,
      highlight_count: Math.max(0, Math.min(12, Math.round(opts.count))),
    })
    .eq("id", opts.videoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** (Re)run curation for a video against its latest script. */
export async function curateHighlightsForVideo(opts: {
  videoId: string;
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
  const beats = (script?.beats as ScriptBeat[] | undefined) ?? [];
  if (beats.length === 0) return { ok: false, error: "No script to curate yet" };

  // Enabling here is implicit — the operator asked for highlights.
  if (!video.enable_highlights) {
    await db.from("videos").update({ enable_highlights: true }).eq("id", video.id);
    video.enable_highlights = true;
  }
  await runHighlightCuration(db, video, project, beats);
  return { ok: true };
}

/** Persist operator edits to the curated highlights. */
export async function saveHighlights(opts: {
  videoId: string;
  highlights: CuratedHighlight[];
}): Promise<EngineResult> {
  const db = await createClient();
  const { error } = await db
    .from("videos")
    .update({ highlights: opts.highlights })
    .eq("id", opts.videoId);
  if (error) return { ok: false, error: error.message };
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
