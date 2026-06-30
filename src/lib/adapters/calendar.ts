import "server-only";
import type { CalendarSlot, Project } from "@/lib/db/types";
import { planCostFor, type AutoTier } from "@/lib/adapters/auto-tiers";

/**
 * 30-day content-calendar planner (operator concept #4). At the start of each
 * budget cycle the operator plans the WHOLE month at once — a diverse,
 * non-duplicate slate spread across the channel's taxonomy and balanced to the
 * format mix — with a per-format budget reservation so long-form quality is
 * protected late in the cycle. The calendar is a LIVING plan: upcoming slots
 * re-rank toward winners as analytics arrive, and the daily title is finalised
 * at seed time (so it stays fresh + dedup-checked).
 *
 * Live when ANTHROPIC_API_KEY is present; otherwise a deterministic round-robin
 * over the taxonomy keeps the operator planning without a key.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";

function isLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Format for day `d` (1-based) at a given Shorts share — every Nth day is long. */
function formatForDay(d: number, mixShortsPct: number): "long" | "short" {
  const longEvery = Math.max(2, Math.round(1 / Math.max(0.01, 1 - mixShortsPct)));
  return d % longEvery === 0 ? "long" : "short";
}

const TOOL = {
  name: "deliver_calendar",
  description: "Deliver the 30-day content calendar.",
  input_schema: {
    type: "object",
    properties: {
      slots: {
        type: "array",
        description: "One entry per day, in order, matching the requested day + format.",
        items: {
          type: "object",
          properties: {
            day: { type: "number" },
            subtopic: { type: "string", description: "Which taxonomy bucket this fills." },
            title: { type: "string", description: "Specific, non-clickbait YouTube title (≤70 chars)." },
            angle: { type: "string", description: "The unique angle/hook in one sentence." },
            priority: {
              type: "number",
              description:
                "0–1 tentpole potential: how much this idea deserves premium production (broad appeal, evergreen value, monetization, shareability). The top ~25% get the higher tiers; reserve high scores for genuine standouts.",
            },
          },
          required: ["day", "subtopic", "title", "angle", "priority"],
        },
      },
    },
    required: ["slots"],
  },
} as const;

export type CalendarPlan = { slots: CalendarSlot[]; costUsd: number; provider: "anthropic" | "heuristic" };

/** Assign a production tier per slot (Tier 8B): a cheap baseline for all, then
    upgrade the top ~25% by priority to premium/platinum until the budget
    estimate is consumed. Guarantees the planned estimate stays ≤ budgetUsd —
    the LLM proposes priority, this code enforces the $60 cap. */
function allocateTiers(slots: CalendarSlot[], budgetUsd: number): void {
  const fmt = (s: CalendarSlot): "short" | "long" => (s.format === "long" ? "long" : "short");
  for (const s of slots) {
    s.tier = s.format === "long" ? "economy" : "base";
    s.estUsd = planCostFor(fmt(s), s.tier as AutoTier);
  }
  let spent = slots.reduce((sum, s) => sum + (s.estUsd ?? 0), 0);
  const highCount = Math.round(slots.length * 0.25);
  const platCount = Math.ceil(highCount / 3);
  const ranked = [...slots].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || (a.format === "long" ? -1 : 1),
  );
  const tryUpgrade = (s: CalendarSlot, tier: AutoTier): boolean => {
    const est = planCostFor(fmt(s), tier);
    const delta = est - (s.estUsd ?? 0);
    if (delta <= 0 || spent + delta > budgetUsd) return false;
    s.tier = tier;
    s.estUsd = est;
    s.reservedUsd = est;
    spent += delta;
    return true;
  };
  let upgraded = 0;
  for (const s of ranked) {
    if (upgraded >= highCount) break;
    const target: AutoTier = upgraded < platCount ? "platinum" : "premium";
    if (tryUpgrade(s, target) || (target === "platinum" && tryUpgrade(s, "premium"))) upgraded++;
  }
}

