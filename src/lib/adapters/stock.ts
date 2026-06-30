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

export async function searchStockClip(query: string): Promise<StockClip | null> {
  if (!isStockLive()) return null;
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: process.env.PEXELS_API_KEY! } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    videos: {
      id: number;
      duration: number;
      image: string;
      user: { name: string };
      video_files: { link: string; width: number; height: number; file_type: string }[];
    }[];
  };
  const video = data.videos?.[0];
  if (!video) return null;

  // Largest MP4 that stays at or under 1080p.
  const file = video.video_files
    .filter((f) => f.file_type === "video/mp4" && f.height <= 1080)
    .sort((a, b) => b.height - a.height)[0];
  if (!file) return null;

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
