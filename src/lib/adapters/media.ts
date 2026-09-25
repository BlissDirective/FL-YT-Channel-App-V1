import "server-only";
import {
  generateImage as falGenerateImage,
  generateVideo as falGenerateVideo,
  isFalLive,
  FalVideoTimeoutError,
} from "./fal";
import {
  generateHiggsfieldImage,
  generateHiggsfieldVideo,
  HiggsfieldTimeoutError,
  isHiggsfieldLive,
} from "./higgsfield";
import { providerOutage } from "@/lib/pipeline/provider-health";
import { createAdminClient } from "@/lib/supabase/admin";
import { modelProvider, type VideoModel } from "./video-models";

/**
 * Visual-generation router: Higgsfield is PRIMARY, fal is the fallback.
 *
 *  • generateVideo  → dispatches on the model's provider (Cinema Studio 4.0 on
 *    Higgsfield; the legacy catalog on fal).
 *  • generateImage  → SOUL Standard on Higgsfield when live and healthy, else
 *    FLUX on fal. Same return shape either way, plus `provider` for the ledger.
 *
 * Callers import from here instead of ./fal so the provider choice lives in
 * one place.
 */

export { FalVideoTimeoutError, HiggsfieldTimeoutError };

/** Any visual provider live → paid visual stages may run. */
export function isVisualLive(): boolean {
  return isHiggsfieldLive() || isFalLive();
}

/** Higgsfield live AND its circuit breaker closed. Never throws. */
export async function higgsfieldAvailable(): Promise<boolean> {
  if (!isHiggsfieldLive()) return false;
  try {
    const outage = await providerOutage(createAdminClient(), "higgsfield");
    return !outage.down;
  } catch {
    return true;
  }
}

export type GeneratedVideo = {
  video: Buffer;
  costUsd: number;
  durationSec: number;
  provider: "fal" | "higgsfield";
};

export async function generateVideo(opts: {
  model: VideoModel;
  prompt: string;
  imageUrl?: string;
  durationSec: number;
  timeoutMs?: number;
}): Promise<GeneratedVideo> {
  if (modelProvider(opts.model) === "higgsfield") {
    if (!isHiggsfieldLive()) throw new Error("Higgsfield model selected but HIGGSFIELD_API_KEY is not set");
    const out = await generateHiggsfieldVideo(opts);
    return { video: out.video, costUsd: out.costUsd, durationSec: out.durationSec, provider: "higgsfield" };
  }
  const out = await falGenerateVideo(opts);
  return { ...out, provider: "fal" };
}

export type GeneratedImage = {
  image: Buffer;
  costUsd: number;
  seed: number;
  endpoint: string;
  /** Ledger provider tag ("higgsfield" | "fal.ai"). */
  provider: string;
  /** Short model label for asset meta ("soul/standard" | "flux/dev"). */
  model: string;
};

/**
 * In-video still. Locked to SOUL Standard while Higgsfield is available; on a
 * Higgsfield failure (or outage) it falls back to FLUX so a beat is never lost.
 */
export async function generateImage(opts: {
  prompt: string;
  quality?: "schnell" | "dev";
  seed?: number;
}): Promise<GeneratedImage> {
  if (await higgsfieldAvailable()) {
    try {
      const out = await generateHiggsfieldImage({ prompt: opts.prompt, seed: opts.seed });
      return { ...out, provider: "higgsfield", model: "soul/standard" };
    } catch (err) {
      if (!isFalLive()) throw err;
      console.error("SOUL still failed — falling back to FLUX:", err instanceof Error ? err.message : err);
    }
  }
  const quality = opts.quality ?? "schnell";
  const out = await falGenerateImage({ ...opts, quality });
  return { ...out, provider: "fal.ai", model: `flux/${quality}` };
}

/** Cache-key salt so a SOUL still never collides with a cached FLUX still. */
export async function stillCacheSalt(): Promise<string> {
  return (await higgsfieldAvailable()) ? "|hf-soul-standard" : "";
}
