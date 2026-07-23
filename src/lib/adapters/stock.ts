import "server-only";

/**
 * Stock footage adapter (Pexels). Free under the Pexels license — stock
 * beats cost $0 in the ledger. Live when PEXELS_API_KEY is present.
 */

export type StockClip = {
  url: string; // direct video file URL (HD, ≤1080p)
  posterUrl: string;
  width: number;
  height: number;
  durationSec: number;
  pexelsId: number;
  photographer: string;
};

export function isStockLive(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/** Free Pexels still photos for multi-image sections (Tier 9 #4). Returns up to
    `count` large landscape photo URLs for the query, $0 under the Pexels
    license. Empty array when no key / no match / request fails. */
export async function searchStockPhotos(query: string, count = 2): Promise<string[]> {
  if (!isStockLive() || count <= 0) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${Math.min(
        15,
        Math.max(count, 6),
      )}&orientation=landscape`,
      { headers: { Authorization: process.env.PEXELS_API_KEY! } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      photos?: { src?: { large2x?: string; large?: string; original?: string } }[];
    };
    return (data.photos ?? [])
      .map((p) => p.src?.large2x || p.src?.large || p.src?.original)
      .filter((u): u is string => Boolean(u))
      .slice(0, count);
  } catch {
    return [];
  }
}

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "with", "for", "at", "by",
  "from", "into", "over", "as", "is", "are", "be", "this", "that", "these", "those",
  "no", "text", "logo", "logos", "people", "person", "scene", "shot", "cinematic",
  "premium", "abstract", "style", "background", "footage", "video", "clip", "close",
  "wide", "dramatic", "soft", "light", "dark", "sense", "forward", "momentum",
]);

/** Content tokens (lowercased, de-stopworded, ≥4 chars) for relevance scoring. */
function keywords(...texts: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    for (const w of (t ?? "").toLowerCase().match(/[a-z]{4,}/g) ?? []) {
      if (!STOP.has(w)) seen.add(w);
    }
  }
  return [...seen];
}

/**
 * Pick the most RELEVANT stock clip, not just the first hit. The old code took
 * `videos[0]` blindly, which — because the beat's visual prompt is usually
 * abstract/symbolic — returned generic gradient "wallpaper" that didn't match
 * the narration (the recurring visual_relevance QC failure). Now we fetch a
 * pool and rank each candidate by how many content keywords (from the visual
 * prompt AND, when provided, the beat narration) appear in its Pexels page-URL
 * slug, tie-broken by adequate duration + resolution. Falls back to the first
 * usable clip when nothing scores (still better than crashing on a miss).
 */
export async function searchStockClip(
  query: string,
  opts?: { relevanceText?: string; minDurationSec?: number },
): Promise<StockClip | null> {
  if (!isStockLive()) return null;
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY! } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    videos?: {
      id: number;
      url?: string; // pexels page URL — its slug carries the descriptive keywords
      duration: number;
      image: string;
      user: { name: string };
      video_files: { link: string; width: number; height: number; file_type: string }[];
    }[];
  };
  const videos = data.videos ?? [];
  if (videos.length === 0) return null;

  const terms = keywords(query, opts?.relevanceText);
  const minDur = opts?.minDurationSec ?? 0;
  const scoreOf = (v: (typeof videos)[number]): number => {
    const slug = (v.url ?? "").toLowerCase();
    const overlap = terms.reduce((n, t) => n + (slug.includes(t) ? 1 : 0), 0);
    const durOk = v.duration >= minDur ? 1 : 0;
    return overlap * 10 + durOk; // relevance dominates; duration adequacy breaks ties
  };

  // Best-scoring candidate that still yields a usable ≤1080p MP4.
  const ranked = [...videos].sort((a, b) => scoreOf(b) - scoreOf(a));
  for (const video of ranked) {
    const file = video.video_files
      .filter((f) => f.file_type === "video/mp4" && f.height <= 1080)
      .sort((a, b) => b.height - a.height)[0];
    if (!file) continue;
    return {
      url: file.link,
      posterUrl: video.image,
      width: file.width,
      height: file.height,
      durationSec: video.duration,
      pexelsId: video.id,
      photographer: video.user.name,
    };
  }
  return null;
}
