import "server-only";

/**
 * Character drift detection (Character Studio §6, Phase 4).
 *
 * Reference conditioning makes a character *mostly* consistent. Over twelve
 * videos, "mostly" is how a channel ends up with four different Bos — and the
 * failure is invisible one frame at a time, which is exactly why it needs a
 * machine watching rather than an operator remembering.
 *
 * This is a VISION COMPARISON, not a critique: the locked reference and the
 * rendered frame go in together, and the model answers one question — is this
 * the same character, and did the identity anchor survive?
 *
 * ADVISORY BY DESIGN (agent-training Step 1): drift never blocks a render. It
 * badges the beat and offers a re-roll, because a subjective "that's not quite
 * Bo" judgement is exactly the kind of gate that stalled the old pipeline.
 * Resilient: returns null when the model is unavailable or the call fails, and
 * null means "no opinion", never "bad".
 */
import { anthropicFetch } from "./anthropic";
import { anthropicCostUsd } from "./pricing";

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";

export function isDriftCheckLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type DriftVerdict = {
  /** 0–10 how well the render matches the locked reference. */
  score: number;
  /** True when the identity anchor is visibly present and correct. */
  anchorHeld: boolean;
  /** Concrete differences, most important first. */
  issues: string[];
  costUsd: number;
};

/** Below this, the beat is badged and a re-roll offered. Not a blocker. */
export const DRIFT_WARN_SCORE = 6.5;

const DRIFT_TOOL = {
  name: "deliver_drift_verdict",
  description: "Compare a rendered frame against a character's locked reference image.",
  input_schema: {
    type: "object",
    properties: {
      score: {
        type: "number",
        description:
          "0–10: is this recognisably the SAME character as the reference? Judge identity only — face/muzzle shape, skin/fur colour, hair, wardrobe items and their colours, body proportions. Do NOT penalise a different pose, expression, camera angle, crop, or background; those are supposed to change. 8+ = on-model, 6.5–8 = minor drift, below 6.5 = a different character.",
      },
      anchor_held: {
        type: "boolean",
        description:
          "Is the stated identity anchor visibly present and correct in the rendered frame? False if it is missing, the wrong colour, or replaced by something else. If no anchor was given, return true.",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description:
          "Specific identity differences, most important first, max 3. Each must name what changed (e.g. 'tee is orange, reference is mustard-yellow'). Empty when on-model.",
      },
    },
    required: ["score", "anchor_held", "issues"],
  },
} as const;

/**
 * Compare one rendered frame against one character's locked reference.
 *
 * Both URLs must be publicly fetchable (short-lived signed Storage URLs work).
 */
export async function checkCharacterDrift(opts: {
  renderedUrl: string;
  referenceUrl: string;
  characterName: string;
  identityAnchor?: string | null;
}): Promise<DriftVerdict | null> {
  if (!isDriftCheckLive()) return null;
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
        max_tokens: 512,
        tools: [DRIFT_TOOL],
        tool_choice: { type: "tool", name: "deliver_drift_verdict" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `The FIRST image is the locked reference for "${opts.characterName}". ` +
                  `The SECOND is a frame just rendered for a video.\n` +
                  (opts.identityAnchor?.trim()
                    ? `IDENTITY ANCHOR (must survive every frame): ${opts.identityAnchor.trim()}\n`
                    : "") +
                  `Pose, expression, camera angle, crop and background are SUPPOSED to differ — ` +
                  `judge identity only. Call deliver_drift_verdict.`,
              },
              { type: "image", source: { type: "url", url: opts.referenceUrl } },
              { type: "image", source: { type: "url", url: opts.renderedUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const body = (await res.json()) as {
      content?: { type: string; name?: string; input?: Record<string, unknown> }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const tool = body.content?.find((c) => c.type === "tool_use" && c.name === "deliver_drift_verdict");
    const input = tool?.input as
      | { score?: number; anchor_held?: boolean; issues?: string[] }
      | undefined;
    if (typeof input?.score !== "number") return null;
    return {
      score: Math.max(0, Math.min(10, input.score)),
      anchorHeld: input.anchor_held !== false,
      issues: Array.isArray(input.issues) ? input.issues.filter(Boolean).slice(0, 3) : [],
      costUsd: anthropicCostUsd(MODEL, body.usage?.input_tokens ?? 0, body.usage?.output_tokens ?? 0),
    };
  } catch (err) {
    console.error(`drift check failed (treated as no opinion): ${String(err).slice(0, 140)}`);
    return null;
  }
}

/** One line for the thread. Null when nothing drifted. */
export function driftSummary(
  results: { beatIdx: number; name: string; verdict: DriftVerdict }[],
): string | null {
  const bad = results.filter((r) => r.verdict.score < DRIFT_WARN_SCORE || !r.verdict.anchorHeld);
  if (bad.length === 0) return null;
  const lines = bad
    .slice(0, 4)
    .map((r) => {
      const why = !r.verdict.anchorHeld
        ? `${r.verdict.issues[0] ?? "the identity anchor is missing"}`
        : (r.verdict.issues[0] ?? "off-model");
      return `beat ${r.beatIdx + 1} — ${r.name} (${r.verdict.score.toFixed(1)}/10: ${why})`;
    })
    .join("; ");
  return (
    `Character drift check: ${bad.length} of ${results.length} cast ${results.length === 1 ? "frame" : "frames"} ` +
    `drifted from the locked reference — ${lines}. ` +
    `Nothing is blocked; say “regenerate beat N visual” for any you want re-rolled.`
  );
}
