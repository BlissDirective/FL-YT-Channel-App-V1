"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOperator } from "@/lib/auth-guard";
import { processAutofixForVideo } from "@/lib/pipeline/autofix";
import { isKillSwitchOn } from "@/lib/pipeline/engine";
import type { FrameCritique } from "@/lib/stick-types";
import type { Project, Video } from "@/lib/db/types";

function refresh(projectId: string, videoId: string) {
  revalidatePath(`/projects/${projectId}/videos/${videoId}`);
  revalidatePath(`/projects/${projectId}`);
}

/** Per-asset override of the channel's auto-fix loop. 'inherit' clears the
    override (null), 'on'/'off' force it for this video only. */
export async function setVideoAutofixAction(
  projectId: string,
  videoId: string,
  mode: "inherit" | "on" | "off",
): Promise<{ ok: boolean; error?: string }> {
  const db = await createClient();
  const value = mode === "inherit" ? null : mode === "on";
  const { error } = await db.from("videos").update({ autofix_enabled: value }).eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  refresh(projectId, videoId);
  return { ok: true };
}

/** Run one auto-fix step on this video now (operator-triggered). Uses the
    service role so it behaves exactly like the cron sweep. */
export async function runAutofixNowAction(
  projectId: string,
  videoId: string,
): Promise<{ ok: boolean; reason?: string; kind?: string; score?: number; changes?: string[]; error?: string }> {
  try {
    await assertOperator(); // service-role path — bypasses RLS, verify caller
  } catch {
    return { ok: false, error: "Not authenticated." };
  }
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch {
    return { ok: false, error: "Service role not configured — run the loop via the cron instead." };
  }
  try {
    const { data: v } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
    const video = v as Video | null;
    if (!video) return { ok: false, error: "Video not found" };
    const { data: p } = await db.from("projects").select("*").eq("id", video.project_id).maybeSingle();
    const project = p as Project | null;
    if (!project) return { ok: false, error: "Project not found" };
    const out = await processAutofixForVideo(db, video, project);
    refresh(projectId, videoId);
    if (!out.acted) return { ok: true, reason: out.reason };
    return { ok: true, kind: out.kind, score: out.score, changes: out.changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * One-shot "Fix these issues" from the Vision review card. Runs the SAME
 * fix agent as the auto-fix loop (reads the vision critique's per-beat issues,
 * re-rolls / re-choreographs the flagged beats, re-renders) but as a deliberate
 * operator-initiated pass — it runs even when the channel auto-fix loop is off
 * and clears any prior "held" latch. Bounded by the kill switch and the
 * per-video / monthly budget caps.
 */
export async function fixFromVisionReviewAction(
  projectId: string,
  videoId: string,
): Promise<{ ok: boolean; reason?: string; kind?: string; score?: number; changes?: string[]; error?: string }> {
  try {
    await assertOperator(); // service-role path — verify the caller
  } catch {
    return { ok: false, error: "Not authenticated." };
  }
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch {
    return { ok: false, error: "Service role not configured — enable the auto-fix loop instead." };
  }
  try {
    if (await isKillSwitchOn(db)) return { ok: false, error: "The global kill switch is on." };
    const { data: v } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
    const video = v as Video | null;
    if (!video) return { ok: false, error: "Video not found" };
    if (video.status !== "FINAL_REVIEW") {
      return { ok: false, error: "The fix agent runs once the video reaches Final Review." };
    }
    const issues = (video.vision_review as FrameCritique | null)?.issues ?? [];
    if (issues.length === 0) return { ok: false, error: "No vision-review issues to fix." };
    const { data: p } = await db.from("projects").select("*").eq("id", video.project_id).maybeSingle();
    const project = p as Project | null;
    if (!project) return { ok: false, error: "Project not found" };
    const out = await processAutofixForVideo(db, video, project, { force: true });
    refresh(projectId, videoId);
    if (!out.acted) return { ok: true, reason: out.reason };
    return { ok: true, kind: out.kind, score: out.score, changes: out.changes };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Re-review the CURRENT cut on demand (operator-triggered). Runs the in-app
 * Self-Watch judge — which scores timing, script-match, transitions, and
 * competitive fit from the script + beats + assets — so the operator gets an
 * immediate second opinion WITHOUT waiting on the render farm. (The farm's
 * rendered-frame vision critique refreshes automatically after the next render;
 * this is the always-available in-app judge.) Advisory only: it records the
 * fresh watch verdict on the video but never advances or holds.
 */
export async function reReviewVisionAction(
  projectId: string,
  videoId: string,
): Promise<{
  ok: boolean;
  error?: string;
  overall?: number;
  dimensions?: { label: string; score: number }[];
  issues?: string[];
}> {
  try {
    await assertOperator();
  } catch {
    return { ok: false, error: "Not authenticated." };
  }
  let db: ReturnType<typeof createAdminClient>;
  try {
    db = createAdminClient();
  } catch {
    return { ok: false, error: "Service role not configured." };
  }
  try {
    const { data: v } = await db.from("videos").select("*").eq("id", videoId).maybeSingle();
    const video = v as Video | null;
    if (!video) return { ok: false, error: "Video not found" };
    const { data: p } = await db.from("projects").select("*").eq("id", video.project_id).maybeSingle();
    const project = p as Project | null;
    if (!project) return { ok: false, error: "Project not found" };

    const { runWatchGate } = await import("@/lib/pipeline/watch-runner");
    const verdict = await runWatchGate(db, video, project, { competitive: true });
    refresh(projectId, videoId);
    if (!verdict) {
      return { ok: false, error: "Re-review needs a script and rendered beats to analyze." };
    }
    const issues = [
      ...verdict.timing.issues,
      ...verdict.scriptMatch.issues,
      ...verdict.transitions.issues,
      ...verdict.competitive.issues,
    ]
      .map((i) => i.detail)
      .filter(Boolean)
      .slice(0, 8);
    return {
      ok: true,
      overall: verdict.overall,
      dimensions: [
        { label: "Timing", score: verdict.timing.score },
        { label: "Script match", score: verdict.scriptMatch.score },
        { label: "Transitions", score: verdict.transitions.score },
        { label: "Competitive", score: verdict.competitive.score },
      ],
      issues,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
