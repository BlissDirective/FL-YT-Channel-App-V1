import "server-only";
import { anthropicFetch } from "./anthropic";

/**
 * Narrator pronunciation pass. TTS engines mangle technical copy: acronyms get
 * read as words ("GPU" → "gpoo"), jargon is guessed at ("CUDA" → "kewda"),
 * model numbers run together. This adapter produces a per-script lexicon that
 * maps a surface form to how it should be SPOKEN, then the VO stage synthesizes
 * the spoken form while CAPTIONS keep the clean display form ("GPU" on screen,
 * "G P U" in the ear).
 *
 * Two sources, merged:
 *   1. A curated niche dictionary (AI / semiconductors) — instant, free,
 *      deterministic, and consistent across every video.
 *   2. An LLM "pronunciation researcher" (Claude, forced tool-use) that scans
 *      the actual script for the long tail the dictionary doesn't cover.
 *
 * Live research requires ANTHROPIC_API_KEY; without it the dictionary alone
 * still applies (so common terms are always fixed).
 */

import type { WordTiming } from "./voice";

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export type Lexicon = Record<string, string>; // UPPERCASE surface → spoken form

export function isPronunciationLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Curated AI / semiconductor pronunciation dictionary. Keys are UPPERCASE (the
 * lookup uppercases the token); values are the spoken form as plain text that a
 * TTS engine reads correctly — space-separated capitals for initialisms,
 * phonetic respelling for jargon. Deliberately excludes terms that are already
 * said as ordinary words (ARM, RAM, ROM, CHIP) and anything that collides with
 * common English (IT, AS, OR) to avoid false positives.
 */
const NICHE_LEXICON: Lexicon = {
  // Processing units & memory
  GPU: "G P U", GPUS: "G P Us", CPU: "C P U", CPUS: "C P Us",
  TPU: "T P U", NPU: "N P U", DPU: "D P U", APU: "A P U", IPU: "I P U",
  HBM: "H B M", HBM2: "H B M two", HBM3: "H B M three", HBM3E: "H B M three E", HBM4: "H B M four",
  DRAM: "dee ram", SRAM: "ess ram", VRAM: "vee ram",
  DDR: "D D R", DDR4: "D D R four", DDR5: "D D R five",
  GDDR: "G D D R", GDDR6: "G D D R six", GDDR7: "G D D R seven", LPDDR: "L P D D R",
  SSD: "S S D", SSDS: "S S Ds", HDD: "H D D", NAND: "nand", NVME: "N V M E",
  SOC: "S O C", SOCS: "S O Cs", FPGA: "F P G A", ASIC: "ay sick", ASICS: "ay sicks",
  // Interconnect & IO
  PCIE: "P C I express", NVLINK: "N V link", NVSWITCH: "N V switch",
  IO: "I O", DMA: "D M A", UCIE: "U C I E", CXL: "C X L", HBI: "H B I",
  // Process / fab
  EUV: "E U V", DUV: "D U V", FINFET: "fin fet", GAA: "G A A", GAAFET: "gaa fet",
  CMOS: "see moss", TSV: "T S V", WAFER: "wafer", LITHO: "lith oh",
  // Companies & ecosystems
  NVIDIA: "en vid ee uh", TSMC: "T S M C", ASML: "A S M L", AMD: "A M D",
  IBM: "I B M", SK: "S K", GLOBALFOUNDRIES: "global foundries", UMC: "U M C",
  CUDA: "koo duh", ROCM: "rock em", PYTORCH: "pie torch", TENSORRT: "tensor R T",
  // AI / ML
  AI: "A I", ML: "M L", LLM: "L L M", LLMS: "L L Ms", GENAI: "gen A I",
  GPT: "G P T", LLAMA: "lah muh", MOE: "M O E", RAG: "rag", RLHF: "R L H F",
  FLOPS: "flops", TFLOPS: "tee flops", PFLOPS: "pee flops", TOPS: "tops",
  // Models / parts (common ones; numbers read naturally)
  H100: "H one hundred", H200: "H two hundred", A100: "A one hundred",
  B100: "B one hundred", B200: "B two hundred", GB200: "G B two hundred",
  GB300: "G B three hundred", MI300: "M I three hundred", MI300X: "M I three hundred X",
  RTX: "R T X", EPYC: "ep ick", XEON: "zee on", RYZEN: "rye zen",
  // Units & misc
  GHZ: "gigahertz", MHZ: "megahertz", THZ: "terahertz",
  TFLOP: "tee flop", PFLOP: "pee flop", API: "A P I", APIS: "A P Is",
  SDK: "S D K", OS: "O S", UI: "U I", UX: "U X", QPS: "Q P S",
};

