import "server-only";
import { anthropicFetch } from "./anthropic";
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
  "claude-opus-4-8": { in: 5, out: 25 },
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

/**
 * The hook beat (index 0) is republished on its own as a vertical Short — our
 * single biggest discovery/growth surface — so it must always carry at least
 * this many highlights. The Short composition renders only beat 0, so a bare
 * hook means a bare Short.
 */
export const HOOK_BEAT_IDX = 0;
export const SHORT_HOOK_MIN_HIGHLIGHTS = 2;

export type HighlightCuration = {
  highlights: CuratedHighlight[];
  costUsd: number;
  provider: "anthropic" | "mock";
};

export function isHighlightLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Casual/meme slang that undercuts an authoritative, educational channel
    (Tier 9.6). Highlights matching this are rejected so the on-screen text reads
    like a confident expert headline, never "WRONG LAYER, BRO". */
const BANNED_SLANG =
  /\b(bro|bruh|dude|lol|lmao|lmfao|omg|wtf|fr|ngl|tbh|vibe|vibes|lit|sus|yeet|slay|slayed|based|cringe|sheesh|rizz|skibidi|gyatt|bussin|cap|no cap|deadass|fam|bet|finna|gonna lie|mid|goated|sigma)\b/i;

/** True when a phrase is clean enough for a professional/educational channel. */
export function isProfessionalPhrase(text: string): boolean {
  return Boolean(text?.trim()) && !BANNED_SLANG.test(text);
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
  const target = Math.max(opts.targetCount, SHORT_HOOK_MIN_HIGHLIGHTS);

  if (!isHighlightLive()) {
    return {
      highlights: withHookGuarantee(
        heuristicHighlights(opts.beats, target, font, opts.brandPrimary),
        opts.beats,
        font,
        opts.brandPrimary,
      ),
      costUsd: 0,
      provider: "mock",
    };
  }

  const script = opts.beats
    .map((b) => `[Beat ${b.idx}] ${b.text}`)
    .join("\n\n");
  const prompt = `You are the on-screen-text director for a ${opts.niche} YouTube video titled "${opts.title}" (${opts.format}; tone: ${opts.tone}).

TONE — match the channel's ${opts.tone} voice but keep every phrase AUTHORITATIVE, professional, insightful, and educational: confident expert headlines, not memes. BANNED — never use casual/meme slang or filler ("bro", "dude", "lol", "vibe", "lit", "sus", "fr", "ngl", "sheesh", etc.), no emojis, no joke interjections. A phrase like "WRONG LAYER, BRO" is unacceptable; "THE WRONG LAYER" or "MEMORY, NOT COMPUTE" is right.

Pick the ${target} MOST attention-grabbing moments to reinforce with bold burned-in on-screen text. Less is more — only moments that genuinely earn a viewer's eyes: a shocking statistic, a surprising fact, a quotable line, the hook, or the payoff.

CRITICAL — Beat 0 (the hook) is ALSO published on its own as a vertical Short, our single biggest channel-growth driver. Place AT LEAST ${SHORT_HOOK_MIN_HIGHLIGHTS} of your most scroll-stopping highlights on Beat 0, each tied to a DIFFERENT spoken moment, using the highest-energy styles (sticker-tag, color-flash-pop, word-pop) at "high" intensity. They must be bold, unique, and impossible to scroll past. Then spread the remaining highlights across later beats; never two back-to-back in the same later beat.

For each, rewrite the moment into a punchy ALL-CAPS phrase of 2–6 words (condense — do NOT paste the narration), choose an emphasis word that is actually spoken in that beat, and pick the style preset that fits the moment.

SCRIPT:
${script}

Call deliver_highlights with at least ${SHORT_HOOK_MIN_HIGHLIGHTS} highlights on Beat 0 and ${target} total.`;

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
    // Tier 9.6: reject casual/meme slang so on-screen text stays professional.
    // The hook is topped up from clean narration by withHookGuarantee below.
    .filter((h) => validBeats.has(h.beatIdx) && h.text?.trim() && isProfessionalPhrase(h.text))
    // Allow the hook's extra highlights through the cap (≥2 there by design).
    .slice(0, target + SHORT_HOOK_MIN_HIGHLIGHTS)
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
    highlights: withHookGuarantee(highlights, opts.beats, font, opts.brandPrimary),
    costUsd: Math.round(costUsd * 100) / 100,
    provider: "anthropic",
  };
}

