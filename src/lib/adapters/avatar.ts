import "server-only";

/**
 * AI Avatar adapter (avatar build phase A): provider-agnostic
 * image + audio → talking-presenter video.
 *
 * The whole feature rides the seams the pipeline already has — the presenter
 * is ONE fixed image per project (identity by construction), the voice is the
 * beat's existing ElevenLabs VO file, and the output is an ordinary per-beat
 * clip asset the render composes like any footage.
 *
 * Default model: Kling AI Avatar v2 (realistic AND stylized characters,
 * cheapest production tier). VEED Fabric (draft/prototyping), OmniHuman 1.5
 * (film-grade hero shots), and InfiniTalk (long stable takes) are selectable.
 * Endpoint slugs are PINNED against fal's live catalog (Jul 2026), same
 * policy as VIDEO_MODELS; per-second prices are ledger estimates.
 *
 * sync.so lipsync (SYNC_SO_API_KEY) re-syncs an EXISTING avatar clip to new
 * audio — the cheap edit path after a VO retake (~$0.04/s vs full regen).
 *
 * Mock-first: no FAL_KEY → a mock: result so the whole flow works end-to-end
 * (and is testable) with zero credentials.
 */
import { isFalLive } from "./fal";

export type AvatarModel = {
  id: string;
  label: string;
  endpoint: string;
  usdPerSec: number;
  quality: "draft" | "standard" | "premium";
  maxClipSec: number;
  /** Extra fal input params (e.g. VEED resolution). */
  extraInput?: Record<string, unknown>;
  bestFor: string;
};

export const AVATAR_MODELS: AvatarModel[] = [
  {
    id: "kling-avatar-v2",
    label: "Kling AI Avatar v2",
    endpoint: "fal-ai/kling-video/ai-avatar/v2/standard",
    usdPerSec: 0.0562,
    quality: "standard",
    maxClipSec: 60,
    bestFor: "The workhorse presenter — realistic or stylized characters, best cost per production minute",
  },
  {
    id: "veed-fabric-480",
    label: "VEED Fabric 1.0 (480p)",
    endpoint: "veed/fabric-1.0",
    usdPerSec: 0.08,
    quality: "draft",
    maxClipSec: 30,
    extraInput: { resolution: "480p" },
    bestFor: "Cheap look-prototyping before locking the presenter",
  },
  {
    id: "veed-fabric-720",
    label: "VEED Fabric 1.0 (720p)",
    endpoint: "veed/fabric-1.0",
    usdPerSec: 0.15,
    quality: "standard",
    maxClipSec: 30,
    extraInput: { resolution: "720p" },
    bestFor: "Fabric's production tier",
  },
  {
    id: "omnihuman-1-5",
    label: "OmniHuman 1.5",
    endpoint: "fal-ai/bytedance/omnihuman/v1.5",
    usdPerSec: 0.16,
    quality: "premium",
    maxClipSec: 60,
    bestFor: "Film-grade full-body motion and camera moves — hero shots",
  },
  {
    id: "infinitalk",
    label: "InfiniTalk",
    endpoint: "fal-ai/infinitalk",
    usdPerSec: 0.2,
    quality: "premium",
    maxClipSec: 120,
    bestFor: "Long unbroken monologue takes with very stable lip-sync",
  },
];

export const DEFAULT_AVATAR_MODEL_ID = "kling-avatar-v2";

export function getAvatarModel(id: string): AvatarModel | undefined {
  return AVATAR_MODELS.find((m) => m.id === id);
}