/** Units that read wrong when glued to a number ("5nm" → "five nanometer"). */
const UNIT_WORDS: Record<string, string> = {
  nm: "nanometer", um: "micrometer", mm: "millimeter",
  ghz: "gigahertz", mhz: "megahertz", thz: "terahertz", khz: "kilohertz",
  gbps: "gigabit per second", tbps: "terabit per second", mbps: "megabit per second",
  gb: "gigabyte", tb: "terabyte", mb: "megabyte", kb: "kilobyte", pb: "petabyte",
  kw: "kilowatt", mw: "megawatt", kwh: "kilowatt hour", wh: "watt hour",
  ms: "millisecond", ns: "nanosecond", fps: "F P S", tdp: "T D P",
};

const DIGITS = /^\d[\d,.]*$/;

/** Split a token into leading punctuation, core, trailing punctuation. */
function splitPunct(token: string): { lead: string; core: string; trail: string } {
  const m = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  if (!m) return { lead: "", core: token, trail: "" };
  return { lead: m[1] ?? "", core: m[2] ?? "", trail: m[3] ?? "" };
}

/** Spoken form for one core token (no surrounding punctuation), or null to keep. */
function spokenCore(core: string, lexicon: Lexicon): string | null {
  if (!core) return null;
  // 1) Number glued to a unit: "5nm", "3GHz", "800GB".
  const glued = core.match(/^(\d[\d,.]*)([a-zA-Z]+)$/);
  if (glued) {
    const unit = UNIT_WORDS[glued[2].toLowerCase()];
    if (unit) return `${glued[1]} ${unit}`;
  }
  // 2) Dictionary (exact upper-cased surface).
  const hit = lexicon[core.toUpperCase()];
  if (hit) return hit;
  // 3) Bare unit token following a number is handled at the number; lone units
  //    and plain words are left untouched.
  if (DIGITS.test(core)) return null;
  return null;
}

/**
 * Rewrite display text into spoken text using the lexicon, returning a plan that
 * records how many spoken tokens each display token expanded into (so word
 * timings can be folded back onto the clean display tokens for captions).
 */
export function toSpokenText(
  text: string,
  lexicon: Lexicon,
): { spoken: string; plan: { display: string; spokenCount: number }[] } {
  const displayTokens = text.split(/\s+/).filter(Boolean);
  const spokenParts: string[] = [];
  const plan: { display: string; spokenCount: number }[] = [];
  for (const tok of displayTokens) {
    const { lead, core, trail } = splitPunct(tok);
    const spoken = spokenCore(core, lexicon);
    let words: string[];
    if (spoken == null) {
      words = [tok]; // unchanged — keep punctuation as-is
    } else {
      words = spoken.split(/\s+/).filter(Boolean);
      if (words.length === 0) words = [tok];
      else {
        if (lead) words[0] = lead + words[0];
        if (trail) words[words.length - 1] = words[words.length - 1] + trail;
      }
    }
    spokenParts.push(...words);
    plan.push({ display: tok, spokenCount: words.length });
  }
  return { spoken: spokenParts.join(" "), plan };
}

/**
 * Fold spoken-aligned word timings back onto display tokens: each display token
 * spans from its first spoken sub-token's start to its last's end. Defensive —
 * if the provider returned a different token count, it clamps gracefully so
 * captions never break.
 */
export function remapWordTimings(
  plan: { display: string; spokenCount: number }[],
  spokenWords: WordTiming[],
): WordTiming[] {
  const out: WordTiming[] = [];
  let i = 0;
  for (const p of plan) {
    const slice = spokenWords.slice(i, i + p.spokenCount);
    i += p.spokenCount;
    if (slice.length === 0) {
      const t = out.length ? out[out.length - 1].end : 0;
      out.push({ w: p.display, start: t, end: t });
    } else {
      out.push({ w: p.display, start: slice[0].start, end: slice[slice.length - 1].end });
    }
  }
  return out;
}

// ── LLM pronunciation researcher (the long tail) ──────────────────────────

