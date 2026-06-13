"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseYoutubeId, fetchVideoStats } from "@/lib/adapters/youtube";
import { refreshTrackedStats } from "@/lib/stats";

export type PublishResult = { ok: boolean; error?: string };

function refresh(projectId: string, videoId: string) {
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/videos/${videoId}`);
}

/**
 * "Mark as uploaded" — the operator pastes the YouTube URL after uploading
 * the package by hand. We store the parsed video id, stamp published_at,
 * move the video into TRACKING, and capture a first stats snapshot right
 * away so the dashboards light up immediately.
 */
export async function markUploadedAction(
  projectId: string,
  videoId: string,
  youtubeUrl: string,
): Promise<PublishResult> {
  const ytId = parseYoutubeId(youtubeUrl);
  if (!ytId) {
    return { ok: false, error: "Couldn't find a YouTube video id in that URL." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("videos")
      .update({
        youtube_video_id: ytId,
        published_at: new Date().toISOString(),
        status: "TRACKING",
      })
      .eq("id", videoId);
    if (error) return { ok: false, error: error.message };

    // First snapshot so the sparkline and totals aren't empty.
    const [stats] = await fetchVideoStats([ytId]);
    if (stats) {
      await supabase.from("analytics_snapshots").insert({
        video_id: videoId,
        views: stats.views,
        likes: stats.likes,
        comments: stats.comments,
        meta: { source: "youtube", ytId, initial: true },
      });
    }
    refresh(projectId, videoId);
    return { ok: true };
  } catch (err) {
    console.error("markUploaded failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** On-demand stats pull for one project's tracked videos (a "Refresh" button). */
export async function refreshStatsAction(projectId: string): Promise<PublishResult> {
  try {
    const { refreshed } = await refreshTrackedStats(projectId);
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    return refreshed > 0
      ? { ok: true }
      : { ok: false, error: "No tracked videos to refresh yet." };
  } catch (err) {
    console.error("refreshStats failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
