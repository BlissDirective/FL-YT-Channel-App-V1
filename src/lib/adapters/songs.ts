import "server-only";

/**
 * SONG generation adapter (children's-channel build) — full songs WITH vocals
 * and lyrics, i.e. the actual content of a kids' music video.
 *
 * Distinct from `music.ts`, which synthesises an instrumental BED underneath a
 * narrated video. A song is the subject of its own video: lyrics the writer
 * authored, sung, then illustrated by the visual pipeline.
 *
 * Provider choice (verified Jul 2026):
 * - DEFAULT MiniMax Music v2 via fal (~$0.035/song) — sings YOUR lyrics from a
 *   style description, so the song is script-synced by construction. Uses the
 *   existing FAL_KEY.
 * - Lyria 3 Pro via fal (~$0.08/song) — full songs with vocals and TIMED
 *   lyrics; the timing is what makes karaoke/sing-along captions exact.
 * - ElevenLabs Music (~$0.30/min) — official API on the existing
 *   ELEVENLABS_API_KEY, with explicit commercial terms.
 *
 * SUNO IS DELIBERATELY NOT INTEGRATED: as of Jul 2026 Suno has no official
 * public API (only a partner pilot). Every "Suno API" on the market is an
 * unofficial reseller wrapping consumer sessions — a licensing chain a
 * monetised children's channel must not depend on. Revisit when Suno ships
 * the official developer API; this module's shape makes that a ~30-line add.
 *
 * fal endpoint slugs are PINNED against fal's live catalog, same policy as
 * VIDEO_MODELS / AVATAR_MODELS. Mock-first: no key → mock result.
 */
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";
import { isFalLive } from "./fal";

export type SongModel = {
  id: string;
  label: string;
  provider: "fal" | "elevenlabs";
  endpoint: string;
  /** fal models bill a flat rate per song; ElevenLabs bills per minute. */
  usdPerSong?: number;
  usdPerMin?: number;
  maxSongSec: number;
  /** Sings caller-supplied lyrics (vs. inventing its own). */
  supportsLyrics: boolean;
  /** Returns per-word/line timings usable for sing-along captions. */
  timedLyrics: boolean;
  bestFor: string;
};

export const SONG_MODELS: SongModel[] = [
  {
    id: "minimax-music-v2",
    label: "MiniMax Music v2",
    provider: "fal",
    endpoint: "fal-ai/minimax-music/v2",
    usdPerSong: 0.035,
    maxSongSec: 240,
    supportsLyrics: true,
    timedLyrics: false,
    bestFor: "The workhorse — sings your lyrics from a style description for pennies",
  },
  {
    id: "lyria-3-pro",
    label: "Lyria 3 Pro",
    provider: "fal",
    endpoint: "fal-ai/lyria3-pro",
    usdPerSong: 0.08,
    maxSongSec: 180,
    supportsLyrics: true,
    timedLyrics: true,
    bestFor: "Vocals with timed lyrics — the pick for exact sing-along captions",
  },
  {
    id: "elevenlabs-song",
    label: "ElevenLabs Music",
    provider: "elevenlabs",
    endpoint: "https://api.elevenlabs.io/v1/music",
    usdPerMin: 0.3,
    maxSongSec: 300,
    supportsLyrics: true,
    timedLyrics: false,
    bestFor: "Premium official API with explicit commercial terms (existing key)",
  },
];

export const DEFAULT_SONG_MODEL_ID = "minimax-music-v2";

export function getSongModel(id: string): SongModel | undefined {
  return SONG_MODELS.find((m) => m.id === id);
}

export function estimateSongCost(model: SongModel, durationSec = 120): number {
  const dur = Math.min(Math.max(durationSec, 5), model.maxSongSec);
  const usd = model.usdPerSong ?? (model.usdPerMin ?? 0) * (dur / 60);
  return Math.round(usd * 1000) / 1000;
}

export function isSongProviderLive(model: SongModel): boolean {
  return model.provider === "fal" ? isFalLive() : Boolean(process.env.ELEVENLABS_API_KEY);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Lyric writing                                                       */
/* ------------------------------------------------------------------ */

const LYRICS_MODEL = "claude-sonnet-4-6";

const DELIVER_LYRICS_TOOL = {
  name: "deliver_lyrics",
  description: "Return the finished children's song.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Song title, 2–6 words" },
      lyrics: {
        type: "string",
        description:
          "The full lyrics with [Verse]/[Chorus]/[Bridge] section tags on their own lines. The chorus repeats verbatim.",
      },
      style: {
        type: "string",
        description:
          "One-line musical style directive: genre, tempo in bpm, instrumentation, vocal character.",
      },
      scenes: {
        type: "array",
        description: "One image/animation description per lyric section, in order.",
        items: { type: "string" },
      },
    },
    required: ["title", "lyrics", "style", "scenes"],
  },
};

