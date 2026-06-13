import "server-only";

/**
 * YouTube Data API v3 adapter (Phase 7). API-key only — public statistics
 * for a video id need no OAuth, which keeps the app out of Google's upload
 * audit entirely (uploads stay manual by design). Live when YOUTUBE_API_KEY
 * (or the YOUTUBE_DATA_API_V3 secret alias) is present; otherwise returns
 * deterministic mock stats so the tracking dashboards work end-to-end.
 */

export type VideoStats = {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  title?: string;
  publishedAt?: string;
};

function youtubeKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_V3;
}

export function isYoutubeLive(): boolean {
  return Boolean(youtubeKey());
}

/**
 * Accepts a full URL (watch, youtu.be, shorts, embed) or a bare id and
 * returns the 11-char video id, or null if none can be extracted.
 */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const v = url.searchParams.get("v");
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    // youtu.be/<id>, /shorts/<id>, /embed/<id>, /v/<id>
    const last = parts[parts.length - 1];
    if (last && /^[\w-]{11}$/.test(last)) return last;
  } catch {
    /* not a URL — fall through */
  }
  const match = raw.match(/[\w-]{11}/);
  return match ? match[0] : null;
}

/**
 * Fetch public statistics for up to 50 video ids in one call. Falls back to
 * deterministic mock stats (no key, or a transient API error) so a missing
 * credential never blanks the dashboard.
 */
export async function fetchVideoStats(ids: string[]): Promise<VideoStats[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const key = youtubeKey();
  if (!key) return unique.map(mockStats);

  const out: VideoStats[] = [];
  // The API caps `id` at 50 per request.
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "statistics,snippet");
      url.searchParams.set("id", batch.join(","));
      url.searchParams.set("key", key);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        out.push(...batch.map(mockStats));
        continue;
      }
      const data = (await res.json()) as {
        items?: {
          id: string;
          snippet?: { title?: string; publishedAt?: string };
          statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
        }[];
      };
      const found = new Set<string>();
      for (const item of data.items ?? []) {
        found.add(item.id);
        out.push({
          videoId: item.id,
          views: Number(item.statistics?.viewCount ?? 0),
          likes: Number(item.statistics?.likeCount ?? 0),
          comments: Number(item.statistics?.commentCount ?? 0),
          title: item.snippet?.title,
          publishedAt: item.snippet?.publishedAt,
        });
      }
      // Ids the API didn't return (private/removed) still get a zero row so
      // the snapshot history stays continuous.
      for (const id of batch) {
        if (!found.has(id)) out.push({ videoId: id, views: 0, likes: 0, comments: 0 });
      }
    } catch {
      out.push(...batch.map(mockStats));
    }
  }
  return out;
}

/**
 * Deterministic-but-living mock: a stable hash seeds each video's baseline,
 * then views grow with the number of whole days elapsed since an epoch so
 * repeated refreshes show believable upward movement without a real channel.
 */
function mockStats(videoId: string): VideoStats {
  let h = 0;
  for (let i = 0; i < videoId.length; i++) h = (h * 31 + videoId.charCodeAt(i)) >>> 0;
  const day = Math.floor(Date.now() / 86_400_000);
  const base = 800 + (h % 4000);
  const perDay = 120 + (h % 900);
  const views = base + perDay * (day % 90);
  return {
    videoId,
    views,
    likes: Math.round(views * 0.041),
    comments: Math.round(views * 0.006),
  };
}

/** Estimated revenue from views and a niche RPM (USD per 1,000 views). */
export function estimateRevenueUsd(views: number, rpmUsd: number): number {
  return (views / 1000) * rpmUsd;
}
