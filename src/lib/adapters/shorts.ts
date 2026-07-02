import "server-only";
import { anthropicFetch } from "./anthropic";
import type { ScriptBeat } from "@/lib/db/types";

/**
 * Shorts segment selector (Anthropic Claude). Given a finished long-form
 * script, picks N non-overlapping contiguous beat ranges that each stand alone
 * as a vertical Short, and writes a scroll-stopping title + hook caption for
 * each. Repurposing already-paid-for assets — the render farm reuses the
 * parent's VO + clips for these beats, so a derived Short costs only this one
 * small LLM call (logged to the ledger).
 *
 * Live when ANTHROPIC_API_KEY is present and `smart` is on; otherwise a
 * deterministic heuristic spreads the segments across the script so the
 * feature works with no key and as the toggle's free off-state.
 *
 * Model is env-switchable via SCRIPT_MODEL (default Sonnet 4.6).
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

/** A single derived Short: a contiguous slice of the parent's beats. */
export type ShortSegmentPlan = {
  /** Parent ScriptBeat.idx values, contiguous and in order. */
  beats: number[];
  /** Internal label (the hook line) for the segment. */
  label: string;
  /** YouTube title for the Short (≤90 chars). */
  title: string;
  /** Hook/description line shown under the Short. */
  caption: string;
};

export type ShortSelection = {
  segments: ShortSegmentPlan[];
  costUsd: number;
  provider: "anthropic" | "heuristic";
};

export function isShortsSelectorLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Beats per Short — a tight, punchy slice. Clamped to what the script has. */
const SEG_MIN = 2;
const SEG_MAX = 4;

const DELIVER_SHORTS_TOOL = {
  name: "deliver_shorts",
  description: "Deliver the chosen Short segments cut from the long-form script.",
  input_schema: {
    type: "object",
    properties: {
      shorts: {
        type: "array",
        description:
          "The selected Shorts, strongest first. Each is a CONTIGUOUS run of beats that stands alone. Segments must NOT overlap.",
        items: {
          type: "object",
          properties: {
            beats: {
              type: "array",
              items: { type: "number" },
              description:
                "Contiguous parent beat indices for this Short (2–4 beats), e.g. [3,4,5].",
            },
            title: {
              type: "string",
              description:
                "Scroll-stopping YouTube Short title, ≤90 chars. Curiosity or payoff driven.",
            },
            caption: {
              type: "string",
              description: "One-line hook/description for the Short.",
            },
          },
          required: ["beats", "title", "caption"],
        },
      },
    },
    required: ["shorts"],
  },
} as const;

export async function selectShortSegments(opts: {
  title: string;
  niche: string;
  topic: string;
  tone: string;
  format: string;
  beats: ScriptBeat[];
  count: number;
  smart: boolean;
}): Promise<ShortSelection> {
  const count = Math.max(1, Math.min(opts.count, Math.max(1, Math.floor(opts.beats.length / SEG_MIN))));

  if (!opts.smart || !isShortsSelectorLive()) {
    return { segments: heuristicSegments(opts.beats, count, opts.title), costUsd: 0, provider: "heuristic" };
  }

  const script = opts.beats.map((b) => `[Beat ${b.idx}] ${b.text}`).join("\n\n");
  const prompt = `You are a Shorts editor for a ${opts.niche} YouTube channel. The long-form video is titled "${opts.title}" (${opts.format}; tone: ${opts.tone}).

From the script below, choose the ${count} BEST self-contained moments to republish as vertical Shorts. Each Short is a CONTIGUOUS run of ${SEG_MIN}–${SEG_MAX} beats that delivers a complete hook→payoff on its own — a shocking stat, a counterintuitive claim, a mini-story, or a satisfying reveal. Pick the moments most likely to stop a scroll. Segments must NOT overlap each other.

For each Short, write a scroll-stopping title (≤90 chars) and a one-line hook caption.

SCRIPT:
${script}

Call deliver_shorts with exactly ${count} non-overlapping segments, strongest first.`;

  const res = await anthropicFetch({
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.5,
      tools: [DELIVER_SHORTS_TOOL],
      tool_choice: { type: "tool", name: "deliver_shorts" },
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
  const raw = (toolUse?.input as {
    shorts?: { beats?: number[]; title?: string; caption?: string }[];
  } | undefined)?.shorts ?? [];

  const segments = normalizeSegments(raw, opts.beats, count, opts.title);
  // No usable segments back (rare) — fall back rather than derive nothing.
  if (segments.length === 0) {
    return { segments: heuristicSegments(opts.beats, count, opts.title), costUsd: 0, provider: "heuristic" };
  }

  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
  return { segments, costUsd: Math.round(costUsd * 100) / 100, provider: "anthropic" };
}

/**
 * Validate and clean the model's segments: keep only existing, contiguous beat
 * runs, clamp length, drop overlaps (first-come keeps the beats), and cap to
 * `count`. Guarantees non-overlapping, in-bounds segments.
 */
function normalizeSegments(
  raw: { beats?: number[]; title?: string; caption?: string }[],
  beats: ScriptBeat[],
  count: number,
  parentTitle: string,
): ShortSegmentPlan[] {
  const valid = new Set(beats.map((b) => b.idx));
  const used = new Set<number>();
  const out: ShortSegmentPlan[] = [];
  for (const s of raw) {
    if (out.length >= count) break;
    const picked = (s.beats ?? [])
      .filter((n) => valid.has(n) && !used.has(n))
      .sort((a, b) => a - b)
      .slice(0, SEG_MAX);
    // Require contiguity and a minimum length.
    const contiguous = picked.filter((n, i) => i === 0 || n === picked[i - 1] + 1);
    if (contiguous.length < Math.min(SEG_MIN, beats.length)) continue;
    contiguous.forEach((n) => used.add(n));
    const first = beats.find((b) => b.idx === contiguous[0]);
    out.push({
      beats: contiguous,
      label: clip(first?.text ?? parentTitle, 80),
      title: clip((s.title ?? "").trim() || deriveTitle(first?.text, parentTitle), 90),
      caption: clip((s.caption ?? "").trim() || (first?.text ?? "").trim(), 160),
    });
  }
  return out;
}

// ── Heuristic fallback (no key / smart off) ───────────────────────────
// Spread `count` non-overlapping windows of ~3 beats evenly across the script.

function heuristicSegments(
  beats: ScriptBeat[],
  count: number,
  parentTitle: string,
): ShortSegmentPlan[] {
  if (beats.length === 0) return [];
  const sorted = [...beats].sort((a, b) => a.idx - b.idx);
  const n = Math.max(1, Math.min(count, Math.floor(sorted.length / SEG_MIN)));
  const win = Math.min(SEG_MAX, Math.max(SEG_MIN, Math.floor(sorted.length / n)));
  const out: ShortSegmentPlan[] = [];
  for (let k = 0; k < n; k++) {
    // Evenly spaced start positions; clamp the last window to the end.
    let start = Math.min(Math.round((k * sorted.length) / n), sorted.length - win);
    start = Math.max(0, start);
    const slice = sorted.slice(start, start + win);
    if (slice.length < Math.min(SEG_MIN, sorted.length)) continue;
    const first = slice[0];
    out.push({
      beats: slice.map((b) => b.idx),
      label: clip(first.text, 80),
      title: clip(deriveTitle(first.text, parentTitle), 90),
      caption: clip(first.text, 160),
    });
  }
  return out;
}

function deriveTitle(beatText: string | undefined, parentTitle: string): string {
  const t = (beatText ?? "").replace(/\s+/g, " ").trim();
  if (t.length >= 12) return t;
  return parentTitle;
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}
