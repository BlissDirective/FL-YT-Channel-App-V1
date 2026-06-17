import "server-only";
import type {
  CuratedHighlight,
  HighlightPreset,
  HighlightPosition,
  ScriptBeat,
} from "@/lib/db/types";

/**
 * Kinetic Highlights curation adapter (Anthropic Claude). Reads a finished
 * script + project niche and picks a SPARSE set of retention moments — a
 * shocking stat, a quotable line, a punchy hook — then rewrites each into a
 * 2–6 word on-screen phrase, tags an emphasis word, and assigns a style
 * preset. "Less is more."
 *
 * Live when ANTHROPIC_API_KEY is present; otherwise a deterministic heuristic
 * fallback keeps the pipeline working (standing rule 4). Timing is NOT decided
 * here — the render worker syncs each highlight to the exact spoken moment
 * from the beat's word timestamps.
 *
 * Model is env-switchable via SCRIPT_MODEL (default Sonnet 4.6); same pricing
 * table as the script writer.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export const HIGHLIGHT_PRESETS: HighlightPreset[] = [
  "word-pop",
  "highlight-box-swipe",
  "stat-card",
  "quote-card",
  "typewriter",
  "color-flash-pop",
  "sticker-tag",
  "underline-swipe",
];

/**
 * Display font per niche (CSS family names; all loaded by the render layer's
 * Google-Fonts loader). Keyword-matched against the project niche, with a
 * safe high-contrast default.
 */
const NICHE_FONTS: { match: RegExp; font: string }[] = [
  { match: /(gam|esport|hype|challenge|reaction|meme)/i, font: "Bangers" },
  { match: /(financ|money|business|invest|crypto|stock|b2b|market)/i, font: "Archivo Black" },
  { match: /(educat|explain|science|tech|how|tutorial|history|learn)/i, font: "Montserrat" },
  { match: /(crime|myster|horror|scary|dark|drama|conspirac)/i, font: "Oswald" },
  { match: /(luxur|lifestyle|fashion|travel|wellness|beauty|aesthetic)/i, font: "Bebas Neue" },
];

export function fontForNiche(niche: string): string {
  const hit = NICHE_FONTS.find((n) => n.match.test(niche || ""));
  return hit?.font ?? "Anton";
}

/** Auto density: ~1 highlight per 45s, clamped to a tasteful range. */
export function defaultHighlightCount(targetLengthSec: number): number {
  return Math.max(2, Math.min(8, Math.round(targetLengthSec / 45)));
}

export type HighlightCuration = {
  highlights: CuratedHighlight[];
  costUsd: number;
  provider: "anthropic" | "mock";
};

export function isHighlightLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const POSITIONS: HighlightPosition[] = ["center", "upper-third", "lower-third-safe"];

const DELIVER_HIGHLIGHTS_TOOL = {
  name: "deliver_highlights",
  description: "Deliver the curated on-screen highlight moments.",
  input_schema: {
    type: "object",
    properties: {
      highlights: {
        type: "array",
        description:
          "The selected highlight moments, in script order. Keep it SPARSE — only the most attention-grabbing beats.",
        items: {
          type: "object",
          properties: {
            beatIdx: {
              type: "number",
              description: "Index of the script beat this moment lives in.",
            },
            text: {
              type: "string",
              description:
                "Punchy on-screen phrase, 2–6 words, ALL CAPS. Rewritten and condensed — NOT a verbatim copy of the narration.",
            },
            emphasisWord: {
              type: "string",
              description:
                "One word from `text` to emphasise (a number, a shocking word). It should also be a word actually spoken in the beat so it can be timed.",
            },
            contentType: {
              type: "string",
              enum: ["stat", "fact", "quote", "hook", "payoff"],
              description: "What kind of moment this is — drives the style.",
            },
            stylePreset: {
              type: "string",
              enum: HIGHLIGHT_PRESETS,
              description:
                "Animation style. Suggested mapping: stat→stat-card, quote→quote-card, fact→word-pop or color-flash-pop, hook/payoff→sticker-tag or word-pop, key term→highlight-box-swipe or underline-swipe.",
            },
            intensity: {
              type: "string",
              enum: ["subtle", "med", "high"],
            },
          },
          required: ["beatIdx", "text", "emphasisWord", "contentType", "stylePreset", "intensity"],
        },
      },
    },
    required: ["highlights"],
  },
} as const;

