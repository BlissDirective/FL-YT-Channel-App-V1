import "server-only";
import { clampDuration, estimateClipCost, type VideoModel } from "./video-models";
import { markProviderDown, markProviderUp } from "@/lib/pipeline/provider-health";

/**
 * Higgsfield adapter — the PRIMARY visual provider (see
 * docs/Higgsfield-Integration-Plan.md). Locked defaults:
 *   • video (hero + b-roll, every section) → Cinema Studio 4.0
 *   • in-video stills                     → SOUL Standard
 *   • avatar animation                    → Genjutsu motion-transfer
 * fal.ai stays as the automatic fallback for all three, and keeps the audio
 * work Higgsfield doesn't offer (Kokoro TTS, Whisper, songs, lip-sync avatars).
 *
 * API: https://docs.higgsfield.ai — submit `POST /{endpoint}` → poll the
 * returned `status_url` until a terminal status. Auth is ONE combined
 * `KEY_ID:KEY_SECRET` credential sent as `Authorization: Key <id>:<secret>`.
 * Mock-first: no credential → isHiggsfieldLive() is false and callers fall
 * through to fal / mocks exactly as before.
 */

export const HIGGSFIELD_API = "https://api.higgsfield.ai";
export const HIGGSFIELD_PROVIDER = "higgsfield";

/** Locked Higgsfield endpoints. */
export const HF_ENDPOINTS = {
  cinemaStudio: "higgsfield/cinema-studio/4.0",
  soulStandard: "higgsfield-ai/soul/standard",
  genjutsuMotion: "higgsfield/genjutsu/motion-transfer/v1.0",
} as const;

/** Ledger estimates (Higgsfield "from" catalog prices, Sep 2026). The exact
    per-request price comes from POST /estimate when available. */
export const HF_PRICES = {
  soulStandardPerImage: 0.0938,
  /** Genjutsu is 50% off ($0.159/s) until 2026-10-01, then $0.318/s. */
  genjutsuPerSec: 0.318,
  genjutsuPromoPerSec: 0.159,
  genjutsuPromoEndsAt: "2026-10-01T00:00:00Z",
} as const;

// ── Credentials ──────────────────────────────────────────────────────

/**
 * Resolve the combined `KEY_ID:KEY_SECRET` credential. Canonical is the
 * `HIGGSFIELD_API_KEY` secret (combined form). The SDK's own env names are
 * accepted as aliases so a key pasted in either shape works.
 */
export function higgsfieldCredential(env: NodeJS.ProcessEnv = process.env): string | null {
  const combined = (env.HIGGSFIELD_API_KEY || env.HF_CREDENTIALS || env.HF_KEY || "").trim();
  if (combined) return combined;
  const id = (env.HF_API_KEY_ID || env.HF_API_KEY || "").trim();
  const secret = (env.HF_API_KEY_SECRET || env.HF_API_SECRET || "").trim();
  if (id && secret) return `${id}:${secret}`;
  return null;
}

/** Which credential shape is configured — surfaced by health / verify-secrets. */
export function higgsfieldCredentialShape(
  env: NodeJS.ProcessEnv = process.env,
): "combined" | "missing-secret" | "pair" | "absent" {
  const cred = higgsfieldCredential(env);
  if (!cred) return "absent";
  if (!(env.HIGGSFIELD_API_KEY || env.HF_CREDENTIALS || env.HF_KEY)) return "pair";
  return cred.includes(":") ? "combined" : "missing-secret";
}

