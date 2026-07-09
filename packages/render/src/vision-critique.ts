// Shared Tier-1 vision critique core (Phase 7). The stick and footage
// critics were ~180 duplicated lines each — identical fetch/parse/validate/
// cost plumbing with different prompts and per-frame labels. Each critic is
// now a thin config over critiqueFrames(). Result shape (FrameCritique) is
// unchanged and stored on videos.vision_review either way.

const MODEL = process.env.VISION_MODEL?.trim() || process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
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

export function visionCriticLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const CATEGORIES = ["readability", "composition", "captions", "consistency", "other"] as const;
const SEVERITIES = ["low", "med", "high"] as const;

export type CritiqueSpec = {
  /** Full reviewer prompt (persona + per-dimension rubric + fix guidance). */
  intro: string;
  /** Tool description + per-dimension schema descriptions (rubric wording). */
  toolDescription: string;
  dimensionDocs: { readability: string; composition: string; captions: string; consistency: string };
  fixDoc: string;
  /** Prefix for thrown errors, e.g. "Vision critique" / "Footage vision critique". */
  errorLabel: string;
  /** Mock-mode strengths note. */
  mockNote: string;
};

export type LabeledFrame = {
  beatIdx: number;
  /** base64 JPEG (no data: prefix). */
  jpegBase64: string;
  /** One-line context shown above the image ("Beat 3: action=run — '…'"). */
  label: string;
};

export async function critiqueFrames(
  title: string,
  frames: LabeledFrame[],
  spec: CritiqueSpec,
): Promise<FrameCritique> {
  if (!visionCriticLive() || frames.length === 0) return mockCritique(spec.mockNote);

  const tool = {
    name: "deliver_critique",
    description: spec.toolDescription,
    input_schema: {
      type: "object",
      properties: {
        overall: { type: "number", description: "Overall quality 0–10." },
        readability: { type: "number", description: spec.dimensionDocs.readability },
        composition: { type: "number", description: spec.dimensionDocs.composition },
        captions: { type: "number", description: spec.dimensionDocs.captions },
        consistency: { type: "number", description: spec.dimensionDocs.consistency },
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
              fix: { type: "string", description: spec.fixDoc },
            },
            required: ["beatIdx", "category", "severity", "note", "fix"],
          },
        },
      },
      required: ["overall", "readability", "composition", "captions", "consistency", "strengths", "issues"],
    },
  } as const;

  const content: unknown[] = [{ type: "text", text: spec.intro.replace("__TITLE__", title) }];
  for (const f of frames) {
    content.push({ type: "text", text: f.label });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.jpegBase64 } });
  }

  // Scale the output budget with frame count so more keyframes can yield more
  // beat-anchored issues without truncating the tool call.
  const maxTokens = Math.min(8000, 1200 + frames.length * 220);
  const init: RequestInit = {
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
      tools: [tool],
      tool_choice: { type: "tool", name: "deliver_critique" },
      messages: [{ role: "user", content }],
    }),
  };
  // One bounded retry on transient statuses (mirrors the app's anthropicFetch).
  let res = await fetch("https://api.anthropic.com/v1/messages", init);
  if (!res.ok && [429, 500, 502, 503, 529].includes(res.status)) {
    await new Promise((r) => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
    res = await fetch("https://api.anthropic.com/v1/messages", init);
  }
  if (!res.ok) {
    throw new Error(`${spec.errorLabel} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) throw new Error(`${spec.errorLabel}: no payload`);
  const raw = toolUse.input as {
    overall?: number;
    readability?: number;
    composition?: number;
    captions?: number;
    consistency?: number;
    strengths?: string[];
    issues?: { beatIdx?: number; category?: string; severity?: string; note?: string; fix?: string }[];
  };

  const validBeats = new Set(frames.map((f) => f.beatIdx));
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
function mockCritique(note: string): FrameCritique {
  return {
    score: 8,
    scores: { readability: 8, composition: 8, captions: 8, consistency: 8 },
    issues: [],
    strengths: [note],
    provider: "mock",
    costUsd: 0,
  };
}
