import "server-only";
import { anthropicFetch } from "./anthropic";
import type { Blueprint, IntelCompetitor } from "@/lib/db/types";

/**
 * Video / Market Intelligence adapter (Phase A). Turns a set of similar
 * videos (Data-API metadata) + an optional operator-pasted transcript into a
 * structured, original blueprint via Claude. Live when ANTHROPIC_API_KEY is
 * set; deterministic mock otherwise (standing rule 4). Analysis only — every
 * recommendation drives OUR original content; no third-party footage is used.
 */

const MODEL = process.env.INTEL_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export function isIntelLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const strArr = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description,
});

const DELIVER_BLUEPRINT_TOOL = {
  name: "deliver_blueprint",
  description: "Deliver the market-intelligence blueprint for the operator's video.",
  input_schema: {
    type: "object",
    properties: {
      works: strArr("What clearly WORKS in this market — patterns the top videos share."),
      doesnt: strArr("What does NOT work / common mistakes that suppress these videos."),
      hooks: {
        type: "array",
        description: "3–5 hook patterns that win in this niche.",
        items: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "The hook pattern, generalized." },
            example: { type: "string", description: "A concrete example line (original, not copied)." },
            why: { type: "string", description: "Why it works." },
          },
          required: ["pattern", "example", "why"],
        },
      },
      structure: {
        type: "array",
        description: "Recommended beat-by-beat structure for OUR original video.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Beat label, e.g. 'Cold-open hook'." },
            targetSec: { type: "number", description: "Suggested length of this beat in seconds." },
            note: { type: "string", description: "What to do in this beat." },
          },
          required: ["label", "targetSec", "note"],
        },
      },
      pacing: strArr("Pacing / retention notes (e.g. where viewers drop, ideal cut rhythm)."),
      gaps: strArr("Coverage gaps — what nobody is doing that we could own."),
      titlePatterns: strArr("Title patterns that win in this niche."),
      thumbnailPatterns: strArr("Thumbnail patterns that win in this niche."),
      angle: { type: "string", description: "The single differentiation angle we should take." },
    },
    required: [
      "works", "doesnt", "hooks", "structure", "pacing",
      "gaps", "titlePatterns", "thumbnailPatterns", "angle",
    ],
  },
} as const;

export type IntelResult = { blueprint: Blueprint; costUsd: number; provider: "anthropic" | "mock" };

export async function analyzeVideoIntel(opts: {
  topic: string;
  niche: string;
  audience: string;
  angle: string;
  ourTitle?: string;
  competitors: IntelCompetitor[];
  transcript?: string;
  /** Timestamped frame/perception notes from a deep (Gemini) scan. */
  perceptionNotes?: string;
}): Promise<IntelResult> {
  if (!isIntelLive()) {
    return { blueprint: mockBlueprint(opts), costUsd: 0, provider: "mock" };
  }

  const now = Date.now();
  const compLines = opts.competitors
    .map((c) => {
      const ageDays = c.publishedAt
        ? Math.round((now - new Date(c.publishedAt).getTime()) / 86_400_000)
        : null;
      return `- "${c.title}"${c.channelTitle ? ` (${c.channelTitle})` : ""} — ${c.views.toLocaleString()} views${ageDays != null ? `, ~${ageDays}d old` : ""}`;
    })
    .join("\n");

  const prompt = `You are a YouTube strategist doing competitive research for a ${opts.niche} channel${opts.audience ? ` (audience: ${opts.audience})` : ""}${opts.angle ? `; our channel angle: ${opts.angle}` : ""}.

We are planning a video on: "${opts.topic}"${opts.ourTitle ? ` (working title: "${opts.ourTitle}")` : ""}.

Here are top/similar videos in this market (titles + view counts are the signal — higher views relative to age = what's resonating):
${compLines || "(no competitor list provided — infer from the niche)"}
${opts.perceptionNotes ? `\nDeep frame-by-frame perception of a top reference video (timestamped — what's on screen, pacing, structure):\n"""\n${opts.perceptionNotes.slice(0, 14000)}\n"""\n` : ""}${opts.transcript ? `\nReference transcript:\n"""\n${opts.transcript.slice(0, 12000)}\n"""\n` : ""}
Analyze what works vs. what doesn't in this market, then design a blueprint for OUR ORIGINAL video — never copy their wording or footage; extract the patterns, structure, and gaps. Call deliver_blueprint with the full analysis.`;

  const res = await anthropicFetch({
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      temperature: 0.7,
      tools: [DELIVER_BLUEPRINT_TOOL],
      tool_choice: { type: "tool", name: "deliver_blueprint" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Blueprint }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude returned no blueprint payload");
  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in +
    (data.usage.output_tokens / 1e6) * PRICE.out;

  return {
    blueprint: toolUse.input,
    costUsd: Math.round(costUsd * 100) / 100,
    provider: "anthropic",
  };
}

function mockBlueprint(opts: { topic: string; niche: string }): Blueprint {
  const t = opts.topic || opts.niche || "this topic";
  return {
    works: [
      "A cold-open that states the stakes in the first 5 seconds",
      "Concrete numbers and named examples over vague claims",
      "A clear 'you' — the video talks to one viewer",
    ],
    doesnt: [
      "Slow channel-branded intros before the hook",
      "Listicles with no through-line or payoff",
      "Generic stock visuals with no on-screen text anchors",
    ],
    hooks: [
      { pattern: "Contrarian claim", example: `Everything you've heard about ${t} is backwards.`, why: "Pattern-interrupt earns the next 10 seconds." },
      { pattern: "Open loop", example: `By the end of this you'll see ${t} completely differently.`, why: "Promises a payoff that holds retention." },
    ],
    structure: [
      { label: "Cold-open hook", targetSec: 15, note: `Bold claim about ${t}, no intro.` },
      { label: "Context", targetSec: 60, note: "Why this matters now, one concrete stat." },
      { label: "Core payoff", targetSec: 240, note: "The substance, in 3 escalating beats." },
      { label: "Turn / twist", targetSec: 90, note: "The non-obvious insight competitors miss." },
      { label: "Close + CTA", targetSec: 30, note: "Land the thesis, soft CTA." },
    ],
    pacing: [
      "Cut every 4–7 seconds; never hold a static shot past 10s",
      "Most channels sag around minute 4 — add a re-hook there",
    ],
    gaps: [`Nobody is connecting ${t} to a clear, practical takeaway`],
    titlePatterns: ["'The X nobody tells you about'", "'Why X is wrong about Y'"],
    thumbnailPatterns: ["One bold word + a face/object contrast", "High-contrast color block with 3-word text"],
    angle: `Treat ${t} seriously but make it feel like a discovery, not a lecture.`,
  };
}
