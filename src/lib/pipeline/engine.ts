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
import { createClient } from "@/lib/supabase/server";
import { sendPushToAll } from "@/lib/push";
import type { Project, Video } from "@/lib/db/types";
import { MOCK_COSTS, mockScript } from "./mock-content";

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

/** A video arrived at a review gate: notify, then either wait for a human
    (Assist / Co-pilot until the Phase 8 QC agent exists) or auto-resolve
    the waitpoint (Autopilot). */
async function arriveAtGate(
  db: Db,
  video: Video,
  project: Project,
  gate: ApprovalGate,
): Promise<void> {
  try {
    await sendPushToAll({
      title: `${GATE_LABELS[gate]} ready for review`,
      body: `“${video.title}” — ${project.name}`,
      url: `/projects/${project.id}/review`,
    });
  } catch (err) {
    // Push is best-effort — never let delivery problems block the pipeline.
    console.error("web-push delivery failed:", err);
  }

  const mode: AutonomyMode = project.autonomy?.[gate] ?? "assist";
  if (mode !== "autopilot") return;

  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: "approved",
    decided_by: "autopilot",
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

// ── Stage bodies (mock providers) ─────────────────────────────────────

async function runScripting(db: Db, video: Video, project: Project) {
  const notes = await latestNotes(db, video.id);
  await sleep(STAGE_DELAY_MS);

  const draft = mockScript({
    title: video.title,
    topic: video.topic,
    tone: project.tone,
    targetLengthSec: video.target_length_sec,
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
  await recordCost(db, video, MOCK_COSTS.scriptGeneration, `“${video.title}”`);
  await recordCost(db, video, MOCK_COSTS.metadataPackage);
  await setStatus(db, video.id, "SCRIPT_READY");
}

async function runAssetGeneration(db: Db, video: Video, project: Project) {
  const { data: script } = await db
    .from("scripts")
    .select("beats")
    .eq("video_id", video.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const beats = (script?.beats ?? []) as { idx: number; shotType: string }[];

  // Re-running after a revision replaces the previous attempt's assets.
  await db
    .from("assets")
    .delete()
    .eq("video_id", video.id)
    .in("kind", ["vo", "clip", "thumb", "captions"]);

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

  for (const beat of beats) {
    const stock = beat.shotType === "stock";
    const cost = stock ? MOCK_COSTS.stockClip : MOCK_COSTS.clip;
    await db.from("assets").insert({
      video_id: video.id,
      kind: "clip",
      provider: stock ? "mock:pexels" : "mock:fal.ai",
      storage_path: `mock/${video.id}/clip-${beat.idx}.mp4`,
      beat_index: beat.idx,
      meta: { shotType: beat.shotType },
      cost_usd: cost.usd,
    });
    await recordCost(db, video, cost, `beat ${beat.idx + 1}`);
  }

  for (let i = 0; i < 4; i++) {
    await db.from("assets").insert({
      video_id: video.id,
      kind: "thumb",
      provider: "mock:fal.ai",
      storage_path: `mock/${video.id}/thumb-${i}.png`,
      meta: { variant: i, style: project.brand_kit.thumbnailStyle },
      cost_usd: MOCK_COSTS.thumbnail.usd,
    });
    await recordCost(db, video, MOCK_COSTS.thumbnail, `candidate ${i + 1}`);
  }

  await db.from("assets").insert({
    video_id: video.id,
    kind: "captions",
    provider: "mock:elevenlabs",
    storage_path: `mock/${video.id}/captions.json`,
    meta: { words: 940 },
    cost_usd: 0,
  });
  await setStatus(db, video.id, "ASSETS_READY");
}

async function runAssembly(db: Db, video: Video) {
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
export async function runPipeline(videoId: string): Promise<EngineResult> {
  const db = await createClient();

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
      case "ASSEMBLING":
        await runAssembly(db, video);
        break;
      default:
        return { ok: true }; // APPROVED / TRACKING / KILLED / NEEDS_REVISION
    }
  }
  return { ok: true };
}

/** Resolve a gate decision, then let the engine continue. */
export async function decideGate(opts: {
  videoId: string;
  decision: "approved" | "revision" | "killed";
  notes?: string;
}): Promise<EngineResult> {
  const db = await createClient();
  const video = await getVideo(db, opts.videoId);
  if (!video) return { ok: false, error: "Video not found" };

  const gate = GATE_FOR_STATUS[video.status];
  if (!gate) return { ok: false, error: `No open gate for status ${video.status}` };

  await db.from("approvals").insert({
    video_id: video.id,
    gate,
    decision: opts.decision,
    decided_by: "human",
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
    return runPipeline(video.id);
  }

  const next = ON_APPROVE[video.status];
  if (!next) return { ok: false, error: "No approve transition" };
  await setStatus(db, video.id, next);
  return runPipeline(video.id);
}