export function estimateAvatarCost(model: AvatarModel, durationSec: number): number {
  const d = Math.min(Math.max(durationSec, 1), model.maxClipSec);
  return Math.round(model.usdPerSec * d * 100) / 100;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type AvatarResult =
  | { provider: "fal-avatar"; video: Buffer; costUsd: number; durationSec: number }
  | { provider: "mock"; video: null; costUsd: 0; durationSec: number };

/**
 * Generate one talking-avatar clip via fal's async queue (same submit/poll
 * protocol as generateVideo). Bills per second of output — which equals the
 * audio length — so the estimate uses the VO duration.
 */
export async function generateAvatarVideo(opts: {
  model: AvatarModel;
  imageUrl: string;
  audioUrl: string;
  durationSec: number;
  timeoutMs?: number;
}): Promise<AvatarResult> {
  if (!isFalLive()) {
    return { provider: "mock", video: null, costUsd: 0, durationSec: opts.durationSec };
  }
  const headers = {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "content-type": "application/json",
  };
  const input: Record<string, unknown> = {
    image_url: opts.imageUrl,
    audio_url: opts.audioUrl,
    ...(opts.model.extraInput ?? {}),
  };

  let submit: Response | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    submit = await fetch(`https://queue.fal.run/${opts.model.endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (submit.ok || (submit.status !== 429 && submit.status < 500) || attempt === 3) break;
    await sleep(600 * Math.pow(3, attempt - 1) + Math.floor(Math.random() * 400));
  }
  if (!submit || !submit.ok) {
    throw new Error(
      `fal ${opts.model.endpoint} submit ${submit?.status}: ${((await submit?.text()) ?? "").slice(0, 200)}`,
    );
  }
  const queued = (await submit.json()) as { status_url?: string; response_url?: string };
  if (!queued.status_url || !queued.response_url) {
    throw new Error("fal queue returned no status/response URL");
  }

  const deadline = Date.now() + (opts.timeoutMs ?? 230_000);
  for (;;) {
    if (Date.now() > deadline) {
      throw new Error(
        `fal avatar job timed out after ${(opts.timeoutMs ?? 230_000) / 1000}s — the job may still complete and bill (~$${estimateAvatarCost(opts.model, opts.durationSec).toFixed(2)}).`,
      );
    }
    await sleep(5000);
    const st = await fetch(queued.status_url, { headers, cache: "no-store" });
    if (!st.ok) continue;
    const status = (await st.json()) as { status?: string };
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error("fal reported the avatar job failed");
    }
  }

  const resp = await fetch(queued.response_url, { headers, cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`fal result ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const result = (await resp.json()) as { video?: { url?: string } };
  const url = result.video?.url;
  if (!url) throw new Error("fal returned no video URL");
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`avatar download failed (${dl.status})`);
  return {
    provider: "fal-avatar",
    video: Buffer.from(await dl.arrayBuffer()),
    costUsd: estimateAvatarCost(opts.model, opts.durationSec),
    durationSec: opts.durationSec,
  };
}

/* ------------------------------------------------------------------ */
/* Async job flow — submit once, poll across separate requests. Needed  */
/* because a full avatar clip can render longer than any single request  */
/* can wait, so the sync generateAvatarVideo above times out. Submit     */
/* returns the fal queue URLs; a later poll fetches the result when ready.*/
/* ------------------------------------------------------------------ */

export type AvatarJob = { statusUrl: string; responseUrl: string };

/** Submit an avatar job to the fal queue and return its poll URLs. Does NOT
    wait for completion. Throws on a bad submit; returns null in mock mode. */
export async function submitAvatarJob(opts: {
  model: AvatarModel;
  imageUrl: string;
  audioUrl: string;
}): Promise<AvatarJob | null> {
  if (!isFalLive()) return null;
  const headers = {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "content-type": "application/json",
  };
  const input: Record<string, unknown> = {
    image_url: opts.imageUrl,
    audio_url: opts.audioUrl,
    ...(opts.model.extraInput ?? {}),
  };
  let submit: Response | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    submit = await fetch(`https://queue.fal.run/${opts.model.endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });
    if (submit.ok || (submit.status !== 429 && submit.status < 500) || attempt === 3) break;
    await sleep(600 * Math.pow(3, attempt - 1) + Math.floor(Math.random() * 400));
  }
  if (!submit || !submit.ok) {
    throw new Error(`fal ${opts.model.endpoint} submit ${submit?.status}: ${((await submit?.text()) ?? "").slice(0, 200)}`);
  }
  const queued = (await submit.json()) as { status_url?: string; response_url?: string };
  if (!queued.status_url || !queued.response_url) throw new Error("fal queue returned no status/response URL");
  return { statusUrl: queued.status_url, responseUrl: queued.response_url };
}

/** Poll a submitted avatar job ONCE. Returns {done:false} while it's still
    rendering, {done:true, video} when finished (downloads the mp4), or throws
    on a reported failure. */
export async function pollAvatarJob(
  job: AvatarJob,
): Promise<{ done: false } | { done: true; video: Buffer }> {
  const headers = { Authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" };
  const st = await fetch(job.statusUrl, { headers, cache: "no-store" });
  if (!st.ok) return { done: false };
  const status = (await st.json()) as { status?: string };
  if (status.status === "FAILED" || status.status === "ERROR") {
    throw new Error("fal reported the avatar job failed");
  }
  if (status.status !== "COMPLETED") return { done: false };
  const resp = await fetch(job.responseUrl, { headers, cache: "no-store" });
  if (!resp.ok) throw new Error(`fal result ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const result = (await resp.json()) as { video?: { url?: string } };
  const url = result.video?.url;
  if (!url) throw new Error("fal returned no video URL");
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`avatar download failed (${dl.status})`);
  return { done: true, video: Buffer.from(await dl.arrayBuffer()) };
}

/* ------------------------------------------------------------------ */
/* sync.so — cheap re-sync of an existing avatar clip to new audio     */
/* ------------------------------------------------------------------ */

export const SYNC_USD_PER_SEC = 0.04; // lipsync-2 tier

export function isSyncLive(): boolean {
  return Boolean(process.env.SYNC_SO_API_KEY);
}

export type ResyncResult =
  | { provider: "sync.so"; video: Buffer; costUsd: number }
  | { provider: "mock"; video: null; costUsd: 0 };

/**
 * Re-lipsync an existing avatar clip to new audio (the VO-retake edit path).
 * sync.so bills ~$0.04/s — cents instead of a full regeneration.
 */
export async function resyncLipsync(opts: {
  videoUrl: string;
  audioUrl: string;
  durationSec: number;
  timeoutMs?: number;
}): Promise<ResyncResult> {
  if (!isSyncLive()) return { provider: "mock", video: null, costUsd: 0 };
  const headers = {
    "x-api-key": process.env.SYNC_SO_API_KEY!,
    "content-type": "application/json",
  };
  const submit = await fetch("https://api.sync.so/v2/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "lipsync-2",
      input: [
        { type: "video", url: opts.videoUrl },
        { type: "audio", url: opts.audioUrl },
      ],
    }),
  });
  if (!submit.ok) {
    throw new Error(`sync.so submit ${submit.status}: ${(await submit.text()).slice(0, 200)}`);
  }
  const { id } = (await submit.json()) as { id?: string };
  if (!id) throw new Error("sync.so returned no job id");

  const deadline = Date.now() + (opts.timeoutMs ?? 230_000);
  for (;;) {
    if (Date.now() > deadline) throw new Error("sync.so job timed out");
    await sleep(5000);
    const st = await fetch(`https://api.sync.so/v2/generate/${id}`, { headers, cache: "no-store" });
    if (!st.ok) continue;
    const body = (await st.json()) as { status?: string; outputUrl?: string; error?: string };
    if (body.status === "COMPLETED" && body.outputUrl) {
      const dl = await fetch(body.outputUrl);
      if (!dl.ok) throw new Error(`sync.so download failed (${dl.status})`);
      return {
        provider: "sync.so",
        video: Buffer.from(await dl.arrayBuffer()),
        costUsd: Math.round(SYNC_USD_PER_SEC * opts.durationSec * 100) / 100,
      };
    }
    if (body.status === "FAILED" || body.status === "REJECTED") {
      throw new Error(`sync.so job failed: ${body.error ?? body.status}`);
    }
  }
}
