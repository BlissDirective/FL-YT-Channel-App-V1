import "server-only";
import { encodeDuration, estimateClipCost, type VideoModel } from "./video-models";

/**
 * fal.ai adapter — Kokoro TTS (the low-cost "volume voice"), FLUX image
 * generation for thumbnails/beat visuals, and Kling/Veo/Seedance video
 * generation (Phase B). Live when FAL_KEY is present; callers fall back to
 * mocks otherwise (standing rule 4).
 */

// USD estimates for the cost ledger.
const KOKORO_USD_PER_1K_CHARS = 0.02;
const FLUX_SCHNELL_USD = 0.003;
const FLUX_DEV_USD = 0.025;

export function isFalLive(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/**
 * POST to a fal sync model, retrying transient failures. fal rate-limits bursts
 * (429) and occasionally 5xx's; without a retry these degrade a beat straight to
 * an invisible mock tile. Up to 3 attempts with exponential backoff + jitter.
 * A 4xx other than 429 (bad key, bad input) fails fast — retrying won't help.
 */
async function falRun<T>(model: string, input: Record<string, unknown>): Promise<T> {
  const MAX_ATTEMPTS = 3;
  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (res.ok) return (await res.json()) as T;
    lastErr = `fal ${model} error ${res.status}: ${(await res.text()).slice(0, 200)}`;
    const transient = res.status === 429 || res.status >= 500;
    if (!transient || attempt === MAX_ATTEMPTS) throw new Error(lastErr);
    // 0.6s, 1.8s … with jitter so concurrent callers don't retry in lockstep.
    const backoff = 600 * Math.pow(3, attempt - 1) + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw new Error(lastErr || `fal ${model} failed`);
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

// ── Kling / Veo / Seedance video generation (queue API) ───────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Generate one video clip via fal's async queue (video models are
 * long-running). Prefers image-to-video from our own keyframe; falls back to
 * text-to-video when no keyframe is supplied. Polls until COMPLETED or the
 * timeout (bounded by the route's maxDuration). Cost is the estimate
 * `durationSec × model.usdPerSec` (fal bills per second).
 */
export async function generateVideo(opts: {
  model: VideoModel;
  prompt: string;
  imageUrl?: string;
  durationSec: number;
  timeoutMs?: number;
}): Promise<{ video: Buffer; costUsd: number; durationSec: number }> {
  const endpoint = opts.imageUrl ? opts.model.i2v : opts.model.t2v;
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    duration: encodeDuration(opts.model, opts.durationSec),
  };
  if (opts.imageUrl) input.image_url = opts.imageUrl;

  const headers = {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "content-type": "application/json",
  };

  // Submit to the queue.
  const submit = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!submit.ok) {
    throw new Error(`fal ${endpoint} submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  }
  const queued = (await submit.json()) as {
    status_url?: string;
    response_url?: string;
  };
  if (!queued.status_url || !queued.response_url) {
    throw new Error("fal queue returned no status/response URL");
  }

  // Poll until done.
  const deadline = Date.now() + (opts.timeoutMs ?? 230_000);
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error("Video generation timed out — try a shorter clip or run it via the render worker.");
    }
    await sleep(5000);
    const st = await fetch(queued.status_url, { headers, cache: "no-store" });
    if (!st.ok) continue;
    const status = (await st.json()) as { status?: string };
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error("fal reported the video job failed");
    }
  }

  const resp = await fetch(queued.response_url, { headers, cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`fal result ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const result = (await resp.json()) as { video?: { url?: string } };
  const url = result.video?.url;
  if (!url) throw new Error("fal returned no video URL");

  return {
    video: await download(url),
    costUsd: estimateClipCost(opts.model, opts.durationSec),
    durationSec: opts.durationSec,
  };
}
