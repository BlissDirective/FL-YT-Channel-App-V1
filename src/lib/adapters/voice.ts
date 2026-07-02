/**
 * Voice provider adapter. Two live providers, selectable per project:
 *  - ElevenLabs (premium): real voice library, native word timestamps.
 *  - Kokoro via fal.ai (volume): ~5× cheaper; word timings estimated
 *    proportionally from audio duration.
 * Falls back to stable mock voices when neither key is present.
 */

import { isFalLive, kokoroSynthesize } from "./fal";

export type VoiceProvider = "elevenlabs" | "kokoro" | "mock";

export type Voice = {
  id: string;
  name: string;
  description: string;
  provider: VoiceProvider;
  previewUrl?: string;
};

export type WordTiming = { w: string; start: number; end: number };

export type SynthesisResult = {
  audio: Buffer;
  contentType: string;
  fileExt: string;
  words: WordTiming[];
  durationSec: number;
  costUsd: number;
  provider: VoiceProvider;
};

const TTS_MODEL = "eleven_turbo_v2_5"; // 0.5 credits/char — half the default rate
// Ledger estimate per 1k characters. Plan-dependent (and turbo bills half
// credits/char), so it's env-tunable: set ELEVENLABS_USD_PER_1K_CHARS to your
// effective rate (Creator plan turbo ≈ 0.09; default keeps the conservative
// full-rate estimate so budgets err on the safe side).
const ELEVENLABS_USD_PER_1K_CHARS = Number(process.env.ELEVENLABS_USD_PER_1K_CHARS) > 0
  ? Number(process.env.ELEVENLABS_USD_PER_1K_CHARS)
  : 0.167;

const MOCK_VOICES: Voice[] = [
  { id: "mock-aria", name: "Aria", description: "Warm, conversational female — explainer-friendly", provider: "mock" },
  { id: "mock-atlas", name: "Atlas", description: "Authoritative male — documentary narration", provider: "mock" },
  { id: "mock-sage", name: "Sage", description: "Calm, measured neutral — finance & education", provider: "mock" },
  { id: "mock-nova", name: "Nova", description: "Energetic female — list & hook-driven content", provider: "mock" },
  { id: "mock-orion", name: "Orion", description: "Deep, dramatic male — dark history & true crime", provider: "mock" },
];

/** Curated Kokoro voices (fal.ai american-english endpoint). */
const KOKORO_VOICES: Voice[] = [
  { id: "kokoro:af_heart", name: "Heart", description: "female · warm, natural — best all-rounder", provider: "kokoro" },
  { id: "kokoro:af_bella", name: "Bella", description: "female · bright, energetic", provider: "kokoro" },
  { id: "kokoro:af_nicole", name: "Nicole", description: "female · soft, intimate — whisper-adjacent", provider: "kokoro" },
  { id: "kokoro:af_sarah", name: "Sarah", description: "female · clear, professional", provider: "kokoro" },
  { id: "kokoro:am_michael", name: "Michael", description: "male · steady, documentary", provider: "kokoro" },
  { id: "kokoro:am_fenrir", name: "Fenrir", description: "male · deep, dramatic", provider: "kokoro" },
  { id: "kokoro:am_adam", name: "Adam", description: "male · neutral narrator", provider: "kokoro" },
  { id: "kokoro:am_eric", name: "Eric", description: "male · friendly explainer", provider: "kokoro" },
];

export function isVoiceLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY) || isFalLive();
}

export function voiceProviderFor(voiceId: string | null | undefined): VoiceProvider {
  if (!voiceId || voiceId.startsWith("mock-")) return "mock";
  if (voiceId.startsWith("kokoro:")) return "kokoro";
  return "elevenlabs";
}

/** Can this exact voice be synthesized with the configured keys? */
export function canSynthesize(voiceId: string | null | undefined): boolean {
  const provider = voiceProviderFor(voiceId);
  if (provider === "elevenlabs") return Boolean(process.env.ELEVENLABS_API_KEY);
  if (provider === "kokoro") return isFalLive();
  return false;
}

