"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDirectorMode, bracketById, DIRECTOR_LENGTH_BRACKETS } from "@studio/core";
import {
  decideGate,
  killVideo,
  regenerateScript,
  runDirectedStage,
  runStageReview,
  stepBackStage,
} from "@/lib/pipeline/engine";
import { planNextTopic, taxonomyFor } from "@/lib/adapters/guardrails";
import { DEMO_TOPICS } from "@/lib/pipeline/mock-content";
import {
  directorStageForStatus,
  recordOperatorDecision,
  videoSpendUsd,
  type DirectorStage,
} from "@/lib/pipeline/decisions";
import type { LengthTarget, Project, Video } from "@/lib/db/types";

/**
 * Director Mode stage actions (Fable-5-Director-Mode-Build-Spec.md §5, D2).
 * Every action: (1) asserts the project is in Director Mode, (2) performs one
 * bounded operation by reusing the existing engine/pipeline primitives, and
 * (3) writes one `operator_decisions` row (with the per-action cost delta).
 * Nothing here advances or publishes on its own — each maps 1:1 to a console
 * button the operator presses.
 */

export type DirectorResult = { ok: boolean; error?: string; warning?: string };

type Db = Awaited<ReturnType<typeof createClient>>;

function refresh(projectId: string, videoId?: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/library`);
  if (videoId) revalidatePath(`/projects/${projectId}/videos/${videoId}`);
}

/** Load + gate: returns the project/video only when the project is a director
    project (and, when a videoId is given, the video belongs to it). */
async function directorCtx(
  db: Db,
  projectId: string,
  videoId?: string,
): Promise<{ project: Project; video?: Video } | { error: string }> {
  const { data: proj } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
  const project = proj as Project | null;
  if (!project) return { error: "Project not found." };
  if (!isDirectorMode(project)) return { error: "This project is not in Director Mode." };
  if (!videoId) return { project };
  const { data: vid } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
  const video = vid as Video | null;
  if (!video || video.project_id !== projectId) return { error: "Video not found." };
  return { project, video };
}

/**
 * Generate N new ideas (spec §5 Idea/Generate). Each becomes a video parked at
 * IDEA with the chosen length bracket, awaiting the operator's direction. The
 * idea concept comes from the live planner when available, else a mock concept
 * (mock-first: works with zero credentials).
 */
export async function directorGenerateIdeasAction(
  projectId: string,
  opts: { count: number; format: "short" | "long"; bracket: string; topic?: string },
): Promise<DirectorResult & { created?: number }> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const { project } = ctx;

    const count = Math.max(1, Math.min(5, Math.round(opts.count)));
    const bracket = bracketById(opts.bracket) ?? DIRECTOR_LENGTH_BRACKETS.find((b) => b.format === opts.format);
    if (!bracket) return { ok: false, error: "Pick a length bracket first." };
    const lengthTarget: LengthTarget = {
      format: bracket.format,
      bracket: bracket.id,
      minSec: bracket.minSec,
      maxSec: bracket.maxSec,
    };
    const targetSec = Math.round((bracket.minSec + bracket.maxSec) / 2);

    // Recent titles keep the planner from repeating itself.
    const { data: recent } = await db
      .from("videos")
      .select("title")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);
    const recentTitles = ((recent ?? []) as { title: string }[]).map((r) => r.title);
    const taxonomy = taxonomyFor(project);

    let created = 0;
    for (let i = 0; i < count; i++) {
      let title: string;
      let topic: string;
      const planned = await planNextTopic({
        project,
        recentTitles: [...recentTitles],
        taxonomy,
        kind: opts.format,
      }).catch(() => null);
      if (planned) {
        title = planned.title;
        topic = planned.subtopic ?? planned.title;
      } else if (opts.topic?.trim()) {
        const seed = opts.topic.trim();
        title = count > 1 ? `${seed} (${i + 1})` : seed.replace(/^./, (c) => c.toUpperCase());
        topic = seed;
      } else {
        const pick = DEMO_TOPICS[(recentTitles.length + i) % DEMO_TOPICS.length];
        title = pick.title;
        topic = pick.topic;
      }
      recentTitles.unshift(title);

      const { data: video, error } = await db
        .from("videos")
        .insert({
          project_id: projectId,
          title,
          topic,
          status: "IDEA",
          kind: opts.format,
          target_length_sec: targetSec,
          length_target: lengthTarget,
        })
        .select("id")
        .single();
      if (error || !video) continue;
      created++;
      await recordOperatorDecision(db, {
        projectId,
        videoId: video.id as string,
        stage: "idea",
        action: "generate",
        operatorNotes: opts.topic?.trim() || null,
      });
    }

    refresh(projectId);
    if (created === 0) return { ok: false, error: "Could not generate any ideas — try again." };
    return { ok: true, created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate the current stage's artifact (spec §5 "Generate"): script, visuals,
 * or the render, depending on where the video sits. One press = one stage.
 */
export async function directorRunStageAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const stage = directorStageForStatus(ctx.video!.status);

    const before = await videoSpendUsd(db, videoId);
    const r = await runDirectedStage(videoId, db);
    const after = await videoSpendUsd(db, videoId);

    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage,
      action: "generate",
      costUsd: Math.max(0, after - before),
    });
    refresh(projectId, videoId);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run the advisory review agent for the current stage (spec §5 "Review"). Purely
 * advisory — records the score/verdict; nothing advances or holds on it.
 */
export async function directorReviewStageAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult & { score?: number | null; verdict?: "pass" | "fail" | null }> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const stage = directorStageForStatus(ctx.video!.status);

    const r = await runStageReview(videoId, db);
    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage,
      action: "review",
      agentScore: r.score,
      agentVerdict: r.verdict,
      costUsd: r.costUsd,
    });
    refresh(projectId, videoId);
    return { ok: r.ok, error: r.error, score: r.score, verdict: r.verdict };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Advance one stage (spec §5 "Advance ▸"). Moves the gate forward; never chains. */
export async function directorAdvanceAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const stage = directorStageForStatus(ctx.video!.status);
    const score = await latestReviewScore(db, videoId);

    const r = await decideGate({ videoId, decision: "approved" }, db);
    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage,
      action: "advance",
      agentScore: score,
    });
    refresh(projectId, videoId);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Revise the current stage's artifact applying review findings + notes (spec §5
 * "Revise…"). Reuses the proven revision path: record the notes at the gate,
 * loop back to the stage, then regenerate it (the stage body injects the notes).
 */
export async function directorReviseAction(
  projectId: string,
  videoId: string,
  opts: { notes?: string; findings?: unknown } = {},
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const video = ctx.video!;
    const stage = directorStageForStatus(video.status);
    const score = await latestReviewScore(db, videoId);
    const before = await videoSpendUsd(db, videoId);

    const notes = opts.notes?.trim() || "Apply the review findings.";
    // Loop back with notes (no caps in Director Mode), then regenerate the stage.
    const back = await decideGate({ videoId, decision: "revision", notes }, db);
    if (!back.ok) return { ok: false, error: back.error };
    // IDEA revisions sharpen in place (no stage body to run); others regenerate.
    if (stage !== "idea") await runDirectedStage(videoId, db);

    const after = await videoSpendUsd(db, videoId);
    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage,
      action: "revise",
      agentScore: score,
      operatorNotes: notes,
      findingsApplied: opts.findings ?? null,
      costUsd: Math.max(0, after - before),
    });
    refresh(projectId, videoId);
    return { ok: true, warning: back.warning };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Re-render the current stage from scratch (spec §5 "Re-render…"). A fresh
 * artifact — the script stage regenerates the script wholesale; other stages
 * loop back and re-run their generation without applying targeted findings.
 */
export async function directorRerenderAction(
  projectId: string,
  videoId: string,
  opts: { notes?: string } = {},
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const video = ctx.video!;
    const stage = directorStageForStatus(video.status);
    const score = await latestReviewScore(db, videoId);
    const before = await videoSpendUsd(db, videoId);

    if (stage === "script") {
      // Fresh script from scratch.
      const r = await regenerateScript({ videoId });
      if (!r.ok) return { ok: false, error: r.error };
    } else if (stage === "idea") {
      // Re-generate the idea concept in place.
      const back = await decideGate({ videoId, decision: "revision", notes: opts.notes?.trim() || "" }, db);
      if (!back.ok) return { ok: false, error: back.error };
    } else {
      const back = await decideGate({ videoId, decision: "revision", notes: opts.notes?.trim() || "" }, db);
      if (!back.ok) return { ok: false, error: back.error };
      await runDirectedStage(videoId, db);
    }

    const after = await videoSpendUsd(db, videoId);
    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage,
      action: "rerender",
      agentScore: score,
      operatorNotes: opts.notes?.trim() || null,
      costUsd: Math.max(0, after - before),
    });
    refresh(projectId, videoId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Step the video back one stage (spec §5 "◂ Step back"). */
export async function directorStepBackAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const stage = directorStageForStatus(ctx.video!.status);
    const r = await stepBackStage({ videoId, deleteAssets: false });
    await recordOperatorDecision(db, { projectId, videoId, stage, action: "step_back" });
    refresh(projectId, videoId);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Kill the video (spec §5 "Kill"). */
export async function directorKillAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const stage = directorStageForStatus(ctx.video!.status);
    const r = await killVideo(videoId, db);
    await recordOperatorDecision(db, { projectId, videoId, stage, action: "kill" });
    refresh(projectId, videoId);
    return { ok: r.ok, error: r.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Publish (spec §5 Publish / §6.5). The only publish path for a director
 * project: flag the rendered cut for upload. The render farm's publisher then
 * uploads it — nothing here auto-publishes on a schedule.
 */
export async function directorPublishAction(
  projectId: string,
  videoId: string,
): Promise<DirectorResult> {
  try {
    const db = await createClient();
    const ctx = await directorCtx(db, projectId, videoId);
    if ("error" in ctx) return { ok: false, error: ctx.error };
    const video = ctx.video!;
    if (video.youtube_video_id) return { ok: false, error: "This video is already published." };
    if (video.status !== "FINAL_REVIEW" && video.status !== "APPROVED") {
      return { ok: false, error: "This video isn't rendered yet — advance it to a final cut first." };
    }
    // Approve the final gate if it's still open, then flag for upload.
    if (video.status === "FINAL_REVIEW") {
      await decideGate({ videoId, decision: "approved" }, db);
    }
    await db.from("videos").update({ publish_requested: true }).eq("id", videoId);
    await recordOperatorDecision(db, {
      projectId,
      videoId,
      stage: "publish",
      action: "publish",
    });
    refresh(projectId, videoId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── helpers ────────────────────────────────────────────────────────────

/** Most recent QC review score for a video (the advisory score shown/logged). */
async function latestReviewScore(db: Db, videoId: string): Promise<number | null> {
  const { data } = await db
    .from("qc_reviews")
    .select("score")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const s = (data as { score?: number } | null)?.score;
  return typeof s === "number" ? s : null;
}

export type { DirectorStage };