const DELIVER_TOOL = {
  name: "deliver_pronunciations",
  description: "Deliver the list of terms that need pronunciation guidance for TTS narration.",
  input_schema: {
    type: "object",
    properties: {
      terms: {
        type: "array",
        description:
          "Only terms a text-to-speech engine would likely MISPRONOUNCE in this script: acronyms/initialisms to spell out, technical jargon, proper nouns, and model numbers. Skip ordinary English words and anything already pronounced correctly. At most 25 entries.",
        items: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "The exact surface form as it appears in the script (e.g. 'GPU', 'CUDA', 'TSMC', 'GDDR7').",
            },
            spoken: {
              type: "string",
              description:
                "How to SAY it, written as plain text the TTS will read correctly. Initialisms → space-separated capitals ('G P U'). Jargon/proper nouns → phonetic respelling in plain letters ('koo duh' for CUDA, 'en vid ee uh' for NVIDIA). Model numbers → natural reading ('H one hundred'). No IPA, no symbols.",
            },
          },
          required: ["term", "spoken"],
        },
      },
    },
    required: ["terms"],
  },
} as const;

type RawTerm = { term?: string; spoken?: string };

/**
 * Scan the script for terms the niche dictionary doesn't already cover and ask
 * Claude how to pronounce them. Returns entries keyed for merge into the
 * lexicon. No-key (or any failure) → empty, so the dictionary still applies.
 */
export async function researchPronunciations(opts: {
  title: string;
  niche: string;
  topic: string;
  scriptText: string;
  known: Lexicon;
}): Promise<{ entries: Lexicon; costUsd: number; provider: "anthropic" | "none" }> {
  if (!isPronunciationLive() || !opts.scriptText.trim()) {
    return { entries: {}, costUsd: 0, provider: "none" };
  }
  const knownList = Object.keys(opts.known).slice(0, 200).join(", ");
  const prompt =
    `You are a PRONUNCIATION COACH for a ${opts.niche} YouTube narrator. Read the script below and list the terms a ` +
    `text-to-speech engine would likely get WRONG, with how each should be spoken. Focus on acronyms/initialisms, ` +
    `technical jargon, proper nouns, and model numbers. Do NOT include ordinary words or anything already in this ` +
    `known list (already handled): ${knownList || "(none)"}.\n\n` +
    `SCRIPT:\n"""${opts.scriptText.slice(0, 6000)}"""\n\n` +
    `Call deliver_pronunciations with only the terms that genuinely need guidance.`;
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.2,
        tools: [DELIVER_TOOL],
        tool_choice: { type: "tool", name: "deliver_pronunciations" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { entries: {}, costUsd: 0, provider: "none" };
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const raw = (data.content.find((c) => c.type === "tool_use")?.input as { terms?: RawTerm[] } | undefined)?.terms ?? [];
    const entries: Lexicon = {};
    for (const r of raw) {
      const term = (r?.term ?? "").trim();
      const spoken = (r?.spoken ?? "").trim();
      // Single-word surface only (multi-word phrases aren't token-matchable in
      // the whole-word VO transform); keep it sane and short.
      if (!term || !spoken || /\s/.test(term) || term.length > 24) continue;
      if (opts.known[term.toUpperCase()]) continue;
      entries[term.toUpperCase()] = spoken.slice(0, 60);
    }
    const costUsd =
      (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
    return { entries, costUsd: Math.round(costUsd * 1000) / 1000, provider: "anthropic" };
  } catch {
    return { entries: {}, costUsd: 0, provider: "none" };
  }
}

/**
 * Build the full per-script lexicon: the curated niche dictionary merged with
 * the LLM-researched long tail. Researched entries never override the curated
 * ones. Cheap (one Claude call) and best-effort.
 */
export async function buildScriptLexicon(opts: {
  title: string;
  niche: string;
  topic: string;
  beats: { text: string }[];
}): Promise<{ lexicon: Lexicon; costUsd: number; provider: "anthropic" | "dictionary" }> {
  const base: Lexicon = { ...NICHE_LEXICON };
  const scriptText = opts.beats.map((b) => b.text ?? "").join("\n").trim();
  const research = await researchPronunciations({
    title: opts.title,
    niche: opts.niche,
    topic: opts.topic,
    scriptText,
    known: base,
  });
  for (const [k, v] of Object.entries(research.entries)) if (!base[k]) base[k] = v;
  return {
    lexicon: base,
    costUsd: research.costUsd,
    provider: research.provider === "anthropic" ? "anthropic" : "dictionary",
  };
}
