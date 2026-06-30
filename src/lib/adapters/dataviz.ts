import "server-only";
import type { ScriptBeat } from "@/lib/db/types";

/**
 * Tier 9.5 — programmatic data-viz inserts (Option A: LLM-supplied figures).
 *
 * Two stages keep the charts honest without any new data API:
 *   1) proposeCharts   — Claude picks the beats that would land better as an
 *      animated chart/ranking and supplies the figures + a self-declared basis.
 *   2) verifyChartFacts — the "research operator" fact-checks those figures
 *      against its own knowledge: corrects obvious errors, and DOWNGRADES any
 *      number it can't stand behind to `illustrative` (rendered with an
 *      "Illustrative" tag) or drops the chart entirely. Fail-closed: anything
 *      unverifiable is labelled illustrative, never presented as sourced fact.
 *
 * A SEPARATE post-render vision gate (packages/render) then confirms the
 * RENDERED graphic is internally consistent and not misleading before publish.
 *
 * Live when ANTHROPIC_API_KEY is present; otherwise no charts are proposed
 * (footage path is unchanged).
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
// Fact-check with a strong model regardless of the cheap generation model.
const VERIFY_MODEL = process.env.QC_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const priceFor = (m: string) => PRICING[m] ?? { in: 3, out: 15 };

export function isDataVizLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const CHART_KINDS = ["bar", "ranking", "line"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];
export type ChartPoint = { label: string; value: number };
export type ChartSpec = {
  /** Which beat this chart illustrates (its visual replaces footage). */
  beatIdx: number;
  kind: ChartKind;
  title: string;
  unit?: string;
  points: ChartPoint[];
  source?: string;
  illustrative?: boolean;
};

/** Niches where charts earn their keep (finance / AI / authoritative explainer).
    Keyword match keeps it opt-in by topic without a new column. */
const DATAVIZ_NICHE_RE =
  /\b(financ|invest|stock|market|econom|money|wealth|business|crypto|ai|artificial intelligence|machine learning|tech|technolog|science|data|geopolit|histor|statistic)\b/i;

export function nicheWantsDataViz(niche: string): boolean {
  return DATAVIZ_NICHE_RE.test(niche ?? "");
}

const MAX_CHARTS = 2;

function sanitize(raw: RawChart[], validBeats: Set<number>): ChartSpec[] {
  const out: ChartSpec[] = [];
  const usedBeats = new Set<number>();
  for (const c of raw) {
    if (typeof c?.beatIdx !== "number" || !validBeats.has(c.beatIdx) || usedBeats.has(c.beatIdx)) continue;
    const kind = (CHART_KINDS as readonly string[]).includes(c.kind ?? "") ? (c.kind as ChartKind) : "bar";
    const points = (c.points ?? [])
      .filter((p) => p && typeof p.value === "number" && Number.isFinite(p.value) && (p.label ?? "").trim())
      .slice(0, 6)
      .map((p) => ({ label: String(p.label).trim().slice(0, 24), value: Number(p.value) }));
    if (points.length < 2 || !(c.title ?? "").trim()) continue;
    usedBeats.add(c.beatIdx);
    out.push({
      beatIdx: c.beatIdx,
      kind,
      title: String(c.title).trim().slice(0, 90),
      unit: c.unit ? String(c.unit).trim().slice(0, 8) : undefined,
      points,
      source: c.source ? String(c.source).trim().slice(0, 60) : undefined,
      illustrative: c.illustrative !== false, // default to illustrative unless explicitly cleared
    });
    if (out.length >= MAX_CHARTS) break;
  }
  return out;
}

type RawChart = {
  beatIdx?: number;
  kind?: string;
  title?: string;
  unit?: string;
  points?: { label?: string; value?: number }[];
  source?: string;
  illustrative?: boolean;
};

async function callTool(opts: {
  model: string;
  system?: string;
  prompt: string;
  tool: Record<string, unknown>;
  toolName: string;
  maxTokens?: number;
}): Promise<{ input: Record<string, unknown> | undefined; costUsd: number } | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1500,
        ...(opts.system ? { system: opts.system } : {}),
        tools: [opts.tool],
        tool_choice: { type: "tool", name: opts.toolName },
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input;
    const price = priceFor(opts.model);
    const costUsd =
      Math.round(((data.usage.input_tokens / 1e6) * price.in + (data.usage.output_tokens / 1e6) * price.out) * 1000) /
      1000;
    return { input, costUsd };
  } catch {
    return null;
  }
}

