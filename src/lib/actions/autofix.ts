"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOperator } from "@/lib/auth-guard";
import { processAutofixForVideo } from "@/lib/pipeline/autofix";
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
