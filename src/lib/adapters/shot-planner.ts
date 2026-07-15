import "server-only";
import { anthropicFetch } from "./anthropic";
import {
  routeMedium,
  planCost,
  type ShotIntent,
  type ShotPlan,
  type RouteContext,
  type VisualBible,
} from "@studio/core";
import type { ScriptBeat } from "@/lib/db/types";

/**
 * Visual Craft Engine V2 — shot planner.
 *
 * Decomposes each beat into a shot intent (and hero/motion hints), then defers
 * the medium choice to the PURE routeMedium (budget-aware). Live mode asks the
 * model to classify each beat's intent; mock mode uses a deterministic
 * heuristic so the whole engine plans with zero spend/credentials.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";

export function isShotPlannerLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type PlanShotsOpts = {
  beats: ScriptBeat[];
  bible?: VisualBible | null;
  ctx: RouteContext;
  /** Total visual budget for the video (the router spends within this). */
  budgetUsd: number;
};

const INTENTS: ShotIntent[] = ["establish", "detail", "motion", "data", "concept", "quote", "hero"];

/** Deterministic per-beat intent classifier for mock mode (no spend). Keys off
    the beat's existing shotType + simple text cues so it's stable + sensible. */
export function mockBeatIntents(beats: ScriptBeat[]): { beatIdx: number; intent: ShotIntent; hero: boolean; wantsMotion: boolean }[] {
  return beats.map((b, i) => {
    const t = `${b.text} ${b.visualPrompt}`.toLowerCase();
    let intent: ShotIntent = "detail";
    if (/\b(percent|%|\d{2,}|billion|million|rate|growth|chart|graph|data)\b/.test(t)) intent = "data";
    else if (/\b(imagine|compare|versus|vs\.?|process|step|how it works|concept)\b/.test(t)) intent = "concept";
    else if (b.shotType === "hero") intent = "hero";
    else if (/\b(quote|said|"|“)/.test(t)) intent = "quote";
    else if (i === 0) intent = "establish";
    else if (b.motion) intent = "motion";
    return { beatIdx: b.idx, intent, hero: b.shotType === "hero", wantsMotion: Boolean(b.motion) };
  });
}

/** Build the shot plan: classify each beat's intent, then route to a medium
    within budget. Returns the plan + its total estimated cost. Never throws. */
export async function planShots(opts: PlanShotsOpts): Promise<ShotPlan> {
  let intents: { beatIdx: number; intent: ShotIntent; hero: boolean; wantsMotion: boolean }[];
  try {
    intents = isShotPlannerLive() ? await liveIntents(opts.beats) : mockBeatIntents(opts.beats);
  } catch {
    intents = mockBeatIntents(opts.beats);
  }

  // Route greedily in beat order, decrementing the remaining budget so premium
  // spend is reserved for the beats the planner marked hero (which the model is
  // instructed to keep to 1–3).
  let remaining = opts.budgetUsd;
  const beatShots: ShotPlan["beats"] = [];
  for (const it of intents) {
    const ctx: RouteContext = { ...opts.ctx, budgetRemainingUsd: remaining };
    const shot = routeMedium(
      { beatIdx: it.beatIdx, intent: it.intent, hero: it.hero, wantsMotion: it.wantsMotion },
      ctx,
    );
    remaining = Math.max(0, remaining - shot.estCostUsd);
    beatShots.push({ beatIdx: it.beatIdx, shots: [shot] });
  }

  const plan: ShotPlan = { beats: beatShots, version: 1, planCostUsd: 0 };
  plan.planCostUsd = planCost(plan);
  return plan;
}

const INTENT_TOOL = {
  name: "classify_beat_intents",
  description: "Classify each script beat's visual INTENT and flag the 1–3 hero (marquee cinematic) beats.",
  input_schema: {
    type: "object",
    properties: {
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number" },
            intent: { type: "string", enum: INTENTS },
            hero: { type: "boolean", description: "true for the 1–3 marquee beats worth premium cinematic video" },
            wantsMotion: { type: "boolean", description: "true if the beat genuinely needs real movement" },
          },
          required: ["beatIdx", "intent", "hero"],
        },
      },
    },
    required: ["beats"],
  },
} as const;

async function liveIntents(beats: ScriptBeat[]): Promise<{ beatIdx: number; intent: ShotIntent; hero: boolean; wantsMotion: boolean }[]> {
  const res = await anthropicFetch({
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      tools: [INTENT_TOOL],
      tool_choice: { type: "tool", name: "classify_beat_intents" },
      messages: [
        {
          role: "user",
          content:
            "Classify each beat's visual intent. Reserve hero=true for only the 1–3 most impactful beats. Beats:\n" +
            beats.map((b) => `#${b.idx}: ${b.text}\n  [visual: ${b.visualPrompt}]`).join("\n"),
        },
      ],
    }),
  });
  const json = (await res.json()) as { content?: { type: string; input?: { beats?: { beatIdx: number; intent: ShotIntent; hero?: boolean; wantsMotion?: boolean }[] } }[] };
  const tool = json.content?.find((c) => c.type === "tool_use");
  const rows = tool?.input?.beats ?? [];
  if (rows.length === 0) return mockBeatIntents(beats);
  const byIdx = new Map(rows.map((r) => [r.beatIdx, r]));
  return beats.map((b) => {
    const r = byIdx.get(b.idx);
    return {
      beatIdx: b.idx,
      intent: (r?.intent && INTENTS.includes(r.intent) ? r.intent : "detail") as ShotIntent,
      hero: Boolean(r?.hero),
      wantsMotion: Boolean(r?.wantsMotion),
    };
  });
}
