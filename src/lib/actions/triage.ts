"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GATE_FOR_STATUS } from "@studio/core";
import { decideGate } from "@/lib/pipeline/engine";
import type { Project, Video } from "@/lib/db/types";

/**
 * Feed batch actions (#3) — fan a single decision out over many selected assets
 * so the operator clears a bucket in one press. Each item is guarded
 * individually (mode, gate/status, QC threshold) and failures are isolated, so
 * one ineligible asset never aborts the batch. Returns a per-batch summary.
 */

export type BatchResult = { ok: boolean; acted: number; skipped: number; error?: string };

type Db = Awaited<ReturnType<typeof createClient>>;

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}/feed`);
  revalidatePath(`/projects/${projectId}/library`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

async function loadVideos(db: Db, projectId: string, videoIds: string[]): Promise<Video[]> {
  if (videoIds.length === 0) return [];
  const { data } = await db
    .from("videos")
    .select("*")
    .eq("project_id", projectId)
    .in("id", videoIds);
  return (data as Video[]) ?? [];
}

/**
 * Approve every selected asset sitting at an open gate whose latest QC score is
 * at or above `minScore` (default 0 = approve all at a gate). Autonomous and
 * director both advance one gate via decideGate; director does not chain.
 */
export async function batchApproveAction(
  projectId: string,
  videoIds: string[],
  minScore = 0,
): Promise<BatchResult> {
  try {
    const db = await createClient();
    const videos = await loadVideos(db, projectId, videoIds);
    let acted = 0;
    let skipped = 0;
    // Latest QC score per video (across gates) for the threshold check.
    const scores = await latestScores(db, videoIds);
    for (const v of videos) {
      if (!GATE_FOR_STATUS[v.status as keyof typeof GATE_FOR_STATUS]) {
        skipped++;
        continue;
      }
      const score = scores.get(v.id);
      if (minScore > 0 && (score == null || score < minScore)) {
        skipped++;
        continue;
      }
      const r = await decideGate({ videoId: v.id, decision: "approved" }, db);
      if (r.ok) acted++;
      else skipped++;
    }
    refresh(projectId);
    return { ok: true, acted, skipped };
  } catch (err) {
    return { ok: false, acted: 0, skipped: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Flag every selected rendered asset for publish (FINAL_REVIEW/APPROVED, not
    already published). Works in both modes — publish is always operator-driven. */
export async function batchPublishAction(
  projectId: string,
  videoIds: string[],
): Promise<BatchResult> {
  try {
    const db = await createClient();
    const videos = await loadVideos(db, projectId, videoIds);
    let acted = 0;
    let skipped = 0;
    for (const v of videos) {
      const publishable =
        !v.youtube_video_id && (v.status === "FINAL_REVIEW" || v.status === "APPROVED");
      if (!publishable) {
        skipped++;
        continue;
      }
      if (v.status === "FINAL_REVIEW") {
        await decideGate({ videoId: v.id, decision: "approved" }, db);
      }
      await db.from("videos").update({ publish_requested: true }).eq("id", v.id);
      acted++;
    }
    refresh(projectId);
    return { ok: true, acted, skipped };
  } catch (err) {
    return { ok: false, acted: 0, skipped: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Re-review every selected asset with the in-app Self-Watch judge (no render
    farm needed). Best-effort per item; returns how many got a fresh verdict. */
export async function batchReReviewAction(
  projectId: string,
  videoIds: string[],
): Promise<BatchResult> {
  try {
    const db = await createClient();
    const { data: proj } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();
    const project = proj as Project | null;
    if (!project) return { ok: false, acted: 0, skipped: 0, error: "Project not found" };
    const videos = await loadVideos(db, projectId, videoIds);
    const { runWatchGate } = await import("@/lib/pipeline/watch-runner");
    let acted = 0;
    let skipped = 0;
    for (const v of videos) {
      try {
        const verdict = await runWatchGate(db, v, project, { competitive: true });
        if (verdict) acted++;
        else skipped++;
      } catch {
        skipped++;
      }
    }
    refresh(projectId);
    return { ok: true, acted, skipped };
  } catch (err) {
    return { ok: false, acted: 0, skipped: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

async function latestScores(db: Db, videoIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (videoIds.length === 0) return out;
  const { data } = await db
    .from("qc_reviews")
    .select("video_id, score, created_at")
    .in("video_id", videoIds)
    .order("created_at", { ascending: false });
  for (const r of (data ?? []) as { video_id: string; score: number }[]) {
    if (!out.has(r.video_id)) out.set(r.video_id, Number(r.score));
  }
  return out;
}
