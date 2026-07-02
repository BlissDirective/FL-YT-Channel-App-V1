import "server-only";
import { anthropicFetch } from "./anthropic";

/**
 * Tier 4 #1 — seed-still vision gate. AI video clips (Kling/Veo/Seedance) are
 * billed per second and are generated image-to-video from a SEED still. Before
 * paying for that clip, critique the seed with the vision model: if it's
 * off-prompt or low quality, the caller re-rolls the cheap still rather than
 * paying dollars to animate a bad frame. Resilient: returns null when the model
 * is unavailable or the call fails (caller treats null as "don't block").
 */

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

export function isSeedVisionLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type SeedCritique = { score: number; issues: string[]; costUsd: number };

const CRITIC_TOOL = {
  name: "deliver_still_critique",
  description: "Rate a seed still that is about to be animated into a paid video clip.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description:
          "0–10 readiness to animate. Judge: does it match the intended scene, is the composition clean, and is it free of garbled text/letters, warped faces/hands, watermarks, or obvious AI artifacts? 8+ = great, 6–8 = usable, <6 = re-roll before paying to animate.",
      },
      issues: { type: "array", items: { type: "string" }, description: "Concrete problems, most important first (max 3)." },
    },
    required: ["score", "issues"],
  },
} as const;

/** Critique one seed still by URL (a short-lived signed Storage URL works). */
export async function critiqueSeedStill(opts: {
  imageUrl: string;
  visualPrompt: string;
  beatText: string;
}): Promise<SeedCritique | null> {
  if (!isSeedVisionLive()) return null;
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
        max_tokens: 512,
        tools: [CRITIC_TOOL],
        tool_choice: { type: "tool", name: "deliver_still_critique" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `This still is about to be animated into a PAID video clip, so judge it strictly.\n` +
                  `INTENDED SCENE: ${opts.visualPrompt}\n` +
                  (opts.beatText ? `BEAT NARRATION: ${opts.beatText.slice(0, 300)}\n` : "") +
                  `Call deliver_still_critique.`,
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
      | { score?: number; issues?: string[] }
      | undefined;
    if (!input || typeof input.score !== "number") return null;
    const price = PRICING[MODEL] ?? { in: 3, out: 15 };
    const costUsd =
      Math.round(((data.usage.input_tokens / 1e6) * price.in + (data.usage.output_tokens / 1e6) * price.out) * 1000) / 1000;
    return {
      score: Math.max(0, Math.min(10, Number(input.score))),
      issues: (input.issues ?? []).slice(0, 3),
      costUsd,
    };
  } catch {
    return null;
  }
}