export async function curateHighlights(opts: {
  title: string;
  niche: string;
  topic: string;
  tone: string;
  format: string;
  beats: ScriptBeat[];
  targetCount: number;
  brandPrimary: string;
}): Promise<HighlightCuration> {
  const font = fontForNiche(opts.niche);
  const target = Math.max(1, opts.targetCount);

  if (!isHighlightLive()) {
    return {
      highlights: heuristicHighlights(opts.beats, target, font, opts.brandPrimary),
      costUsd: 0,
      provider: "mock",
    };
  }

  const script = opts.beats
    .map((b) => `[Beat ${b.idx}] ${b.text}`)
    .join("\n\n");
  const prompt = `You are the on-screen-text director for a ${opts.niche} YouTube video titled "${opts.title}" (${opts.format}; tone: ${opts.tone}).

Pick the ${target} MOST attention-grabbing moments to reinforce with bold burned-in on-screen text. Less is more — only moments that genuinely earn a viewer's eyes: a shocking statistic, a surprising fact, a quotable line, the hook, or the payoff. Spread them across the script; never two in the same beat back-to-back.

For each, rewrite the moment into a punchy ALL-CAPS phrase of 2–6 words (condense — do NOT paste the narration), choose an emphasis word that is actually spoken in that beat, and pick the style preset that fits the moment.

SCRIPT:
${script}

Call deliver_highlights with up to ${target} highlights.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.6,
      tools: [DELIVER_HIGHLIGHTS_TOOL],
      tool_choice: { type: "tool", name: "deliver_highlights" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude returned no highlights payload");

  const raw = (toolUse.input as {
    highlights?: {
      beatIdx: number;
      text: string;
      emphasisWord?: string;
      contentType?: string;
      stylePreset?: string;
      intensity?: string;
    }[];
  }).highlights ?? [];

  const validBeats = new Set(opts.beats.map((b) => b.idx));
  const highlights: CuratedHighlight[] = raw
    .filter((h) => validBeats.has(h.beatIdx) && h.text?.trim())
    .slice(0, target)
    .map((h, i) => ({
      id: `hl_${i + 1}`,
      beatIdx: h.beatIdx,
      text: h.text.trim().toUpperCase(),
      emphasisWord: h.emphasisWord?.trim() || undefined,
      stylePreset: coercePreset(h.stylePreset, h.contentType),
      fontFamily: font,
      emphasisColor: opts.brandPrimary,
      position: positionFor(h.stylePreset, i),
      intensity: coerceIntensity(h.intensity),
      maxLines: 2,
    }));

  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in +
    (data.usage.output_tokens / 1e6) * PRICE.out;

  return {
    highlights,
    costUsd: Math.round(costUsd * 100) / 100,
    provider: "anthropic",
  };
}

function coercePreset(preset: string | undefined, contentType: string | undefined): HighlightPreset {
  if (preset && (HIGHLIGHT_PRESETS as string[]).includes(preset)) return preset as HighlightPreset;
  switch (contentType) {
    case "stat":
      return "stat-card";
    case "quote":
      return "quote-card";
    case "hook":
    case "payoff":
      return "sticker-tag";
    default:
      return "word-pop";
  }
}

function coerceIntensity(v: string | undefined): CuratedHighlight["intensity"] {
  return v === "subtle" || v === "high" ? v : "med";
}

/** Vary placement so stacked highlights don't all sit dead-centre. */
function positionFor(preset: string | undefined, i: number): HighlightPosition {
  if (preset === "stat-card" || preset === "quote-card") return "center";
  return POSITIONS[i % POSITIONS.length];
}

// ── Heuristic fallback (no API key) ───────────────────────────────────
// Picks beats spread across the script and lifts a short punchy phrase —
// preferring a sentence that contains a number/percent — so the feature is
// demoable without a live key.

const NUM_RE = /(\$?\d[\d,.]*\s?(?:%|percent|million|billion|thousand|k|x)?)/i;

function heuristicHighlights(
  beats: ScriptBeat[],
  count: number,
  font: string,
  brandPrimary: string,
): CuratedHighlight[] {
  if (beats.length === 0) return [];
  const n = Math.min(count, beats.length);
  const step = Math.max(1, Math.floor(beats.length / n));
  const out: CuratedHighlight[] = [];
  for (let k = 0; k < n; k++) {
    const beat = beats[Math.min(beats.length - 1, k * step)];
    const phrase = liftPhrase(beat.text);
    if (!phrase) continue;
    const num = beat.text.match(NUM_RE)?.[0]?.trim();
    out.push({
      id: `hl_${out.length + 1}`,
      beatIdx: beat.idx,
      text: phrase.text,
      emphasisWord: num ?? phrase.emphasis,
      stylePreset: num ? "stat-card" : k === 0 ? "sticker-tag" : "word-pop",
      fontFamily: font,
      emphasisColor: brandPrimary,
      position: POSITIONS[k % POSITIONS.length],
      intensity: "med",
      maxLines: 2,
    });
  }
  return out;
}

/** Lift up to 5 punchy words around the most interesting token in a beat. */
function liftPhrase(text: string): { text: string; emphasis: string } | null {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return null;
  // Anchor on a number if present, else the first long word.
  let anchor = words.findIndex((w) => NUM_RE.test(w));
  if (anchor < 0) anchor = words.findIndex((w) => clean(w).length >= 6);
  if (anchor < 0) anchor = 0;
  const start = Math.max(0, anchor - 1);
  const slice = words.slice(start, start + 5).map(clean).filter(Boolean);
  if (slice.length === 0) return null;
  return { text: slice.join(" ").toUpperCase(), emphasis: clean(words[anchor]) };
}

const clean = (w: string) => w.replace(/[^\p{L}\p{N}$%.]/gu, "");