export function isHiggsfieldLive(): boolean {
  return Boolean(higgsfieldCredential());
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Key ${higgsfieldCredential()}`,
    "content-type": "application/json",
  };
}

// ── Request lifecycle ────────────────────────────────────────────────

export type HfStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";

export type HfHandle = {
  requestId: string;
  statusUrl: string;
  cancelUrl?: string;
};

export type HfResult = {
  status: HfStatus;
  request_id?: string;
  error?: string | null;
  video?: { url?: string };
  images?: { url?: string }[];
  audio?: { url?: string };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Error carrying the HTTP status + correlation id so callers can decide
    (403 = out of credits → breaker; 400 concurrency → back off; 422 → bad input). */
export class HiggsfieldError extends Error {
  constructor(
    message: string,
    public status: number,
    public correlationId: string | null = null,
  ) {
    super(message);
    this.name = "HiggsfieldError";
  }
}

/** The concurrency limit arrives as a 400 with a message, not a 429. */
export function isConcurrencyLimit(status: number, body: string): boolean {
  return status === 429 || (status === 400 && /concurrent/i.test(body));
}

/**
 * Submit one request. Retries ONLY on responses that prove nothing was queued
 * (429/concurrency-400/5xx) — Higgsfield has no idempotency key, so an
 * ambiguous network failure must never be blindly re-POSTed (double billing).
 */
export async function hfSubmit(
  endpoint: string,
  input: Record<string, unknown>,
  opts: { webhookUrl?: string } = {},
): Promise<HfHandle> {
  const qs = opts.webhookUrl ? `?hf_webhook=${encodeURIComponent(opts.webhookUrl)}` : "";
  const MAX_ATTEMPTS = 4;
  let last = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(`${HIGGSFIELD_API}/${endpoint}${qs}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    const corr = res.headers.get("x-correlation-id");
    if (res.ok) {
      const q = (await res.json()) as {
        request_id?: string;
        status_url?: string;
        cancel_url?: string;
      };
      if (!q.request_id) throw new HiggsfieldError("Higgsfield returned no request_id", 502, corr);
      await markProviderUp(HIGGSFIELD_PROVIDER);
      return {
        requestId: q.request_id,
        statusUrl: q.status_url ?? `${HIGGSFIELD_API}/requests/${q.request_id}/status`,
        cancelUrl: q.cancel_url,
      };
    }
    const body = (await res.text()).slice(0, 300);
    last = `higgsfield ${endpoint} submit ${res.status}: ${body}`;
    if (res.status === 401 || res.status === 403) {
      // 401 bad key / 403 out of credits — terminal account conditions.
      await markProviderDown(HIGGSFIELD_PROVIDER, last);
      throw new HiggsfieldError(last, res.status, corr);
    }
    const retryable = isConcurrencyLimit(res.status, body) || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) throw new HiggsfieldError(last, res.status, corr);
    // Concurrency slots free up as jobs finish — back off longer than a 5xx.
    const base = isConcurrencyLimit(res.status, body) ? 8000 : 1000;
    await sleep(base * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 750));
  }
  throw new HiggsfieldError(last || `higgsfield ${endpoint} submit failed`, 0);
}

