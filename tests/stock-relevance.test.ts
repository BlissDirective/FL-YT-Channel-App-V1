/**
 * searchStockClip must pick the most RELEVANT Pexels result, not blindly the
 * first hit. Taking videos[0] for an abstract visual prompt returned generic
 * gradient "wallpaper" that didn't match the narration (the recurring
 * visual_relevance QC failure).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchStockClip } from "@/lib/adapters/stock";

const mp4 = (h: number) => ({ link: `http://x/${h}.mp4`, width: (h * 16) / 9, height: h, file_type: "video/mp4" });

function pexelsResponse(videos: unknown[]) {
  return {
    ok: true,
    json: async () => ({ videos }),
  } as unknown as Response;
}

const ORIG_KEY = process.env.PEXELS_API_KEY;

beforeEach(() => {
  process.env.PEXELS_API_KEY = "test-key";
});
afterEach(() => {
  if (ORIG_KEY == null) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = ORIG_KEY;
  vi.unstubAllGlobals();
});

describe("searchStockClip relevance ranking", () => {
  it("prefers the candidate whose slug matches the narration over the first hit", async () => {
    const videos = [
      // First hit — generic abstract wallpaper (would be chosen by the old code).
      { id: 1, url: "https://www.pexels.com/video/abstract-gradient-light-1/", duration: 20, image: "i1", user: { name: "a" }, video_files: [mp4(1080)] },
      // Better match — the narration is about a data center / servers.
      { id: 2, url: "https://www.pexels.com/video/rows-of-servers-in-a-data-center-2/", duration: 20, image: "i2", user: { name: "b" }, video_files: [mp4(1080)] },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => pexelsResponse(videos)));
    const clip = await searchStockClip("soft abstract gradient light", {
      relevanceText: "Inside a massive data center, rows of servers hum as cooling systems run.",
    });
    expect(clip?.pexelsId).toBe(2);
  });

  it("falls back to the first usable clip when nothing scores", async () => {
    const videos = [
      { id: 9, url: "https://www.pexels.com/video/nothing-matching-9/", duration: 20, image: "i9", user: { name: "a" }, video_files: [mp4(720)] },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => pexelsResponse(videos)));
    const clip = await searchStockClip("quantum foam", { relevanceText: "unrelated narration" });
    expect(clip?.pexelsId).toBe(9);
  });

  it("returns null when the key is absent (no spend, no crash)", async () => {
    delete process.env.PEXELS_API_KEY;
    const clip = await searchStockClip("anything");
    expect(clip).toBeNull();
  });
});