/** Combined per-project voice library: premium + volume tiers. */
export async function getVoices(): Promise<Voice[]> {
  const voices: Voice[] = [];
  if (process.env.ELEVENLABS_API_KEY) voices.push(...(await elevenLabsVoices()));
  if (isFalLive()) voices.push(...KOKORO_VOICES);
  return voices.length > 0 ? voices : MOCK_VOICES;
}

async function elevenLabsVoices(): Promise<Voice[]> {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    voices: {
      voice_id: string;
      name: string;
      preview_url?: string;
      labels?: Record<string, string>;
      category?: string;
    }[];
  };
  return data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    description:
      [v.labels?.gender, v.labels?.age, v.labels?.accent, v.labels?.description ?? v.labels?.use_case]
        .filter(Boolean)
        .join(" · ") || v.category || "ElevenLabs voice",
    provider: "elevenlabs" as const,
    // Only surface a real, playable URL — some voices return empty/invalid
    // previews, which would render a play button that does nothing.
    previewUrl:
      v.preview_url && /^https?:\/\//.test(v.preview_url) ? v.preview_url : undefined,
  }));
}

/** Synthesize one narration segment, routed by the voice's provider. */
export async function synthesizeSpeech(opts: {
  text: string;
  voiceId: string;
}): Promise<SynthesisResult> {
  const provider = voiceProviderFor(opts.voiceId);
  if (provider === "mock") {
    throw new Error(
      "Project uses a sample voice — pick a real voice in project settings first",
    );
  }
  if (provider === "kokoro") return synthesizeKokoro(opts.text, opts.voiceId);
  return synthesizeElevenLabs(opts.text, opts.voiceId);
}

async function synthesizeKokoro(text: string, voiceId: string): Promise<SynthesisResult> {
  if (!isFalLive()) throw new Error("fal.ai is not configured for Kokoro voices");
  const result = await kokoroSynthesize({
    text,
    voice: voiceId.replace(/^kokoro:/, ""),
  });
  return {
    audio: result.audio,
    contentType: "audio/wav",
    fileExt: "wav",
    words: estimateWordTimings(text, result.durationSec),
    durationSec: result.durationSec,
    costUsd: result.costUsd,
    provider: "kokoro",
  };
}

async function synthesizeElevenLabs(text: string, voiceId: string): Promise<SynthesisResult> {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("ElevenLabs is not configured");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text, model_id: TTS_MODEL }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    audio_base64: string;
    alignment: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  };
  return {
    audio: Buffer.from(data.audio_base64, "base64"),
    contentType: "audio/mpeg",
    fileExt: "mp3",
    words: foldWords(data.alignment),
    durationSec:
      Math.round((data.alignment.character_end_times_seconds.at(-1) ?? 0) * 100) / 100,
    costUsd:
      Math.round((text.length / 1000) * ELEVENLABS_USD_PER_1K_CHARS * 100) / 100,
    provider: "elevenlabs",
  };
}

/** Kokoro has no native timestamps — distribute words across the measured
    duration, weighted by length plus a pause after sentence punctuation.
    Close enough for the read-along highlight; upgradeable to forced
    alignment later without schema changes. */
function estimateWordTimings(text: string, durationSec: number): WordTiming[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || durationSec <= 0) return [];
  const weights = tokens.map((t) => t.length + 1 + (/[.!?;:]$/.test(t) ? 4 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  return tokens.map((w, i) => {
    const span = (weights[i] / total) * durationSec;
    const timing = { w, start: round2(t), end: round2(t + span) };
    t += span;
    return timing;
  });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function foldWords(alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): WordTiming[] {
  const words: WordTiming[] = [];
  let current = "";
  let start = 0;
  for (let i = 0; i < alignment.characters.length; i++) {
    const ch = alignment.characters[i];
    if (/\s/.test(ch)) {
      if (current) {
        words.push({
          w: current,
          start,
          end: alignment.character_end_times_seconds[i - 1] ?? start,
        });
        current = "";
      }
    } else {
      if (!current) start = alignment.character_start_times_seconds[i] ?? 0;
      current += ch;
    }
  }
  if (current) {
    words.push({
      w: current,
      start,
      end: alignment.character_end_times_seconds.at(-1) ?? start,
    });
  }
  return words;
}