/**
 * Guarantee the hook beat carries at least SHORT_HOOK_MIN_HIGHLIGHTS highlights
 * (it becomes a standalone Short). Tops up from the hook's own narration with
 * high-energy styling when the model under-delivers, then re-ids the full set.
 * If the hook is visual-only (no/thin narration), it borrows phrases from the
 * next beat — still anchored to the hook so they appear in the Short.
 */
function withHookGuarantee(
  highlights: CuratedHighlight[],
  beats: ScriptBeat[],
  font: string,
  brandPrimary: string,
): CuratedHighlight[] {
  const hook = beats.find((b) => b.idx === HOOK_BEAT_IDX) ?? beats[0];
  let result = highlights;
  if (hook) {
    const onHook = highlights.filter((h) => h.beatIdx === hook.idx);
    const need = SHORT_HOOK_MIN_HIGHLIGHTS - onHook.length;
    if (need > 0) {
      const used = onHook.map((h) => h.text);
      let phrases = liftPhrases(hook.text, need, used);
      // Visual-only / thin hook: borrow from the next beat's narration so the
      // Short still gets its highlights (kept on the hook beat to render there).
      if (phrases.length < need) {
        const next = beats.find((b) => b.idx === HOOK_BEAT_IDX + 1);
        if (next) {
          phrases = [
            ...phrases,
            ...liftPhrases(next.text, need - phrases.length, [
              ...used,
              ...phrases.map((p) => p.text),
            ]),
          ];
        }
      }
      const hookStyles: HighlightPreset[] = ["sticker-tag", "color-flash-pop", "word-pop"];
      const hookPos: HighlightPosition[] = ["center", "upper-third"];
      const topUps: CuratedHighlight[] = phrases.map((p, i) => ({
        id: "hook_tmp",
        beatIdx: hook.idx,
        text: p.text,
        emphasisWord: p.emphasis || undefined,
        stylePreset: hookStyles[(onHook.length + i) % hookStyles.length],
        fontFamily: font,
        emphasisColor: brandPrimary,
        position: hookPos[(onHook.length + i) % hookPos.length],
        intensity: "high",
        maxLines: 2,
      }));
      result = [...highlights, ...topUps];
    }
  }
  // Stable, unique ids for the final set (curation replaces it wholesale).
  return result.map((h, i) => ({ ...h, id: `hl_${i + 1}` }));
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

/** Lift up to `n` distinct punchy phrases from a beat (one per sentence),
    skipping any already in `exclude`. Used to top up a thin hook beat. */
function liftPhrases(
  text: string,
  n: number,
  exclude: string[],
): { text: string; emphasis: string }[] {
  const seen = new Set(exclude.map((t) => t.toUpperCase()));
  const out: { text: string; emphasis: string }[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  for (const s of sentences) {
    if (out.length >= n) break;
    const p = liftPhrase(s);
    if (p && !seen.has(p.text)) {
      seen.add(p.text);
      out.push(p);
    }
  }
  // Fallback for short/single-sentence hooks: lift from different word-segments
  // so we still get distinct phrases.
  if (out.length < n) {
    const w = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const segLen = Math.max(1, Math.ceil(w.length / n));
    for (let s = 0; s < n && out.length < n; s++) {
      const p = liftPhrase(w.slice(s * segLen, (s + 1) * segLen).join(" "));
      if (p && !seen.has(p.text)) {
        seen.add(p.text);
        out.push(p);
      }
    }
  }
  return out.slice(0, n);
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
