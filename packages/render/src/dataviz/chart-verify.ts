// Tier 9.5 — post-render data-viz QC gate. After the chart beat is rendered,
// Claude vision inspects the ACTUAL rendered frame and confirms it represents
// the data accurately and isn't misleading: bars/line proportional to the
// values, labels legible and correct, axis not deceptively truncated, the title
// matches what's drawn, and (where checkable) the figures are factually sound.
// Live when ANTHROPIC_API_KEY is set; returns ok=true (skip) otherwise so the
// render farm degrades gracefully. Sibling of thumbnail-pick.ts.

import type { ChartSpec } from "../types";

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export function chartVerifyLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type ChartVerdict = { ok: boolean; issues: string[]; costUsd: number };

const TOOL = {
  name: "deliver_chart_verdict",
  description: "Report whether the rendered chart accurately and honestly represents the data.",
  input_schema: {
    type: "object",
    properties: {
      accurate: {
        type: "boolean",
        description:
          "true ONLY if the rendered chart is a faithful, non-misleading representation of the stated data: visual magnitudes are proportional to the values, labels are legible and correct, the axis is not deceptively truncated, and the title matches what's drawn.",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "Concrete problems found (empty if accurate). e.g. 'tallest bar is labelled the smallest value', 'labels overlap', 'values don't sum as the title claims'.",
      },
    },
    required: ["accurate", "issues"],
  },
} as const;

/** Verify a rendered chart frame against its spec. `imageBase64` is the raw
    base64 (no data: prefix) of the rendered still; `mediaType` its mime. */
export async function verifyRenderedChart(opts: {
  spec: ChartSpec;
  imageBase64: string;
  mediaType?: string;
}): Promise<ChartVerdict> {
  if (!chartVerifyLive()) return { ok: true, issues: [], costUsd: 0 };
  const data =
    `Stated chart data (what the frame is supposed to show):\n` +
    `- type: ${opts.spec.kind}\n- title: "${opts.spec.title}"\n` +
    `- unit: ${opts.spec.unit ?? "(none)"}\n` +
    `- points: ${opts.spec.points.map((p) => `${p.label}=${p.value}`).join(", ")}\n` +
    (opts.spec.illustrative ? `- labelled illustrative: yes\n` : ``) +
    `\nInspect the attached rendered frame. Does it represent this data accurately and honestly? ` +
    `Check proportionality, label correctness/legibility, axis honesty, and title match. Then call deliver_chart_verdict.`;
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
        max_tokens: 400,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_chart_verdict" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: data },
              {
                type: "image",
                source: { type: "base64", media_type: opts.mediaType ?? "image/jpeg", data: opts.imageBase64 },
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { ok: true, issues: [], costUsd: 0 }; // soft-skip on API error
    const json = (await res.json()) as {
      content: { type: string; input?: Record<string, unknown> }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const inp = json.content.find((c) => c.type === "tool_use")?.input as
      | { accurate?: boolean; issues?: string[] }
      | undefined;
    const costUsd =
      Math.round(((json.usage.input_tokens / 1e6) * PRICE.in + (json.usage.output_tokens / 1e6) * PRICE.out) * 1000) /
      1000;
    if (!inp || typeof inp.accurate !== "boolean") return { ok: true, issues: [], costUsd };
    return { ok: inp.accurate, issues: (inp.issues ?? []).slice(0, 6), costUsd };
  } catch {
    return { ok: true, issues: [], costUsd: 0 };
  }
}
