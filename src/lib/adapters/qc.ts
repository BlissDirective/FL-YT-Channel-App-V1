import "server-only";
import type { ApprovalGate } from "@studio/core";

/**
 * QC agent — Claude reviews every gate arrival and returns a scored
 * verdict. Powers the QC card next to Approve and, in Co-pilot mode,
 * auto-approval above the confidence threshold. Uses Haiku: a review
 * costs ~$0.001. Heuristic fallback when no key (standing rule 4).
 */

const MODEL = "claude-haiku-4-5";
const PRICE_IN = 1; // USD per 1M tokens
const PRICE_OUT = 5;

export const COPILOT_AUTO_APPROVE_SCORE = 7.5;

export type QcResult = {
  score: number; // 0–10
  verdict: string;
  issues: string[];
  strengths: string[];
  costUsd: number;
};

const REVIEW_TOOL = {
  name: "deliver_review",
  description: "Deliver the QC review.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description:
          "0–10 quality/confidence score. 8+ = publish-grade, 6–8 = solid with nits, <6 = needs human attention.",
      },
      verdict: { type: "string", description: "One-sentence overall verdict." },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "Specific problems, most important first (max 4). Empty if none.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "What works (max 2).",
      },
    },
    required: ["score", "verdict", "issues", "strengths"],
  },
} as const;

const GATE_BRIEFS: Record<ApprovalGate, string> = {
  IDEA: `Review this video idea for a faceless YouTube channel. Judge: topic appeal to the stated audience, angle originality (would it survive YouTube's inauthentic-content bar?), and title promise strength.`,
  SCRIPT: `Review this video script. Judge: hook strength (first 2 sentences must create tension), pacing (no filler, every sentence earns runtime), original editorial voice (not templated), factual red flags, and policy risk (violence/medical/financial claims).`,
  ASSETS: `Review this asset package summary for a video. Judge: voiceover coverage vs script, visual variety across beats (not all the same shot type), thumbnail prompt/title coherence, and anything missing.`,
  FINAL: `Review this final render summary. Judge: completeness (duration vs target, captions present), and readiness to publish.`,
};

export function isQcLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function reviewGate(opts: {
  gate: ApprovalGate;
  context: Record<string, unknown>;
}): Promise<QcResult> {
  if (!isQcLive()) return heuristicReview();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "deliver_review" },
      messages: [
        {
          role: "user",
          content: `${GATE_BRIEFS[opts.gate]}\n\nBe critical and concrete — vague praise helps nobody.\n\n${JSON.stringify(opts.context, null, 2)}`,
        },
      ],
    }),
  });
  if (!res.ok) return heuristicReview(); // QC must never block the pipeline

  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const input = data.content.find((c) => c.type === "tool_use")?.input as
    | { score: number; verdict: string; issues: string[]; strengths: string[] }
    | undefined;
  if (!input) return heuristicReview();

  return {
    score: Math.max(0, Math.min(10, Number(input.score))),
    verdict: input.verdict,
    issues: (input.issues ?? []).slice(0, 4),
    strengths: (input.strengths ?? []).slice(0, 2),
    costUsd:
      Math.round(
        ((data.usage.input_tokens / 1e6) * PRICE_IN +
          (data.usage.output_tokens / 1e6) * PRICE_OUT) *
          10000,
      ) / 10000,
  };
}

function heuristicReview(): QcResult {
  return {
    score: 6,
    verdict: "Automatic review unavailable — human judgment required.",
    issues: [],
    strengths: [],
    costUsd: 0,
  };
}
