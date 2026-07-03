import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";
import { selectBest, normalizeCandidates, type PairScorer } from "@/lib/pipeline/best-of-n";

/**
 * Best-of-N judge + variant expansion for packaging artifacts (Harness C2).
 *
 * Titles are the single biggest CTR lever, yet the autonomous path published
 * the idea title untouched. This module expands the candidate set with a few
 * fresh variants, then judge-selects the winner via best-of-N pairwise
 * (order-swapped). The judge is Haiku (~$0.0004/comparison) — a title is
 * worth a cent of judging. No key → returns the first candidate unchanged.
 */

const JUDGE_MODEL = process.env.VARIANT_JUDGE_MODEL?.trim() || "claude-haiku-4-5";
const GEN_MODEL = process.env.VARIANT_GEN_MODEL?.trim() || "claude-haiku-4-5";

export type VariantKind = "title" | "thumb_phrase";

function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const GOAL: Record<VariantKind, string> = {
  title:
    "the YouTube TITLE most likely to earn a click from the target audience WITHOUT overpromising — " +
    "one specific, curiosity-driving promise the video actually delivers (satisfaction matters, not just CTR)",
  thumb_phrase:
    "the 2–5 word THUMBNAIL phrase that best pairs with the title to sell one clear promise at a glance — punchy, legible, no clickbait the video can't back up",
};

/** Generate `n` fresh variants to widen the candidate pool. Best-effort. */
async function expandVariants(
  kind: VariantKind,
  existing: string[],
  context: { title: string; niche: string; topic: string; hook?: string },
  n: number,
): Promise<{ variants: string[]; costUsd: number }> {
  if (n <= 0 || !isLive()) return { variants: [], costUsd: 0 };
  const tool = {
    name: "deliver_variants",
    description: "Deliver fresh candidate variants.",
    input_schema: {
      type: "object",
      properties: {
        variants: { type: "array", items: { type: "string" }, description: `${n} distinct options.` },
      },
      required: ["variants"],
    },
  } as const;
  const prompt =
    `Generate ${n} fresh candidates for ${GOAL[kind]}.\n\n` +
    `NICHE: ${context.niche}\nVIDEO TOPIC: ${context.topic}\nWORKING TITLE: ${context.title}\n` +
    (context.hook ? `OPENING HOOK: ${context.hook}\n` : "") +
    `\nExisting options (make yours meaningfully different, not paraphrases):\n${existing.map((e) => `- ${e}`).join("\n")}`;
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: GEN_MODEL,
        max_tokens: 400,
        tools: [tool],
        tool_choice: { type: "tool", name: "deliver_variants" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { variants: [], costUsd: 0 };
    const data = (await res.json()) as {
      content: { type: string; input?: { variants?: string[] } }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const variants = data.content.find((c) => c.type === "tool_use")?.input?.variants ?? [];
    return {
      variants: variants.map((v) => String(v).trim()).filter(Boolean),
      costUsd: anthropicCostUsd(GEN_MODEL, data.usage.input_tokens, data.usage.output_tokens),
    };
  } catch {
    return { variants: [], costUsd: 0 };
  }
}

/** A pairwise judge that returns P(a beats b). Cost accrues via the closure. */
function makePairScorer(
  kind: VariantKind,
  context: { title: string; niche: string; topic: string },
  onCost: (usd: number) => void,
): PairScorer {
  const tool = {
    name: "pick",
    description: "Pick the stronger option.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One line: why the winner is stronger." },
        winner: { type: "string", enum: ["A", "B"], description: "The stronger option." },
      },
      required: ["reason", "winner"],
    },
  } as const;
  return async (a, b) => {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 200,
        tools: [tool],
        tool_choice: { type: "tool", name: "pick" },
        messages: [
          {
            role: "user",
            content:
              `For a ${context.niche} video ("${context.topic}"), pick ${GOAL[kind]}.\n\n` +
              `A: ${a}\nB: ${b}\n\nState your reason, then pick the winner.`,
          },
        ],
      }),
    });
    if (!res.ok) return 0.5;
    const data = (await res.json()) as {
      content: { type: string; input?: { winner?: string } }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    onCost(anthropicCostUsd(JUDGE_MODEL, data.usage.input_tokens, data.usage.output_tokens));
    const winner = data.content.find((c) => c.type === "tool_use")?.input?.winner;
    return winner === "A" ? 1 : winner === "B" ? 0 : 0.5;
  };
}

export type BestVariantResult = {
  winner: string;
  ranked: { candidate: string; winShare: number }[];
  costUsd: number;
  /** true when a real judge ran (vs. no-key passthrough). */
  judged: boolean;
};

/**
 * Expand the candidate pool to ~`poolSize`, then best-of-N select the winner.
 * Returns the first candidate untouched when QC isn't live (no spend).
 */
export async function pickBestVariant(opts: {
  kind: VariantKind;
  candidates: string[];
  context: { title: string; niche: string; topic: string; hook?: string };
  poolSize?: number;
}): Promise<BestVariantResult> {
  const base = normalizeCandidates(opts.candidates, opts.poolSize ?? 5);
  if (!isLive() || base.length === 0) {
    return { winner: base[0] ?? opts.candidates[0] ?? "", ranked: [], costUsd: 0, judged: false };
  }
  let costUsd = 0;
  const poolSize = opts.poolSize ?? 5;
  const need = Math.max(0, poolSize - base.length);
  const { variants, costUsd: genCost } = await expandVariants(opts.kind, base, opts.context, need);
  costUsd += genCost;

  const pool = normalizeCandidates([...base, ...variants], poolSize);
  const scorePair = makePairScorer(opts.kind, opts.context, (c) => {
    costUsd += c;
  });
  const result = await selectBest(pool, scorePair);
  if (!result) return { winner: base[0], ranked: [], costUsd, judged: false };
  return { winner: result.winner, ranked: result.ranked, costUsd: Math.round(costUsd * 10000) / 10000, judged: true };
}
