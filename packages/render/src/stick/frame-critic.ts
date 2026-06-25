// Stick Studio — Tier-1 vision critique. Claude looks at rendered keyframe
// stills of a stick video and scores them against an animation rubric (pose
// readability, composition/safe-area, caption legibility, character
// consistency), returning concrete, beat-anchored fixes. Runs in the render
// farm after a stick render; the result is stored on videos.vision_review.
//
// Free Tier 1 of the Vision Optimizer Loop (see docs/stick-studio/) — uses
// Claude's own vision on a handful of frames, no extra vendor. Live when
// ANTHROPIC_API_KEY is present; otherwise a benign mock keeps the farm working.

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

export type FrameIssue = {
  beatIdx: number | null;
  category: "readability" | "composition" | "captions" | "consistency" | "other";
  severity: "low" | "med" | "high";
  note: string;
  fix: string;
};

export type FrameCritique = {
  score: number;
  scores: { readability: number; composition: number; captions: number; consistency: number };
  issues: FrameIssue[];
  strengths: string[];
  provider: "anthropic" | "mock";
  costUsd: number;
};

export type CritiqueFrame = {
  beatIdx: number;
  /** base64 JPEG (no data: prefix). */
  jpegBase64: string;
  action: string;
  setting: string;
  text: string;
};

export function visionCriticLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const CATEGORIES = ["readability", "composition", "captions", "consistency", "other"] as const;
const SEVERITIES = ["low", "med", "high"] as const;

const DELIVER_CRITIQUE_TOOL = {
  name: "deliver_critique",
  description: "Deliver the structured critique of the stick-figure keyframes.",
  input_schema: {
    type: "object",
    properties: {
      overall: { type: "number", description: "Overall quality 0–10." },
      readability: { type: "number", description: "Pose readability 0–10 (is each action unmistakable?)." },
      composition: { type: "number", description: "Composition & safe-area 0–10 (framing, not cut off, balanced)." },
      captions: { type: "number", description: "Caption legibility 0–10 (clear, not overlapping the figure)." },
      consistency: { type: "number", description: "Character consistency 0–10 (same character across beats)." },
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
            fix: { type: "string", description: "A specific, actionable fix (e.g. 'increase the run stride; the pose reads as standing')." },
          },
          required: ["beatIdx", "category", "severity", "note", "fix"],
        },
      },
    },
    required: ["overall", "readability", "composition", "captions", "consistency", "strengths", "issues"],
  },
} as const;

export async function critiqueStickFrames(opts: {
  title: string;
  frames: CritiqueFrame[];
}): Promise<FrameCritique> {
  if (!visionCriticLive() || opts.frames.length === 0) return mockCritique();

  const intro = `You are a senior animation director reviewing keyframe stills from a stick-figure YouTube short titled "${opts.title}". Each image is one beat. The art is intentionally simple flat black stick figures — do NOT critique it for lacking detail; judge it as stick animation.

For each frame, assess:
- READABILITY: is the protagonist's action unmistakable from the pose alone?
- COMPOSITION / SAFE-AREA: is the figure well-framed (not cut off, not tiny, not crowding the caption), centred-ish for 9:16?
- CAPTIONS: is the on-screen caption legible and clear of the figure?
- CONSISTENCY: is it the same character (colour/build/accessory) across beats?

Score each dimension 0–10 and overall. List concrete issues, each tied to its beat index with a SPECIFIC, actionable fix (these map to tunable params — pose, action choice, setting, camera). Be terse and concrete. Then call deliver_critique.`;

  const content: unknown[] = [{ type: "text", text: intro }];
  for (const f of opts.frames) {
    content.push({ type: "text", text: `Beat ${f.beatIdx}: action="${f.action}", setting="${f.setting}" — "${f.text}"` });
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
    throw new Error(`Vision critique ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const tool = data.content.find((c) => c.type === "tool_use");
  if (!tool?.input) throw new Error("Vision critique: no payload");
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

/** Benign placeholder when no API key — keeps the farm running, triggers no fixes. */
function mockCritique(): FrameCritique {
  return {
    score: 8,
    scores: { readability: 8, composition: 8, captions: 8, consistency: 8 },
    issues: [],
    strengths: ["Vision critique runs in mock mode (set ANTHROPIC_API_KEY in the render workflow to enable it)."],
    provider: "mock",
    costUsd: 0,
  };
}