export async function planMonthlyCalendar(opts: {
  project: Project;
  taxonomy: string[];
  days: number;
  mixShortsPct: number;
  shortsCapUsd: number;
  longCapUsd: number;
  /** The operator's 30-day cycle budget — the allocator keeps the tier mix ≤ this. */
  cycleBudgetUsd: number;
}): Promise<CalendarPlan> {
  const days = Math.max(1, Math.min(60, Math.round(opts.days)));
  const formats: ("long" | "short")[] = Array.from({ length: days }, (_, i) =>
    formatForDay(i + 1, opts.mixShortsPct),
  );
  const reserve = (f: "long" | "short") => (f === "long" ? opts.longCapUsd : opts.shortsCapUsd);

  const finalize = (
    raw: { day: number; subtopic: string; title: string; angle: string; priority?: number }[] | null,
  ): CalendarSlot[] => {
    const byDay = new Map<number, { subtopic: string; title: string; angle: string; priority?: number }>();
    for (const r of raw ?? []) if (typeof r?.day === "number") byDay.set(r.day, r);
    const slots = formats.map((format, i) => {
      const day = i + 1;
      const r = byDay.get(day);
      const tax = opts.taxonomy[i % opts.taxonomy.length] || "general";
      // Heuristic priority when the model didn't supply one: long-form skews higher.
      const priority =
        typeof r?.priority === "number" ? Math.max(0, Math.min(1, r.priority)) : format === "long" ? 0.6 : 0.4;
      return {
        day,
        format,
        subtopic: r?.subtopic?.trim() || tax,
        title: r?.title?.trim() || "",
        angle: r?.angle?.trim() || "",
        reservedUsd: reserve(format),
        priority,
        status: "planned",
      } as CalendarSlot;
    });
    // Tier 8B: assign a 75/25 base-economy vs higher-tier mix within the cycle budget.
    allocateTiers(slots, opts.cycleBudgetUsd);
    return slots;
  };

  if (!isLive()) return { slots: finalize(null), costUsd: 0, provider: "heuristic" };

  const schedule = formats.map((f, i) => `Day ${i + 1}: ${f === "long" ? "long-form" : "Short"}`).join(", ");
  const prompt =
    `Plan a ${days}-day content calendar for the YouTube channel "${opts.project.name}" ` +
    `(niche: ${opts.project.niche}; angle: ${opts.project.angle}). ` +
    `Produce ${days} DISTINCT, non-overlapping video ideas — no two should be near-duplicates — spread EVENLY across these taxonomy buckets so the month has broad coverage:\n- ${opts.taxonomy.join("\n- ")}\n\n` +
    `Each day's FORMAT is fixed (Shorts are snappy single-ideas; long-form goes deeper):\n${schedule}\n\n` +
    `For each day return: day, subtopic (the bucket), a specific non-clickbait title, a one-line angle, and a priority 0–1 (tentpole potential — reserve high scores for genuine standouts; ~25% of the slate will get premium production). Be accurate and on-niche. Call deliver_calendar with exactly ${days} slots.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 6000,
        temperature: 0.7,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_calendar" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { slots: finalize(null), costUsd: 0, provider: "heuristic" };
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const raw =
      (data.content.find((c) => c.type === "tool_use")?.input as { slots?: { day: number; subtopic: string; title: string; angle: string; priority?: number }[] } | undefined)?.slots ?? null;
    const PRICE: Record<string, { in: number; out: number }> = {
      "claude-opus-4-8": { in: 15, out: 75 },
      "claude-sonnet-4-6": { in: 3, out: 15 },
      "claude-haiku-4-5": { in: 1, out: 5 },
    };
    const p = PRICE[MODEL] ?? { in: 3, out: 15 };
    const costUsd = Math.round(((data.usage.input_tokens / 1e6) * p.in + (data.usage.output_tokens / 1e6) * p.out) * 1000) / 1000;
    return { slots: finalize(raw), costUsd, provider: "anthropic" };
  } catch {
    return { slots: finalize(null), costUsd: 0, provider: "heuristic" };
  }
}
