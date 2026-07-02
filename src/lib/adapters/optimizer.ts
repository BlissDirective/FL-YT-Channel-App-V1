import "server-only";
import { anthropicFetch } from "./anthropic";

/**
 * Optimizer (Phase 8). Correlates a project's tracked performance with the
 * formats / lengths / hooks that drove it and returns plain-English insight
 * cards — some carrying a proposed prompt-template revision the operator can
 * apply (and revert via versioning) in one tap. Live on ANTHROPIC_API_KEY
 * (Haiku); heuristic fallback otherwise (standing rule 4).
 */

const MODEL = "claude-haiku-4-5";
const PRICE_IN = 1;
const PRICE_OUT = 5;

export type OptimizerVideo = {
  title: string;
  format: string;
  lengthSec: number;
  views: number;
  likes: number;
  comments: number;
};

export type OptimizerInsight = {
  title: string;
  body: string;
  metric?: string;
  proposedTemplateKind?: string;
  proposedTemplateBody?: string;
};

export function isOptimizerLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const TOOL = {
  name: "deliver_insights",
  description: "Deliver performance insights for the channel.",
  input_schema: {
    type: "object",
    properties: {
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Punchy insight headline." },
            body: {
              type: "string",
              description: "2–3 sentences: the pattern, the evidence, the recommended change.",
            },
            metric: { type: "string", description: "The metric this is grounded in (e.g. 'avg views by format')." },
            revisedScriptTemplate: {
              type: "string",
              description:
                "OPTIONAL. If this insight implies a concrete change to the script prompt template, return the full revised template here. Omit otherwise.",
            },
          },
          required: ["title", "body"],
        },
      },
    },
    required: ["insights"],
  },
} as const;

export async function generateInsights(opts: {
  niche: string;
  audience: string;
  videos: OptimizerVideo[];
  scriptTemplate: string;
}): Promise<{ insights: OptimizerInsight[]; costUsd: number }> {
  if (opts.videos.length < 2) return { insights: [], costUsd: 0 };
  if (!isOptimizerLive()) return { insights: heuristic(opts.videos), costUsd: 0 };

  const rows = opts.videos
    .map(
      (v) =>
        `- "${v.title}" [${v.format}, ${Math.round(v.lengthSec / 60)}min] → ${v.views} views, ${v.likes} likes, ${v.comments} comments`,
    )
    .join("\n");
  const prompt = `You are the performance optimizer for a faceless YouTube channel.
Niche: ${opts.niche}. Audience: ${opts.audience}.

Tracked videos:
${rows}

Find 1–3 actionable patterns correlating attributes (format, length, hook/title
style) with views/engagement. Be concrete and grounded in the numbers above. If a
pattern implies a concrete change to the script prompt template below, return the
full revised template in revisedScriptTemplate.

Current script template:
"""
${opts.scriptTemplate}
"""`;

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
        max_tokens: 2000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_insights" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { insights: heuristic(opts.videos), costUsd: 0 };
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input as
      | { insights: { title: string; body: string; metric?: string; revisedScriptTemplate?: string }[] }
      | undefined;
    if (!input?.insights) return { insights: heuristic(opts.videos), costUsd: 0 };

    const insights: OptimizerInsight[] = input.insights.map((it) => ({
      title: it.title,
      body: it.body,
      metric: it.metric,
      ...(it.revisedScriptTemplate
        ? { proposedTemplateKind: "script", proposedTemplateBody: it.revisedScriptTemplate }
        : {}),
    }));
    const costUsd =
      Math.round(
        ((data.usage.input_tokens / 1e6) * PRICE_IN +
          (data.usage.output_tokens / 1e6) * PRICE_OUT) *
          10000,
      ) / 10000;
    return { insights, costUsd };
  } catch {
    return { insights: heuristic(opts.videos), costUsd: 0 };
  }
}

/** No-key fallback: surface the strongest format by average views. */
function heuristic(videos: OptimizerVideo[]): OptimizerInsight[] {
  const byFormat = new Map<string, { views: number; n: number }>();
  for (const v of videos) {
    const cur = byFormat.get(v.format) ?? { views: 0, n: 0 };
    cur.views += v.views;
    cur.n += 1;
    byFormat.set(v.format, cur);
  }
  const ranked = [...byFormat.entries()]
    .map(([format, { views, n }]) => ({ format, avg: Math.round(views / n) }))
    .sort((a, b) => b.avg - a.avg);
  if (ranked.length === 0) return [];
  const best = ranked[0];
  const compact = (n: number) => Intl.NumberFormat("en", { notation: "compact" }).format(n);
  return [
    {
      title: `“${best.format}” is your strongest format`,
      body: `Across tracked videos, ${best.format} averages ${compact(best.avg)} views — your highest. Lean the next batch of ideas toward this format and length band.`,
      metric: "avg views by format",
    },
  ];
}
