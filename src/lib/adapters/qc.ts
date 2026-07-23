import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";
import type { ApprovalGate } from "@studio/core";
import {
  GATE_RUBRICS,
  computeLints,
  scoreFromCriteria,
  type CriterionResult,
} from "@/lib/pipeline/rubrics";

/**
 * QC judge (Harness C1) — binary rubric criteria instead of one scalar.
 *
 * Design, per the research in Fable5-Agentic-Harness-Plan.md:
 *  - Each gate has 3–6 atomic pass/fail criteria (rubrics.ts); the score is
 *    the weighted pass-fraction × 10, so every existing threshold works.
 *  - Evidence-before-verdict: the tool schema forces a `note` before each
 *    `pass` — Multiple-Evidence-Calibration ordering reduces snap verdicts.
 *  - Judge cascade: a Haiku screen judges every arrival (~$0.001); when the
 *    result lands NEAR a decision threshold (`escalateNear`) the review
 *    re-runs on the strong judge model — a different tier than the script
 *    generator, which also counters same-model self-preference bias.
 *  - Degraded reviews are flagged (`degraded: true`) so autonomy modes can
 *    hold instead of trusting a neutral placeholder.
 */

const SCREEN_MODEL = process.env.QC_SCREEN_MODEL?.trim() || "claude-haiku-4-5";
/** Strong judge for borderline publish-gating verdicts. Deliberately a
    different tier than SCRIPT_MODEL (generator) — self-preference bias. */
const JUDGE_MODEL = process.env.QC_JUDGE_MODEL?.trim() || "claude-opus-4-8";
/** Screen results within this band of `escalateNear` re-judge on JUDGE_MODEL. */
const ESCALATE_BAND = 1.5;

export const COPILOT_AUTO_APPROVE_SCORE = 7.5;

export type QcResult = {
  score: number; // 0–10 (weighted pass-fraction)
  verdict: string;
  issues: string[];
  strengths: string[];
  /** Per-criterion binary verdicts (judge + lint), the calibration unit. */
  criteria: CriterionResult[];
  /** Model that produced the final verdict. */
  judgeModel: string;
  /** True when the screen was borderline and the strong judge re-reviewed. */
  escalated: boolean;
  /** True when no real review happened (no key / API failure) — autonomy
      modes must treat this as "hold for a human", never as a real 6/10. */
  degraded: boolean;
  costUsd: number;
};

const GATE_BRIEFS: Record<ApprovalGate, string> = {
  IDEA: "You are reviewing a video idea for a faceless YouTube channel.",
  SCRIPT: "You are reviewing a video script for a faceless YouTube channel.",
  ASSETS: "You are reviewing an asset package summary for a video.",
  FINAL: "You are reviewing a final render summary before publish.",
};

function reviewTool(gate: ApprovalGate) {
  const rubric = GATE_RUBRICS[gate];
  const properties: Record<string, unknown> = {};
  for (const c of rubric) {
    properties[c.id] = {
      type: "object",
      description: c.test,
      // `note` first: the judge must state evidence before the verdict.
      properties: {
        note: { type: "string", description: "One line of concrete evidence for your verdict, citing the material." },
        pass: { type: "boolean", description: `PASS only if strictly true: ${c.test}` },
      },
      required: ["note", "pass"],
    };
  }
  return {
    name: "deliver_review",
    description: "Deliver the QC review: per-criterion evidence + verdicts, then the overall summary.",
    input_schema: {
      type: "object",
      properties: {
        ...properties,
        verdict: { type: "string", description: "One-sentence overall verdict." },
        strengths: { type: "array", items: { type: "string" }, description: "What works (max 2)." },
      },
      required: [...rubric.map((c) => c.id), "verdict", "strengths"],
    },
  } as const;
}

export function isQcLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function reviewGate(opts: {
  gate: ApprovalGate;
  context: Record<string, unknown>;
  /**
   * The decision threshold this review will be compared against (copilot
   * auto-approve bar, run floor…). When the cheap screen lands within
   * ±1.5 of it, the strong judge re-reviews. Omit for advisory-only reviews.
   */
  escalateNear?: number;
  /**
   * Force a single consistent judge model instead of the Haiku-screen → Opus
   * cascade. The auto-fix loop uses this for the POST-FIX re-judge so scores stay
   * on one comparable scale across passes (band routing depends on it) and the
   * grader is independent of the fixer's tier.
   */
  judgeModel?: string;
}): Promise<QcResult> {
  if (!isQcLive()) return heuristicReview();

  const lints = computeLints(opts.gate, opts.context);
  try {
    if (opts.judgeModel) return await judgeOnce(opts.judgeModel, opts.gate, opts.context, lints);
    const screen = await judgeOnce(SCREEN_MODEL, opts.gate, opts.context, lints);
    const borderline =
      opts.escalateNear != null && Math.abs(screen.score - opts.escalateNear) <= ESCALATE_BAND;
    if (!borderline) return screen;

    // Borderline publish-gating decision → strong judge, different tier
    // than the generator. Cost lands only where it changes an outcome.
    const strong = await judgeOnce(JUDGE_MODEL, opts.gate, opts.context, lints);
    return {
      ...strong,
      escalated: true,
      costUsd: Math.round((screen.costUsd + strong.costUsd) * 10000) / 10000,
    };
  } catch (err) {
    console.error(`QC review failed (${opts.gate}):`, err);
    return heuristicReview();
  }
}

