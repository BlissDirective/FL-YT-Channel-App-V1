// Footage (AI-clip / stock) Tier-1 vision critique. Claude looks at rendered
// keyframe stills of a footage video and scores them against a footage rubric
// (visual relevance to the narration, composition/framing, caption legibility,
// visual variety across beats), returning concrete, beat-anchored fixes. Runs in
// the render farm after a footage render for channels on the AI-clip auto-fix
// loop; the result is stored on videos.vision_review in the SAME shape the stick
// critic uses, so the app + UI handle both uniformly.
//
// Live when ANTHROPIC_API_KEY is present; otherwise a benign mock keeps the farm
// working. Sibling of stick/frame-critic.ts — shares the FrameCritique shape.

import type { FrameCritique, FrameIssue } from "../stick/frame-critic";

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export type FootageFrame = {
  beatIdx: number;
  /** base64 JPEG (no data: prefix). */
  jpegBase64: string;
  /** "hero" | "broll" | "stock" — what kind of visual this beat uses. */
  shotType: string;
  /** Whether the underlying visual is a motion clip (vs a still). */
  isVideo: boolean;
  text: string;
};

export function visionCriticLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Same category vocabulary as the stick critic so the app's fixer/UI is uniform.
// Meaning here: readability = visual relevance/clarity, composition = framing,
// captions = legibility, consistency = visual variety/continuity.
const CATEGORIES = ["readability", "composition", "captions", "consistency", "other"] as const;
const SEVERITIES = ["low", "med", "high"] as const;

const DELIVER_CRITIQUE_TOOL = {
  name: "deliver_critique",
  description: "Deliver the structured critique of the footage keyframes.",
  input_schema: {
    type: "object",
    properties: {
      overall: { type: "number", description: "Overall quality 0–10." },
      readability: { type: "number", description: "Visual relevance & clarity 0–10 (does the visual match and reinforce the narration, and read clearly?)." },
      composition: { type: "number", description: "Composition & framing 0–10 (subject placement, balance, safe-area, not awkwardly cropped)." },
      captions: { type: "number", description: "Caption/text legibility 0–10 (readable over the footage, good contrast)." },
      consistency: { type: "number", description: "Visual variety & continuity 0–10 (beats feel distinct and cohesive, not repetitive or jarring)." },
      strengths: { type: "array", items: { type: "string" }, description: "What works (2–4 short notes)." },
      issues: {
        type: "array",
        description: "Concrete problems, each tied to a beat and a specific fix.",
        items: {
          type: "object",
          properties: {
            beatIdx: { type: "number", description: "Beat the issue is about (use -1 for whole-video)." },
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
            severity: { type: "string", enum: SEVERITIES as unknown as string[] },
            note: { type: "string", description: "What's wrong, briefly." },
            fix: { type: "string", description: "A specific, actionable fix — e.g. 'the clip is off-topic; re-roll with a prompt showing X', 'reframe to centre the subject', 'enable captions; text is missing'." },
          },
          required: ["beatIdx", "category", "severity", "note", "fix"],
        },
      },
    },
    required: ["overall", "readability", "composition", "captions", "consistency", "strengths", "issues"],
  },
} as const;

export async function critiqueFootageFrames(opts: {
  title: string;
  frames: FootageFrame[];
}): Promise<FrameCritique> {
  if (!visionCriticLive() || opts.frames.length === 0) return mockCritique();

  const intro = `You are a senior video editor reviewing keyframe stills from an AI-clip / stock-footage YouTube video titled "${opts.title}". Each image is one beat (a still grabbed mid-beat). Judge it as a faceless footage video — the goal is visuals that clearly support the spoken narration and hold attention.

For each frame, assess:
- VISUAL RELEVANCE & CLARITY: does the visual clearly match and reinforce the beat's narration? Is it on-topic and legible (not muddy, glitchy, or generic filler)?
- COMPOSITION / FRAMING: is the subject well-placed (not awkwardly cropped, balanced, safe-area respected)?
- CAPTIONS: if present, is the on-screen text legible with good contrast? Flag if captions are missing where they'd help.
- VARIETY & CONTINUITY: across beats, do the visuals feel distinct and cohesive (not repetitive, not jarring cuts)?

Score each dimension 0–10 and overall. List concrete issues, each tied to its beat index with a SPECIFIC, actionable fix (re-roll the visual with a better prompt, swap to a more relevant clip, reframe, enable/restyle captions). Be terse and concrete. Then call deliver_critique.`;

  const content: unknown[] = [{ type: "text", text: intro }];
  for (const f of opts.frames) {
    content.push({
      type: "text",
      text: `Beat ${f.beatIdx} (${f.shotType}, ${f.isVideo ? "motion clip" : "still"}) — "${f.text}"`,
    });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.jpegBase64 } });
  }

  // Scale the output budget with frame count so more keyframes can yield more
  // beat-anchored issues without truncating the tool call.
  const maxTokens = Math.min(8000, 1200 + opts.frames.length * 220);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      tools: [DELIVER_CRITIQUE_TOOL],
      tool_choice: { type: "tool", name: "deliver_critique" },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Footage vision critique ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const tool = data.content.find((c) => c.type === "tool_use");
  if (!tool?.input) throw new Error("Footage vision critique: no payload");
  const raw = tool.input as {
    overall?: number;
    readability?: number;
    composition?: number;
    captions?: number;
    consistency?: number;
    strengths?: string[];
    issues?: { beatIdx?: number; category?: string; severity?: string; note?: string; fix?: string }[];
  };

  const validBeats = new Set(opts.frames.map((f) => f.beatIdx));
  const issues: FrameIssue[] = (raw.issues ?? [])
    .filter((i) => i.note?.trim())
    .map((i) => ({
      beatIdx: typeof i.beatIdx === "number" && validBeats.has(i.beatIdx) ? i.beatIdx : null,
      category: (CATEGORIES as readonly string[]).includes(i.category ?? "") ? (i.category as FrameIssue["category"]) : "other",
      severity: (SEVERITIES as readonly string[]).includes(i.severity ?? "") ? (i.severity as FrameIssue["severity"]) : "low",
      note: i.note!.trim().slice(0, 200),
      fix: (i.fix ?? "").trim().slice(0, 200),
    }));

  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in + (data.usage.output_tokens / 1e6) * PRICE.out;
  return {
    score: clamp10(raw.overall),
    scores: {
      readability: clamp10(raw.readability),
      composition: clamp10(raw.composition),
      captions: clamp10(raw.captions),
      consistency: clamp10(raw.consistency),
    },
    issues,
    strengths: (raw.strengths ?? []).filter((s) => s?.trim()).slice(0, 5),
    provider: "anthropic",
    costUsd: Math.round(costUsd * 1000) / 1000,
  };
}

function clamp10(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 7;
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

function mockCritique(): FrameCritique {
  return {
    score: 8,
    scores: { readability: 8, composition: 8, captions: 8, consistency: 8 },
    issues: [],
    strengths: ["Footage vision critique runs in mock mode (set ANTHROPIC_API_KEY in the render workflow to enable it)."],
    provider: "mock",
    costUsd: 0,
  };
}
