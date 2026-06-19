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

/**
 * One-tap "Publish to YouTube" for any rendered video (long-form or Short).
 * Flags it for the render farm — which holds the YouTube OAuth credentials (the
 * app never does) — to upload on its next pass (long-form as an unlisted draft,
 * Short as #Shorts). The download package stays available either way, so the
 * operator always chooses: download by hand, upload automatically, or both.
 */
export async function requestPublishAction(
  projectId: string,
  videoId: string,
): Promise<PublishResult> {
  try {
    const supabase = await createClient();
    const { data: v } = await supabase
      .from("videos")
      .select("id, status, youtube_video_id, parent_video_id")
      .eq("id", videoId)
      .maybeSingle();
    if (!v) return { ok: false, error: "Video not found." };
    if (v.youtube_video_id) return { ok: false, error: "This video is already published." };
    if (v.status !== "FINAL_REVIEW" && v.status !== "APPROVED") {
      return { ok: false, error: "This video isn't rendered yet." };
    }
    const { error } = await supabase
      .from("videos")
      .update({ publish_requested: true })
      .eq("id", videoId);
    if (error) return { ok: false, error: error.message };
    refresh(projectId, videoId);
    if (v.parent_video_id) {
      revalidatePath(`/projects/${projectId}/videos/${v.parent_video_id}`);
    }
    return { ok: true };
  } catch (err) {
    console.error("requestPublish failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** On-demand stats pull for one project's tracked videos (a "Refresh" button).
    `videoId` is the page the button lives on, so its sparkline revalidates too. */
export async function refreshStatsAction(
  projectId: string,
  videoId?: string,
): Promise<PublishResult> {
  try {
    const { refreshed } = await refreshTrackedStats(projectId);
    revalidatePath("/");
    revalidatePath(`/projects/${projectId}`);
    if (videoId) revalidatePath(`/projects/${projectId}/videos/${videoId}`);
    return refreshed > 0
      ? { ok: true }
      : { ok: false, error: "Nothing to refresh — no published videos are being tracked yet." };
  } catch (err) {
    console.error("refreshStats failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