async function judgeOnce(
  model: string,
  gate: ApprovalGate,
  context: Record<string, unknown>,
  lints: CriterionResult[],
): Promise<QcResult> {
  const rubric = GATE_RUBRICS[gate];
  const body = JSON.stringify({
    model,
    // Big enough that the strong judge's evidence notes across 6–8 criteria
    // don't truncate mid-tool-call — a truncated payload used to parse as
    // "all criteria missing" → an all-fail spurious ~1.0 score.
    max_tokens: 4000,
    tools: [reviewTool(gate)],
    tool_choice: { type: "tool", name: "deliver_review" },
    messages: [
      {
        role: "user",
        content:
          `${GATE_BRIEFS[gate]} Judge each criterion independently and strictly: ` +
          `state your evidence first, then pass/fail. A criterion you cannot verify from the material FAILS. ` +
          `Be concrete — vague praise helps nobody.\n\n${JSON.stringify(context, null, 2)}`,
      },
    ],
  });
  // Retry transient failures (429 / 5xx / network) before giving up — a single
  // blip used to degrade the whole gate to a placeholder 6.0 and hold the video.
  // 4xx (bad request) is not retried; it re-throws immediately.
  let res: Awaited<ReturnType<typeof anthropicFetch>> | undefined;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    try {
      res = await anthropicFetch({
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body,
      });
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err); // network — retry
      continue;
    }
    if (res.ok) break;
    lastErr = `QC judge ${model} ${res.status}: ${(await res.text()).slice(0, 160)}`;
    if (res.status < 500 && res.status !== 429) throw new Error(lastErr); // client error — don't retry
  }
  if (!res || !res.ok) {
    throw new Error(lastErr || `QC judge ${model} failed`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const input = data.content.find((c) => c.type === "tool_use")?.input as
    | Record<string, { note?: string; pass?: boolean } | unknown>
    | undefined;
  if (!input) throw new Error("QC judge returned no review payload");

  // A tool call with NONE of the rubric's criteria present is a malformed /
  // truncated payload — not a real review. Scoring it as all-fail yields a
  // spurious ~1.0 and (worse) can HOLD a fine asset or, at other gates, mislead
  // the operator. Treat it as degraded so autonomy holds for a human instead.
  const answered = rubric.filter((c) => input[c.id] != null).length;
  if (answered === 0) {
    return { ...heuristicReview(), judgeModel: model, verdict: "Judge returned an unparseable review (likely truncated) — held for a human." };
  }
  const judged: CriterionResult[] = rubric.map((c) => {
    const raw = input[c.id] as { note?: string; pass?: boolean } | undefined;
    return {
      id: c.id,
      label: c.label,
      // Missing/malformed criterion = FAIL (a judge that skips a check
      // must not be credited with a pass).
      pass: raw?.pass === true,
      note: String(raw?.note ?? "").slice(0, 240),
      weight: c.weight,
      source: "judge",
    };
  });
  const criteria = [...judged, ...lints];
  const failed = criteria.filter((c) => !c.pass);
  return {
    score: scoreFromCriteria(criteria),
    verdict: String((input.verdict as string) ?? "").slice(0, 300) || "Review delivered.",
    issues: failed.slice(0, 4).map((c) => `${c.label}: ${c.note || "failed"}`),
    strengths: ((input.strengths as string[]) ?? []).filter((s) => s?.trim()).slice(0, 2),
    criteria,
    judgeModel: model,
    escalated: false,
    degraded: false,
    costUsd: anthropicCostUsd(model, data.usage.input_tokens, data.usage.output_tokens),
  };
}

function heuristicReview(): QcResult {
  return {
    score: 6,
    verdict: "Automatic review unavailable — human judgment required.",
    issues: [],
    strengths: [],
    criteria: [],
    judgeModel: "mock",
    escalated: false,
    degraded: true,
    costUsd: 0,
  };
}