/**
 * Child-safety rules for lyric writing. These are content constraints on
 * OUR generated output for a children's audience — not a filter on anything
 * a user supplies.
 */
const KIDS_LYRIC_SYSTEM = `You write original songs for a young children's animation channel (ages 2–6).

Craft rules:
- Simple, concrete vocabulary a preschooler uses. Short lines (3–8 words). Strong, obvious end rhymes.
- A repeating chorus that lands at least three times, word-for-word identical. Repetition is the point — it is how small children learn and how they ask to rewatch.
- Steady, singable meter. Read every line aloud in your head; if it stumbles, rewrite it.
- One clear idea per song (counting to five, brushing teeth, colours of a rainbow, sharing a toy). Never two.
- Warm, encouraging, gently playful. Call-and-response and simple actions (clap, jump, wave) are welcome.

Hard constraints:
- Nothing frightening, sad, violent, or peril-based. No monsters, danger, illness, injury, death, or characters in distress.
- No romance, no bodily humour, no consumer/brand references, no religion or politics.
- No real people, no trademarked characters, no lyrics or melodies from existing songs — everything original.
- No instructions a child could unsafely imitate (climbing, hiding, going somewhere alone, touching hot or sharp things).
- Plain, kind language throughout. Nothing sarcastic or ironic — small children read tone literally.`;

export type SongLyrics = {
  title: string;
  lyrics: string;
  style: string;
  scenes: string[];
  costUsd: number;
  provider: "anthropic" | "mock";
};

/** Deterministic mock so the whole flow works with no API key. */
function mockLyrics(topic: string): SongLyrics {
  const t = topic.trim() || "a happy day";
  return {
    title: `The ${t} Song`,
    lyrics: [
      "[Verse]",
      `Come along and sing with me,`,
      `${t} is fun to see.`,
      "",
      "[Chorus]",
      `Clap your hands and sing along,`,
      `${t} makes a happy song!`,
      "",
      "[Verse]",
      `One more time and off we go,`,
      `${t} helps us learn and grow.`,
      "",
      "[Chorus]",
      `Clap your hands and sing along,`,
      `${t} makes a happy song!`,
    ].join("\n"),
    style: "gentle acoustic children's sing-along, 95 bpm, ukulele and light percussion, warm friendly vocal",
    scenes: [
      `Bright cheerful cartoon scene introducing ${t}, soft rounded shapes, sunny palette`,
      `Colourful chorus scene with characters clapping, confetti, joyful motion`,
      `Playful scene showing ${t} again from a new angle, warm daylight`,
      `Final chorus scene, characters waving goodbye, soft sunset colours`,
    ],
    costUsd: 0,
    provider: "mock",
  };
}

