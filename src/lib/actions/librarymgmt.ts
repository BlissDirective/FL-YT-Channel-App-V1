"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Library management actions (Clean House §4/§5): archive assets out of the
 * active library, and set the per-project working-library size guardrail.
 */

/** Archive (or unarchive) a single video — hides it from the active library. */
export async function setVideoArchived(
  projectId: string,
  videoId: string,
  archived: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("videos")
      .update({ archived, archived_at: archived ? new Date().toISOString() : null })
      .eq("id", videoId)
      .eq("project_id", projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/library`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Bulk-archive every published (live) asset in a project — the fast way to
    clear the working library after publishing. */
export async function archiveAllPublished(
  projectId: string,
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();
    // Published/live = has a youtube_video_id OR published_at OR status TRACKING.
    const { data, error } = await supabase
      .from("videos")
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("archived", false)
      .or("status.eq.TRACKING,youtube_video_id.not.is.null,published_at.not.is.null")
      .select("id");
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/library`);
    return { ok: true, count: (data ?? []).length };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Set the working-library size guardrail (0 disables it). */
export async function setLibrarySizeLimit(
  projectId: string,
  limit: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const clamped = Math.max(0, Math.min(100, Math.round(limit)));
    const supabase = await createClient();
    const { error } = await supabase
      .from("projects")
      .update({ library_size_limit: clamped })
      .eq("id", projectId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath(`/projects/${projectId}/library`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
