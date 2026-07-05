import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";
import { COMPETITIVE_CRITERIA, scoreCompetitive, type WatchCriterionKey, type WatchDimensionResult } from "@/lib/pipeline/watch-gate";

/**
 * Competitive-fit judge for the Self-Watch gate (#4, Fable5-Self-Watch-Loop-Plan.md
 * Phase 2). Scores our video's packaging + structure against stored competitive
 * context — the channel's own winners, the deep Video-Intelligence blueprint when
 * one exists, and graduated `competitive`/`outcome` memory lessons — never a live
 * scrape. Binary criteria, note-before-verdict (mirrors the C1 QC judge).
 *
 * The `faceless_policy_transformative` criterion is the compliance floor: if it
 * fails, the runner flags policyRisk and the video holds for a human.
 */

const JUDGE_MODEL = process.env.WATCH_JUDGE_MODEL?.trim() || "claude-haiku-4-5";

export type CompetitiveContext = {
  title: string;
  topic: string;
  niche: string;
  angle?: string;
  hook?: string;
  beatCount: number;
  targetLengthSec: number;
  ourWinners: string[];
  blueprint?: {
    works?: string[];
    hooks?: unknown[];
    gaps?: string[];
    titlePatterns?: string[];
  } | null;
  memoryLessons: string[];
};

export type CompetitiveJudgment = {
  dimension: WatchDimensionResult;
  policyRisk: boolean;
  suggestions: string[];
  costUsd: number;
};

export function isCompetitiveLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function judgeTool() {
  const properties: Record<string, unknown> = {};
  for (const c of COMPETITIVE_CRITERIA) {
    properties[c.key] = {
      type: "object",
      description: c.label,
      properties: {
        note: { type: "string", description: "One line of concrete evidence for your verdict." },
        pass: { type: "boolean", description: `PASS only if strictly true: ${c.label}` },
      },
      required: ["note", "pass"],
    };
  }
  return {
    name: "deliver_competitive",
    description: "Deliver the competitive-fit review: per-criterion evidence + verdicts, then improvement suggestions.",
    input_schema: {
      type: "object",
      properties: {
        ...properties,
        suggestions: { type: "array", items: { type: "string" }, description: "Concrete ways to make the video more competitive (max 3)." },
      },
      required: [...COMPETITIVE_CRITERIA.map((c) => c.key), "suggestions"],
    },
  } as const;
}

export async function judgeCompetitiveFit(ctx: CompetitiveContext, floor: number): Promise<CompetitiveJudgment> {
  const neutral: WatchDimensionResult = { score: 0, pass: true, evaluated: false, issues: [] };
  if (!isCompetitiveLive()) return { dimension: neutral, policyRisk: false, suggestions: [], costUsd: 0 };

  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        max_tokens: 1200,
        tools: [judgeTool()],
        tool_choice: { type: "tool", name: "deliver_competitive" },
        messages: [
          {
            role: "user",
            content:
              "You are judging whether a faceless-YouTube video is COMPETITIVE in its niche and compliant with YouTube's inauthentic/repetitious-content rules. " +
              "Judge each criterion strictly: state evidence first, then pass/fail. A criterion you cannot verify FAILS. For faceless_policy_transformative, FAIL if the video reads as low-effort, templated, mass-produced repetition with no transformative value.\n\n" +
              JSON.stringify(
                {
                  ourVideo: { title: ctx.title, topic: ctx.topic, niche: ctx.niche, angle: ctx.angle, hook: ctx.hook, beats: ctx.beatCount, targetLengthSec: ctx.targetLengthSec },
                  ourChannelWinners: ctx.ourWinners.slice(0, 8),
                  nicheBlueprint: ctx.blueprint
                    ? { works: ctx.blueprint.works?.slice(0, 6), gaps: ctx.blueprint.gaps?.slice(0, 6), titlePatterns: ctx.blueprint.titlePatterns?.slice(0, 6) }
                    : null,
                  learnedLessons: ctx.memoryLessons.slice(0, 6),
                },
                null,
                2,
              ),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`competitive judge ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input as Record<string, unknown> | undefined;
    if (!input) throw new Error("competitive judge returned no payload");

    const passed = {} as Record<WatchCriterionKey, boolean>;
    const issues = [];
    for (const c of COMPETITIVE_CRITERIA) {
      const raw = input[c.key] as { note?: string; pass?: boolean } | undefined;
      const pass = raw?.pass === true; // missing/malformed = FAIL
      passed[c.key] = pass;
      if (!pass) issues.push({ criterion: c.key, beatIdx: null, detail: String(raw?.note ?? "failed").slice(0, 240) });
    }
    const score = scoreCompetitive(passed);
    const policyRisk = passed.faceless_policy_transformative === false;
    const suggestions = ((input.suggestions as string[]) ?? []).filter((s) => s?.trim()).slice(0, 3);

    return {
      dimension: { score, pass: score >= floor && !policyRisk, evaluated: true, issues },
      policyRisk,
      suggestions,
      costUsd: anthropicCostUsd(JUDGE_MODEL, data.usage.input_tokens, data.usage.output_tokens),
    };
  } catch (err) {
    console.error("competitive judge failed (non-fatal):", err);
    return { dimension: neutral, policyRisk: false, suggestions: [], costUsd: 0 };
  }
}
