/**
 * Voice provider adapter (ElevenLabs). Live when ELEVENLABS_API_KEY is
 * present: real voice library + speech synthesis with word timestamps.
 * Falls back to stable mock voices otherwise (standing rule 4).
 */

export type Voice = {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
};

export type WordTiming = { w: string; start: number; end: number };

export type SynthesisResult = {
  audio: Buffer;
  words: WordTiming[];
  durationSec: number;
  /** USD estimate from character count (starter tier ≈ $0.167 / 1k chars). */
  costUsd: number;
};

const TTS_MODEL = "eleven_turbo_v2_5";
const USD_PER_1K_CHARS = 0.167;

const MOCK_VOICES: Voice[] = [
  { id: "mock-aria", name: "Aria", description: "Warm, conversational female — explainer-friendly" },
  { id: "mock-atlas", name: "Atlas", description: "Authoritative male — documentary narration" },
  { id: "mock-sage", name: "Sage", description: "Calm, measured neutral — finance & education" },
  { id: "mock-nova", name: "Nova", description: "Energetic female — list & hook-driven content" },
  { id: "mock-orion", name: "Orion", description: "Deep, dramatic male — dark history & true crime" },
];

export function isVoiceLive(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** The project's voice library — real ElevenLabs voices in live mode. */
export async function getVoices(): Promise<Voice[]> {
  if (!isVoiceLive()) return MOCK_VOICES;

  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return MOCK_VOICES;

  const data = (await res.json()) as {
    voices: {
      voice_id: string;
      name: string;
      preview_url?: string;
      labels?: Record<string, string>;
      category?: string;
    }[];
  };
  const voices = data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    description:
      [v.labels?.gender, v.labels?.age, v.labels?.accent, v.labels?.description ?? v.labels?.use_case]
        .filter(Boolean)
        .join(" · ") || v.category || "ElevenLabs voice",
    previewUrl: v.preview_url,
  }));
  return voices.length > 0 ? voices : MOCK_VOICES;
}

/** Kept for compatibility with earlier call sites. */
export async function getMockVoices(): Promise<Voice[]> {
  return getVoices();
}

/**
 * Synthesize one narration segment with character-level timestamps,
 * folded into word timings for the caption/reader sync.
 */
export async function synthesizeSpeech(opts: {
  text: string;
  voiceId: string;
}): Promise<SynthesisResult> {
  if (!isVoiceLive()) throw new Error("ElevenLabs is not configured");

  const voiceId = opts.voiceId.startsWith("mock-") ? "" : opts.voiceId;
  if (!voiceId) throw new Error("Project uses a sample voice — pick a real voice in project settings first");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text: opts.text, model_id: TTS_MODEL }),
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

  const words = foldWords(data.alignment);
  const durationSec =
    data.alignment.character_end_times_seconds.at(-1) ?? 0;

  return {
    audio: Buffer.from(data.audio_base64, "base64"),
    words,
    durationSec: Math.round(durationSec * 100) / 100,
    costUsd: Math.round(((opts.text.length / 1000) * USD_PER_1K_CHARS) * 100) / 100,
  };
}

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
