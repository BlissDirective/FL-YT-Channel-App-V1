import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchVideoStats } from "@/lib/adapters/youtube";

/**
 * Stats ingestion (Phase 7). Pulls public YouTube statistics for every
 * tracked video and writes one analytics_snapshots row per video per run —
 * the snapshot history powers the per-video sparkline and the portfolio
 * totals. Run on demand (a button) or nightly (the cron route). Uses the
 * service-role client so it works from an unauthenticated cron call.
 */
export async function refreshTrackedStats(
  projectId?: string,
): Promise<{ refreshed: number }> {
  const db = createAdminClient();

  let query = db
    .from("videos")
    .select("id, youtube_video_id")
    .not("youtube_video_id", "is", null);
  if (projectId) query = query.eq("project_id", projectId);
  const { data: videos } = await query;

  const tracked = (videos ?? []).filter(
    (v): v is { id: string; youtube_video_id: string } => Boolean(v.youtube_video_id),
  );
  if (tracked.length === 0) return { refreshed: 0 };

  const stats = await fetchVideoStats(tracked.map((v) => v.youtube_video_id));
  const byYtId = new Map(stats.map((s) => [s.videoId, s]));

  const rows = tracked
    .map((v) => {
      const s = byYtId.get(v.youtube_video_id);
      if (!s) return null;
      return {
        video_id: v.id,
        views: s.views,
        likes: s.likes,
        comments: s.comments,
        meta: { source: "youtube", ytId: v.youtube_video_id },
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await db.from("analytics_snapshots").insert(rows as object[]);
  }
  return { refreshed: rows.length };
}
