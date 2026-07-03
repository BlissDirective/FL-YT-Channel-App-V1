import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

/**
 * Beat-visual RELEVANCE gate (vision). The seed-vision gate only fires for
 * beats about to become paid AI video and weights artifacts/quality; plain
 * FLUX stills and — worst of all — keyword-searched STOCK clips got no
 * relevance check, so a beat about a specific chip, machine, or system could
 * end up illustrated by something unrelated.
 *
 * This looks at the ACTUAL chosen visual and asks one question: does it depict
 * the subject the narration is about? For technical topics it must show the
 * right kind of thing (a wafer/fab for a semiconductor beat, not a random
 * abstract gradient). It also returns concrete stock-search keywords so an
 * off-topic stock clip can be re-searched, not just discarded.
 *
 * Cheap model (Haiku vision by default); resilient — null on any failure so it
 * never blocks the pipeline.
 */

const MODEL = process.env.BEAT_RELEVANCE_MODEL?.trim() || "claude-haiku-4-5";

export function isBeatRelevanceLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type BeatRelevance = {
  /** 0–10: how well the image depicts what the narration is about. */
  relevance: number;
  /** What the image actually shows (one phrase). */
  depicts: string;
  /** Concise, subject-focused stock-search keywords to find a better clip. */
  betterQuery: string;
  reason: string;
  costUsd: number;
};

const TOOL = {
  name: "deliver_relevance",
  description: "Judge whether the image depicts what the narration is about.",
  input_schema: {
    type: "object",
    properties: {
      relevance: {
        type: "number",
        description:
          "0–10. 8+: clearly depicts the beat's subject. 5–7: on-theme but generic. " +
          "0–4: unrelated or a random stand-in (e.g. abstract shapes for a concrete technical subject).",
      },
      depicts: { type: "string", description: "What the image actually shows, one short phrase." },
      betterQuery: {
        type: "string",
        description:
          "2–5 concrete search keywords (nouns) for finding stock footage that WOULD match this narration — the specific subject, not a style.",
      },
      reason: { type: "string", description: "One line: why it does or doesn't match." },
    },
    required: ["relevance", "depicts", "betterQuery", "reason"],
  },
} as const;

/**
 * Verify one beat's visual against its narration. `imageUrl` is a short-lived
 * signed Storage URL (our stills) or an external poster URL (stock).
 */
export async function verifyBeatVisual(opts: {
  imageUrl: string;
  narration: string;
  visualPrompt?: string;
  niche?: string;
}): Promise<BeatRelevance | null> {
  if (!isBeatRelevanceLive()) return null;
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
        max_tokens: 400,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_relevance" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `This still illustrates one beat of a ${opts.niche ?? "YouTube"} video.\n` +
                  `The narrator is saying: "${opts.narration}"\n\n` +
                  `Judge how well the image depicts THAT subject. Be strict for concrete/technical topics: ` +
                  `a generic or abstract stand-in for a specific thing scores low. Then call deliver_relevance.`,
              },
              { type: "image", source: { type: "url", url: opts.imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input as
      | { relevance?: number; depicts?: string; betterQuery?: string; reason?: string }
      | undefined;
    if (!input) return null;
    return {
      relevance: Math.max(0, Math.min(10, Number(input.relevance ?? 0))),
      depicts: String(input.depicts ?? "").slice(0, 120),
      betterQuery: String(input.betterQuery ?? "").slice(0, 80),
      reason: String(input.reason ?? "").slice(0, 200),
      costUsd: anthropicCostUsd(MODEL, data.usage.input_tokens, data.usage.output_tokens),
    };
  } catch (err) {
    console.error("verifyBeatVisual failed:", err);
    return null;
  }
}