export async function hfStatus(h: Pick<HfHandle, "statusUrl">): Promise<HfResult | null> {
  const res = await fetch(h.statusUrl, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as HfResult;
}

/** Poll with the documented 2s → 10s backoff + jitter until terminal. */
export async function hfPoll(h: HfHandle, timeoutMs = 280_000): Promise<HfResult> {
  const deadline = Date.now() + timeoutMs;
  let wait = 2000;
  for (;;) {
    if (Date.now() > deadline) throw new HiggsfieldTimeoutError(h);
    await sleep(wait + Math.floor(Math.random() * 400));
    wait = Math.min(10_000, Math.round(wait * 1.5));
    const s = await hfStatus(h);
    if (!s) continue;
    if (s.status === "completed") return s;
    if (s.status === "failed") throw new HiggsfieldError(`Higgsfield job failed: ${s.error ?? "unknown"}`, 500);
    if (s.status === "nsfw") throw new HiggsfieldError("Higgsfield moderation rejected the request (nsfw)", 451);
    if (s.status === "canceled") throw new HiggsfieldError("Higgsfield job was canceled", 499);
  }
}

/** Thrown when polling gives up. The job keeps running (and bills) — callers
    persist the handle and resume rather than re-submitting. */
export class HiggsfieldTimeoutError extends Error {
  constructor(public handle: HfHandle, public estCostUsd = 0) {
    super("Higgsfield generation timed out — resume it via the render worker.");
    this.name = "HiggsfieldTimeoutError";
  }
}

/** Exact price for a request, or null (estimate endpoint is best-effort). */
export async function hfEstimate(
  endpoint: string,
  input: Record<string, unknown>,
): Promise<{ usd: number; credits: number } | null> {
  try {
    const res = await fetch(`${HIGGSFIELD_API}/estimate/${endpoint}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { usd?: number | string; credits?: number | string };
    const usd = Number(j.usd);
    return Number.isFinite(usd) ? { usd, credits: Number(j.credits ?? 0) } : null;
  } catch {
    return null;
  }
}

async function download(url: string): Promise<Buffer> {
  // Higgsfield keeps outputs ≥7 days only — callers upload the bytes to our
  // own storage immediately, never persist the provider URL.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url.slice(0, 80)}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Cinema Studio 4.0 (locked video model) ───────────────────────────

export type CinemaStudioControls = {
  genre?: "epic" | "drama" | "noir" | "comedy" | "horror" | "action";
  pacing?: "chaotic" | "dynamic" | "calm" | "single-shot";
  camera_model?: "modern" | "35mm-film" | "8mm-film" | "dv-camcorder";
  camera_lens?: "clean-sharp" | "anamorphic" | "vintage-anamorphic" | "warm-vintage" | "halation-vintage";
  era?: "1960s" | "1980s" | "1990s" | "2000s" | "2020s";
};

/** Build the Cinema Studio request. With a keyframe it becomes
    reference-to-video: the still rides `image_urls` and the prompt anchors it
    via the one-based `<<<image_1>>>` token. Creative controls are omitted
    unless set (the "director" chooses; the literal "auto" is rejected). */
export function cinemaStudioInput(opts: {
  prompt: string;
  durationSec: number;
  imageUrls?: string[];
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
  resolution?: "480p" | "720p";
  controls?: CinemaStudioControls;
}): Record<string, unknown> {
  const refs = (opts.imageUrls ?? []).filter(Boolean).slice(0, 30);
  const prompt = refs.length
    ? `Open on <<<image_1>>> and keep its subject, palette and composition. ${opts.prompt}`
    : opts.prompt;
  const input: Record<string, unknown> = {
    prompt,
    duration: Math.max(4, Math.min(30, Math.round(opts.durationSec))),
    resolution: opts.resolution ?? "720p",
    aspect_ratio: opts.aspectRatio ?? "16:9",
  };
  if (refs.length) input.image_urls = refs;
  for (const [k, v] of Object.entries(opts.controls ?? {})) if (v) input[k] = v;
  return input;
}

/** Endpoint + body for a Higgsfield video model. Cinema Studio takes the
    keyframe as a reference (`image_urls`); Seedance 2.5 uses its dedicated
    image-to-video endpoint where the keyframe is the literal first frame. */
export function higgsfieldVideoRequest(
  model: VideoModel,
  opts: { prompt: string; durationSec: number; imageUrl?: string; aspectRatio?: "16:9" | "9:16" },
): { endpoint: string; input: Record<string, unknown> } {
  const duration = Math.max(4, Math.min(30, Math.round(opts.durationSec)));
  if (model.id === "hf-seedance-2-5") {
    return opts.imageUrl
      ? {
          endpoint: model.i2v,
          input: { prompt: opts.prompt, image_url: opts.imageUrl, duration, resolution: "720p" },
        }
      : {
          endpoint: model.t2v,
          input: { prompt: opts.prompt, duration, resolution: "720p", aspect_ratio: opts.aspectRatio ?? "16:9" },
        };
  }
  return {
    endpoint: model.t2v,
    input: cinemaStudioInput({
      prompt: opts.prompt,
      durationSec: duration,
      imageUrls: opts.imageUrl ? [opts.imageUrl] : [],
      aspectRatio: opts.aspectRatio,
    }),
  };
}

/** Generate one clip on a Higgsfield video model (Cinema Studio 4.0 / Seedance 2.5). */
export async function generateHiggsfieldVideo(opts: {
  model: VideoModel;
  prompt: string;
  imageUrl?: string;
  durationSec: number;
  aspectRatio?: "16:9" | "9:16";
  timeoutMs?: number;
}): Promise<{ video: Buffer; costUsd: number; durationSec: number; requestId: string }> {
  const durationSec = clampDuration(opts.model, opts.durationSec);
  const { endpoint, input } = higgsfieldVideoRequest(opts.model, { ...opts, durationSec });
  const quoted = await hfEstimate(endpoint, input);
  const estimate = quoted?.usd ?? estimateClipCost(opts.model, durationSec);
  const handle = await hfSubmit(endpoint, input);
  let result: HfResult;
  try {
    result = await hfPoll(handle, opts.timeoutMs ?? 230_000);
  } catch (err) {
    if (err instanceof HiggsfieldTimeoutError) err.estCostUsd = estimate;
    throw err;
  }
  const url = result.video?.url;
  if (!url) throw new HiggsfieldError("Higgsfield returned no video URL", 502);
  return {
    video: await download(url),
    costUsd: Math.round(estimate * 100) / 100,
    durationSec,
    requestId: handle.requestId,
  };
}

// ── SOUL Standard (locked in-video image model) ──────────────────────

export function soulStandardInput(opts: {
  prompt: string;
  seed?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "2:3" | "3:2";
  resolution?: "720p" | "1080p";
  styleId?: string;
  customReferenceId?: string;
}): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: opts.prompt,
    aspect_ratio: opts.aspectRatio ?? "16:9",
    resolution: opts.resolution ?? "1080p",
    batch_size: 1,
    enhance_prompt: false,
  };
  // SOUL's seed range is 1..1_000_000.
  if (opts.seed !== undefined) input.seed = (Math.abs(Math.floor(opts.seed)) % 1_000_000) + 1;
  if (opts.styleId) input.style_id = opts.styleId;
  if (opts.customReferenceId) input.custom_reference_id = opts.customReferenceId;
  return input;
}

/** Drop-in for fal's generateImage: same return shape so the still pipeline
    (cache, pixel check, perceptual hash) is unchanged. */
export async function generateHiggsfieldImage(opts: {
  prompt: string;
  seed?: number;
  aspectRatio?: "16:9" | "9:16";
  timeoutMs?: number;
}): Promise<{ image: Buffer; costUsd: number; seed: number; endpoint: string }> {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000) + 1;
  const input = soulStandardInput({ prompt: opts.prompt, seed, aspectRatio: opts.aspectRatio });
  const handle = await hfSubmit(HF_ENDPOINTS.soulStandard, input);
  const result = await hfPoll(handle, opts.timeoutMs ?? 120_000);
  const url = result.images?.[0]?.url;
  if (!url) throw new HiggsfieldError("SOUL returned no image", 502);
  return {
    image: await download(url),
    costUsd: HF_PRICES.soulStandardPerImage,
    seed: input.seed as number,
    endpoint: HF_ENDPOINTS.soulStandard,
  };
}

// ── Genjutsu motion transfer (avatar animation) ──────────────────────

/** Current Genjutsu $/s (promo price until the promo end date). */
export function genjutsuUsdPerSec(now = new Date()): number {
  return now < new Date(HF_PRICES.genjutsuPromoEndsAt)
    ? HF_PRICES.genjutsuPromoPerSec
    : HF_PRICES.genjutsuPerSec;
}

/**
 * Animate a still (e.g. The Silicon Layer's host avatar) by transferring the
 * motion of a DRIVING video onto it. The API is video-to-video: it needs a
 * ≥4s driving clip (trimmed to 30s) plus 1–8 reference images of the
 * character. Output duration follows the driving clip.
 */
export async function animateWithGenjutsu(opts: {
  characterImageUrls: string[];
  drivingVideoUrl: string;
  drivingSec: number;
  prompt?: string;
  resolution?: "480p" | "720p";
  timeoutMs?: number;
}): Promise<{ video: Buffer; costUsd: number; durationSec: number; requestId: string }> {
  const refs = opts.characterImageUrls.filter(Boolean).slice(0, 8);
  if (!refs.length) throw new Error("Genjutsu needs at least one character image");
  if (opts.drivingSec < 4) throw new Error("Genjutsu driving video must be at least 4 seconds");
  const input: Record<string, unknown> = {
    video_url: opts.drivingVideoUrl,
    image_urls: refs,
    prompt: opts.prompt ?? "",
    resolution: opts.resolution ?? "720p",
  };
  const durationSec = Math.min(30, opts.drivingSec);
  const quoted = await hfEstimate(HF_ENDPOINTS.genjutsuMotion, input);
  const handle = await hfSubmit(HF_ENDPOINTS.genjutsuMotion, input);
  const result = await hfPoll(handle, opts.timeoutMs ?? 280_000);
  const url = result.video?.url;
  if (!url) throw new HiggsfieldError("Genjutsu returned no video URL", 502);
  return {
    video: await download(url),
    costUsd: Math.round((quoted?.usd ?? genjutsuUsdPerSec() * durationSec) * 100) / 100,
    durationSec,
    requestId: handle.requestId,
  };
}
