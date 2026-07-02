import "server-only";
import { anthropicFetch } from "./anthropic";
import type { NicheVideo } from "./youtube";

/**
 * Intelligence scoring (Phase 8). Claude scores proven niche videos for
 * repurposability into this project's channel — a fresh angle, not a copy —
 * using the Master Plan rubric. Live on ANTHROPIC_API_KEY (Haiku, ~$0.002 a
 * run); deterministic heuristic fallback otherwise (standing rule 4).
 */

const MODEL = "claude-haiku-4-5";
const PRICE_IN = 1;
const PRICE_OUT = 5;

export type ScoredIdea = {
  title: string;
  angle: string;
  score: number; // 0–10
  flag: "HIGH_VALUE" | "MEDIUM" | "SKIP";
  format: string;
  source: {
    ytVideoId?: string;
    url?: string;
    views?: number;
    sourceTitle?: string;
    publishedAt?: string;
  };
};

export function isIntelligenceLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SCORE_TOOL = {
  name: "deliver_ideas",
  description: "Deliver scored, repurposed video ideas for this channel.",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        description: "Scored ideas, strongest first.",
        items: {
          type: "object",
          properties: {
            sourceIndex: {
              type: "number",
              description: "Index of the source video this idea repurposes.",
            },
            title: {
              type: "string",
              description: "A fresh, original title for OUR channel — not a copy of the source.",
            },
            angle: {
              type: "string",
              description: "One sentence: the distinct angle/hook that makes this ours.",
            },
            score: {
              type: "number",
              description: "0–10 repurposability: proven demand × fit to our audience × originality headroom.",
            },
            format: {
              type: "string",
              enum: ["list", "story", "explainer", "case_study"],
            },
          },
          required: ["sourceIndex", "title", "angle", "score", "format"],
        },
      },
    },
    required: ["ideas"],
  },
} as const;

export async function scoreIdeas(opts: {
  niche: string;
  audience: string;
  angle: string;
  candidates: NicheVideo[];
}): Promise<{ ideas: ScoredIdea[]; costUsd: number }> {
  const top = opts.candidates.slice(0, 12);
  if (top.length === 0) return { ideas: [], costUsd: 0 };
  if (!isIntelligenceLive()) return { ideas: heuristicScore(opts, top), costUsd: 0 };

  const prompt = `You scout video ideas for a faceless YouTube channel.
Niche: ${opts.niche}
Audience: ${opts.audience}
Our editorial angle: ${opts.angle}

Below are proven videos from this niche. For the best 5, propose a video for OUR
channel that repurposes the proven demand with a genuinely fresh angle (never a
copy — it must survive YouTube's inauthentic-content bar). Score repurposability
0–10. Skip anything off-audience or too generic.

${top
  .map(
    (v, i) =>
      `[${i}] "${v.title}" — ${Intl.NumberFormat("en", { notation: "compact" }).format(v.views)} views, published ${v.publishedAt.slice(0, 10)}`,
  )
  .join("\n")}`;

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
        tools: [SCORE_TOOL],
        tool_choice: { type: "tool", name: "deliver_ideas" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { ideas: heuristicScore(opts, top), costUsd: 0 };
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input as
      | { ideas: { sourceIndex: number; title: string; angle: string; score: number; format: string }[] }
      | undefined;
    if (!input?.ideas) return { ideas: heuristicScore(opts, top), costUsd: 0 };

    const ideas: ScoredIdea[] = input.ideas.map((it) => {
      const src = top[it.sourceIndex] ?? top[0];
      const score = Math.max(0, Math.min(10, Number(it.score)));
      return {
        title: it.title,
        angle: it.angle,
        score,
        flag: score >= 7.5 ? "HIGH_VALUE" : score >= 5 ? "MEDIUM" : "SKIP",
        format: it.format,
        source: {
          ytVideoId: src.videoId,
          url: src.url,
          views: src.views,
          sourceTitle: src.title,
          publishedAt: src.publishedAt,
        },
      };
    });
    const costUsd =
      Math.round(
        ((data.usage.input_tokens / 1e6) * PRICE_IN +
          (data.usage.output_tokens / 1e6) * PRICE_OUT) *
          10000,
      ) / 10000;
    return { ideas, costUsd };
  } catch {
    return { ideas: heuristicScore(opts, top), costUsd: 0 };
  }
}

/** No-key fallback: score by proven views, keep the source title's pull. */
function heuristicScore(
  opts: { angle: string },
  top: NicheVideo[],
): ScoredIdea[] {
  const maxViews = Math.max(...top.map((v) => v.views), 1);
  return top
    .map((v) => {
      const score = Math.round((4 + (v.views / maxViews) * 5) * 10) / 10;
      return {
        title: v.title,
        angle: `Repurpose with our angle: ${opts.angle || "a sharper, original hook"}`,
        score,
        flag: (score >= 7.5 ? "HIGH_VALUE" : score >= 5 ? "MEDIUM" : "SKIP") as ScoredIdea["flag"],
        format: "explainer",
        source: {
          ytVideoId: v.videoId,
          url: v.url,
          views: v.views,
          sourceTitle: v.title,
          publishedAt: v.publishedAt,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
