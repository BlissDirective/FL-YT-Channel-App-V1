/**
 * Generated sound effects (MVDA Phase D, plan D7 "generated" source).
 * ElevenLabs sound-generation: text prompt → mp3. Stored as an asset row
 * with kind='sfx'; EDD cues reference it via { source:'generated', assetId }.
 * The curated-library path (DEFAULT_SFX_LIBRARY) is separate and free.
 */

export type SfxResult = {
  audio: Buffer;
  contentType: string;
  fileExt: string;
  durationSec: number;
  costUsd: number;
};

// ElevenLabs bills sound generation from the prompt/duration credit table;
// plan-dependent, so env-tunable like the TTS estimate. Default errs high.
const SFX_USD_PER_GENERATION = Number(process.env.ELEVENLABS_SFX_USD) > 0
  ? Number(process.env.ELEVENLABS_SFX_USD)
  : 0.1;

/** Sound-effect generation needs the same key as premium TTS. */
export function isSfxLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

const MAX_SFX_SEC = 22; // ElevenLabs hard limit
const MIN_SFX_SEC = 0.5;

export async function generateSoundEffect(opts: {
  prompt: string;
  /** Target length; omit to let the model choose from the prompt. */
  durationSec?: number;
}): Promise<SfxResult> {
  if (!isSfxLive()) throw new Error("ElevenLabs is not configured (sound generation)");
  const prompt = opts.prompt.trim();
  if (!prompt) throw new Error("sound effect prompt is empty");
  const durationSec =
    opts.durationSec != null
      ? Math.min(MAX_SFX_SEC, Math.max(MIN_SFX_SEC, opts.durationSec))
      : undefined;

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: prompt,
      ...(durationSec != null ? { duration_seconds: durationSec } : {}),
      prompt_influence: 0.6,
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs SFX error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const audio = Buffer.from(await res.arrayBuffer());
  return {
    audio,
    contentType: "audio/mpeg",
    fileExt: "mp3",
    // The API doesn't return duration; estimate from mp3 size at 128kbps and
    // let the requested duration override (the renderer plays the file as-is
    // either way — this only feeds asset meta / UI display).
    durationSec: durationSec ?? Math.round((audio.byteLength / (128_000 / 8)) * 10) / 10,
    costUsd: SFX_USD_PER_GENERATION,
  };
}
