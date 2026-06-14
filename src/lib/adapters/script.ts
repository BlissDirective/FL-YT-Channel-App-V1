import "server-only";
import type { ScriptBeat } from "@/lib/db/types";
import { mockScript } from "@/lib/pipeline/mock-content";

/**
 * Script provider adapter (Anthropic Claude). Live when ANTHROPIC_API_KEY
 * is present; otherwise falls back to the deterministic mock so the
 * pipeline always works (standing rule 4).
 *
 * Model is env-switchable via SCRIPT_MODEL (default Sonnet 4.6). Set it to
 * "claude-opus-4-8" for the flagship-quality writer — ~5x the token cost
 * (~$0.25–0.30/script vs ~$0.05); pricing below tracks whichever is set.
 */

const MODEL = process.env.SCRIPT_MODEL?.trim() || "claude-sonnet-4-6";
// USD per million tokens (input, output) per model — for the cost ledger.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 15, out: 75 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const PRICE = PRICING[MODEL] ?? { in: 3, out: 15 };

/**
 * Voice DNA — a system prompt that fights the "AI essay" register: writes
 * like a real creator with a point of view, varies rhythm, and bans the
 * tells that make scripts sound machine-written. Tone (per project) decides
 * how edgy/hype vs. sharp/measured the delivery is.
 */
const VOICE_SYSTEM = `You write YouTube scripts that sound like a sharp human creator talking to one viewer — never like an AI essay or a press release.

Hard rules:
- BANNED phrases (never use, in any form): "delve", "dive in/into", "in today's video", "buckle up", "without further ado", "let's get started", "that's right, folks", "in conclusion", "the world of", "when it comes to", "it's important to note", "needless to say", "look no further", "game-changer", "at the end of the day", "rest assured", "embark", "tapestry", "navigate the", "unlock the secrets".
- Vary rhythm hard: mix 3-word punches with longer lines. Never three same-length sentences in a row. Use sentence fragments for impact.
- Real voice: contractions, second person ("you"), a clear opinion, the occasional aside. Confidence over hedging — cut "might", "perhaps", "in many ways".
- Open cold and mid-thought with a real stake or a bold claim. No throat-clearing, no "welcome back".
- Specifics beat vibes: concrete names, numbers, moments. Show, don't summarize.
- Match the channel tone: if it's energetic/hype, go punchy, bold, a little provocative (but never clickbait lies); if authoritative, go sharp and certain; if curious, go conspiratorial and intriguing.
- It must read like someone SAID it, not wrote it. Read it back in your head — if a sentence sounds like a corporate blog, rewrite it.`;

export type ScriptDraft = {
  body: string;
  beats: ScriptBeat[];
  runtimeSec: number;
  metadata: {
    titles: string[];
    description: string;
    tags: string[];
    chapters: { at: number; label: string }[];
  };
  costUsd: number;
  provider: "anthropic" | "mock";
};

export function isScriptLive(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const DELIVER_SCRIPT_TOOL = {
  name: "deliver_script",
  description: "Deliver the finished YouTube script package.",
  input_schema: {
    type: "object",
    properties: {
      beats: {
        type: "array",
        description:
          "Script beats in order. Beat 1 is the hook. Each beat is 60–90 seconds of narration.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Narration text, spoken-word style." },
            visualPrompt: {
              type: "string",
              description: "One-line visual direction for this beat ([VISUAL] prompt).",
            },
            shotType: {
              type: "string",
              enum: ["hero", "broll", "stock"],
              description:
                "hero = premium generated shot, broll = standard generated, stock = real-world factual footage",
            },
          },
          required: ["text", "visualPrompt", "shotType"],
        },
      },
      titles: {
        type: "array",
        items: { type: "string" },
        description: "3 title options, strongest first.",
      },
      description: { type: "string", description: "YouTube description with CTA." },
      tags: { type: "array", items: { type: "string" }, description: "8–12 tags." },
      chapters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            at: { type: "number", description: "Chapter start in seconds." },
            label: { type: "string" },
          },
          required: ["at", "label"],
        },
      },
      runtimeSec: { type: "number", description: "Estimated spoken runtime in seconds." },
    },
    required: ["beats", "titles", "description", "tags", "chapters", "runtimeSec"],
  },
} as const;

export async function generateScript(opts: {
  title: string;
  topic: string;
  niche: string;
  audience: string;
  angle: string;
  tone: string;
  format: string;
  targetLengthSec: number;
  template: string;
  revisionNotes?: string;
}): Promise<ScriptDraft> {
  if (!isScriptLive()) {
    const draft = mockScript({
      title: opts.title,
      topic: opts.topic,
      tone: opts.tone,
      targetLengthSec: opts.targetLengthSec,
      revisionNotes: opts.revisionNotes,
    });
    return {
      body: draft.body,
      beats: draft.beats,
      runtimeSec: draft.runtimeSec,
      metadata: draft.metadata as ScriptDraft["metadata"],
      costUsd: 0.18,
      provider: "mock",
    };
  }

  const prompt = fillTemplate(opts.template, {
    title: opts.title,
    topic: opts.topic,
    niche: opts.niche,
    audience: opts.audience,
    angle: opts.angle,
    tone: opts.tone,
    format: opts.format,
    target_minutes: String(Math.round(opts.targetLengthSec / 60)),
    revision_notes: opts.revisionNotes
      ? `\n\nIMPORTANT — the previous draft was rejected with these reviewer notes; address them directly:\n"${opts.revisionNotes}"`
      : "",
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      // Higher temperature for less robotic, more human phrasing.
      temperature: 0.9,
      system: VOICE_SYSTEM,
      tools: [DELIVER_SCRIPT_TOOL],
      tool_choice: { type: "tool", name: "deliver_script" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content: { type: string; input?: Record<string, unknown> }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const toolUse = data.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude returned no script payload");

  const input = toolUse.input as {
    beats: { text: string; visualPrompt: string; shotType: ScriptBeat["shotType"] }[];
    titles: string[];
    description: string;
    tags: string[];
    chapters: { at: number; label: string }[];
    runtimeSec: number;
  };
  const beats: ScriptBeat[] = input.beats.map((b, idx) => ({ idx, ...b }));
  const costUsd =
    (data.usage.input_tokens / 1e6) * PRICE.in +
    (data.usage.output_tokens / 1e6) * PRICE.out;

  return {
    body: beats.map((b) => b.text).join("\n\n"),
    beats,
    runtimeSec: input.runtimeSec || opts.targetLengthSec,
    metadata: {
      titles: input.titles,
      description: input.description,
      tags: input.tags,
      chapters: input.chapters,
    },
    costUsd: Math.round(costUsd * 100) / 100,
    provider: "anthropic",
  };
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}