export function isLyricsLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Write original, age-appropriate children's song lyrics for a topic, plus the
 * musical style directive and one visual scene per section (the scenes become
 * the video's beats, so the animation follows the song exactly).
 */
export async function writeSongLyrics(opts: {
  topic: string;
  ageRange?: string;
  lengthSec?: number;
  channelStyle?: string;
}): Promise<SongLyrics> {
  if (!isLyricsLive()) return mockLyrics(opts.topic);
  const sections = Math.max(4, Math.min(8, Math.round((opts.lengthSec ?? 120) / 25)));
  const prompt =
    `Write an original children's song about: ${opts.topic}\n` +
    `Audience: ${opts.ageRange ?? "ages 2–6"}. Target length: about ${opts.lengthSec ?? 120} seconds ` +
    `(roughly ${sections} sections including repeated choruses).\n` +
    (opts.channelStyle ? `Channel style: ${opts.channelStyle}\n` : "") +
    `Return one scene description per section, in the same order as the lyric sections. ` +
    `Scene descriptions must be simple, bright, and child-friendly, and must not name real people or branded characters.`;

  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: LYRICS_MODEL,
        max_tokens: 2000,
        system: KIDS_LYRIC_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        tools: [DELIVER_LYRICS_TOOL],
        tool_choice: { type: "tool", name: "deliver_lyrics" },
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const body = (await res.json()) as {
      content?: { type: string; name?: string; input?: Record<string, unknown> }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tool = body.content?.find((c) => c.type === "tool_use" && c.name === "deliver_lyrics");
    const input = tool?.input as
      | { title?: string; lyrics?: string; style?: string; scenes?: string[] }
      | undefined;
    if (!input?.lyrics || !input.title) throw new Error("no lyrics returned");
    return {
      title: input.title,
      lyrics: input.lyrics,
      style: input.style ?? "cheerful children's sing-along, 100 bpm, warm friendly vocal",
      scenes: Array.isArray(input.scenes) && input.scenes.length > 0 ? input.scenes : mockLyrics(opts.topic).scenes,
      costUsd: anthropicCostUsd(
        LYRICS_MODEL,
        body.usage?.input_tokens ?? 0,
        body.usage?.output_tokens ?? 0,
      ),
      provider: "anthropic",
    };
  } catch (err) {
    console.error(`lyric writing fell back to mock: ${String(err).slice(0, 140)}`);
    return mockLyrics(opts.topic);
  }
}

/* ------------------------------------------------------------------ */
/* Song synthesis                                                      */
/* ------------------------------------------------------------------ */

export type SongResult =
  | {
      provider: "fal-song" | "elevenlabs-song";
      audio: Buffer;
      contentType: string;
      costUsd: number;
      /** Present when the model returns timed lyrics (Lyria). */
      timings?: { text: string; start: number; end: number }[];
    }
  | { provider: "mock"; audio: null; contentType: "audio/mpeg"; costUsd: 0 };

/** Generate one sung song from a style directive and (optionally) lyrics. */
export async function generateSong(opts: {
  model: SongModel;
  style: string;
  lyrics?: string;
  durationSec?: number;
  timeoutMs?: number;
}): Promise<SongResult> {
  if (!isSongProviderLive(opts.model)) {
    return { provider: "mock", audio: null, contentType: "audio/mpeg", costUsd: 0 };
  }
  return opts.model.provider === "fal" ? generateFalSong(opts) : generateElevenLabsSong(opts);
}

async function generateFalSong(opts: {
  model: SongModel;
  style: string;
  lyrics?: string;
  durationSec?: number;
  timeoutMs?: number;
}): Promise<SongResult> {
  const headers = {
    Authorization: `Key ${process.env.FAL_KEY}`,
    "content-type": "application/json",
  };
  const input: Record<string, unknown> = { prompt: opts.style };
  if (opts.lyrics?.trim()) input.lyrics = opts.lyrics.trim();

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
        `fal song job timed out — it may still complete and bill (~$${estimateSongCost(opts.model, opts.durationSec).toFixed(3)}).`,
      );
    }
    await sleep(4000);
    const st = await fetch(queued.status_url, { headers, cache: "no-store" });
    if (!st.ok) continue;
    const status = (await st.json()) as { status?: string };
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error("fal reported the song job failed");
    }
  }

  const resp = await fetch(queued.response_url, { headers, cache: "no-store" });
  if (!resp.ok) throw new Error(`fal result ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  const result = (await resp.json()) as {
    audio?: { url?: string };
    audio_file?: { url?: string };
    timestamps?: { text?: string; start?: number; end?: number }[];
  };
  const url = result.audio?.url ?? result.audio_file?.url;
  if (!url) throw new Error("fal returned no audio URL");
  const dl = await fetch(url);
  if (!dl.ok) throw new Error(`song download failed (${dl.status})`);
  const timings = (result.timestamps ?? [])
    .filter((t) => typeof t.start === "number" && typeof t.end === "number")
    .map((t) => ({ text: t.text ?? "", start: t.start as number, end: t.end as number }));
  return {
    provider: "fal-song",
    audio: Buffer.from(await dl.arrayBuffer()),
    contentType: dl.headers.get("content-type") ?? "audio/mpeg",
    costUsd: estimateSongCost(opts.model, opts.durationSec),
    ...(timings.length > 0 ? { timings } : {}),
  };
}

async function generateElevenLabsSong(opts: {
  model: SongModel;
  style: string;
  lyrics?: string;
  durationSec?: number;
  timeoutMs?: number;
}): Promise<SongResult> {
  const durationSec = Math.min(opts.durationSec ?? 120, opts.model.maxSongSec);
  const prompt = opts.lyrics?.trim()
    ? `${opts.style}\n\nSing these lyrics exactly:\n${opts.lyrics.trim()}`
    : opts.style;
  const res = await fetch(opts.model.endpoint, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prompt, music_length_ms: durationSec * 1000 }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 230_000),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs Music ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return {
    provider: "elevenlabs-song",
    audio: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "audio/mpeg",
    costUsd: estimateSongCost(opts.model, durationSec),
  };
}
