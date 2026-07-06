import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

/**
 * Notes-driven fix planner (Self-Watch remediation, Layer 1). Rewrites a beat's
 * visual direction using the QC review's specific per-criterion notes as the
 * work-order — not a generic "improve this" — with the score-banded model
 * (Sonnet/Opus). This is what turns the judge's precise feedback ("beat-2 is
 * starved of visuals", "no data-viz for the fab-capacity claim") into a targeted
 * regeneration prompt. Degradable: no key / failure → null, and the caller falls
 * back to its existing string-concatenated direction.
 */

const TOOL = {
  name: "deliver_direction",
  description: "Deliver one improved visual-generation prompt for this beat.",
  input_schema: {
    type: "object",
    properties: {
      visualPrompt: {
        type: "string",
        description: "A concrete, self-contained image/video generation prompt for this beat that fixes the flagged problem and matches the narration. No meta-commentary.",
      },
    },
    required: ["visualPrompt"],
  },
} as const;

export async function refineFixDirection(opts: {
  model: string;
  title: string;
  niche: string;
  beatText: string;
  currentVisualPrompt: string;
  issue: string;
  qcNotes: string;
}): Promise<{ visualPrompt: string; costUsd: number } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await anthropicFetch({
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 600,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_direction" },
        messages: [
          {
            role: "user",
            content:
              `You are the art director fixing ONE beat of a ${opts.niche} faceless-YouTube video ("${opts.title}"). ` +
              `Rewrite the beat's visual-generation prompt so it fixes the flagged problem and depicts the narration clearly and specifically. Keep it concrete and shot-ready.\n\n` +
              `BEAT NARRATION: ${opts.beatText}\n\n` +
              `CURRENT VISUAL PROMPT: ${opts.currentVisualPrompt || "(none)"}\n\n` +
              `THE SPECIFIC PROBLEM TO FIX: ${opts.issue}\n\n` +
              (opts.qcNotes ? `QC WORK-ORDER (address what's relevant to this beat):\n${opts.qcNotes}\n\n` : "") +
              `Call deliver_direction with the improved prompt.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`fix-planner ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = (await res.json()) as {
      content: { type: string; input?: { visualPrompt?: string } }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const visualPrompt = data.content.find((c) => c.type === "tool_use")?.input?.visualPrompt?.trim();
    if (!visualPrompt) return null;
    return { visualPrompt: visualPrompt.slice(0, 600), costUsd: anthropicCostUsd(opts.model, data.usage.input_tokens, data.usage.output_tokens) };
  } catch (err) {
    console.error("fix-planner failed (non-fatal):", err);
    return null;
  }
}
