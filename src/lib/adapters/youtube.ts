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
 * Fetch public statistics for up to 50 video ids in one call. With no key,
 * returns deterministic mock stats so the dashboards work end-to-end. With
 * a live key, a transient API error SKIPS the batch (no snapshot row) —
 * fabricated numbers must never masquerade as real analytics.
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
        console.error(`youtube stats batch failed (${res.status}) — skipping ${batch.length} ids`);
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
    } catch (err) {
      console.error("youtube stats batch failed — skipping:", err);
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
  // Monotonic by design: views grow with the video's age in days and plateau
  // after a year — they never wrap/drop, so dashboard totals can't lurch
  // backward between refreshes on mock (no-key) deployments.
  const epochDay = Math.floor(Date.UTC(2026, 0, 1) / 86_400_000);
  const today = Math.floor(Date.now() / 86_400_000);
  const age = Math.min(Math.max(today - epochDay, 0), 365);
  const base = 800 + (h % 4000);
  const perDay = 120 + (h % 900);
  const views = base + perDay * age;
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

export type NicheVideo = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  views: number;
  url: string;
};

/**
 * Niche research search (Phase 8). Returns recent + proven videos for a
 * query, hydrated with view counts, newest-strongest first. Live via the
 * YouTube Data API (search.list → videos.list for stats); deterministic
 * mock results when no key, so the intelligence run and Scout chat work
 * end-to-end on the default deployment.
 */
export async function searchNiche(
  query: string,
  max = 12,
): Promise<NicheVideo[]> {
  const key = youtubeKey();
  if (!key) return mockNiche(query, max);

  try {
    const search = new URL("https://www.googleapis.com/youtube/v3/search");
    search.searchParams.set("part", "snippet");
    search.searchParams.set("q", query);
    search.searchParams.set("type", "video");
    search.searchParams.set("order", "relevance");
    search.searchParams.set("maxResults", String(Math.min(max, 25)));
    search.searchParams.set("relevanceLanguage", "en");
    search.searchParams.set("key", key);
    const sres = await fetch(search, { cache: "no-store" });
    if (!sres.ok) {
      console.error(`youtube niche search failed (${sres.status}) — returning no results`);
      return [];
    }
    const sdata = (await sres.json()) as {
      items?: { id?: { videoId?: string } }[];
    };
    const ids = (sdata.items ?? [])
      .map((i) => i.id?.videoId)
      .filter((v): v is string => Boolean(v));
    if (ids.length === 0) return [];

    const stats = await fetchVideoStats(ids);
    const byId = new Map(stats.map((s) => [s.videoId, s]));
    return ids
      .map((id) => {
        const s = byId.get(id);
        return {
          videoId: id,
          title: s?.title ?? "Untitled",
          channelTitle: "",
          publishedAt: s?.publishedAt ?? "",
          views: s?.views ?? 0,
          url: `https://youtu.be/${id}`,
        };
      })
      .sort((a, b) => b.views - a.views);
  } catch (err) {
    console.error("youtube niche search failed — returning no results:", err);
    return [];
  }
}

function mockNiche(query: string, max: number): NicheVideo[] {
  const topic = query.replace(/\s+/g, " ").trim().slice(0, 40) || "this niche";
  const angles = [
    `The Hidden Truth About ${topic}`,
    `Why Everyone Is Wrong About ${topic}`,
    `${topic}: What Nobody Tells You`,
    `I Tried ${topic} For 30 Days`,
    `The ${topic} Mistake Costing You Thousands`,
    `${topic} Explained In 8 Minutes`,
    `5 ${topic} Secrets The Experts Hide`,
    `How ${topic} Actually Works`,
  ];
  return angles.slice(0, max).map((title, i) => {
    let h = 0;
    for (let j = 0; j < title.length; j++) h = (h * 31 + title.charCodeAt(j)) >>> 0;
    const days = 30 + (h % 520); // 1–18 month proven band
    return {
      videoId: `mock${String(h).slice(0, 7)}`,
      title,
      channelTitle: `${topic} Channel ${i + 1}`,
      publishedAt: new Date(Date.now() - days * 86_400_000).toISOString(),
      views: 40_000 + (h % 1_800_000),
      url: "https://youtube.com",
    };
  });
}
