import "server-only";
import type { ScriptBeat } from "@/lib/db/types";
import { mockScript } from "@/lib/pipeline/mock-content";

/**
 * Script provider adapter (Anthropic Claude). Live when ANTHROPIC_API_KEY
 * is present; otherwise falls back to the deterministic mock so the
 * pipeline always works (standing rule 4).
 */

const MODEL = "claude-sonnet-4-6";
// USD per million tokens (input, output) — used for the cost ledger.
const PRICE_IN = 3;
const PRICE_OUT = 15;

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
    (data.usage.input_tokens / 1e6) * PRICE_IN +
    (data.usage.output_tokens / 1e6) * PRICE_OUT;

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
