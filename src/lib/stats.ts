import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchVideoStats } from "@/lib/adapters/youtube";
import { analyticsConfigured, getVideoMetrics, getEngagedViews } from "@/lib/adapters/youtube-analytics";

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
    .select("id, youtube_video_id, project_id")
    .not("youtube_video_id", "is", null);
  if (projectId) query = query.eq("project_id", projectId);
  const { data: videos } = await query;

  const tracked = (videos ?? []).filter(
    (v): v is { id: string; youtube_video_id: string; project_id: string } => Boolean(v.youtube_video_id),
  );
  if (tracked.length === 0) return { refreshed: 0 };

  const stats = await fetchVideoStats(tracked.map((v) => v.youtube_video_id));
  const byYtId = new Map(stats.map((s) => [s.videoId, s]));

  // B4 enrichment: for projects with Analytics OAuth, pull the owner-only
  // signals that beat raw views — retention %, watch minutes, subscribers,
  // and engaged views (what the algorithm actually runs on since Mar 2025).
  // Keyed by our internal video id. Best-effort per project.
  const enrichByVideo = new Map<string, { retentionPct?: number; watchMinutes?: number; subsGained?: number; engagedViews?: number }>();
  const byProject = new Map<string, string[]>();
  for (const v of tracked) {
    byProject.set(v.project_id, [...(byProject.get(v.project_id) ?? []), v.youtube_video_id]);
  }
  for (const [pid, ytIds] of byProject) {
    const { data: proj } = await db.from("projects").select("youtube_refresh_token").eq("id", pid).maybeSingle();
    const token = (proj?.youtube_refresh_token as string | null) ?? null;
    if (!analyticsConfigured(token)) continue;
    try {
      const [metrics, engaged] = await Promise.all([
        getVideoMetrics(token, ytIds),
        getEngagedViews(token, ytIds),
      ]);
      for (const v of tracked.filter((t) => t.project_id === pid)) {
        const m = metrics.get(v.youtube_video_id);
        const e = engaged.get(v.youtube_video_id);
        if (m || e != null) {
          enrichByVideo.set(v.id, {
            retentionPct: m?.retentionPct,
            watchMinutes: m?.watchMinutes,
            subsGained: m?.subscribersGained,
            engagedViews: e,
          });
        }
      }
    } catch (err) {
      console.error(`analytics enrichment failed for project ${pid}:`, err);
    }
  }

  const rows = tracked
    .map((v) => {
      const s = byYtId.get(v.youtube_video_id);
      if (!s) return null;
      const en = enrichByVideo.get(v.id);
      return {
        video_id: v.id,
        views: s.views,
        likes: s.likes,
        comments: s.comments,
        retention_pct: en?.retentionPct ?? null,
        watch_minutes: en?.watchMinutes ?? null,
        subs_gained: en?.subsGained ?? null,
        engaged_views: en?.engagedViews ?? null,
        meta: { source: "youtube", ytId: v.youtube_video_id },
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await db.from("analytics_snapshots").insert(rows as object[]);
  }
  return { refreshed: rows.length };
}
