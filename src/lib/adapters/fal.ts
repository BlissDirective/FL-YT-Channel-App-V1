import "server-only";

/**
 * fal.ai adapter — Kokoro TTS (the low-cost "volume voice") and FLUX
 * image generation for thumbnails and beat visuals. Live when FAL_KEY is
 * present; callers fall back to mocks otherwise (standing rule 4).
 */

// USD estimates for the cost ledger.
const KOKORO_USD_PER_1K_CHARS = 0.02;
const FLUX_SCHNELL_USD = 0.003;
const FLUX_DEV_USD = 0.025;

export function isFalLive(): boolean {
  return Boolean(process.env.FAL_KEY);
}

async function falRun<T>(model: string, input: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`fal ${model} error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url.slice(0, 80)}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Kokoro text-to-speech ─────────────────────────────────────────────

export async function kokoroSynthesize(opts: {
  text: string;
  voice: string; // e.g. "af_heart"
}): Promise<{ audio: Buffer; durationSec: number; costUsd: number }> {
  const data = await falRun<{ audio: { url: string } }>(
    "fal-ai/kokoro/american-english",
    { prompt: opts.text, voice: opts.voice },
  );
  const audio = await download(data.audio.url);
  return {
    audio,
    durationSec: wavDurationSec(audio),
    costUsd: Math.round((opts.text.length / 1000) * KOKORO_USD_PER_1K_CHARS * 100) / 100,
  };
}

/** Duration from the WAV header (RIFF byte rate + data chunk size). */
function wavDurationSec(wav: Buffer): number {
  try {
    const byteRate = wav.readUInt32LE(28);
    // Scan chunks after the fmt header for the data chunk.
    let off = 12;
    while (off + 8 <= wav.length) {
      const id = wav.toString("ascii", off, off + 4);
      const size = wav.readUInt32LE(off + 4);
      if (id === "data" && byteRate > 0) {
        return Math.round((size / byteRate) * 100) / 100;
      }
      off += 8 + size + (size % 2);
    }
  } catch {
    // fall through
  }
  return 0;
}

// ── FLUX image generation ─────────────────────────────────────────────

export async function generateImage(opts: {
  prompt: string;
  /** schnell = fast/cheap (b-roll, thumbnails), dev = premium (hero shots) */
  quality?: "schnell" | "dev";
}): Promise<{ image: Buffer; costUsd: number }> {
  const quality = opts.quality ?? "schnell";
  const data = await falRun<{ images: { url: string }[] }>(
    `fal-ai/flux/${quality}`,
    {
      prompt: opts.prompt,
      image_size: "landscape_16_9",
      num_images: 1,
      enable_safety_checker: true,
    },
  );
  const url = data.images?.[0]?.url;
  if (!url) throw new Error("FLUX returned no image");
  return {
    image: await download(url),
    costUsd: quality === "dev" ? FLUX_DEV_USD : FLUX_SCHNELL_USD,
  };
}
