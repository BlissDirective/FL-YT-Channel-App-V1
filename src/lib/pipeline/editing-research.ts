import "server-only";
import { anthropicFetch } from "@/lib/adapters/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeMemory } from "@/lib/pipeline/memory-service";
import {
  RESEARCH_MONTHLY_CAP_USD,
  recordResearchCost,
  researchMonthSpend,
} from "@/lib/pipeline/ledger";

/**
 * Editing-Craft Research Producer (MVDA §11, KD1–KD4).
 *
 * Weekly, budget-capped: proposes a handful of editing techniques as SHADOW
 * lessons in the global `editing` craft tier. KD1 makes the trust boundary
 * mechanical: everything written here is Tier B/C (external), stored SHADOW —
 * it feeds the agent's authoring context at advisory weight but can never
 * gate a cut or become loaded default context without graduation, which only
 * FIRST-PARTY retention (the outcome-audit attribution loop) or a human PR
 * can grant.
 *
 * Hard gates, checked in order (all pure in `researchGate`, unit-tested):
 *  kill switch → C4 (≥5 real agent cuts) → monthly research cap. Spend
 *  ledgers at SYSTEM scope (provider 'research', project_id null) so the $20
 *  research line and production budgets can never eat each other (KD4).
 */

const MODEL = process.env.RESEARCH_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

/** C4 — lessons need real cuts + retention to attach to. */
export const MIN_AGENT_CUTS = 5;
/** Per-run ceiling (KD4: SDK maxBudgetUsd analog for the one-call producer). */
export const RESEARCH_RUN_CAP_USD = 2;

export type ResearchGateInput = {
  killSwitch: boolean;
  agentCuts: number;
  monthSpendUsd: number;
  capUsd: number;
  aboutToSpendUsd?: number;
};

/** Pure pre-flight gate — every reason a run must NOT start (KD4 tests 1+4, C4). */
export function researchGate(s: ResearchGateInput): { ok: true } | { ok: false; reason: string } {
  if (s.killSwitch) return { ok: false, reason: "kill switch is ON" };
  if (s.agentCuts < MIN_AGENT_CUTS) {
    return { ok: false, reason: `knowledge loop starts after ${MIN_AGENT_CUTS} real agent cuts (C4) — ${s.agentCuts} so far` };
  }
  const projected = s.monthSpendUsd + (s.aboutToSpendUsd ?? 0);
  if (projected >= s.capUsd) {
    return { ok: false, reason: `research budget reached ($${s.monthSpendUsd.toFixed(2)} + $${(s.aboutToSpendUsd ?? 0).toFixed(2)} ≥ $${s.capUsd}/mo)` };
  }
  return { ok: true };
}

type Technique = {
  technique_id: string;
  text: string;
  source_tier: "B" | "C";
  applies_when: string;
  source_url?: string;
};

const DELIVER_TOOL = {
  name: "deliver_techniques",
  description: "Deliver the researched editing techniques.",
  input_schema: {
    type: "object" as const,
    properties: {
      techniques: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            technique_id: { type: "string" as const, description: "stable kebab-case id, e.g. 'pattern-interrupt-3s'" },
            text: { type: "string" as const, description: "the lesson, phrased as actionable guidance for the cut agent (≤200 chars)" },
            source_tier: { type: "string" as const, enum: ["B", "C"], description: "B = niche/competitor-specific signal, C = general craft" },
            applies_when: { type: "string" as const, description: "when this applies, e.g. 'long-form explainers', 'shorts hooks'" },
            source_url: { type: "string" as const, description: "citation when one exists" },
          },
          required: ["technique_id", "text", "source_tier", "applies_when"],
        },
      },
    },
    required: ["techniques"],
  },
};

export type ResearchRunResult = {
  ok: boolean;
  skipped?: string;
  wrote?: number;
  costUsd?: number;
  error?: string;
};

export async function runEditingResearch(
  dbArg?: ReturnType<typeof createAdminClient>,
): Promise<ResearchRunResult> {
  const db = dbArg ?? createAdminClient();

  // Gate inputs (all cheap reads).
  const { data: ks } = await db.from("app_settings").select("value").eq("key", "kill_switch").maybeSingle();
  const killSwitch = Boolean((ks?.value as { enabled?: boolean } | null)?.enabled);
  const { count: agentCuts } = await db
    .from("agent_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "ready");
  const monthSpendUsd = await researchMonthSpend(db);

  const gate = researchGate({
    killSwitch,
    agentCuts: agentCuts ?? 0,
    monthSpendUsd,
    capUsd: RESEARCH_MONTHLY_CAP_USD,
    aboutToSpendUsd: RESEARCH_RUN_CAP_USD,
  });
  if (!gate.ok) return { ok: true, skipped: gate.reason };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: true, skipped: "no ANTHROPIC_API_KEY" };

  // Existing technique ids → the model avoids repeats, we drop any anyway.
  const { data: existing } = await db
    .from("memory_entries")
    .select("technique_id")
    .eq("namespace", "editing")
    .not("technique_id", "is", null)
    .limit(500);
  const known = new Set((existing ?? []).map((r) => r.technique_id as string));

  const prompt =
    `You are the editing-research producer for a faceless YouTube studio ` +
    `(long-form explainers + Shorts; AI b-roll, kinetic captions, VO narration; ` +
    `the cut is authored on an explicit timeline with retime/trim/transitions/` +
    `Ken Burns-style motion/per-token caption emphasis/SFX cues). ` +
    `Propose 3-5 CURRENT best-practice editing techniques for retention, each ` +
    `concrete enough that a cut agent can apply it mechanically. Avoid these ` +
    `already-known technique_ids: ${[...known].slice(0, 60).join(", ") || "(none yet)"}. ` +
    `Tier B = niche/competitor-observed signal; Tier C = general craft. ` +
    `Call deliver_techniques.`;

  const res = await anthropicFetch({
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      tools: [DELIVER_TOOL],
      tool_choice: { type: "tool", name: "deliver_techniques" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    return { ok: false, error: `Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = (await res.json()) as {
    content: { type: string; input?: { techniques?: Technique[] } }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const costUsd =
    Math.round(((data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out) * 100) / 100;
  await recordResearchCost(db, costUsd, `Editing-craft research (${MODEL})`);

  const techniques = (data.content.find((c) => c.type === "tool_use")?.input?.techniques ?? [])
    .filter((t) => t.technique_id && t.text && !known.has(t.technique_id))
    .slice(0, 5);

  let wrote = 0;
  for (const t of techniques) {
    // SHADOW + global craft tier (KD1/KD3): advisory authoring input only;
    // graduation to active/default is retention's or a human's call.
    await writeMemory(db, {
      namespace: "editing",
      text: t.text.slice(0, 300),
      evidence: `external research (${MODEL}), tier ${t.source_tier}${t.source_url ? ` — ${t.source_url}` : ""}`,
      scope: { tier: "global" },
      status: "shadow",
      confidence: 0.25,
    });
    // Stamp provenance columns on the row we just wrote (writeMemory has no
    // meta params; match on exact text within the namespace/tier).
    await db
      .from("memory_entries")
      .update({
        source_tier: t.source_tier,
        source_url: t.source_url ?? null,
        technique_id: t.technique_id,
        applies_when: t.applies_when,
      })
      .eq("namespace", "editing")
      .eq("tier", "global")
      .eq("text", t.text.slice(0, 300));
    wrote++;
  }
  return { ok: true, wrote, costUsd };
}