const PROPOSE_TOOL = {
  name: "deliver_charts",
  description: "Propose 0–2 data-viz reveals for the beats that would land better as a chart.",
  input_schema: {
    type: "object",
    properties: {
      charts: {
        type: "array",
        description:
          "0 to 2 charts. Only propose a chart for a beat whose narration compares quantities, ranks things, or shows a trend over time. If no beat genuinely benefits, return an empty array.",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number", description: "The beat this chart illustrates." },
            kind: { type: "string", enum: CHART_KINDS as unknown as string[], description: "bar = compare categories, ranking = ordered leaderboard, line = trend over time." },
            title: { type: "string", description: "Short, specific chart title (no clickbait)." },
            unit: { type: "string", description: "Value unit shown on labels, e.g. \"$B\", \"%\", \"M\". Omit if unitless." },
            points: {
              type: "array",
              description: "2–6 data points in the order they should appear (already ranked for ranking charts; chronological for line).",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Short category/period label." },
                  value: { type: "number", description: "Numeric value (same unit as `unit`)." },
                },
                required: ["label", "value"],
              },
            },
            source: { type: "string", description: "If these figures reflect a real, well-known fact, name the rough basis (e.g. \"~2024 figures\"). Otherwise leave blank." },
            illustrative: { type: "boolean", description: "true if the numbers are illustrative/approximate rather than precise sourced data. Be honest — default true unless you are confident the figures are factually accurate." },
          },
          required: ["beatIdx", "kind", "title", "points", "illustrative"],
        },
      },
    },
    required: ["charts"],
  },
} as const;

/** Stage 1 — propose charts with LLM-supplied figures. */
export async function proposeCharts(opts: {
  title: string;
  niche: string;
  beats: ScriptBeat[];
}): Promise<{ charts: ChartSpec[]; costUsd: number }> {
  if (!isDataVizLive()) return { charts: [], costUsd: 0 };
  const usable = opts.beats.filter((b) => b.text?.trim());
  if (usable.length === 0) return { charts: [], costUsd: 0 };
  const beatLines = usable.map((b) => `[Beat ${b.idx}] "${b.text.slice(0, 220)}"`).join("\n\n");
  const prompt =
    `You design programmatic data-viz inserts for a ${opts.niche} YouTube video titled "${opts.title}". ` +
    `Read the beats. For AT MOST ${MAX_CHARTS} beats whose narration genuinely compares quantities, ranks items, or shows a trend, ` +
    `propose an animated chart that visualises exactly what the narrator says. Supply concrete figures. ` +
    `Be rigorous and honest about whether each figure is factually accurate or merely illustrative — most will be illustrative; say so. ` +
    `Do NOT invent precise-looking statistics and present them as fact. If no beat benefits, return an empty array.\n\n` +
    `BEATS:\n${beatLines}\n\nCall deliver_charts.`;
  const r = await callTool({ model: MODEL, prompt, tool: PROPOSE_TOOL, toolName: "deliver_charts", maxTokens: 1800 });
  if (!r?.input) return { charts: [], costUsd: r?.costUsd ?? 0 };
  const validBeats = new Set(usable.map((b) => b.idx));
  const charts = sanitize(((r.input as { charts?: RawChart[] }).charts ?? []), validBeats);
  return { charts, costUsd: r.costUsd };
}

const VERIFY_TOOL = {
  name: "deliver_verdicts",
  description: "Fact-check each proposed chart's figures and return a verdict per chart.",
  input_schema: {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number" },
            decision: {
              type: "string",
              enum: ["accurate", "illustrative", "drop"],
              description:
                "accurate = figures are factually sound and may be shown as real; illustrative = approximately right / directionally true but not precise (show with an Illustrative tag); drop = misleading, fabricated, or wrong — remove the chart.",
            },
            correctedPoints: {
              type: "array",
              description: "Optional corrected data points if you fixed obvious errors. Same shape as the input points; omit to keep as-is.",
              items: {
                type: "object",
                properties: { label: { type: "string" }, value: { type: "number" } },
                required: ["label", "value"],
              },
            },
            source: { type: "string", description: "If accurate, a short basis/attribution. Optional." },
            note: { type: "string", description: "One-line reason for the decision." },
          },
          required: ["beatIdx", "decision"],
        },
      },
    },
    required: ["verdicts"],
  },
} as const;

