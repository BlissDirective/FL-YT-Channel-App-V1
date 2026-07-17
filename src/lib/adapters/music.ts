import "server-only";
import type { MusicPlan } from "@studio/core";

/**
 * Music-bed adapter (list1 #15) — mock-first, like every other provider here.
 * When ELEVENLABS_API_KEY is present it calls ElevenLabs Music; otherwise it
 * returns a benign mock so the pipeline plans + wires music end-to-end with no
 * key. The soundtrack is decided by the pure `planMusic` at proposal time; this
 * only synthesises the bed the plan describes.
 */

export function isMusicLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export type MusicBed = {
  audio: Uint8Array | null;
  contentType: string;
  durationSec: number;
  costUsd: number;
  provider: "elevenlabs-music" | "mock";
  prompt: string;
};

const MUSIC_ENDPOINT = "https://api.elevenlabs.io/v1/music";
/** ~$0.05 per 30s of generated bed (estimate for the ledger). */
const MUSIC_USD_PER_SEC = 0.0017;

/** Generate (or mock) a music bed for a resolved plan. Never throws — falls
    back to the mock on any error so a music failure can't break a render. */
export async function generateMusicBed(plan: MusicPlan, durationSec: number): Promise<MusicBed> {
  const dur = Math.max(5, Math.round(durationSec));
  if (!isMusicLive()) {
    return { audio: null, contentType: "audio/mpeg", durationSec: dur, costUsd: 0, provider: "mock", prompt: plan.prompt };
  }
  try {
    const res = await fetch(MUSIC_ENDPOINT, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ prompt: plan.prompt, music_length_ms: dur * 1000 }),
    });
    if (!res.ok) throw new Error(`ElevenLabs Music ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      audio: buf,
      contentType: "audio/mpeg",
      durationSec: dur,
      costUsd: Math.round(MUSIC_USD_PER_SEC * dur * 1000) / 1000,
      provider: "elevenlabs-music",
      prompt: plan.prompt,
    };
  } catch (err) {
    console.error(`music bed fell back to mock: ${String(err).slice(0, 120)}`);
    return { audio: null, contentType: "audio/mpeg", durationSec: dur, costUsd: 0, provider: "mock", prompt: plan.prompt };
  }
}
