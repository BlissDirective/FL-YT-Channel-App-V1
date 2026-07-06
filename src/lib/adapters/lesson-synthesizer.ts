import "server-only";
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

/**
 * Librarian cross-cutting synthesis (C8, Fable5-Agentic-Harness-Plan.md §C8).
 * The nightly librarian's deterministic pass promotes/retires individual
 * lessons; this optional LLM step reads a batch of proven technique lessons and
 * distills the higher-order craft principle they share ("these winners all
 * front-load the payoff — template it"). Runs only when fresh material was
 * promoted; degradable — no key → no syntheses.
 */

const MODEL = process.env.LIBRARIAN_MODEL?.trim() || "claude-haiku-4-5";

export function isSynthesisLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const TOOL = {
  name: "deliver_syntheses",
  description: "Deliver higher-order craft principles distilled from the proven lessons.",
  input_schema: {
    type: "object",
    properties: {
      syntheses: {
        type: "array",
        items: { type: "string" },
        description: "1–3 reusable, higher-order craft principles the lessons share. Each a single concrete sentence. Empty if there's no real shared pattern.",
      },
    },
    required: ["syntheses"],
  },
} as const;

export async function synthesizeCraftLessons(lessons: string[]): Promise<{ syntheses: string[]; costUsd: number }> {
  const source = lessons.map((l) => l.trim()).filter(Boolean).slice(0, 16);
  if (!isSynthesisLive() || source.length < 3) return { syntheses: [], costUsd: 0 };
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
        max_tokens: 700,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "deliver_syntheses" },
        messages: [
          {
            role: "user",
            content:
              "These video-production technique lessons have each been confirmed across multiple faceless-YouTube channels. Identify the higher-order craft principle(s) they share — reusable templates, not a restatement of one lesson. Only real cross-cutting patterns; return an empty array if there's none.\n\n" +
              source.map((l, i) => `${i + 1}. ${l}`).join("\n"),
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`synthesis ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = (await res.json()) as {
      content: { type: string; input?: { syntheses?: string[] } }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const input = data.content.find((c) => c.type === "tool_use")?.input;
    const syntheses = (input?.syntheses ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3);
    return { syntheses, costUsd: anthropicCostUsd(MODEL, data.usage.input_tokens, data.usage.output_tokens) };
  } catch (err) {
    console.error("librarian synthesis failed (non-fatal):", err);
    return { syntheses: [], costUsd: 0 };
  }
}