type RawVerdict = {
  beatIdx?: number;
  decision?: string;
  correctedPoints?: { label?: string; value?: number }[];
  source?: string;
  note?: string;
};

/** Stage 2 — the research-operator factuality pass. Corrects, downgrades to
    illustrative, or drops each chart. Fail-closed: on any error or missing
    verdict, the chart is forced to `illustrative` rather than shown as fact. */
export async function verifyChartFacts(opts: {
  title: string;
  niche: string;
  charts: ChartSpec[];
}): Promise<{ charts: ChartSpec[]; costUsd: number; dropped: number }> {
  if (opts.charts.length === 0) return { charts: [], costUsd: 0, dropped: 0 };
  if (!isDataVizLive()) {
    // No verifier available → present nothing as fact.
    return { charts: opts.charts.map((c) => ({ ...c, illustrative: true })), costUsd: 0, dropped: 0 };
  }
  const list = opts.charts
    .map(
      (c) =>
        `Beat ${c.beatIdx} — "${c.title}" (${c.kind}${c.unit ? `, ${c.unit}` : ""}): ` +
        c.points.map((p) => `${p.label}=${p.value}`).join(", ") +
        (c.illustrative ? " [proposed: illustrative]" : " [proposed: factual]"),
    )
    .join("\n");
  const system =
    `You are a rigorous research fact-checker for a ${opts.niche} channel. You verify numeric claims that will be shown on-screen as charts. ` +
    `Default to skepticism: only mark a chart "accurate" if the figures are well-established and you are confident in them. ` +
    `If figures are roughly/directionally right but not precise, mark "illustrative". If they are misleading, fabricated, internally inconsistent, or wrong, mark "drop". ` +
    `Fix obvious errors via correctedPoints when you can.`;
  const prompt = `VIDEO: "${opts.title}"\n\nPROPOSED CHARTS:\n${list}\n\nReturn one verdict per chart. Call deliver_verdicts.`;
  const r = await callTool({ model: VERIFY_MODEL, system, prompt, tool: VERIFY_TOOL, toolName: "deliver_verdicts", maxTokens: 1500 });
  if (!r?.input) {
    return { charts: opts.charts.map((c) => ({ ...c, illustrative: true })), costUsd: r?.costUsd ?? 0, dropped: 0 };
  }
  const verdicts = new Map<number, RawVerdict>();
  for (const v of ((r.input as { verdicts?: RawVerdict[] }).verdicts ?? [])) {
    if (typeof v?.beatIdx === "number") verdicts.set(v.beatIdx, v);
  }
  const kept: ChartSpec[] = [];
  let dropped = 0;
  for (const c of opts.charts) {
    const v = verdicts.get(c.beatIdx);
    // Fail-closed: no verdict → keep but force illustrative.
    if (!v) {
      kept.push({ ...c, illustrative: true });
      continue;
    }
    if (v.decision === "drop") {
      dropped++;
      continue;
    }
    const corrected =
      v.correctedPoints && v.correctedPoints.length >= 2
        ? v.correctedPoints
            .filter((p) => p && typeof p.value === "number" && (p.label ?? "").trim())
            .slice(0, 6)
            .map((p) => ({ label: String(p.label).trim().slice(0, 24), value: Number(p.value) }))
        : c.points;
    kept.push({
      ...c,
      points: corrected.length >= 2 ? corrected : c.points,
      illustrative: v.decision !== "accurate",
      source: v.source?.trim()?.slice(0, 60) || c.source,
    });
  }
  return { charts: kept, costUsd: r.costUsd, dropped };
}

/** Convenience: propose then fact-check in one call. */
export async function planVerifiedCharts(opts: {
  title: string;
  niche: string;
  beats: ScriptBeat[];
}): Promise<{ charts: ChartSpec[]; costUsd: number; dropped: number }> {
  if (!nicheWantsDataViz(opts.niche)) return { charts: [], costUsd: 0, dropped: 0 };
  const proposed = await proposeCharts(opts);
  if (proposed.charts.length === 0) return { charts: [], costUsd: proposed.costUsd, dropped: 0 };
  const verified = await verifyChartFacts({ title: opts.title, niche: opts.niche, charts: proposed.charts });
  return {
    charts: verified.charts,
    costUsd: Math.round((proposed.costUsd + verified.costUsd) * 1000) / 1000,
    dropped: verified.dropped,
  };
}
